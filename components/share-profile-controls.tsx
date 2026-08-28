"use client";

import { useMemo, useState } from "react";
import { Check, Copy, QrCode, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ShareProfileControls({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(url)}`,
    [url],
  );

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled
      }
    }
    await copy();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="border-white/20 bg-black/30 text-white hover:bg-white/10"
        onClick={copy}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button
        type="button"
        className="bg-brand text-black hover:bg-brand/90"
        onClick={nativeShare}
      >
        <Share2 className="size-4" />
        Share profile
      </Button>
      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-black/30 text-white hover:bg-white/10"
            />
          }
        >
          <QrCode className="size-4" />
          QR code
        </DialogTrigger>
        <DialogContent className="border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Share with a QR code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={`QR code for ${title}`}
              width={280}
              height={280}
              className="rounded-xl bg-white p-3"
            />
            <p className="max-w-xs text-center text-xs text-zinc-400">
              Print this on recruiting cards, tournament handouts, or your social bio.
            </p>
            <p className="break-all text-center text-xs text-brand">{url}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
