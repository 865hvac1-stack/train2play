import Link from "next/link";

import { BrandLogoLarge } from "@/components/brand-logo";
import { ResetPasswordForm } from "@/components/password-reset-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-emerald-50 px-4 py-12">
      <Link href="/" className="mb-8">
        <BrandLogoLarge />
      </Link>
      <div className="w-full max-w-md">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Invalid reset link</CardTitle>
              <CardDescription>
                This password reset link is missing or incomplete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Request a new reset link
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
