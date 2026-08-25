"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Mail, Trash2 } from "lucide-react";

import {
  createShareLinkAction,
  revokeShareLinkAction,
} from "@/app/(dashboard)/athletes/share-actions";
import { sendShareInviteEmailAction } from "@/app/(dashboard)/settings/actions";
import { buildShareInviteMailto, formatShareLinkExpiry } from "@/lib/share";
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

type ShareLink = {
  id: string;
  token: string;
  label: string | null;
  parentEmail: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
};

type ParentSharePanelProps = {
  athleteId: string;
  athleteName: string;
  coachName: string;
  emailEnabled: boolean;
  links: ShareLink[];
};

function buildShareUrl(token: string) {
  return `${window.location.origin}/view/${token}`;
}

export function ParentSharePanel({
  athleteId,
  athleteName,
  coachName,
  emailEnabled,
  links,
}: ParentSharePanelProps) {
  const [parentEmail, setParentEmail] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeLinks = links.filter((link) => !link.revokedAt);

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(buildShareUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function handleCreate() {
    startTransition(async () => {
      const link = await createShareLinkAction(
        athleteId,
        parentEmail || undefined,
      );
      await handleCopy(link.token);
      setParentEmail("");
    });
  }

  function handleRevoke(linkId: string) {
    startTransition(async () => {
      await revokeShareLinkAction(athleteId, linkId);
    });
  }

  function handleSendEmail(linkId: string) {
    startTransition(async () => {
      const result = await sendShareInviteEmailAction(athleteId, linkId);
      setEmailFeedback(result.success ?? result.error ?? null);
      setTimeout(() => setEmailFeedback(null), 4000);
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
          Generate a read-only link for parents. Links expire after 90 days. Optionally add
          their email to send an invite from your mail app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="parentEmail">Parent email (optional)</Label>
          <Input
            id="parentEmail"
            type="email"
            value={parentEmail}
            onChange={(event) => setParentEmail(event.target.value)}
            placeholder="parent@example.com"
          />
        </div>

        <Button
          type="button"
          className="w-full "
          disabled={pending}
          onClick={handleCreate}
        >
          {pending ? "Generating..." : "Generate new link"}
        </Button>

        {emailFeedback ? (
          <p className="text-sm text-slate-600">{emailFeedback}</p>
        ) : null}

        {activeLinks.length > 0 ? (
          <ul className="space-y-3">
            {activeLinks.map((link) => {
              const shareUrl = buildShareUrl(link.token);
              const mailto =
                link.parentEmail &&
                buildShareInviteMailto({
                  parentEmail: link.parentEmail,
                  athleteName,
                  shareUrl,
                  coachName,
                });

              return (
                <li
                  key={link.id}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <p className="font-medium text-slate-900">
                    {link.label ?? "Family view"}
                  </p>
                  {link.parentEmail ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {link.parentEmail}
                    </p>
                  ) : null}
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {shareUrl}
                  </p>
                  {link.expiresAt ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Expires {formatShareLinkExpiry(link.expiresAt)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
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
                    {mailto ? (
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a href={mailto}>
                            <Mail className="h-3.5 w-3.5" />
                            Email invite
                          </a>
                        }
                      />
                    ) : null}
                    {emailEnabled && link.parentEmail ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleSendEmail(link.id)}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Send email
                      </Button>
                    ) : null}
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
              );
            })}
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
