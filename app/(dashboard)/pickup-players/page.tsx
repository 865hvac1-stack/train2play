import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMetricValue } from "@/lib/progress";
import { getLatestMetricForLabel } from "@/lib/player-profile";
import { getPickupPlayersForCoach } from "@/lib/player-profile-server";
import { requireUser } from "@/lib/session";

export default async function PickupPlayersPage() {
  const user = await requireUser();
  const pickupPlayers = await getPickupPlayersForCoach(user.id);

  return (
    <DashboardShell
      title="Pickup players"
      description="Quick-add guest players for tryouts, scrimmages, and showcases — with velo compared to system averages."
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/pickup-players/nearby">Players near me</Link>} />
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
      {pickupPlayers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserPlus className="text-muted-foreground mb-4 size-12" />
            <h2 className="text-lg font-medium">No pickup players yet</h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Add a guest player in seconds — name, position, and velo numbers. Their profile
              compares against everyone logged in the system.
            </p>
            <Button
              className="mt-6 "
              nativeButton={false}
              render={<Link href="/pickup-players/new">Add pickup player</Link>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pickupPlayers.map((player) => {
            const throwing = getLatestMetricForLabel(player.progressMetrics, "Throwing velo");
            const batSpeed = getLatestMetricForLabel(player.progressMetrics, "Bat speed");

            return (
              <Link key={player.id} href={`/athletes/${player.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {player.firstName} {player.lastName}
                      </CardTitle>
                      <Badge variant="outline">Pickup</Badge>
                    </div>
                    <CardDescription>
                      {player.sport}
                      {player.position ? ` · ${player.position}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {throwing ? (
                      <p>
                        Throwing:{" "}
                        <span className="font-medium text-primary">
                          {formatMetricValue(throwing.value, throwing.unit)}
                        </span>
                      </p>
                    ) : null}
                    {batSpeed ? (
                      <p>
                        Bat speed:{" "}
                        <span className="font-medium text-primary">
                          {formatMetricValue(batSpeed.value, batSpeed.unit)}
                        </span>
                      </p>
                    ) : null}
                    {!throwing && !batSpeed ? (
                      <p className="text-muted-foreground">No velo logged yet</p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
