"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";

import { Label } from "@/components/ui/label";

const ACCEPT = "image/*";

export function ProfilePhotoPicker({
  name,
  label,
  currentUrl,
  preview,
  capture = "user",
}: {
  name: string;
  label: string;
  currentUrl?: string | null;
  preview: "avatar" | "cover";
  capture?: "user" | "environment";
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState("");

  function applyFile(file: File | null, other: HTMLInputElement | null) {
    if (other) other.value = "";
    if (liveUrl) URL.revokeObjectURL(liveUrl);
    if (!file) {
      setLiveUrl(null);
      setFileLabel("");
      return;
    }
    setLiveUrl(URL.createObjectURL(file));
    setFileLabel(file.name || "Photo selected");
  }

  const shown = liveUrl || currentUrl || null;

  return (
    <div className="space-y-3">
      <Label className="text-slate-300">{label}</Label>
      {shown ? (
        preview === "avatar" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className="size-24 rounded-2xl border border-white/15 object-cover"
          />
        ) : (
          <div
            className="h-24 overflow-hidden rounded-xl border border-white/15 bg-zinc-800 bg-cover bg-center"
            style={{ backgroundImage: `url(${shown})` }}
          />
        )
      ) : null}

      <input
        ref={cameraRef}
        type="file"
        name={name}
        accept={ACCEPT}
        capture={capture}
        className="sr-only"
        onChange={(event) => applyFile(event.target.files?.[0] ?? null, libraryRef.current)}
      />
      <input
        ref={libraryRef}
        type="file"
        name={name}
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => applyFile(event.target.files?.[0] ?? null, cameraRef.current)}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-black"
        >
          <Camera className="size-4" />
          Take photo
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold"
        >
          <ImagePlus className="size-4" />
          Choose from phone
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Use your camera or pick a photo from your library. JPG, PNG, HEIC, and WebP work.
        {fileLabel ? ` Selected: ${fileLabel}` : null}
      </p>
    </div>
  );
}
