/**
 * Date Range interval calculations using half-open intervals [startDate, endDate).
 * Start date is inclusive, end date is exclusive.
 * All calendar comparisons are evaluated in UTC.
 */

export function parseDate(dateStr: string): Date {
  // If string is YYYY-MM-DD, parse as UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00Z`);
  }
  return new Date(dateStr);
}

export function isValidDateRange(startDateStr: string, endDateStr: string): boolean {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() < end.getTime();
}

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Checks if two half-open intervals [startA, endA) and [startB, endB) overlap.
 * Overlap condition: max(startA, startB) < min(endA, endB)
 */
export function hasHalfOpenOverlap(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  const sA = typeof startA === "string" ? parseDate(startA).getTime() : startA.getTime();
  const eA = typeof endA === "string" ? parseDate(endA).getTime() : endA.getTime();
  const sB = typeof startB === "string" ? parseDate(startB).getTime() : startB.getTime();
  const eB = typeof endB === "string" ? parseDate(endB).getTime() : endB.getTime();

  const maxStart = Math.max(sA, sB);
  const minEnd = Math.min(eA, eB);

  return maxStart < minEnd;
}
