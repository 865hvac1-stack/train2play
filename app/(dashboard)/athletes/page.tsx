import Link from "next/link";
import { Plus } from "lucide-react";

import { AthleteRoster } from "@/components/athlete-roster";
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

  const serializedAthletes = athletes.map((athlete) => ({
    ...athlete,
    dateOfBirth: athlete.dateOfBirth?.toISOString() ?? null,
  }));

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
      <AthleteRoster athletes={serializedAthletes} />
    </DashboardShell>
  );
}
