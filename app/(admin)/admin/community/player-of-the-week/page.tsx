import { AdminShell } from "@/components/admin-shell";
import {
  savePlayerOfTheWeekForm,
  publishPlayerOfTheWeekAction,
  unpublishPlayerOfTheWeekAction,
} from "@/app/(admin)/admin/community-actions";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/session";
import { Button } from "@/components/ui/button";

export default async function AdminPlayerOfTheWeekPage() {
  await requirePlatformAdmin();
  const [rows, athletes] = await Promise.all([
    prisma.playerOfTheWeek.findMany({
      include: {
        athleteProfile: { select: { firstName: true, lastName: true, publicSlug: true } },
      },
      orderBy: { startDate: "desc" },
      take: 20,
    }),
    prisma.athleteProfile.findMany({
      select: { id: true, firstName: true, lastName: true, primarySport: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
    }),
  ]);

  return (
    <AdminShell
      title="Player of the Week"
      description="Editorial selection. Publishing awards the achievement and can feature the athlete on Community and the homepage."
    >
      <form action={savePlayerOfTheWeekForm} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold">Select athlete</h2>
        <select name="athleteProfileId" required className="h-10 w-full rounded-lg border px-2">
          <option value="">Choose athlete</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.firstName} {athlete.lastName} {athlete.primarySport ? `· ${athlete.primarySport}` : ""}
            </option>
          ))}
        </select>
        <input name="sport" placeholder="Sport" className="h-10 w-full rounded-lg border px-2" />
        <input name="highlight" placeholder="Highlight (e.g. +6 MPH exit velocity)" className="h-10 w-full rounded-lg border px-2" />
        <input name="featuredVideoReviewId" placeholder="Featured video review ID (optional)" className="h-10 w-full rounded-lg border px-2" />
        <textarea name="description" required placeholder="Short feature description" className="min-h-24 w-full rounded-lg border px-2 py-2" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Start
            <input type="date" name="startDate" required className="mt-1 h-10 w-full rounded-lg border px-2" />
          </label>
          <label className="text-sm">
            End
            <input type="date" name="endDate" required className="mt-1 h-10 w-full rounded-lg border px-2" />
          </label>
        </div>
        <Button type="submit">Save draft</Button>
      </form>

      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading font-bold">
                  {row.athleteProfile.firstName} {row.athleteProfile.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {row.startDate.toLocaleDateString()} – {row.endDate.toLocaleDateString()} ·{" "}
                  {row.published ? "Published" : "Draft"}
                </p>
                <p className="mt-1 text-sm">{row.description}</p>
              </div>
              {row.published ? (
                <form action={unpublishPlayerOfTheWeekAction.bind(null, row.id)}>
                  <Button type="submit" variant="outline">
                    Unpublish
                  </Button>
                </form>
              ) : (
                <form action={publishPlayerOfTheWeekAction.bind(null, row.id)}>
                  <Button type="submit">Publish</Button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
