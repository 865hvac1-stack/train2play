import Link from "next/link";
import { UsersRound } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCoach } from "@/lib/session";

export default async function TeamsPage() {
  await requireCoach();

  return (
    <DashboardShell
      title="Teams"
      description="Organization teams will live here — supporting athlete development, not replacing it."
    >
      <Card className="mx-auto max-w-xl border-dashed">
        <CardHeader>
          <UsersRound className="mb-2 size-8 text-brand" />
          <CardTitle className="font-heading text-2xl">Coming soon</CardTitle>
          <CardDescription>
            Team rosters and org structure are secondary to Train → Track → Develop →
            Perform. Athlete profiles stay the source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/athletes">Go to Athletes</Link>} />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
