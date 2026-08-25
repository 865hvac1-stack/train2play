"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { geocodeZipCode, normalizeZipCode } from "@/lib/geocoding";
import { onboardingSchema } from "@/lib/onboarding";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type OnboardingActionState = {
  error?: string;
};

export async function completeOnboardingAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    zipCode: normalizeZipCode(String(formData.get("zipCode") ?? "")),
    lookingForSport: formData.get("lookingForSport"),
    searchRadiusMiles: formData.get("searchRadiusMiles"),
    lookingForPositions: formData.get("lookingForPositions") || undefined,
    pickupAlertsEnabled: formData.get("pickupAlertsEnabled") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const geo = await geocodeZipCode(parsed.data.zipCode);
  if (!geo) {
    return {
      error: "Could not find that US zip code. Double-check and try again.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      zipCode: geo.zipCode,
      latitude: geo.latitude,
      longitude: geo.longitude,
      searchRadiusMiles: parsed.data.searchRadiusMiles,
      lookingForSport: parsed.data.lookingForSport,
      lookingForPositions: parsed.data.lookingForPositions?.trim() || null,
      pickupAlertsEnabled: parsed.data.pickupAlertsEnabled,
      onboardingCompletedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/pickup-players/nearby");
  redirect("/dashboard");
}

export async function getPostAuthRedirect(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { onboardingCompletedAt: true, role: true },
  });

  if (!user) return "/dashboard";

  const { getLoginLandingPath } = await import("@/lib/roles");
  return getLoginLandingPath({
    role: user.role,
    onboardingCompletedAt: user.onboardingCompletedAt,
  });
}
