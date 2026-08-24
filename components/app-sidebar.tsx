"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Menu,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/athletes", label: "Athletes", icon: Users },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
          YT
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Youth Training</p>
          <p className="text-xs text-slate-500">Coach Portal</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <NavLinks />
        <div className="mt-auto rounded-lg bg-emerald-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-emerald-800">
            <Dumbbell className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Coming soon
            </span>
          </div>
          <p className="text-xs leading-relaxed text-emerald-700">
            Training plans and workout tracking are up next.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-slate-200 px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
              YT
            </div>
            Youth Training
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <NavLinks />
        </div>
      </SheetContent>
    </Sheet>
  );
}
