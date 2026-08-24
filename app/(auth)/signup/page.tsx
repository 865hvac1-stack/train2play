import Link from "next/link";

import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-emerald-50 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
          YT
        </div>
        <span className="text-lg font-semibold text-slate-900">
          Youth Athlete Training
        </span>
      </Link>
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </div>
  );
}
