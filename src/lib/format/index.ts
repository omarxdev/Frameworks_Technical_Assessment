import { DEFAULT_CURRENCY, FIXTURE_CLOCK_DATE } from "@/lib/constants";

const PLACEHOLDER = "—";

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const momentFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const moneyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const parse = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDay = (value?: string | null) => {
  const parsed = parse(value);
  if (!parsed) return value || PLACEHOLDER;
  return dayFormatter.format(parsed);
};

export const formatMoment = (value?: string | null) => {
  const parsed = parse(value);
  if (!parsed) return value || PLACEHOLDER;
  return momentFormatter.format(parsed);
};

export const formatWeekday = (value?: string | null) => {
  const parsed = parse(value);
  if (!parsed) return value || PLACEHOLDER;
  return weekdayFormatter.format(parsed);
};

export const formatTime = (value?: string | null) => {
  const parsed = parse(value);
  if (!parsed) return value || PLACEHOLDER;
  return timeFormatter.format(parsed);
};

export const formatDateRange = (start?: string | null, end?: string | null) =>
  `${formatDay(start)} – ${formatDay(end)}`;

export const formatMoney = (
  amount?: number | null,
  currency: string = DEFAULT_CURRENCY
) => {
  if (amount === null || amount === undefined) return "Price on request";
  if (currency === DEFAULT_CURRENCY) return moneyFormatter.format(amount);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const humaniseKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (character) => character.toUpperCase());

export const pluralise = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;

export const daysBetween = (start: string, end: string) => {
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
};

export const toIsoFromLocalInput = (value: string) => {
  if (!value) return "";
  return value.length === 16 ? `${value}:00Z` : `${value}Z`;
};

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const utcDayKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
};

export const CLOCK_DAY_KEY = utcDayKey(FIXTURE_CLOCK_DATE);

export const isToday = (iso: string) => utcDayKey(iso) === CLOCK_DAY_KEY;

export const isUpcoming = (iso: string) => utcDayKey(iso) > CLOCK_DAY_KEY;

export const formatJobWindow = (start: string, end: string) =>
  utcDayKey(start) === utcDayKey(end)
    ? `${formatWeekday(start)} · ${formatTime(start)}–${formatTime(end)}`
    : `${formatWeekday(start)} ${formatTime(start)} → ${formatWeekday(end)} ${formatTime(end)}`;
