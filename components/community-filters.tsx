export function CommunityFilters({
  sports,
  primarySport,
  selectedSport,
  myAgeGroup,
  selectedAgeGroup,
  organizations,
  selectedOrganizationId,
  locationState,
  selectedState,
}: {
  sports: string[];
  primarySport: string;
  selectedSport: string | null;
  myAgeGroup: string | null;
  selectedAgeGroup: string | null;
  organizations: { id: string; name: string }[];
  selectedOrganizationId: string | null;
  locationState: string | null;
  selectedState: string | null;
}) {
  const showAge = Boolean(myAgeGroup);
  const showOrg = organizations.length > 0;
  const showState = Boolean(locationState);
  const sportValue = selectedSport ?? "all";
  const ageValue = selectedAgeGroup ?? "all";

  return (
    <form
      method="get"
      action="/athlete/community"
      className="rounded-2xl border border-white/10 bg-zinc-900 p-3 sm:p-4"
    >
      <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase">
        Your cohort
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block min-w-0">
          <span className="mb-1 block text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
            Sport
          </span>
          <select
            name="sport"
            defaultValue={sportValue}
            className="h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-sm text-white"
          >
            {sports.map((sport) => (
              <option key={sport} value={sport}>
                {sport === primarySport ? `My sport (${sport})` : sport}
              </option>
            ))}
            <option value="all">All eligible sports</option>
          </select>
        </label>
        {showAge ? (
          <label className="block min-w-0">
            <span className="mb-1 block text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              Age group
            </span>
            <select
              name="ageGroup"
              defaultValue={ageValue}
              className="h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-sm text-white"
            >
              <option value={myAgeGroup!}>My age group ({myAgeGroup})</option>
              <option value="all">All eligible</option>
            </select>
          </label>
        ) : null}
        {showOrg ? (
          <label className="block min-w-0">
            <span className="mb-1 block text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              Organization
            </span>
            <select
              name="organizationId"
              defaultValue={selectedOrganizationId ?? "all"}
              className="h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-sm text-white"
            >
              <option value="all">All eligible</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showState ? (
          <label className="block min-w-0">
            <span className="mb-1 block text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              State
            </span>
            <select
              name="state"
              defaultValue={selectedState ?? "all"}
              className="h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-sm text-white"
            >
              <option value="all">All eligible</option>
              <option value={locationState!}>My state ({locationState})</option>
            </select>
          </label>
        ) : null}
      </div>
      <button
        type="submit"
        className="mt-3 inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-black"
      >
        Apply
      </button>
    </form>
  );
}
