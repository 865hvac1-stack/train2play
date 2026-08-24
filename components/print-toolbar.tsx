"use client";

import Link from "next/link";
import { useEffect } from "react";

type PrintToolbarProps = {
  backHref: string;
  autoPrint?: boolean;
};

export function PrintToolbar({ backHref, autoPrint }: PrintToolbarProps) {
  useEffect(() => {
    if (autoPrint) {
      window.print();
    }
  }, [autoPrint]);

  return (
    <div className="mb-8 flex items-start justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
      <div>
        <p className="text-sm text-slate-500">Print preview</p>
        <h1 className="text-xl font-semibold">Report</h1>
      </div>
      <div className="flex gap-2">
        <Link
          href={backHref}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
        >
          Back
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}
