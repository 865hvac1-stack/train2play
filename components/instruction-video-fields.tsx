"use client";

import { useRef, useState } from "react";
import { Camera, Film, Link2, RefreshCcw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { videoFileSizeError } from "@/lib/video-upload-limits";

const VIDEO_ACCEPT =
  "video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const fileError = selectedFile ? videoFileSizeError(selectedFile) : null;

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
              e.currentTarget.setCustomValidity(
                file ? (videoFileSizeError(file) ?? "") : "",
              );
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
                  fileError ? "text-destructive" : "text-slate-600",
                )}
              >
                {formatBytes(selectedFile.size)} · {fileError ?? "ready"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              MP4 / MOV · up to 100 MB
              {defaultUrl ? " · uploading replaces the current video" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
