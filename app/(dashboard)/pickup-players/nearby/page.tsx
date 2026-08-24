import Link from "next/link";
import { MapPin, Plus } from "lucide-react";

import { NearbyPickupFeed } from "@/components/nearby-pickup-feed";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getNearbyPickupPlayersForCoach } from "@/lib/pickup-matching-server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function NearbyPickupPlayersPage() {
  const user = await requireUser();
  const { players, needsZip } = await getNearbyPickupPlayersForCoach(user.id);

  const coach = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { searchRadiusMiles: true, zipCode: true },
  });

  return (
    <DashboardShell
      title="Players near me"
      description={
        needsZip
          ? "Set your zip code in Settings to find pickup players nearby."
          : `Showing listed pickup players within ${coach.searchRadiusMiles} miles of zip ${coach.zipCode}.`
      }
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/pickup-players">My pickup list</Link>} />
          <Button
           
            nativeButton={false}
            render={
              <Link href="/pickup-players/new">
                <Plus className="size-4" />
                Add pickup player
              </Link>
            }
          />
        </div>
      }
    >
      {!needsZip ? (
        <p className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
          <MapPin className="size-4" />
          Sorted by distance · email alerts fire automatically when new matches are added
        </p>
      ) : null}
      <NearbyPickupFeed players={players} needsZip={needsZip} />
    </DashboardShell>
  );
}
