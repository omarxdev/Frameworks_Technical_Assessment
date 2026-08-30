export const FIXTURE_CLOCK = "2027-01-15T09:00:00Z";
export const FIXTURE_CLOCK_DATE = new Date(FIXTURE_CLOCK);
export const DEFAULT_CURRENCY = "GBP";

export const THEME_COLOR = "#214a2e";

export const PROTOTYPE_USER_PROFILES = [
  {
    id: "user-manager-01",
    name: "Morgan Reed",
    role: "manager",
    label: "Agency Manager (Morgan Reed)",
    badge: "Operations Lead",
    organisationId: null,
  },
  {
    id: "user-fitter-01",
    name: "Casey Morgan",
    role: "fitter",
    label: "Field Engineer / Fitter (Casey Morgan)",
    badge: "Field Tech",
    organisationId: null,
  },
  {
    id: "user-client-silverline",
    name: "Avery Stone",
    role: "client",
    label: "Silverline Fitness (Avery Stone)",
    badge: "0 Contracts (New)",
    organisationId: "org-silverline",
  },
  {
    id: "user-client-lighthouse",
    name: "Jordan Ellis",
    role: "client",
    label: "Lighthouse Learning (Jordan Ellis)",
    badge: "Issued Contract",
    organisationId: "org-lighthouse",
  },
  {
    id: "user-client-oaklegal",
    name: "Taylor Quinn",
    role: "client",
    label: "Oak Legal (Taylor Quinn)",
    badge: "Active Campaign",
    organisationId: "org-oak-legal",
  },
] as const;
