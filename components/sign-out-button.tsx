import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:bg-white/10 hover:text-white"
      >
        Sign out
      </Button>
    </form>
  );
}
