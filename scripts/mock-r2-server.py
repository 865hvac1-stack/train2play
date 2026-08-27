#!/usr/bin/env python3
"""Tiny S3 multipart stand-in used by the browser integration test."""

import hashlib
import re
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

uploads: dict[str, dict[int, bytes]] = {}
objects: dict[str, bytes] = {}
failed_once: set[tuple[str, int]] = set()


class Handler(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,HEAD,PUT,POST,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Expose-Headers", "ETag,Content-Length,Content-Range")

    def reply(self, status=200, body=b"", content_type="application/xml"):
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_OPTIONS(self):
        self.reply(204)

    def do_POST(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query, keep_blank_values=True)
        if "uploads" in query:
            upload_id = uuid.uuid4().hex
            uploads[upload_id] = {}
            body = (
                f"<InitiateMultipartUploadResult><Bucket>test</Bucket>"
                f"<Key>{parsed.path}</Key><UploadId>{upload_id}</UploadId>"
                "</InitiateMultipartUploadResult>"
            ).encode()
            self.reply(200, body)
            return
        upload_id = query.get("uploadId", [None])[0]
        if upload_id and upload_id in uploads:
            length = int(self.headers.get("Content-Length", "0"))
            request_body = self.rfile.read(length).decode(errors="ignore")
            numbers = [int(value) for value in re.findall(r"<PartNumber>(\d+)</PartNumber>", request_body)]
            parts = uploads.pop(upload_id)
            objects[parsed.path] = b"".join(parts[number] for number in sorted(numbers))
            etag = hashlib.md5(objects[parsed.path], usedforsecurity=False).hexdigest()
            body = (
                f"<CompleteMultipartUploadResult><Location>http://localhost{parsed.path}</Location>"
                f"<Bucket>test</Bucket><Key>{parsed.path}</Key><ETag>\"{etag}\"</ETag>"
                "</CompleteMultipartUploadResult>"
            ).encode()
            self.reply(200, body)
            return
        self.reply(404, b"<Error><Code>NoSuchUpload</Code></Error>")

    def do_PUT(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        upload_id = query.get("uploadId", [None])[0]
        part_number = int(query.get("partNumber", ["0"])[0])
        if not upload_id or upload_id not in uploads:
            self.reply(404, b"<Error><Code>NoSuchUpload</Code></Error>")
            return
        # Force one transient failure so the integration test proves the
        # browser retries only this chunk rather than restarting the video.
        attempt_key = (upload_id, part_number)
        if part_number == 2 and attempt_key not in failed_once:
            failed_once.add(attempt_key)
            self.reply(503, b"<Error><Code>SlowDown</Code></Error>")
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        uploads[upload_id][part_number] = body
        etag = hashlib.md5(body, usedforsecurity=False).hexdigest()
        self.send_response(200)
        self.cors()
        self.send_header("ETag", f'"{etag}"')
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self):
        parsed = urlparse(self.path)
        body = objects.get(parsed.path)
        if body is None:
            self.reply(404)
            return
        self.send_response(200)
        self.cors()
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Type", "video/mp4")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        body = objects.get(parsed.path)
        if body is None:
            self.reply(404)
            return
        self.reply(200, body, "video/mp4")

    def do_DELETE(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        upload_id = query.get("uploadId", [None])[0]
        if upload_id:
            uploads.pop(upload_id, None)
        self.reply(204)

    def log_message(self, fmt, *args):
        print(f"[mock-r2] {fmt % args}", flush=True)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4569
    print(f"mock R2 listening on {port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
