"use client";

import { useTransition } from "react";

import {
  approveConnectionRequestAction,
  declineConnectionRequestAction,
} from "@/app/(dashboard)/connections/actions";
import { Button } from "@/components/ui/button";

export type ConnectionRequestItem = {
  id: string;
  firstName: string;
  lastName: string;
  sport: string | null;
  requestedAt: Date;
};

export function CoachConnectionRequests({
  requests,
}: {
  requests: ConnectionRequestItem[];
}) {
  if (requests.length === 0) return null;

  return (
    <section className="rounded-2xl border border-brand/25 bg-white/90 p-4 shadow-sm sm:p-5">
      <h2 className="font-heading text-lg font-bold text-slate-900">
        Connection requests
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Athletes who entered your Train2Play code or requested you from Find a Coach.
        Approve to create the existing coaching relationship — training is still assigned separately.
      </p>
      <p className="mt-2">
        <a href="/dashboard/requests" className="text-sm font-semibold text-brand underline">
          Open Athlete requests
        </a>
      </p>
      <ul className="mt-4 space-y-3">
        {requests.map((req) => (
          <ConnectionRequestRow key={req.id} request={req} />
        ))}
      </ul>
    </section>
  );
}

function ConnectionRequestRow({ request }: { request: ConnectionRequestItem }) {
  const [pending, startTransition] = useTransition();
  const sport = request.sport || "Athlete";

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-900">
          {request.firstName} {request.lastName.charAt(0)}.
        </p>
        <p className="text-sm text-slate-600">
          {sport} · Requests to connect with you
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await approveConnectionRequestAction(request.id);
            });
          }}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await declineConnectionRequestAction(request.id);
            });
          }}
        >
          Decline
        </Button>
      </div>
    </li>
  );
}
