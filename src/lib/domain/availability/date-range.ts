export const parseDate = (dateStr: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00Z`);
  }
  return new Date(dateStr);
};

export const isValidDateRange = (startDateStr: string, endDateStr: string): boolean => {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  return (
    !isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() < end.getTime()
  );
};

export const calculateDaysBetween = (
  startDateStr: string,
  endDateStr: string
): number => {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

export const hasHalfOpenOverlap = (
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean => {
  const sA =
    typeof startA === "string" ? parseDate(startA).getTime() : startA.getTime();
  const eA = typeof endA === "string" ? parseDate(endA).getTime() : endA.getTime();
  const sB =
    typeof startB === "string" ? parseDate(startB).getTime() : startB.getTime();
  const eB = typeof endB === "string" ? parseDate(endB).getTime() : endB.getTime();

  const maxStart = Math.max(sA, sB);
  const minEnd = Math.min(eA, eB);

  return maxStart < minEnd;
};
