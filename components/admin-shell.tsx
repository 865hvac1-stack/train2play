import { UserMenu } from "@/components/user-menu";
import { AdminMobileNav } from "@/components/admin-sidebar";
import { requirePlatformAdmin } from "@/lib/session";

export async function AdminShell({
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
  const user = await requirePlatformAdmin();
  return (
    <>
      <header className="safe-area-pt sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="safe-area-px flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <AdminMobileNav />
            <div className="min-w-0">
              <h1 className="font-heading truncate text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="hidden truncate text-sm text-slate-500 sm:block">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {action}
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <main className="safe-area-px min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </>
  );
}
