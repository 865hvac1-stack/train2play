"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMetricDate, formatMetricValue } from "@/lib/progress";

type MetricPoint = {
  id: string;
  label: string;
  value: number;
  unit: string;
  recordedAt: Date;
};

type ProgressChartsProps = {
  metrics: MetricPoint[];
  tone?: "light" | "dark";
  showTitle?: boolean;
  heightClassName?: string;
};

function groupMetricsByLabel(metrics: MetricPoint[]) {
  const groups = new Map<string, MetricPoint[]>();

  for (const metric of metrics) {
    const key = `${metric.label}|${metric.unit}`;
    const existing = groups.get(key) ?? [];
    existing.push(metric);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([key, points]) => {
      const [label, unit] = key.split("|");
      return {
        label,
        unit,
        points: points.sort(
          (a, b) =>
            new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
        ),
      };
    })
    .filter((group) => group.points.length >= 2);
}

export function ProgressCharts({
  metrics,
  tone = "light",
  showTitle = true,
  heightClassName = "h-48",
}: ProgressChartsProps) {
  const chartGroups = groupMetricsByLabel(
    metrics.map((m) => ({
      ...m,
      recordedAt: new Date(m.recordedAt),
    })),
  );
  const dark = tone === "dark";

  if (chartGroups.length === 0) {
    if (dark) return null;
    return (
      <p className="text-sm text-slate-500">
        Log at least two entries for the same metric to see a progress chart.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {chartGroups.map((group) => {
        const data = group.points.map((point) => ({
          date: formatMetricDate(point.recordedAt),
          value: point.value,
          fullLabel: formatMetricValue(point.value, group.unit),
        }));

        const values = group.points.map((p) => p.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || 1;

        return (
          <div key={`${group.label}-${group.unit}`} className="space-y-2">
            {showTitle ? (
              <h4
                className={
                  dark
                    ? "text-sm font-semibold text-white"
                    : "text-sm font-semibold text-slate-900"
                }
              >
                {group.label}{" "}
                <span
                  className={
                    dark ? "font-normal text-zinc-500" : "font-normal text-slate-500"
                  }
                >
                  ({group.unit})
                </span>
              </h4>
            ) : null}
            <div
              className={
                dark
                  ? `${heightClassName} w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black p-2`
                  : `${heightClassName} w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-2`
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={dark ? "#27272a" : "#e2e8f0"}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: dark ? "#a1a1aa" : "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: dark ? "#3f3f46" : "#e2e8f0" }}
                  />
                  <YAxis
                    domain={[min - padding, max + padding]}
                    tick={{ fontSize: 11, fill: dark ? "#a1a1aa" : "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: dark ? "#3f3f46" : "#e2e8f0" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: dark ? "1px solid #3f3f46" : "1px solid #e2e8f0",
                      background: dark ? "#09090b" : "#ffffff",
                      color: dark ? "#fafafa" : "#0f172a",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [
                      formatMetricValue(Number(value), group.unit),
                      group.label,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#FF6600"
                    strokeWidth={2}
                    dot={{ fill: "#FF6600", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
