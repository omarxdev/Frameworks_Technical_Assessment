import { FIXTURE_CLOCK_DATE } from "@/lib/constants";

const utcDayKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
};

export const CLOCK_DAY_KEY = utcDayKey(FIXTURE_CLOCK_DATE);

export const isToday = (iso: string) => utcDayKey(iso) === CLOCK_DAY_KEY;

export const isUpcoming = (iso: string) => utcDayKey(iso) > CLOCK_DAY_KEY;

export const isOverdue = (iso: string) => utcDayKey(iso) < CLOCK_DAY_KEY;

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export const formatDateTime = (iso: string) =>
  `${formatDate(iso)} · ${formatTime(iso)}`;

export const formatWindow = (start: string, end: string) =>
  utcDayKey(start) === utcDayKey(end)
    ? `${formatDate(start)} · ${formatTime(start)}–${formatTime(end)}`
    : `${formatDateTime(start)} → ${formatDateTime(end)}`;

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
