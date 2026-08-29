import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getRoleHomePath } from "@/lib/roles";

/** PWA start URL — routes each role to the existing portal, not a second app. */
export default async function LaunchPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/launch");
  }
  redirect(getRoleHomePath(session.user.role));
}
