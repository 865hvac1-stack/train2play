"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  Dumbbell,
  Home,
  UserRound,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/athlete", label: "Home", icon: Home, exact: true },
  { href: "/athlete/train", label: "Train", icon: Dumbbell },
  { href: "/athlete/progress", label: "Progress", icon: ChartNoAxesCombined },
  { href: "/athlete/videos", label: "Videos", icon: Video },
  { href: "/athlete/profile", label: "Profile", icon: UserRound },
];

export function AthleteBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-area-pb fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 backdrop-blur-md md:hidden">
      <ul className="safe-area-px mx-auto grid max-w-lg grid-cols-5 gap-0 px-1 pt-1.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold tracking-wide uppercase",
                  active ? "text-brand" : "text-slate-400 hover:text-white",
                )}
              >
                <Icon className={cn("size-5", active && "text-brand")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AthleteDesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-zinc-950 md:flex md:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="font-heading text-lg font-bold tracking-wide text-white">
          Train2Play
        </p>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
          Athlete
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
