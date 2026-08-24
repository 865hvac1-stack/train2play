import Link from "next/link";

import { BrandLogoLarge } from "@/components/brand-logo";
import { LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-emerald-50 px-4 py-12">
      <Link href="/" className="mb-8">
        <BrandLogoLarge />
      </Link>
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
