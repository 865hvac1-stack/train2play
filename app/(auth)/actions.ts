"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { getPostAuthRedirect } from "@/app/onboarding/actions";
import { createUser, signupSchema } from "@/lib/users";

export type AuthActionState = {
  error?: string;
};

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

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
  redirect(await getPostAuthRedirect(email));
}

export async function logoutAction() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/" });
}
