"use client";

import { useActionState } from "react";

import {
  changeUserRoleAction,
  setUserActiveAction,
  type AdminAccountActionState,
} from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";

const initialState: AdminAccountActionState = {};

const ROLE_OPTIONS = [
  { value: "ATHLETE", label: "Athlete" },
  { value: "COACH", label: "Coach" },
  { value: "TRAINER", label: "Director" },
  { value: "PARENT", label: "Guardian" },
  { value: "STAFF", label: "Staff" },
  { value: "ORG_ADMIN", label: "Organization Admin" },
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
];

function ActionMessage({ state }: { state: AdminAccountActionState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-slate-700"
      >
        {state.success}
      </p>
    );
  }
  return null;
}

export function AdminRoleForm({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    changeUserRoleAction.bind(null, userId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <label
        htmlFor="admin-role"
        className="text-xs font-semibold text-slate-600"
      >
        Role
      </label>
      <select
        id="admin-role"
        name="role"
        defaultValue={currentRole}
        disabled={pending}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-60"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Saving..." : "Update role"}
      </Button>
      {isSelf ? (
        <p className="text-xs text-slate-500">
          This is your own account. Only another Platform Admin can change your
          role.
        </p>
      ) : null}
      <ActionMessage state={state} />
    </form>
  );
}

export function AdminActivationForm({
  userId,
  isActive,
  label,
}: {
  userId: string;
  isActive: boolean;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(
    setUserActiveAction.bind(null, userId, !isActive),
    initialState,
  );
  const verb = isActive ? "Deactivate" : "Activate";

  return (
    <form action={formAction} className="space-y-2">
      <Button
        type="submit"
        variant={isActive ? "outline" : "default"}
        className="w-full"
        disabled={pending}
      >
        {pending ? `${verb.slice(0, -1)}ing...` : `${verb} ${label ?? "account"}`}
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export function AdminAllowlistNote({
  email,
  envVar,
  roleLabel,
}: {
  email: string;
  envVar: string;
  roleLabel: string;
}) {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {email} is listed in <span className="font-semibold">{envVar}</span> on
      Railway, so this account is set back to {roleLabel} every time it signs in.
      Remove the email from that variable if you want a different role to stick.
    </p>
  );
}
