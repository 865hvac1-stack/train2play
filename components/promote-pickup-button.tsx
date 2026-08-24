import { Button } from "@/components/ui/button";
import { promotePickupToRosterAction } from "@/app/(dashboard)/pickup-players/actions";

export function PromotePickupButton({ athleteId }: { athleteId: string }) {
  const promote = promotePickupToRosterAction.bind(null, athleteId);

  return (
    <form action={promote}>
      <Button type="submit" variant="outline" size="sm">
        Add to roster
      </Button>
    </form>
  );
}
