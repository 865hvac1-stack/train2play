import Link from "next/link";

import { logoutAction } from "@/app/(auth)/actions";
import { MobileNav } from "@/components/app-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
  title: string;
  description?: string;
  action?: React.ReactNode;
};

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return email?.slice(0, 2).toUpperCase() ?? "CO";
}

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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-brand-light text-primary">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
                    {user.name ?? user.email}
                  </span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <Link href="/settings" className="w-full">
                    Settings
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <form action={logoutAction}>
                    <button type="submit" className="w-full text-left">
                      Sign out
                    </button>
                  </form>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
