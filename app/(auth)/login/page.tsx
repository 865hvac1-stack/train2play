import Link from "next/link";

import { BrandLogoLarge } from "@/components/brand-logo";
import { LoginForm } from "@/components/auth-forms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-full flex-col items-center justify-center t2p-page-gradient px-4 py-12">
      <Link href="/" className="mb-8">
        <BrandLogoLarge />
      </Link>
      <div className="w-full max-w-md">
        <LoginForm
          resetSuccess={params.reset === "1"}
          callbackUrl={params.callbackUrl}
        />
      </div>
    </div>
  );
}
