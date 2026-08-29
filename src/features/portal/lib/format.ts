import { DEFAULT_CURRENCY } from "@/lib/constants";

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dayTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const moneyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  maximumFractionDigits: 0,
});

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return dayFormatter.format(parsed);
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return dayTimeFormatter.format(parsed);
};

export const formatDateRange = (start: string, end: string) =>
  `${formatDate(start)} – ${formatDate(end)}`;

export const formatMoney = (amount?: number | null) =>
  amount === null || amount === undefined ? "—" : moneyFormatter.format(amount);

export const humaniseKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (character) => character.toUpperCase());

export const daysBetween = (start: string, end: string) => {
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
};

export const toInputDate = (value: string) => value.slice(0, 10);
