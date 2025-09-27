export function calculateDurationMinutes(start?: number | null, end?: number | null): number {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return 0;
  const endTime = endDate && !Number.isNaN(endDate.getTime()) ? endDate : new Date();
  const diff = Math.max(0, endTime.getTime() - startDate.getTime());
  return diff / 60000;
}
