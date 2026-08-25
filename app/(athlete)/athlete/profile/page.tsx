import { SignOutButton } from "@/components/sign-out-button";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { brand } from "@/lib/brand";

export default async function AthleteProfilePage() {
  const ctx = await requireAthleteContext();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Profile
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {ctx.firstName} {ctx.lastName}
        </h1>
        <p className="text-slate-400">
          {[ctx.sport, ctx.position].filter(Boolean).join(" • ")}
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 space-y-3">
        <p className="text-sm text-slate-300">
          Your athlete profile is the center of Train2Play. Coaches, parents, and
          your training data all connect here.
        </p>
        <p className="text-xs text-slate-500">
          {brand.name} · {brand.tagline}
        </p>
      </section>

      <SignOutButton />
    </div>
  );
}
