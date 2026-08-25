"use client";

import Link from "next/link";
import { MapPin, UserPlus } from "lucide-react";

import { expressInterestAction } from "@/app/(dashboard)/pickup-players/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/geocoding";
import type { NearbyPickupPlayer } from "@/lib/pickup-matching";

function PickupTypeBadge({ type }: { type: string | null }) {
  if (type === "LOOKING_FOR_TEAM") {
    return <Badge variant="secondary">Looking for team</Badge>;
  }
  return <Badge variant="outline">Guest player</Badge>;
}

function InterestButton({ playerId }: { playerId: string }) {
  const expressInterest = expressInterestAction.bind(null, playerId);

  return (
    <form action={expressInterest}>
      <Button type="submit" size="sm" variant="outline">
        I&apos;m interested
      </Button>
    </form>
  );
}

export function NearbyPickupFeed({
  players,
  needsZip,
}: {
  players: NearbyPickupPlayer[];
  needsZip: boolean;
}) {
  if (needsZip) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="text-muted-foreground mb-4 size-10" />
          <h2 className="text-lg font-medium">Add your zip code first</h2>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            Set your zip and search radius in Settings to see pickup players near you and
            receive email alerts.
          </p>
          <Button className="mt-6 " nativeButton={false} render={<Link href="/settings">Go to settings</Link>} />
        </CardContent>
      </Card>
    );
  }

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <UserPlus className="text-muted-foreground mb-4 size-10" />
          <h2 className="text-lg font-medium">No pickup players nearby yet</h2>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            When coaches add listed pickup players within your radius, they&apos;ll show up
            here and you&apos;ll get an email if alerts are on.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {players.map((player) => (
        <Card key={player.id} className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  <Link href={`/pickup-players/${player.id}`} className="hover:underline">
                    {player.firstName} {player.lastName}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {player.sport}
                  {player.position ? ` · ${player.position}` : ""}
                </CardDescription>
              </div>
              <PickupTypeBadge type={player.pickupType} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              Zip {player.zipCode} · {formatDistance(player.distanceMiles)}
            </p>
            <div className="flex flex-wrap gap-3">
              {player.throwingVelo ? (
                <span>
                  Throwing: <strong className="text-primary">{player.throwingVelo} mph</strong>
                </span>
              ) : null}
              {player.batSpeed ? (
                <span>
                  Bat: <strong className="text-primary">{player.batSpeed} mph</strong>
                </span>
              ) : null}
              {player.exitVelo ? (
                <span>
                  Exit: <strong className="text-primary">{player.exitVelo} mph</strong>
                </span>
              ) : null}
            </div>
            {player.availabilityNotes ? (
              <p className="text-muted-foreground">{player.availabilityNotes}</p>
            ) : null}
            <p className="text-muted-foreground text-xs">Listed by {player.coachName}</p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" nativeButton={false} render={<Link href={`/pickup-players/${player.id}`}>View profile</Link>} />
              {player.alreadyInterested ? (
                <Badge variant="secondary">Interest sent</Badge>
              ) : (
                <InterestButton playerId={player.id} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
