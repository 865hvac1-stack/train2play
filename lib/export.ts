export function escapeCsv(value: string | number | null | undefined) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function csvResponse(filename: string, content: string) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function formatCsvDate(date: Date | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function completionRate(completed: number, total: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
