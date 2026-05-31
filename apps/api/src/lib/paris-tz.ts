const PARIS_TZ = "Europe/Paris";

export function parisDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ }).format(date);
}

function parisOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const localMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return localMs - date.getTime();
}

export function parisDayBounds(date: Date): [Date, Date] {
  const key = parisDateKey(date);
  const approxMid = new Date(`${key}T11:00:00Z`);
  const offsetMs = parisOffsetMs(approxMid);
  const start = new Date(new Date(`${key}T00:00:00Z`).getTime() - offsetMs);
  const end = new Date(start.getTime() + 24 * 3600_000 - 1);
  return [start, end];
}

export function parisMonth(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS_TZ,
      month: "numeric",
    }).format(date),
    10,
  );
}

export function parisYearBounds(year: number): [Date, Date] {
  const [from] = parisDayBounds(new Date(`${year}-01-01T12:00:00Z`));
  const [, to] = parisDayBounds(new Date(`${year}-12-31T12:00:00Z`));
  return [from, to];
}

export function parisMonthStart(date: Date): Date {
  const key = parisDateKey(date); // "YYYY-MM-DD"
  const firstOfMonth = key.slice(0, 8) + "01"; // "YYYY-MM-01"
  return parisDayBounds(new Date(`${firstOfMonth}T12:00:00Z`))[0];
}
