import Link from "next/link";

import { createDirectorAction } from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";

export default async function NewDirectorPage() {
  const organizations = await prisma.organization.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return (
    <AdminShell
      title="Add director"
      description="Promote an existing account or create a Director account."
    >
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/admin/directors">← Back to Directors</Link>}
      />
      <form
        action={createDirectorAction}
        className="mt-4 max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Director name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
          <p className="text-xs text-slate-500">
            If this email already has an account, its role becomes Director. New
            accounts use Forgot Password to establish credentials.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationId">Organization (optional)</Label>
          <select
            id="organizationId"
            name="organizationId"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Platform-wide / assign later</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Create Director</Button>
      </form>
    </AdminShell>
  );
}
