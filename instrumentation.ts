export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { getProductionWarnings } = await import("@/lib/env");

    for (const warning of getProductionWarnings()) {
      console.warn(`[train2play] ${warning}`);
    }
  }
}
