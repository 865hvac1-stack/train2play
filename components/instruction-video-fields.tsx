"use client";

import { useRef, useState } from "react";
import { Camera, Film, Link2, RefreshCcw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVideoCompression } from "@/components/use-video-compression";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/video-upload-limits";

const VIDEO_ACCEPT =
  "video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";

type InstructionVideoFieldsProps = {
  idPrefix: string;
  required?: boolean;
  defaultUrl?: string | null;
  title?: string;
  description?: string;
};

/** Shared upload / YouTube-Vimeo / MP4 fields for workouts and course drills. */
export function InstructionVideoFields({
  idPrefix,
  required = false,
  defaultUrl,
  title = "Video (optional)",
  description = "Upload a clip, or paste a YouTube / Vimeo / direct MP4 link.",
}: InstructionVideoFieldsProps) {
  const [mode, setMode] = useState<"upload" | "url">(
    defaultUrl ? "url" : "url",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [optimize, setOptimize] = useState(true);
  const { state: compression, prepare, reset } = useVideoCompression();
  const busy = compression.status === "working";
  const fileError = compression.sizeError;

  function openPicker(pickerMode: "gallery" | "back-camera" | "front-camera") {
    const input = fileInputRef.current;
    if (!input) return;
    if (pickerMode === "back-camera") {
      input.setAttribute("capture", "environment");
    } else if (pickerMode === "front-camera") {
      input.setAttribute("capture", "user");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/25 bg-brand-light/50 p-3 sm:p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "url" ? "default" : "outline"}
          onClick={() => setMode("url")}
        >
          <Link2 className="size-3.5" />
          Paste link
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
        >
          <Upload className="size-3.5" />
          Upload file
        </Button>
      </div>

      {mode === "url" ? (
        <div className="space-y-2">
          <input type="hidden" name="instructionVideoMode" value="url" />
          <Label htmlFor={`${idPrefix}-url`}>YouTube, Vimeo, or MP4 URL</Label>
          <Input
            id={`${idPrefix}-url`}
            name="instructionVideoUrl"
            type="url"
            required={required}
            defaultValue={defaultUrl ?? ""}
            placeholder="https://youtube.com/watch?v=… or https://….mp4"
            className="h-11 text-base sm:h-9 sm:text-sm"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <input type="hidden" name="instructionVideoMode" value="upload" />
          {/* Blocks a save that would upload the original, uncompressed file. */}
          {busy ? (
            <input type="hidden" name="videoCompressionPending" value="1" />
          ) : null}
          {compression.mediaId ? (
            <input
              type="hidden"
              name="directVideoMediaId"
              value={compression.mediaId}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            {[
              {
                value: true,
                label: "Optimized 720p",
                note: "Fast upload",
              },
              {
                value: false,
                label: "Original quality",
                note: "R2 required",
              },
            ].map((choice) => (
              <button
                key={String(choice.value)}
                type="button"
                disabled={busy}
                onClick={() => {
                  setOptimize(choice.value);
                  if (selectedFile) {
                    void prepare(selectedFile, fileInputRef.current, {
                      optimize: choice.value,
                    });
                  }
                }}
                className={cn(
                  "rounded-md px-2 py-2 text-center text-xs disabled:opacity-60",
                  optimize === choice.value
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-600",
                )}
              >
                <span className="block">{choice.label}</span>
                <span className="block font-normal text-slate-500">
                  {choice.note}
                </span>
              </button>
            ))}
          </div>
          {/* Keep existing URL when replacing via upload only if needed — empty on upload */}
          <input
            ref={fileInputRef}
            id={`${idPrefix}-file`}
            name="instructionVideoFile"
            type="file"
            accept={VIDEO_ACCEPT}
            className="sr-only"
            required={required && !selectedFile}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSelectedFile(file);
              if (file) {
                void prepare(file, fileInputRef.current, { optimize });
              }
              else reset();
            }}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => openPicker("back-camera")}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-white px-3 py-3 text-center",
                "hover:border-brand hover:bg-brand-light/40",
              )}
            >
              <Camera className="h-6 w-6 text-brand" />
              <span className="text-sm font-semibold text-slate-900">
                Record demo
              </span>
              <span className="text-[11px] text-slate-500">Back camera</span>
            </button>
            <button
              type="button"
              onClick={() => openPicker("front-camera")}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-white px-3 py-3 text-center",
                "hover:border-brand hover:bg-brand-light/40",
              )}
            >
              <RefreshCcw className="h-6 w-6 text-brand" />
              <span className="text-sm font-semibold text-slate-900">
                Record yourself
              </span>
              <span className="text-[11px] text-slate-500">Front camera</span>
            </button>
            <button
              type="button"
              onClick={() => openPicker("gallery")}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-center",
                "hover:border-brand hover:bg-brand-light/40",
              )}
            >
              <Film className="h-6 w-6 text-slate-700" />
              <span className="text-sm font-semibold text-slate-900">
                Gallery / files
              </span>
            </button>
          </div>
          {selectedFile ? (
            <div className="rounded-lg border border-brand/30 bg-white px-3 py-2 text-sm">
              <p className="truncate font-medium text-slate-900">
                {selectedFile.name}
              </p>
              <p
                className={cn(
                  "text-xs",
                  fileError || compression.uploadError
                    ? "text-destructive"
                    : "text-slate-600",
                )}
              >
                {fileError ??
                  compression.uploadError ??
                  compression.message ??
                  formatBytes(selectedFile.size)}
              </p>
              {busy ? (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand/20"
                  role="progressbar"
                  aria-valuenow={compression.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width]"
                    style={{ width: `${compression.percent}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              MP4 / MOV · long clips are compressed on your device before upload
              {defaultUrl ? " · uploading replaces the current video" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
