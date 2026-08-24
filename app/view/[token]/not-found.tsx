import Link from "next/link";

import { BrandLogoLarge } from "@/components/brand-logo";

export default function ParentViewNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-emerald-50 px-6 py-16">
      <BrandLogoLarge />
      <h1 className="mt-8 text-2xl font-bold text-slate-900">Link not found</h1>
      <p className="mt-2 max-w-md text-center text-slate-600">
        This family view link is invalid or has been revoked. Ask your coach to
        send a new link.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-emerald-700 hover:underline"
      >
        Go to home page
      </Link>
    </div>
  );
}
