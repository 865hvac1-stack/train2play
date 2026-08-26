import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { prisma } from "@/lib/db";
import { isAthleteRole, isLibraryEditor, isPlatformAdmin } from "@/lib/roles";
import { requireCoach } from "@/lib/session";

export async function DashboardShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const user = await requireCoach();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true },
  });

  const displayUser = dbUser ?? user;

  return (
    <>
      <AppHeader
        user={displayUser}
        title={title}
        description={description}
        action={action}
        navVariant={isLibraryEditor(user.role) ? "trainer" : "coach"}
        isPlatformAdmin={isPlatformAdmin(user.role)}
      />
      <main className="safe-area-px min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </>
  );
}

export async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (isAthleteRole(session.user.role)) {
    redirect("/athlete");
  }

  await requireCoach();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true, role: true },
  });

  if (!user?.onboardingCompletedAt && !isLibraryEditor(user?.role)) {
    redirect("/onboarding");
  }

  const navVariant = isLibraryEditor(user?.role) ? "trainer" : "coach";

  return (
    <div className="t2p-portal-bg flex min-h-full min-w-0 overflow-x-hidden">
      <AppSidebar variant={navVariant} admin={isPlatformAdmin(user?.role)} />
      <div className="flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
