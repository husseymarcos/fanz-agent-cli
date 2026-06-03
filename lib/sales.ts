export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((key) => csvCell(row[key])).join(","));
  return [headers.join(","), ...lines].join("\n");
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/["",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
