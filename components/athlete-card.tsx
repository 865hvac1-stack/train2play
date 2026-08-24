import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AthleteCardProps = {
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    sport: string;
    position: string | null;
    dateOfBirth: Date | null;
  };
};

function formatDate(date: Date | null) {
  if (!date) return "Birthday not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function AthleteCard({ athlete }: AthleteCardProps) {
  return (
    <Link href={`/athletes/${athlete.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {athlete.firstName} {athlete.lastName}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">{athlete.sport}</Badge>
                {athlete.position ? (
                  <span className="text-slate-500">{athlete.position}</span>
                ) : null}
              </CardDescription>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            {formatDate(athlete.dateOfBirth)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function EmptyAthletesState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>No athletes yet</CardTitle>
        <CardDescription>
          Add your first athlete to start building rosters and tracking progress.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/athletes/new"
          className="inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          Add your first athlete →
        </Link>
      </CardContent>
    </Card>
  );
}
