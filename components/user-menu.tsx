"use client";

import Link from "next/link";

import { logoutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
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

export function UserMenu({ user }: UserMenuProps) {
  return (
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
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>Settings</DropdownMenuItem>
        <DropdownMenuItem
          render={
            <button
              type="submit"
              form="coach-logout-form"
              className="w-full cursor-default text-left"
            />
          }
        >
          Sign out
        </DropdownMenuItem>
        <form id="coach-logout-form" action={logoutAction} className="hidden" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
