"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-slate-600">
        {error.message || "An unexpected error occurred. Try again or contact support."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700">
          Try again
        </Button>
        <Button variant="outline" render={<Link href="/dashboard">Dashboard</Link>} />
      </div>
      <a
        href={`mailto:${brand.supportEmail}`}
        className="mt-6 text-sm text-emerald-700 hover:underline"
      >
        {brand.supportEmail}
      </a>
    </div>
  );
}
