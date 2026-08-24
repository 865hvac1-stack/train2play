"use client";

import { brand } from "@/lib/brand";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
        <p className="mt-2 text-slate-600">Something went wrong loading the app.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
        <a
          href={`mailto:${brand.supportEmail}`}
          className="mt-4 text-sm text-primary"
        >
          {brand.supportEmail}
        </a>
      </body>
    </html>
  );
}
