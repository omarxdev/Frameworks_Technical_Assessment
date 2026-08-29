# Shared UI build brief

Read this before writing any UI. It is the contract between the three surfaces.

## Stack (already installed, do not change)

- Next.js 16 App Router, React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first, tokens in `src/app/globals.css` — there is NO tailwind.config file)
- shadcn/ui (radix base, "nova" preset) in `src/components/ui/`
- TanStack Query v5 for all server state (provider already mounted in root layout)
- Zustand + persist for client-only state
- `sonner` for toasts (`<Toaster />` already mounted in root layout)
- lucide-react for icons

## House rules (from the repo owner, non-negotiable)

- **Zero comments.** No inline, no block, no JSDoc.
- **`const` arrow functions only.** Never `function foo() {}`.
- **kebab-case filenames** (`product-card.tsx`, `use-catalogue.ts`).
- **Tailwind only.** No custom CSS files, no inline `style={{}}` except for genuinely dynamic values.
- Destructure imports. Early returns preferred.
- Event handlers prefixed `handle` (`handleSubmit`, `handleAccept`).
- Import via `@/` alias, never relative `../../`.

## Design tokens — use these, never raw colours

Semantic shadcn tokens: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`,
`bg-primary`, `border-border`, `bg-accent`.

Status tokens added for this project (light + dark already defined):

| Token | Use |
|---|---|
| `bg-ok-surface text-ok-foreground` / `text-ok` | success, available, completed |
| `bg-warn-surface text-warn-foreground` / `text-warn` | needs attention, confirmation required |
| `bg-stop-surface text-stop-foreground` / `text-stop` | blocked, unavailable, declined |
| `bg-info-surface text-info-foreground` / `text-info` | in progress, issued, submitted |

**Never write `bg-blue-500`, `text-red-600`, etc.** Everything must theme correctly in dark mode.

## Shared components you MUST reuse (do not re-create)

- `@/components/ui/*` — shadcn primitives (button, card, badge, input, textarea, label, select, separator, table, tabs, dialog, alert, skeleton, sheet, dropdown-menu, sonner)
- `@/components/ui/status-pill` — `<StatusPill status="issued" />`. Handles every status string in the domain and picks the right tone. Also exports `humanise(value)` and `toneForStatus(status)`.
- `@/components/ui/states` — `<LoadingState />`, `<EmptyState />`, `<ErrorState onRetry />`, `<Callout tone="warn" title="...">`
- `@/components/shared/role-switcher` — `<RoleSwitcher />` and the `useSession()` hook
- `@/lib/api-client` — `apiFetch<T>(path, { method, body, idempotencyKey })`, `newIdempotencyKey()`, `ApiRequestError` (has `.code`, `.status`, `.details`)
- `@/lib/utils` — `cn()`
- `@/stores/use-shortlist-store` — shortlist (persisted)
- `@/stores/use-upload-queue-store` — fitter proof queue (persisted)

## API surface

Base `/api`. `apiFetch` already prefixes it — call `apiFetch("/products?...")`.

Auth resolves from the `island_session` cookie automatically in the browser. Do not send
`X-Prototype-User-Id` from UI code; that header is for curl/Postman only.

Errors always come back as `{ code, message, details? }`. `apiFetch` throws `ApiRequestError`.
Codes you must handle in the UI: `INVENTORY_CONFLICT` (409), `IDEMPOTENCY_KEY_REUSED` (409),
`INVALID_TRANSITION` (409), `VALIDATION_ERROR` (422), `PROOF_REQUIRED` (422), `REASON_REQUIRED` (422),
`FORBIDDEN` (403), `PROOF_STORAGE_UNAVAILABLE` (503).

| Method | Path | Notes |
|---|---|---|
| GET | `/products?startDate&endDate&mediaType&locationId&maxMonthlyBudget` | dates REQUIRED |
| GET | `/products/{id}?startDate&endDate` | includes `assetOptions[]` with per-asset `availability.blockers[]` |
| POST | `/booking-requests` | **needs `idempotencyKey`** |
| GET | `/client/summary` | portal home |
| GET | `/client/contracts` | org-scoped list |
| GET | `/client/contracts/{id}` | + campaign, serviceEvents, proofRecords, clientRequests |
| POST | `/client/contracts/{id}/actions` | `{ action: "accept" \| "request_changes" \| "request_cancellation", note }` |
| GET | `/management/dashboard` | `{ attentionItems[], counts{}, upcomingWorkOrders[] }` |
| GET | `/management/booking-requests?status=` | |
| GET/PATCH | `/management/booking-requests/{id}` | PATCH `{ action: "approve" \| "decline" \| "request_information", note, selectedAssetId }` |
| POST | `/management/contracts` | **needs `idempotencyKey`** |
| POST | `/management/contracts/{id}/issue` | |
| POST | `/management/work-orders` | **needs `idempotencyKey`** |
| GET | `/mobile/work-orders?status=` | fitter sees only their own |
| GET | `/mobile/work-orders/{id}` | |
| POST | `/mobile/work-orders/{id}/status` | **needs `idempotencyKey`**, `{ status, note }` |
| POST | `/mobile/work-orders/{id}/proof` | **needs `idempotencyKey`**, FormData `file` + `completionNote` |
| GET | `/session/current`, POST `/session/switch` | |

## Domain rules the UI must respect

- **Fixture clock is `2027-01-15T09:00:00Z`.** Import `FIXTURE_CLOCK` / `FIXTURE_CLOCK_DATE` from
  `@/lib/constants`. Never call `new Date()` to mean "now" — the seeded data lives in 2027.
- Dates are half-open `[start, end)`. All dates are UTC calendar dates; format with
  `en-GB` and `timeZone: "UTC"`.
- **Rates:** always display `indicativeRate.label` verbatim. If `amount` is `null`, that label is
  already "Price on request" — never render £0. `monthlyEquivalent` is for the budget filter only.
- **Availability states:** `available` | `unavailable` | `confirmation_required`. The third means the
  asset is free but its `verifiedAt` is over 30 days old — show it as a caution, not a hard block.
- The client portal must **never imply a change/cancellation is approved**. Those stay
  "Submitted — awaiting management review" until management acts.
- Work orders: `draft → assigned → travelling → on_site → blocked → completed`.
  Blocked needs a reason. Completed needs a completion note AND at least one proof record.

## Seeded data for demos

- Manager `user-manager-01` (Morgan Reed) · Fitter `user-fitter-01` (Casey Morgan)
- `org-silverline` / `user-client-silverline` — **zero contracts**, tests the empty-state journey
- `org-lighthouse` / `user-client-lighthouse` — `contract-001` is **issued**, awaiting acceptance
- `org-oak-legal` / `user-client-oaklegal` — `contract-002` **active**, full service history,
  `work-order-001` assigned to the fitter for 2027-01-16, one pending change request
- `request-001` — deliberately **unavailable** (all 3 bus assets blocked). Approving must 409.
- `request-002` — already **approved**, the happy path into contract creation.
- `product-ev-screen` — price on request. `asset-door-b` + `asset-ev-screen-02` — stale verification.

## Definition of done for your surface

- `bunx tsc --noEmit` clean
- Every list has loading, empty and error states
- Every mutation has a pending state and surfaces API error `message` to the user (toast or inline)
- Responsive: management + portal must hold from desktop down to 768px; fitter is mobile-first (375px)
- No `any` in component props
