import { Plus, Volleyball } from "lucide-react";
import Link from "next/link";

import { createPlatformSportAction } from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPlatformCommandCenter } from "@/lib/admin-analytics";

export default async function AdminSportsPage() {
  const data = await getPlatformCommandCenter("30d");
  return (
    <AdminShell
      title="Sports"
      description="Platform-wide adoption and health by sport."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {data.sports.map((sport) => (
            <Link
              key={sport.id}
              href={`/admin/sports/${sport.id}`}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand/60 hover:shadow-sm sm:grid-cols-[1fr_repeat(4,110px)]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Volleyball className="size-5 text-brand" />
                  <h2 className="font-heading text-lg font-bold">{sport.name}</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {sport.organizations} organizations offering this sport
                </p>
              </div>
              <div>
                <p className="font-heading text-xl font-bold">{sport.athletes}</p>
                <p className="text-xs text-slate-500">Athletes</p>
              </div>
              <div>
                <p className="font-heading text-xl font-bold">{sport.activeRate}%</p>
                <p className="text-xs text-slate-500">Active · 30d</p>
              </div>
              <div>
                <p className="font-heading text-xl font-bold">{sport.coaches}</p>
                <p className="text-xs text-slate-500">Coaches</p>
              </div>
              <div>
                <p className="font-heading text-xl font-bold">{sport.workouts}</p>
                <p className="text-xs text-slate-500">Workouts · 30d</p>
              </div>
            </Link>
          ))}
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-5">
          <Plus className="size-5 text-brand" />
          <h2 className="font-heading mt-3 text-lg font-bold">Add future sport</h2>
          <p className="mt-1 text-sm text-slate-500">
            New sports are data-driven. Existing portals continue using the
            current sport strings while the new sport becomes available to Admin.
          </p>
          <form action={createPlatformSportAction} className="mt-4 space-y-3">
            <Input name="name" required placeholder="Lacrosse" />
            <Button type="submit" className="w-full">
              Add sport
            </Button>
          </form>
          <div className="mt-5 border-t pt-4 text-xs text-slate-500">
            <Badge variant="outline">Community ready</Badge>
            <p className="mt-2">
              Leaderboard rules and challenges will reference this sport catalog.
            </p>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
