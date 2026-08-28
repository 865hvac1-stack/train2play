"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileImageUrlField({
  name,
  label,
  defaultValue,
  hint,
  preview,
}: {
  name: string;
  label: string;
  defaultValue: string;
  hint?: string;
  preview: "avatar" | "cover";
}) {
  const [url, setUrl] = useState(defaultValue);
  const showPreview = /^https?:\/\//i.test(url.trim());

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-slate-300">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://"
        className="h-11 border-white/15 bg-black/30 text-white"
      />
      {hint ? <p className="text-[11px] leading-relaxed text-zinc-500">{hint}</p> : null}
      {showPreview ? (
        preview === "avatar" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url.trim()}
            alt=""
            className="size-20 rounded-2xl border border-white/15 object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="h-20 overflow-hidden rounded-xl border border-white/15 bg-zinc-800 bg-cover bg-center"
            style={{ backgroundImage: `url(${url.trim()})` }}
          />
        )
      ) : null}
    </div>
  );
}
