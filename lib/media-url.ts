/**
 * Detect playable instruction media: direct files vs YouTube/Vimeo embeds.
 */

export type MediaPlayback =
  | { kind: "file"; src: string }
  | { kind: "youtube"; embedSrc: string; watchUrl: string }
  | { kind: "vimeo"; embedSrc: string; watchUrl: string };

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

export function getMediaPlayback(rawUrl: string): MediaPlayback | null {
  const url = safeUrl(rawUrl);
  if (!url) return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id) return null;
    return {
      kind: "youtube",
      embedSrc: `https://www.youtube.com/embed/${id}`,
      watchUrl: rawUrl.trim(),
    };
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    let id = url.searchParams.get("v");
    if (!id && url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2] ?? null;
    }
    if (!id && url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2] ?? null;
    }
    if (!id) return null;
    return {
      kind: "youtube",
      embedSrc: `https://www.youtube.com/embed/${id}`,
      watchUrl: rawUrl.trim(),
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    if (!id) return null;
    return {
      kind: "vimeo",
      embedSrc: `https://player.vimeo.com/video/${id}`,
      watchUrl: rawUrl.trim(),
    };
  }

  return { kind: "file", src: rawUrl.trim() };
}

export function isValidInstructionVideoUrl(raw: string): boolean {
  return getMediaPlayback(raw) !== null;
}
