"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  acceptInviteAction,
} from "@/app/(dashboard)/athletes/invite-actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/lib/brand";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create password & start training"}
    </Button>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(acceptInviteAction, {});

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
          <CardDescription>
            This invite link is missing a token. Ask your coach to send a new
            invite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm font-medium text-primary">
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Join {brand.name}</CardTitle>
        <CardDescription>
          Create your own password. Your account will link to the athlete
          profile your coach set up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-2">
            <Label htmlFor="name">Display name (optional)</Label>
            <Input id="name" name="name" placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <SubmitButton />
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function AcceptInvitePageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-black px-4 py-12">
      <div aria-hidden className="t2p-hero-field absolute inset-0 opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black"
      />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <BrandLogo size="lg" variant="dark" subtitle={brand.tagline} />
        </Link>
        {children}
      </div>
    </div>
  );
}
