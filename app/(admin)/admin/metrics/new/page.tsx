import Link from "next/link";

import { createMetricAction } from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";

export default async function NewMetricPage() {
  const sports = await prisma.platformSport.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <AdminShell
      title="Add metric"
      description="Extend the existing Train2Play performance metric library."
    >
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/admin/metrics">← Back to metrics</Link>}
      />
      <form
        action={createMetricAction}
        className="mt-4 max-w-3xl space-y-5 rounded-2xl border bg-white p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Throwing Velocity" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sport">Sport</Label>
            <select
              id="sport"
              name="sport"
              required
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Choose sport</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.name}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" required placeholder="Throwing" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" name="unit" required placeholder="mph" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <select
              id="direction"
              name="direction"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="HIGHER_IS_BETTER">Higher is better</option>
              <option value="LOWER_IS_BETTER">Lower is better</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationRequirement">Verification</Label>
            <select
              id="verificationRequirement"
              name="verificationRequirement"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="NONE">No verification</option>
              <option value="COACH">Coach verified</option>
              <option value="VIDEO">Video evidence</option>
              <option value="EVENT">Verified event</option>
            </select>
          </div>
        </div>
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="leaderboardEligible" className="size-4" />
            Eligible for future Train2Play leaderboards
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="publicLeaderboardEligible"
              className="size-4"
            />
            Eligible for future public leaderboards
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSensitive" className="size-4" />
            Sensitive/private metric
          </label>
          <p className="text-xs text-slate-500">
            Sensitive metrics are forced off public leaderboards when saved.
          </p>
        </div>
        <Button type="submit">Create metric</Button>
      </form>
    </AdminShell>
  );
}
