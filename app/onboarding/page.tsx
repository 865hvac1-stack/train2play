import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BrandLogoLarge } from "@/components/brand-logo";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex min-h-full flex-col items-center justify-center t2p-page-gradient px-4 py-12">
      <Link href="/" className="mb-8">
        <BrandLogoLarge />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</CardTitle>
          <CardDescription>
            Tell us where you coach so we can match you with nearby pickup players.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
