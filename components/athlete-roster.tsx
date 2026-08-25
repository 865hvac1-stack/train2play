"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AthleteCard, EmptyAthletesState } from "@/components/athlete-card";
import { Input } from "@/components/ui/input";

type Athlete = {
  id: string;
  firstName: string;
  lastName: string;
  sport: string;
  position: string | null;
  dateOfBirth: Date | string | null;
  activeProgram?: string | null;
  completionPercent?: number | null;
  lastWorkoutTitle?: string | null;
  lastActivityAt?: Date | string | null;
};

type AthleteRosterProps = {
  athletes: Athlete[];
};

export function AthleteRoster({ athletes }: AthleteRosterProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return athletes;

    return athletes.filter((athlete) => {
      const haystack = [
        athlete.firstName,
        athlete.lastName,
        athlete.sport,
        athlete.position ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [athletes, query]);

  if (athletes.length === 0) {
    return <EmptyAthletesState />;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, sport, or position..."
          className="pl-9"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              athlete={{
                ...athlete,
                dateOfBirth: athlete.dateOfBirth
                  ? new Date(athlete.dateOfBirth)
                  : null,
                lastActivityAt: athlete.lastActivityAt
                  ? new Date(athlete.lastActivityAt)
                  : null,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No athletes match &ldquo;{query}&rdquo;. Try a different search.
        </p>
      )}
    </div>
  );
}
