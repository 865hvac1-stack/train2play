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
} from "lucide-react";

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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/athletes", label: "Athletes", icon: Users },
  { href: "/pickup-players/nearby", label: "Players near me", icon: MapPin },
  { href: "/pickup-players", label: "Pickup players", icon: UserPlus },
  { href: "/training", label: "Training", icon: ClipboardList },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/videos", label: "Videos", icon: Video },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate, dark }: { onNavigate?: () => void; dark?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));

        return (
          <Link
            key={href}
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
      })}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-zinc-950 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <BrandLogo subtitle={brand.portalLabel} variant="dark" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
          Coach portal
        </p>
        <NavLinks dark />
      </div>
      <div className="border-t border-white/10 p-4">
        <p className="px-3 text-xs text-slate-500">{brand.tagline}</p>
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
            <BrandLogo variant="dark" />
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <NavLinks dark />
        </div>
      </SheetContent>
    </Sheet>
  );
}
