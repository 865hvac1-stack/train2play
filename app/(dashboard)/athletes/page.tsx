import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";

import { AthleteRoster } from "@/components/athlete-roster";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getRosterAthletesForCoach } from "@/lib/player-profile-server";
import { requireUser } from "@/lib/session";

export default async function AthletesPage() {
  const user = await requireUser();

  const athletes = await getRosterAthletesForCoach(user.id);

  const serializedAthletes = athletes.map((athlete) => ({
    ...athlete,
    dateOfBirth: athlete.dateOfBirth?.toISOString() ?? null,
  }));

  return (
    <DashboardShell
      title="Athletes"
      description="Manage your roster and athlete profiles."
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/pickup-players/new">
                <UserPlus className="h-4 w-4" />
                Pickup player
              </Link>
            }
          />
          <Button
           
            nativeButton={false}
            render={
              <Link href="/athletes/new">
                <Plus className="h-4 w-4" />
                Add athlete
              </Link>
            }
          />
        </div>
      }
    >
      <AthleteRoster athletes={serializedAthletes} />
    </DashboardShell>
  );
}
