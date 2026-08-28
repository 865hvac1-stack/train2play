"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/session";
import { adminReviewCoachProfile, adminUpdateBackgroundCheck } from "@/lib/coaching/approval";
import { isBackgroundCheckStatus } from "@/lib/coaching/status";

export async function reviewCoachProfileForm(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as
    | "APPROVE"
    | "DECLINE"
    | "REQUEST_CHANGES"
    | "SUSPEND"
    | "REACTIVATE"
    | "UNDER_REVIEW";
  if (!id || !action) return;
  await adminReviewCoachProfile({
    adminUserId: admin.id,
    coachProfileId: id,
    action,
    adminNote: String(formData.get("adminNote") ?? "").trim() || null,
    declineReason: String(formData.get("declineReason") ?? "").trim() || null,
    requestChangesNote: String(formData.get("requestChangesNote") ?? "").trim() || null,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${id}`);
  revalidatePath("/admin/users");
}

export async function updateBackgroundCheckForm(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !isBackgroundCheckStatus(status)) return;
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  await adminUpdateBackgroundCheck({
    adminUserId: admin.id,
    coachProfileId: id,
    status,
    provider: String(formData.get("provider") ?? "").trim() || null,
    reference: String(formData.get("reference") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    expiresAt: expiresRaw ? new Date(expiresRaw) : null,
  });
  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${id}`);
}
