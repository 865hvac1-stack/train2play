"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Library,
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
  { href: "/training", label: "Plans & workouts", icon: ClipboardList },
  { href: "/courses", label: "My courses", icon: BookOpen },
  { href: "/library", label: "Program library", icon: Library },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/videos", label: "Videos", icon: Video },
  { href: "/reports", label: "Progress", icon: BarChart3 },
  { href: "/teams", label: "Teams", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const trainerNav = [
  { href: "/trainer", label: "Program health", icon: LayoutDashboard, exact: true },
  { href: "/library", label: "Content library", icon: Library },
  { href: "/trainer/drills", label: "Suggested drills", icon: Dumbbell },
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
  exact,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
  dark?: boolean;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const pathOnly = href.split("?")[0]!;
  const isActive = exact
    ? pathname === pathOnly
    : pathname === pathOnly ||
      (pathOnly !== "/dashboard" && pathname.startsWith(pathOnly));

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

function NavLinks({
  onNavigate,
  dark,
  variant = "coach",
}: {
  onNavigate?: () => void;
  dark?: boolean;
  variant?: "coach" | "trainer";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const communityOpenDefault = pathname.startsWith("/pickup-players");
  const [communityOpen, setCommunityOpen] = useState(communityOpenDefault);

  if (variant === "trainer") {
    const sport = searchParams.get("sport");
    const directorNav = trainerNav.map((item) => ({
      ...item,
      href: sport
        ? `${item.href}?sport=${encodeURIComponent(sport)}`
        : item.href,
    }));
    return (
      <nav className="flex flex-col gap-1">
        {directorNav.map((item) => (
          <NavLink key={item.href} {...item} onNavigate={onNavigate} dark={dark} />
        ))}
      </nav>
    );
  }

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

export function AppSidebar({ variant = "coach" }: { variant?: "coach" | "trainer" }) {
  const director = variant === "trainer";
  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 border-r md:flex md:flex-col",
        director
          ? "border-orange-200 bg-orange-50/80"
          : "border-white/10 bg-zinc-950",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b px-6",
          director ? "border-orange-200" : "border-white/10",
        )}
      >
        <BrandLogo
          subtitle={director ? "Director command center" : brand.portalLabel}
          variant={director ? "light" : "dark"}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
          {variant === "trainer" ? "Director portal" : "Coach portal"}
        </p>
        <NavLinks dark={!director} variant={variant} />
      </div>
      <div
        className={cn(
          "border-t p-4",
          director ? "border-orange-200" : "border-white/10",
        )}
      >
        <p className="px-3 text-xs text-slate-500">
          Train · Track · Develop · Perform
        </p>
      </div>
    </aside>
  );
}

export function MobileNav({ variant = "coach" }: { variant?: "coach" | "trainer" }) {
  const director = variant === "trainer";
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
      <SheetContent
        side="left"
        className={cn(
          "w-72 p-0",
          director
            ? "border-orange-200 bg-orange-50 text-slate-950"
            : "border-black/10 bg-black text-white",
        )}
      >
        <SheetHeader
          className={cn(
            "border-b px-6 py-4",
            director ? "border-orange-200" : "border-white/10",
          )}
        >
          <SheetTitle>
            <BrandLogo
              variant={director ? "light" : "dark"}
              subtitle={director ? "Director command center" : brand.portalLabel}
            />
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <NavLinks dark={!director} variant={variant} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
