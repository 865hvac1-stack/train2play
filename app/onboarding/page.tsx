import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BrandLogo } from "@/components/brand-logo";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brand } from "@/lib/brand";
import { prisma } from "@/lib/db";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true, name: true },
  });

  if (user?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-black px-4 py-12">
      <div aria-hidden className="t2p-hero-field absolute inset-0 opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black"
      />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <BrandLogo size="lg" variant="dark" subtitle={brand.tagline} />
        </Link>
        <Card className="w-full border-white/10 bg-white/95 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">
              Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </CardTitle>
            <CardDescription>
              Tell us where you coach so we can match you with nearby pickup players
              and suggest age-right drills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
