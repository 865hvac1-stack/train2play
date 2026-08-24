import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

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

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <AppHeader
        user={session.user}
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
