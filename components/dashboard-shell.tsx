import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { prisma } from "@/lib/db";

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
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  const user = dbUser ?? session.user;

  return (
    <>
      <AppHeader
        user={user}
        title={title}
        description={description}
        action={action}
      />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </>
  );
}

export async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full bg-slate-50">
      <AppSidebar />
      <div className="flex min-h-full flex-1 flex-col">{children}</div>
    </div>
  );
}
