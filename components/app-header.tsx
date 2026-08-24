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
};

export function AppHeader({ user, title, description, action }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:px-6 md:py-0 md:h-16">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <MobileNav />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg md:text-xl">
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
