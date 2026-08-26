"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";

export type CatalogRecipientAthlete = {
  id: string;
  name: string;
  sports: string[];
};

export function CatalogDrillAudienceFields({
  sport,
  athletes,
  defaultShareWithCoaches = true,
  defaultAthleteAudience = "ALL_SPORT",
  defaultAthleteProfileIds = [],
}: {
  sport: string;
  athletes: CatalogRecipientAthlete[];
  defaultShareWithCoaches?: boolean;
  defaultAthleteAudience?: string;
  defaultAthleteProfileIds?: string[];
}) {
  const normalizedAudience = ["NONE", "ALL_SPORT", "SELECTED"].includes(
    defaultAthleteAudience,
  )
    ? defaultAthleteAudience
    : "ALL_SPORT";
  const [athleteAudience, setAthleteAudience] = useState(normalizedAudience);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    defaultAthleteProfileIds,
  );
  const eligibleAthletes = athletes.filter((athlete) =>
    athlete.sports.some(
      (athleteSport) =>
        athleteSport.toLocaleLowerCase() === sport.toLocaleLowerCase(),
    ),
  );

  return (
    <fieldset className="space-y-3 rounded-xl border border-brand/20 bg-orange-50/50 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-900">
        Push this drill to
      </legend>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="shareWithCoaches"
          defaultChecked={defaultShareWithCoaches}
          className="size-4"
        />
        All coaches set up under {sport}
      </label>

      <div className="space-y-2 border-t border-orange-200 pt-3">
        <Label>Players</Label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="athleteAudience"
            value="ALL_SPORT"
            checked={athleteAudience === "ALL_SPORT"}
            onChange={() => setAthleteAudience("ALL_SPORT")}
          />
          Everyone signed up under {sport}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="athleteAudience"
            value="SELECTED"
            checked={athleteAudience === "SELECTED"}
            onChange={() => setAthleteAudience("SELECTED")}
          />
          Only selected players
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="athleteAudience"
            value="NONE"
            checked={athleteAudience === "NONE"}
            onChange={() => setAthleteAudience("NONE")}
          />
          No players yet
          <span className="text-xs text-slate-500">
            — save as a draft for coaches only
          </span>
        </label>
      </div>

      {athleteAudience === "SELECTED" ? (
        <>
          <p className="text-xs font-medium text-slate-600">
            {selectedIds.length} of {eligibleAthletes.length} selected
          </p>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-orange-200 bg-white p-2">
            {eligibleAthletes.length > 0 ? (
              eligibleAthletes.map((athlete) => (
                <label
                  key={athlete.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-orange-50"
                >
                  <input
                    type="checkbox"
                    name="athleteProfileIds"
                    value={athlete.id}
                    checked={selectedIds.includes(athlete.id)}
                    onChange={(event) => {
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, athlete.id]
                          : current.filter((id) => id !== athlete.id),
                      );
                    }}
                    className="size-4"
                  />
                  {athlete.name}
                </label>
              ))
            ) : (
              <p className="p-2 text-xs text-slate-500">
                No players have {sport} on their profile yet.
              </p>
            )}
          </div>
        </>
      ) : null}

      <p className="text-xs text-slate-500">
        {athleteAudience === "NONE"
          ? "Saving keeps this off player home screens until you pick an audience."
          : "Saving sends the drill to this audience right away."}
      </p>
    </fieldset>
  );
}
