import { SignOutButton } from "@/components/sign-out-button";
import { requireAthlete } from "@/lib/session";

export default async function AthleteSetupRequiredPage() {
  await requireAthlete();

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <h1 className="font-heading text-2xl font-bold">Almost ready</h1>
      <p className="text-sm leading-relaxed text-slate-300">
        Your athlete login is active, but it is not linked to an athlete profile
        yet. Ask your coach to connect your account, or use the demo athlete
        login after seeding local data.
      </p>
      <SignOutButton />
    </div>
  );
}
