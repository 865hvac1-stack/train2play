import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PickupPlayerForm } from "@/components/pickup-player-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPickupPlayerPage() {
  return (
    <DashboardShell
      title="Add pickup player"
      description="Guest players for tryouts and scrimmages — log velo now and compare to system averages instantly."
      action={
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/pickup-players">
              <ArrowLeft className="size-4" />
              Back to pickup list
            </Link>
          }
        />
      }
    >
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Quick player card</CardTitle>
          <CardDescription>
            Pickup players live here until you promote them to your full roster. Their stats still
            count toward system-wide averages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PickupPlayerForm />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
