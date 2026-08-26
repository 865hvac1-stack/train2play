import Link from "next/link";

import { createOrganizationAction } from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewOrganizationPage() {
  return (
    <AdminShell
      title="Add organization"
      description="Create a Train2Play organization without inventing activity."
    >
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/admin/organizations">← Back to organizations</Link>}
      />
      <form
        action={createOrganizationAction}
        className="mt-4 max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Organization name</Label>
          <Input id="name" name="name" required placeholder="NexGen Athletics" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL slug (optional)</Label>
          <Input id="slug" name="slug" placeholder="nexgen-athletics" />
          <p className="text-xs text-slate-500">
            Leave blank to generate it from the organization name.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary color (optional)</Label>
          <Input id="primaryColor" name="primaryColor" placeholder="#ff6b00" />
        </div>
        <Button type="submit">Create organization</Button>
      </form>
    </AdminShell>
  );
}
