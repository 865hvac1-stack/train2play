import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMetricDate, formatMetricValue } from "@/lib/progress";
import {
  comparisonTone,
  formatComparisonDelta,
  type ProfileStatComparison,
} from "@/lib/player-profile";
import { cn } from "@/lib/utils";

type PlayerProfileStatsProps = {
  stats: ProfileStatComparison[];
  athleteName: string;
  sport: string;
  throws?: string | null;
  bats?: string | null;
  isPickup?: boolean;
};

function DeltaIcon({ tone }: { tone: ReturnType<typeof comparisonTone> }) {
  if (tone === "positive") return <TrendingUp className="size-4 text-primary" />;
  if (tone === "negative") return <TrendingDown className="size-4 text-amber-600" />;
  return <Minus className="size-4 text-slate-400" />;
}

export function PlayerProfileStats({
  stats,
  athleteName,
  sport,
  throws,
  bats,
  isPickup,
}: PlayerProfileStatsProps) {
  const hasAnyStat = stats.some((stat) => stat.value !== null);

  return (
    <Card className="overflow-hidden border-brand/20 bg-gradient-to-br from-brand-light/80 via-white to-white">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Player profile</CardTitle>
            <CardDescription className="mt-1">
              {athleteName} · {sport}
              {throws ? ` · Throws ${throws}` : ""}
              {bats ? ` · Bats ${bats}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {isPickup ? <Badge variant="outline">Pickup player</Badge> : null}
            <Badge variant="secondary">vs system average</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnyStat ? (
          <p className="text-muted-foreground text-sm">
            Log throwing velo, bat speed, or exit velo to see how this player stacks up against
            everyone in the system.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const tone = comparisonTone(stat.delta, stat.direction);
              const deltaLabel = formatComparisonDelta(
                stat.delta,
                stat.unit,
                stat.direction,
              );

              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {stat.shortLabel}
                  </p>
                  {stat.value !== null ? (
                    <>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {formatMetricValue(stat.value, stat.unit)}
                      </p>
                      {stat.systemAverage !== null ? (
                        <p className="text-muted-foreground mt-1 text-sm">
                          System avg{" "}
                          <span className="font-medium text-slate-700">
                            {formatMetricValue(stat.systemAverage, stat.unit)}
                          </span>
                          {stat.sampleSize > 0 ? (
                            <span className="text-muted-foreground"> · n={stat.sampleSize}</span>
                          ) : null}
                        </p>
                      ) : null}
                      {deltaLabel ? (
                        <div
                          className={cn(
                            "mt-3 flex items-center gap-1.5 text-sm font-medium",
                            tone === "positive" && "text-primary",
                            tone === "negative" && "text-amber-700",
                            tone === "neutral" && "text-slate-600",
                          )}
                        >
                          <DeltaIcon tone={tone} />
                          {deltaLabel}
                        </div>
                      ) : null}
                      {stat.percentile !== null ? (
                        <p className="text-muted-foreground mt-2 text-xs">
                          {stat.percentile}th percentile in the system
                        </p>
                      ) : null}
                      {stat.recordedAt ? (
                        <p className="text-muted-foreground mt-2 text-xs">
                          Last logged {formatMetricDate(stat.recordedAt)}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm">Not logged yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
