import { DashboardShell } from "@/components/dashboard-shell";
import {
  PasswordSettingsForm,
  ProfileSettingsForm,
} from "@/components/settings-forms";
import { PickupAlertSettingsForm } from "@/components/pickup-alert-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isEmailConfigured } from "@/lib/settings";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });

  const emailEnabled = isEmailConfigured();

  return (
    <DashboardShell
      title="Settings"
      description="Manage your coach account and preferences."
    >
      <div className="mx-auto grid max-w-3xl gap-6">
        <ProfileSettingsForm defaultName={user.name} email={user.email} />
        <PickupAlertSettingsForm
          defaults={{
            zipCode: user.zipCode ?? "",
            searchRadiusMiles: user.searchRadiusMiles,
            pickupAlertsEnabled: user.pickupAlertsEnabled,
            lookingForSport: user.lookingForSport ?? "",
            lookingForPositions: user.lookingForPositions ?? "",
            minThrowingVelo: user.minThrowingVelo?.toString() ?? "",
          }}
        />
        <PasswordSettingsForm />

        <Card>
          <CardHeader>
            <CardTitle>Email invites</CardTitle>
            <CardDescription>
              Send family share links automatically from the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailEnabled ? (
              <p className="text-sm text-emerald-700">
                Email sending is enabled. Use &ldquo;Send email&rdquo; on an
                athlete&apos;s family share link to deliver invites automatically.
              </p>
            ) : (
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  Email sending is not configured yet. Family links still work
                  via copy link or the mail app &ldquo;Email invite&rdquo; button.
                </p>
                <p>
                  To enable automated sends, add{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    RESEND_API_KEY
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    EMAIL_FROM
                  </code>{" "}
                  to your environment. Get a free key at{" "}
                  <a
                    href="https://resend.com"
                    className="font-medium text-emerald-700 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    resend.com
                  </a>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
