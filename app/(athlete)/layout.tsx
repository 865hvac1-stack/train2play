import { AthleteShell } from "@/components/athlete-shell";
import { getAthleteContext } from "@/lib/athlete-dashboard";
import { requireAthlete } from "@/lib/session";

export default async function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAthlete();
  const ctx = await getAthleteContext();
  const firstName =
    ctx?.firstName ?? user.name?.split(" ")[0] ?? "Athlete";

  return <AthleteShell firstName={firstName}>{children}</AthleteShell>;
}
