import Link from "next/link";
import { Plus } from "lucide-react";

import { AthleteCard, EmptyAthletesState } from "@/components/athlete-card";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function AthletesPage() {
  const user = await requireUser();

  const athletes = await prisma.athlete.findMany({
    where: { coachId: user.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <DashboardShell
      title="Athletes"
      description="Manage your roster and athlete profiles."
      action={
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          render={
            <Link href="/athletes/new">
              <Plus className="h-4 w-4" />
              Add athlete
            </Link>
          }
        />
      }
    >
      {athletes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {athletes.map((athlete) => (
            <AthleteCard key={athlete.id} athlete={athlete} />
          ))}
        </div>
      ) : (
        <EmptyAthletesState />
      )}
    </DashboardShell>
  );
}
