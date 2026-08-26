"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AdminGrowthChart({
  data,
}: {
  data: {
    date: string;
    athletes: number;
    coaches: number;
    directors: number;
    organizations: number;
  }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm text-slate-500">
        Growth will appear as users and organizations join.
      </div>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="athletes" name="Athletes" fill="#ff6b00" radius={[4, 4, 0, 0]} />
          <Bar dataKey="coaches" name="Coaches" fill="#18181b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="directors" name="Directors" fill="#64748b" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="organizations"
            name="Organizations"
            fill="#fbbf24"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
