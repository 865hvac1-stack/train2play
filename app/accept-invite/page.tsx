import { AcceptInviteForm, AcceptInvitePageShell } from "@/components/accept-invite-form";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AcceptInvitePageShell>
      <AcceptInviteForm token={token ?? ""} />
    </AcceptInvitePageShell>
  );
}
