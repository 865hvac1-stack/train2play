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
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div>
            <h1 className="text-lg font-semibold text-slate-900 md:text-xl">
              {title}
            </h1>
            {description ? (
              <p className="hidden text-sm text-slate-500 sm:block">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {action}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
