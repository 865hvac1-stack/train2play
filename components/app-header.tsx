import { MobileNav } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";

type AppHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
  title: string;
  description?: string;
  action?: React.ReactNode;
  navVariant?: "coach" | "trainer";
  isPlatformAdmin?: boolean;
};

export function AppHeader({
  user,
  title,
  description,
  action,
  navVariant = "coach",
  isPlatformAdmin = false,
}: AppHeaderProps) {
  return (
    <header className="safe-area-pt sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="safe-area-px flex min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:px-6 md:py-0 md:h-16">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <MobileNav variant={navVariant} admin={isPlatformAdmin} />
          <div className="min-w-0">
            <h1 className="font-heading truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl md:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="hidden truncate text-sm text-slate-500 sm:block">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
          {action ? (
            <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
              {action}
            </div>
          ) : null}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
