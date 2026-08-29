import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    enabled: isPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
}
