import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function getSession() {
  return auth();
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

export async function requireCoachId() {
  const user = await requireUser();
  return user.id;
}
