import { AdminSidebar } from "@/components/admin-sidebar";
import { requirePlatformAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();
  return (
    <div className="flex min-h-full min-w-0 overflow-x-hidden bg-[#f6f7f9]">
      <AdminSidebar />
      <div className="flex min-h-full min-w-0 flex-1 flex-col overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
