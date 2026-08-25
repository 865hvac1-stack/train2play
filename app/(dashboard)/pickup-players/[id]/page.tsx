import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { expressInterestAction } from "@/app/(dashboard)/pickup-players/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlayerProfileStats } from "@/components/player-profile-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDistance } from "@/lib/geocoding";
import {
  getAthleteProfileComparisons,
  getListedPickupPlayerForView,
} from "@/lib/player-profile-server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

function formatBirthDate(date: Date | null) {
  if (!date) return "Not provided";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function PickupPlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const player = await getListedPickupPlayerForView(id);

  if (!player) {
    notFound();
  }

  if (player.coachId === user.id) {
    notFound();
  }

  const coach = await prisma.user.findUnique({
    where: { id: user.id },
    select: { latitude: true, longitude: true },
  });

  let distanceLabel: string | null = null;
  if (
    coach?.latitude != null &&
    coach?.longitude != null &&
    player.latitude != null &&
    player.longitude != null
  ) {
    const { distanceMiles } = await import("@/lib/geocoding");
    distanceLabel = formatDistance(
      distanceMiles(coach.latitude, coach.longitude, player.latitude, player.longitude),
    );
  }

  const profileStats = await getAthleteProfileComparisons(
    player.progressMetrics,
    player.sport,
  );
  const alreadyInterested = player.pickupInterests.some(
    (interest) => interest.interestedCoachId === user.id,
  );
  const expressInterest = expressInterestAction.bind(null, player.id);

  return (
    <DashboardShell
      title={`${player.firstName} ${player.lastName}`}
      description="Listed pickup player · limited public profile"
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/pickup-players/nearby">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back to nearby</span>
            </Link>
          }
        />
      }
    >
      <div className="mx-auto w-full max-w-3xl min-w-0 space-y-6">
        <PlayerProfileStats
          stats={profileStats}
          athleteName={`${player.firstName} ${player.lastName}`}
          sport={player.sport}
          throws={player.throws}
          bats={player.bats}
          isPickup
        />

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{player.sport}</Badge>
              {player.position ? <Badge variant="outline">{player.position}</Badge> : null}
              <Badge variant="outline">Pickup listing</Badge>
            </div>
            <CardTitle className="text-xl">
              {player.firstName} {player.lastName}
            </CardTitle>
            <CardDescription>
              Listed by {player.coach.name}
              {player.zipCode ? ` · Zip ${player.zipCode}` : ""}
              {distanceLabel ? ` · ${distanceLabel}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <span className="text-muted-foreground">Born:</span>{" "}
              {formatBirthDate(player.dateOfBirth)}
            </p>
            {player.availabilityNotes ? (
              <p className="text-muted-foreground">{player.availabilityNotes}</p>
            ) : null}
            {player.notes ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{player.notes}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {alreadyInterested ? (
                <Badge variant="secondary">Interest sent to listing coach</Badge>
              ) : (
                <form action={expressInterest}>
                  <Button type="submit" size="sm">
                    I&apos;m interested
                  </Button>
                </form>
              )}
              {player.zipCode ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="size-3.5" />
                  {player.zipCode}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
