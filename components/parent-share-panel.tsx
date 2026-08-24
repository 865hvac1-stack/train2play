"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Trash2 } from "lucide-react";

import {
  createShareLinkAction,
  revokeShareLinkAction,
} from "@/app/(dashboard)/athletes/share-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ShareLink = {
  id: string;
  token: string;
  label: string | null;
  createdAt: Date;
  revokedAt: Date | null;
};

type ParentSharePanelProps = {
  athleteId: string;
  links: ShareLink[];
};

function buildShareUrl(token: string) {
  return `${window.location.origin}/view/${token}`;
}

export function ParentSharePanel({ athleteId, links }: ParentSharePanelProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeLinks = links.filter((link) => !link.revokedAt);

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(buildShareUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function handleCreate() {
    startTransition(async () => {
      const link = await createShareLinkAction(athleteId);
      await handleCopy(link.token);
    });
  }

  function handleRevoke(linkId: string) {
    startTransition(async () => {
      await revokeShareLinkAction(athleteId, linkId);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Family share link
        </CardTitle>
        <CardDescription>
          Generate a read-only link parents can use to view training progress —
          no account required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={pending}
          onClick={handleCreate}
        >
          {pending ? "Generating..." : "Generate new link"}
        </Button>

        {activeLinks.length > 0 ? (
          <ul className="space-y-3">
            {activeLinks.map((link) => (
              <li
                key={link.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium text-slate-900">
                  {link.label ?? "Family view"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {buildShareUrl(link.token)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(link.token)}
                  >
                    {copiedToken === link.token ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleRevoke(link.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No active links. Generate one to share with a parent or guardian.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
