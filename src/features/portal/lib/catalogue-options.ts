import { FIXTURE_CLOCK } from "@/lib/constants";
import type { CatalogueFilters } from "@/features/portal/lib/types";

export const FIXTURE_TODAY = FIXTURE_CLOCK.slice(0, 10);

export const DEFAULT_START_DATE = "2027-02-01";
export const DEFAULT_END_DATE = "2027-03-01";

export const ANY_VALUE = "any";

export const MEDIA_TYPE_OPTIONS = [
  { value: "vehicle", label: "Vehicle" },
  { value: "digital_screen", label: "Digital screen" },
  { value: "static_site", label: "Static site" },
];

export const LOCATION_OPTIONS = [
  { value: "loc-islandwide", label: "Islandwide routes" },
  { value: "loc-central-hub", label: "Central transport hub" },
  { value: "loc-east", label: "East district" },
  { value: "loc-west", label: "West district" },
];

export const DEFAULT_FILTERS: CatalogueFilters = {
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mediaType: "",
  locationId: "",
  maxMonthlyBudget: "",
};

export const filtersToSearchParams = (filters: CatalogueFilters) => {
  const params = new URLSearchParams();
  params.set("startDate", filters.startDate);
  params.set("endDate", filters.endDate);
  if (filters.mediaType) params.set("mediaType", filters.mediaType);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.maxMonthlyBudget) {
    params.set("maxMonthlyBudget", filters.maxMonthlyBudget);
  }
  return params;
};

export const readParam = (
  source: Record<string, string | string[] | undefined>,
  key: string
) => {
  const value = source[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export const filtersFromSearchParams = (
  source: Record<string, string | string[] | undefined>
): CatalogueFilters => ({
  startDate: readParam(source, "startDate") || DEFAULT_START_DATE,
  endDate: readParam(source, "endDate") || DEFAULT_END_DATE,
  mediaType: readParam(source, "mediaType"),
  locationId: readParam(source, "locationId"),
  maxMonthlyBudget: readParam(source, "maxMonthlyBudget"),
});

export const isValidRange = (startDate: string, endDate: string) =>
  Boolean(startDate) && Boolean(endDate) && startDate < endDate;
