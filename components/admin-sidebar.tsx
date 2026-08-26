"use client";

import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  Gauge,
  Menu,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  Volleyball,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Command center", icon: Gauge, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/directors", label: "Directors", icon: ShieldCheck },
  { href: "/admin/sports", label: "Sports", icon: Volleyball },
  { href: "/admin/content", label: "Content", icon: BookOpen },
  { href: "/admin/metrics", label: "Metrics", icon: Trophy },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
] as const;

function AdminLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-brand text-black shadow-[0_8px_24px_-16px_rgba(255,102,0,0.9)]"
                : "text-zinc-300 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminBrand() {
  return (
    <div>
      <BrandLogo variant="dark" subtitle="Platform command center" />
      <p className="mt-4 text-[10px] font-bold tracking-[0.2em] text-brand uppercase">
        Platform Admin
      </p>
    </div>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-zinc-950 md:flex md:flex-col">
      <div className="border-b border-white/10 p-6">
        <AdminBrand />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <AdminLinks />
        <div className="mt-6 border-t border-white/10 pt-5">
          <Link
            href="/admin/search"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-400 transition hover:bg-white/8 hover:text-white"
          >
            <Search className="size-4" />
            Global search
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 p-5 text-xs text-zinc-500">
        Train · Track · Develop · Perform
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
            <span className="sr-only">Open admin menu</span>
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="w-72 border-white/10 bg-zinc-950 p-0 text-white"
      >
        <SheetHeader className="border-b border-white/10 p-6">
          <SheetTitle>
            <AdminBrand />
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <AdminLinks />
        </div>
      </SheetContent>
    </Sheet>
  );
}
