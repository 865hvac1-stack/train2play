"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  UserPlus,
  Video,
  MapPin,
  UsersRound,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/athletes", label: "Athletes", icon: Users },
  { href: "/training", label: "Training", icon: ClipboardList },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/videos", label: "Videos", icon: Video },
  { href: "/reports", label: "Progress", icon: BarChart3 },
  { href: "/teams", label: "Teams", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const communityNav = [
  { href: "/pickup-players/nearby", label: "Players near me", icon: MapPin },
  { href: "/pickup-players", label: "Pickup players", icon: UserPlus },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
  dark,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
  dark?: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-brand text-white"
          : dark
            ? "text-slate-300 hover:bg-white/10 hover:text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function NavLinks({ onNavigate, dark }: { onNavigate?: () => void; dark?: boolean }) {
  const pathname = usePathname();
  const communityOpenDefault =
    pathname.startsWith("/pickup-players");
  const [communityOpen, setCommunityOpen] = useState(communityOpenDefault);

  return (
    <nav className="flex flex-col gap-1">
      {primaryNav.map((item) => (
        <NavLink key={item.href} {...item} onNavigate={onNavigate} dark={dark} />
      ))}

      <div className="pt-3">
        <button
          type="button"
          onClick={() => setCommunityOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-semibold tracking-[0.16em] uppercase",
            dark ? "text-slate-500 hover:text-slate-300" : "text-slate-400",
          )}
        >
          Community
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              communityOpen && "rotate-180",
            )}
          />
        </button>
        {communityOpen ? (
          <div className="mt-1 space-y-1 border-l border-white/10 pl-2 ml-2">
            {communityNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                onNavigate={onNavigate}
                dark={dark}
              />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-zinc-950 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <BrandLogo subtitle={brand.portalLabel} variant="dark" />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
          Coach portal
        </p>
        <NavLinks dark />
      </div>
      <div className="border-t border-white/10 p-4">
        <p className="px-3 text-xs text-slate-500">
          Train · Track · Develop · Perform
        </p>
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
      <SheetContent side="left" className="w-72 border-black/10 bg-black p-0 text-white">
        <SheetHeader className="border-b border-white/10 px-6 py-4">
          <SheetTitle>
            <BrandLogo variant="dark" subtitle={brand.portalLabel} />
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <NavLinks dark />
        </div>
      </SheetContent>
    </Sheet>
  );
}
