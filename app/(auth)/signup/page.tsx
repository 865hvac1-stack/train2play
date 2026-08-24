import Link from "next/link";

import { BrandLogoLarge } from "@/components/brand-logo";
import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center t2p-page-gradient px-4 py-12">
      <Link href="/" className="mb-8">
        <BrandLogoLarge />
      </Link>
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </div>
  );
}
