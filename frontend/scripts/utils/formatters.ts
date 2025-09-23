import { calculateDurationMinutes } from "./time.js";

export function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const date = new Date(value as number);
  if (Number.isNaN(date.getTime())) return String(value);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return date.toLocaleString(undefined, options);
}

export function formatDuration(start?: number | null, end?: number | null): string {
  const durationMinutes = Math.round(calculateDurationMinutes(start, end));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatHours(hours: unknown): string {
  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return "0h 00m";
  }
  const totalMinutes = Math.round(hours * 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${totalHours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatCurrency(value: unknown): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `$${value.toFixed(2)}`;
  }
}

export function formatDecimalHours(hours: unknown): string {
  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return "0.0h";
  }
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded.toFixed(1)}h`;
}

export function formatTimeRange(start?: number | null, end?: number | null): string {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const startText =
    startDate && !Number.isNaN(startDate.getTime())
      ? startDate.toLocaleTimeString(undefined, options)
      : "—";
  const endText =
    endDate && !Number.isNaN(endDate.getTime())
      ? endDate.toLocaleTimeString(undefined, options)
      : "Now";
  return `${startText} – ${endText}`;
}

export function getReportWindow(range: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let end: Date;

  switch (range) {
    case "monthly": {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      break;
    }
    case "yearly": {
      start.setMonth(0, 1);
      end = new Date(start.getFullYear() + 1, 0, 1);
      break;
    }
    case "weekly":
    default: {
      const weekday = start.getDay();
      start.setDate(start.getDate() - weekday);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      break;
    }
  }

  end.setHours(0, 0, 0, 0);
  return { start, end };
}

export function formatReportRangeLabel(start: Date, end: Date): string {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return "—";
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) return "—";

  const inclusiveEnd = new Date(end.getTime() - 1);
  const startOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const endOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

  if (start.getFullYear() !== inclusiveEnd.getFullYear()) {
    startOptions.year = "numeric";
  }

  const startText = start.toLocaleDateString(undefined, startOptions);
  const endText = inclusiveEnd.toLocaleDateString(undefined, endOptions);
  return `${startText} – ${endText}`;
}

export function filterEntriesByRange<T extends { start?: number | null }>(
  entries: T[],
  start: Date,
  end: Date
): T[] {
  if (!Array.isArray(entries)) return [];
  const startTime = start instanceof Date ? start.getTime() : 0;
  const endTime = end instanceof Date ? end.getTime() : 0;

  return entries.filter((entry) => {
    if (!entry || !entry.start) return false;
    const entryDate = new Date(entry.start);
    if (Number.isNaN(entryDate.getTime())) return false;
    const timestamp = entryDate.getTime();
    return timestamp >= startTime && timestamp < endTime;
  });
}

export interface DailyBreakdownBucket {
  date: Date;
  minutes: number;
  sessions: number;
}

export function buildDailyBreakdown<T extends { start?: number | null; end?: number | null; durationMinutes?: number }>(
  entries: T[],
  start: Date,
  end: Date
): DailyBreakdownBucket[] {
  const buckets: DailyBreakdownBucket[] = [];
  const startTime = start instanceof Date ? start.getTime() : Date.now();
  const endTime = end instanceof Date ? end.getTime() : startTime;
  const totalDays = Math.max(1, Math.round((endTime - startTime) / 86400000));
  const daysToRender = Math.min(7, totalDays);
  const offset = Math.max(0, totalDays - daysToRender);

  for (let index = 0; index < daysToRender; index += 1) {
    const dayStart = new Date(startTime + (offset + index) * 86400000);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    let minutes = 0;
    let sessionCount = 0;

    entries.forEach((entry) => {
      if (!entry || !entry.start) return;
      const entryDate = new Date(entry.start);
      if (Number.isNaN(entryDate.getTime())) return;
      const timestamp = entryDate.getTime();
      if (timestamp >= dayStart.getTime() && timestamp < dayEnd.getTime()) {
        const duration =
          typeof entry.durationMinutes === "number"
            ? entry.durationMinutes
            : calculateDurationMinutes(entry.start, entry.end);
        minutes += Number.isFinite(duration) ? duration : 0;
        sessionCount += 1;
      }
    });

    buckets.push({ date: dayStart, minutes, sessions: sessionCount });
  }

  return buckets;
}
