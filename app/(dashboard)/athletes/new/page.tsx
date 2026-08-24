import Link from "next/link";

import { AthleteForm } from "@/components/athlete-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewAthletePage() {
  return (
    <DashboardShell
      title="Add athlete"
      description="Create a new athlete profile for your roster."
      action={
        <Button variant="outline" render={<Link href="/athletes">Cancel</Link>} />
      }
    >
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Athlete details</CardTitle>
          <CardDescription>
            Basic profile information. You can add training history later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AthleteForm />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
