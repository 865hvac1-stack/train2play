"use server";

import { redirect } from "next/navigation";

import {
  requestPasswordReset,
  requestResetSchema,
  resetPasswordSchema,
  resetPasswordWithToken,
} from "@/lib/password-reset";

export type ResetActionState = {
  error?: string;
  success?: string;
};

export async function requestPasswordResetAction(
  _prevState: ResetActionState,
  formData: FormData,
): Promise<ResetActionState> {
  const parsed = requestResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const result = await requestPasswordReset(parsed.data.email);

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    success:
      "If an account exists for that email, we sent a reset link. Check your inbox.",
  };
}

export async function resetPasswordAction(
  _prevState: ResetActionState,
  formData: FormData,
): Promise<ResetActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await resetPasswordWithToken({
      token: parsed.data.token,
      password: parsed.data.password,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to reset password. Try requesting a new link.",
    };
  }

  redirect("/login?reset=1");
}
