"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { getPostAuthRedirect } from "@/app/onboarding/actions";
import { sendWelcomeEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { createUser, signupSchema } from "@/lib/users";

export type AuthActionState = {
  error?: string;
};

function safeCallbackUrl(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (formData.get("acceptTerms") !== "true") {
    return { error: "Please agree to the Terms of Service and Privacy Policy." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    accountType: formData.get("accountType") || "COACH",
    sports: formData.getAll("sports"),
    sport: formData.get("primarySport") || formData.get("sport") || undefined,
    position: formData.get("position") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const accountType = parsed.data.accountType ?? "COACH";

  try {
    await createUser(parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create account. Please try again.",
    };
  }

  // Non-blocking — signup still succeeds if email is not configured or send fails
  try {
    const homePath = accountType === "ATHLETE" ? "/athlete" : "/dashboard";
    await sendWelcomeEmail({
      to: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      accountType,
      loginUrl: `${getAppUrl()}${homePath}`,
    });
  } catch {
    // ignore
  }

  const result = await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });

  if (result?.error) {
    return { error: "Account created, but sign-in failed. Try logging in." };
  }

  redirect(await getPostAuthRedirect(parsed.data.email));
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = await signIn("credentials", {
    email: formData.get("email"),
    password: formData.get("password"),
    redirect: false,
  });

  if (result?.error) {
    return { error: "Invalid email or password" };
  }

  const email = String(formData.get("email") ?? "").toLowerCase();
  const defaultRedirect = await getPostAuthRedirect(email);
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  if (callbackUrl) {
    const athleteHome =
      defaultRedirect === "/athlete" || defaultRedirect.startsWith("/athlete/");
    const callbackIsAthlete =
      callbackUrl === "/athlete" || callbackUrl.startsWith("/athlete/");
    const callbackIsCoach =
      callbackUrl.startsWith("/dashboard") ||
      callbackUrl.startsWith("/athletes") ||
      callbackUrl.startsWith("/training") ||
      callbackUrl.startsWith("/courses") ||
      callbackUrl.startsWith("/videos") ||
      callbackUrl.startsWith("/settings") ||
      callbackUrl.startsWith("/reports") ||
      callbackUrl.startsWith("/calendar") ||
      callbackUrl.startsWith("/teams") ||
      callbackUrl.startsWith("/pickup-players") ||
      callbackUrl === "/onboarding";

    if (athleteHome && callbackIsAthlete) {
      redirect(callbackUrl);
    }
    if (!athleteHome && callbackIsCoach) {
      redirect(callbackUrl);
    }
  }

  redirect(defaultRedirect);
}

export async function logoutAction() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/" });
}
