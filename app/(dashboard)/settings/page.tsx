import { InstallTrain2Play } from "@/components/install-train2play";
import { CoachConnectionCodePanel } from "@/components/coach-connection-code-panel";
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
import {
  connectionCodePath,
  ensureCoachConnectionCode,
} from "@/lib/coach-connections";
import { isEmailConfigured } from "@/lib/settings";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isCoachPortalRole } from "@/lib/roles";

export default async function SettingsPage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });

  const emailEnabled = isEmailConfigured();
  const showCoachCode = isCoachPortalRole(user.role);
  const codeInfo = showCoachCode
    ? await ensureCoachConnectionCode(user.id)
    : null;

  return (
    <DashboardShell
      title="Settings"
      description="Manage your coach account and preferences."
    >
      <div className="mx-auto grid max-w-3xl gap-6">
        {codeInfo ? (
          <Card>
            <CardHeader>
              <CardTitle>My Train2Play code</CardTitle>
              <CardDescription>
                Share this code so athletes can request to connect with you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoachConnectionCodePanel
                code={codeInfo.code}
                connectPath={connectionCodePath(codeInfo.code)}
              />
            </CardContent>
          </Card>
        ) : null}

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
        <InstallTrain2Play variant="settings" tone="light" />

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
              <p className="text-sm text-primary">
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
                    className="font-medium text-primary hover:underline"
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
