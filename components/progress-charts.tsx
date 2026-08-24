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

export function ProgressCharts({ metrics }: ProgressChartsProps) {
  const chartGroups = groupMetricsByLabel(
    metrics.map((m) => ({
      ...m,
      recordedAt: new Date(m.recordedAt),
    })),
  );

  if (chartGroups.length === 0) {
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
            <h4 className="text-sm font-semibold text-slate-900">
              {group.label}{" "}
              <span className="font-normal text-slate-500">({group.unit})</span>
            </h4>
            <div className="h-48 w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    domain={[min - padding, max + padding]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
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
