# Plan for Assessment — Island Media Co Connected Prototype

**Purpose of this document:** self-contained brief + build plan for the Frameworks technical assessment. Written so it can be handed to another developer or AI agent with no other context and they can start building immediately.

---

## 1. What this is

A paid technical assessment (Frameworks, via Upwork). Build **one connected prototype** — not three separate apps — with a management web interface, a mobile-first fitter app, and a client portal, all sharing the same backend/data. The grading emphasis is on the **hand-offs between interfaces**, not visual polish. Delivery window: 2–3 calendar days.

Fictional business: **Island Media Co**, sells out-of-home advertising (bus panels/wraps, transport-hub screens and doors, delivery-van panels, EV-charging-station screens).

Fictional fixture clock (use as "now" everywhere): `2027-01-15T09:00:00Z`

---

## 2. Source pack contents (what was supplied, and why each file matters)

```
Frameworks_Technical_Assessment_Candidate_Pack/
├── README.md                          → pack index, delivery-window note, fixture clock, "no real client data" rule
├── ASSESSMENT.md                      → the full brief (business context, scenarios, rules, deliverables, evaluation)
├── SUBMISSION_TEMPLATE.md             → required submission doc, must be filled in and included in the repo
├── api/
│   └── openapi.yaml                   → the API contract (endpoints + schemas) — can be adapted if equivalent, must explain any change
└── fixtures/
    └── island-media-fixtures.json     → seed data, including deliberately "inconvenient" records (see §6)
```

Everything from these files needed to build is extracted into this document below — the original pack does not need to be re-read.

---

## 3. Roles (4)

1. **Public visitor / prospective client** — browses, registers, no contract needed.
2. **Existing client** — same login as above once a contract exists; sees contract state, campaign progress, actions needed, proof of completed work.
3. **Agency manager** — reviews requests, issues contracts, creates field work, sees status.
4. **Engineer/fitter** — sees assigned jobs on mobile, updates progress, submits proof.

Auth is a **prototype only** — a role/account switcher for seeded manager, fitter, and existing-client records, plus a real, persisting new-client registration flow. No production-grade auth required (see §10 for the chosen approach).

---

## 4. Mandatory connected scenarios

### Scenario A — prospective client signs up and discovers services
Visitor browses products → filters by dates/media type/location/max monthly budget → opens a product (price, minimum term, creative spec, calculated availability) → registers (client + organisation created, no contract needed) → session/account persists across reload → adds to shortlist → submits a non-binding booking request.
**An account with zero contracts must have a useful portal home, not an empty/broken page.**

### Scenario B — management turns a request into a contract and campaign
Manager sees new request in an attention-led dashboard → opens it (client, requested dates, product, current availability) → can request more info / decline / approve → **approval must re-check availability and handle a conflict safely** → for an approvable request, selects asset/pool allocation, creates a draft contract → issues it → client sees it in portal → client accepts or requests changes → acceptance creates/activates the connected campaign and booking state.
(This is a prototype acceptance flow, not real e-signature.)

### Scenario C — management creates field work
Manager creates an installation/fitting work order on the campaign (type, scheduled date, asset/location, instructions, assigned fitter) → appears in fitter's mobile app → manager can see latest field status.

### Scenario D — fitter completes work, client sees progress
Fitter opens assigned job on mobile → moves through `assigned → travelling → on_site → blocked → completed` → **blocked requires a reason** → **completed requires a note + at least one proof attachment/placeholder** → update persists, creates a service-history event → management sees completed job + proof → client sees an updated service timeline + proof in their contract/campaign view.
(Proof storage can be local/simulated — no real object storage required.)

---

## 5. Interface requirements (minimum surface per interface)

**Management web:** attention-led home, booking-request list/detail, client/account detail, product/asset/availability context, contract creation + issue, campaign/booking visibility, work-order creation/assignment/status, service history + proof visibility. No need for unrestricted CRUD on every entity.

**Fitter mobile (PWA acceptable, no App/Play Store needed):** today's/upcoming jobs, job detail (location/asset, contact-safe instructions, scheduled time), prominent progress actions, blocked reason, completion note + proof capture/upload, clear offline/retry/failed-upload treatment (simulated is fine — explain the production alternative).

**Client portal:** working registration, useful no-contract state, full catalogue + date-based discovery, shortlist + non-binding request submission, contract list/detail, prototype accept/change-request, campaign/service timeline, actions requiring attention, proof after completion, change/cancellation requests that **stay pending until management acts** — the portal must never imply an unapproved change is approved.

**Visual consistency:** one simple style (palette, one typeface, spacing/radius) applied identically across all three interfaces. Not a branding exercise — don't over-invest here. No Frameworks branding, no real client identity imitation.

**Responsiveness:** management and client are **responsive web views** (must hold up from desktop down to tablet width, not a single fixed layout) — only the fitter app is required to be mobile-first by design.

---

## 6. Business rules (exact, load-bearing)

**Dates:** half-open intervals `[start, end)` — start inclusive, end exclusive. Overlap test: `max(startA,startB) < min(endA,endB)`. End must be after start. State the timezone assumption (recommend: treat all dates as UTC calendar dates, no local-TZ conversion, for prototype simplicity).

**Products/assets/capacity — do not collapse these:**
- **Product** = what's sold.
- **Physical asset** = the named vehicle/door/screen/location delivering it.
- **Capacity pool** = shared capacity (e.g. a digital loop).
- Booking, contract, and campaign are all separate records too.

**`exclusive_asset` allocation:** available if at least one active physical asset has no overlapping confirmed booking, active hold, or confirmed outage.

**`capacity_pool` allocation:** available if overlapping confirmed bookings + active holds use less than pool capacity.

**Holds:** block inventory only while `expiresAt > fixtureClock`. Expired holds don't block. **Must re-check this at approval and at contract activation, not just at read time.**

**Rates:** show the supplied native rate label as-is. `monthlyEquivalent` is for the budget filter only, never displayed as "the price." `amount: null` → render "Price on request," never £0, and must not silently pass a budget filter as "within budget."

**Client registration/access:** registration creates a fictional user + client organisation. A client account may have zero contracts. All client-facing queries must be scoped to that organisation. Production note must cover real identity verification, tenant isolation, record-level authorisation.

**Contract lifecycle (must support all):** `draft → issued → change_requested → accepted → active → completed → cancelled`. Preserve version, dates, items, total, status, event history. A client action must never silently rewrite an issued contract (bump version / require reissue instead).

**Work-order lifecycle (must support all):** `draft → assigned → travelling → on_site → blocked → completed`. Blocked needs a reason. Completed needs a completion note + proof record.

**Service visibility:** client-visible events must be safe summaries of verified state — never expose internal notes or another client's data.

**Idempotency:** `Idempotency-Key` header required on booking-request submission and other material creates. Same key → return the existing record. New key → new record. Material state changes must append history with actor, time, action, note/reason.

---

## 7. Fixture data — entity counts and the deliberately "inconvenient" records

Counts: 4 mediaOwners · 4 locations · 6 products · 12 assets · 1 capacityPool · 8 bookings · 3 holds · 2 outages · 2 bookingRequests · 5 users · 3 organisations · 2 contracts · 2 campaigns · 1 workOrder · 5 serviceEvents · 1 clientRequest · 0 proofRecords.

These records are **intentionally rigged to break naive logic** — they are not mistakes, do not "clean them up":

| Record(s) | What it tests |
|---|---|
| `request-001` (Silverline, product-bus-rear, **12–18 Feb**) vs `booking-001` (Bus 101, Feb 1–Mar 1), `booking-002` (Bus 102, Feb 15–Apr 1), `outage-001` (Bus 103, Feb 10–20) | **All 3 exclusive assets are blocked for this exact date range.** This request currently has zero availability. If the manager UI lets this get approved without surfacing a conflict, that's the failure mode Scenario B explicitly tests. |
| `pool-hub-screen` (capacity 4): `booking-006/007/008` (1 unit each) + `hold-001` (active, `expiresAt` 2027-01-20 > clock) during **20–28 Feb** | Sums to exactly 4/4 → fully booked in that window. |
| `hold-002` — same product/dates as `hold-001`, but `expiresAt` 2027-01-10 < clock | **Expired hold, must be ignored** — direct test of hold-expiry logic. |
| `product-ev-screen` — `amount: null` | "Price on request" rendering + must not silently pass the budget filter. |
| `asset-door-b` — `verifiedAt` 2026-10-01, note "Owner confirmation recommended before approval" | Stale verification — surface asset trust/freshness in manager UI, not just binary available/unavailable. |
| `org-silverline` — 0 contracts | Tests the "useful no-contract portal home" requirement. |
| `org-oak-legal` — active contract, full service history, **and** a pending `client-request-001` (contract_change, status `submitted`) | Tests that a pending client request stays pending until management acts — must not auto-resolve. |
| `contract-001` (Lighthouse) — status `issued`, not yet accepted | Tests the issue → client-sees-it → accept/change flow end to end. |

---

## 8. API contract (functional summary — adapt freely if you explain the change)

Base: `/api`. Protected routes use `X-Prototype-User-Id` header exactly as specced in the OpenAPI contract. The server **also** accepts a JWT cookie for browser-based navigation (see §10). Both resolve to the same user context server-side. This keeps the API curl/Postman-testable per the spec while giving the browser UI seamless sessions.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create client user + org (idempotent) |
| POST | `/session/switch` | Switch to a seeded prototype user |
| GET | `/products` | Search catalogue by date/mediaType/location/budget |
| GET | `/products/{id}` | Product detail + availability + asset options |
| POST | `/booking-requests` | Submit non-binding request (idempotent) |
| GET | `/client/summary` | Client portal home data |
| GET | `/client/contracts` | Org-scoped contract list |
| GET | `/client/contracts/{id}` | Contract + campaign + service events + proof (org-scoped) |
| POST | `/client/contracts/{id}/actions` | accept / request_changes / request_cancellation |
| GET | `/management/dashboard` | Attention counts + upcoming work |
| GET | `/management/booking-requests` | List (filterable by status) |
| GET/PATCH | `/management/booking-requests/{id}` | Detail / apply decision (request_information, approve, decline) — approve must re-check availability |
| POST | `/management/contracts` | Create draft contract from approved request |
| POST | `/management/contracts/{id}/issue` | Issue draft to client |
| POST | `/management/work-orders` | Create + assign work order |
| GET | `/mobile/work-orders` | List assigned to selected fitter |
| GET | `/mobile/work-orders/{id}` | Mobile-safe detail |
| POST | `/mobile/work-orders/{id}/status` | Progress/blocked update |
| POST | `/mobile/work-orders/{id}/proof` | Upload completion proof (multipart: file + completionNote) |
| POST | `/dev/reset` | Restore fixture state (helper) |

All material creates require `Idempotency-Key`. Standard error shape: `{ code, message, details? }`. Key status codes used throughout: `403` (wrong org/role), `404`, `409` (availability/state conflict), `422` (validation), `503` (simulated service failure).

---

## 9. Deliverables checklist

- [ ] Private repo, `@niko-frameworks` invited as collaborator
- [ ] Deployed preview (free tier, no card required), seeded data, visible role/account switching
- [ ] README: setup, commands, architecture summary, assumptions, deliberate exclusions, known limitations
- [ ] Automated tests, documented command, passing output
- [ ] 5–8 min walkthrough video covering all 3 interfaces + one connected scenario
- [ ] Productionisation note (~1–2 pages): architecture, PWA vs native, idempotency, audit, webhooks/reconciliation, error monitoring; data model + source-of-truth boundaries (CRM/ledger/file-storage/media-scheduling); real signup/identity/recovery; roles + tenant/record/field permissions; contract versioning + e-signature boundary; proof files, malware scanning, signed access, offline/retry; environments, CI/CD, migrations, backups, rollback, secrets; approx. operating cost + what you'd validate before production
- [ ] Completed `SUBMISSION_TEMPLATE.md` — including AI prompts/agent instructions used, one AI-generated mistake caught and corrected, and an honest active-vs-unattended time record
- [ ] Consistent visual style across all three interfaces

**Deliberate exclusions (do not spend time here):** production auth/identity verification, real e-signature, payments, live email/SMS/push, real CRM/ledger/media-scheduling integrations, third-party media-owner onboarding, App/Play Store deployment, full offline sync, AI media planning/chatbots, programmatic advertising, production security certification, a full map product, a full brand/illustration system.

**Evaluation weights:** core connected scenarios 35 · product judgement 15 · engineering quality 15 · production architecture 15 · initiative 10 · communication 5 · AI-tool use/verification 5. Initiative only scores after the four scenarios work.

---

## 10. Stack decisions

- **Framework:** Next.js (App Router) + React + TypeScript — required by the brief.
- **Database:** MongoDB, native driver (no ODM) — one collection per fixture entity, thin `lib/db/collections.ts` accessor layer.
- **Validation/types:** Zod schemas as the single source of truth for both API validation and TS types (`z.infer`).
- **Server state (client-side):** TanStack Query — all `features/*/api.ts` fetch via a shared thin `fetch` wrapper, wrapped in Query hooks per feature (`useProducts`, `useBookingRequest`, etc.).
- **Client/UI state:** Zustand — used narrowly for: shortlist (portal) and fitter offline upload queue. Not used for server data (that's TanStack Query's job).
- **Persistence (client-side):** Zustand `persist` middleware (localStorage) on `shortlistStore` and `uploadQueueStore` so they survive reload. Session itself is carried by the JWT cookie — no client-side session cache needed.
- **Auth:** dual-mode, prototype-appropriate —
  - API routes check `X-Prototype-User-Id` header first (spec-compatible for curl/Postman/reviewer testing).
  - If the header is absent, fall back to a JWT httpOnly cookie (set by `/api/auth/register` and `/api/session/switch`, containing `{ userId, role, organisationId }`).
  - `middleware.ts` resolves the user from whichever source is present and attaches it to request context.
  - No password/identity verification — matches "deliberate exclusions."
- **Forms:** React Hook Form + `zodResolver` — reuses the same Zod request schemas the API validates against.
- **Fetching:** plain `fetch`, no axios — one small wrapper for JSON + error-shape handling + idempotency-key injection.
- **Styling:** Tailwind CSS driving the shared `components/ui` design tokens.
- **Testing:** Vitest for domain/unit + API integration tests; Playwright for the one required connected UI journey.
- **Deployment:** Vercel (app) + MongoDB Atlas free tier (db) — no card required for either at this scale.

---

## 11. Full project tree

```
island-media-co/
├── README.md
├── SUBMISSION_TEMPLATE.md
├── package.json
├── tsconfig.json
├── .env.example
├── docs/
│   └── productionisation-note.md
├── scripts/
│   └── seed.ts                          # loads fixtures into Mongo, preserves IDs
├── src/
│   ├── middleware.ts                    # JWT verification / route protection
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # landing / role entry point
│   │   ├── (auth)/
│   │   │   ├── register/page.tsx
│   │   │   └── switch/page.tsx
│   │   ├── portal/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 → features/portal-dashboard
│   │   │   ├── catalogue/
│   │   │   │   ├── page.tsx             → features/portal-catalogue
│   │   │   │   └── [productId]/page.tsx
│   │   │   └── contracts/
│   │   │       ├── page.tsx
│   │   │       └── [contractId]/page.tsx → features/portal-contract
│   │   ├── management/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 → features/management-dashboard
│   │   │   ├── requests/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [requestId]/page.tsx → features/management-requests
│   │   │   ├── contracts/
│   │   │   │   └── [contractId]/page.tsx → features/management-contracts
│   │   │   └── work-orders/
│   │   │       └── new/page.tsx         → features/management-workorders
│   │   ├── fitter/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 → features/fitter-jobs
│   │   │   └── jobs/[workOrderId]/page.tsx → features/fitter-job-detail
│   │   └── api/
│   │       ├── auth/register/route.ts
│   │       ├── session/switch/route.ts
│   │       ├── products/route.ts
│   │       ├── products/[productId]/route.ts
│   │       ├── booking-requests/route.ts
│   │       ├── client/summary/route.ts
│   │       ├── client/contracts/route.ts
│   │       ├── client/contracts/[contractId]/route.ts
│   │       ├── client/contracts/[contractId]/actions/route.ts
│   │       ├── management/dashboard/route.ts
│   │       ├── management/booking-requests/route.ts
│   │       ├── management/booking-requests/[requestId]/route.ts
│   │       ├── management/contracts/route.ts
│   │       ├── management/contracts/[contractId]/issue/route.ts
│   │       ├── management/work-orders/route.ts
│   │       ├── mobile/work-orders/route.ts
│   │       ├── mobile/work-orders/[workOrderId]/route.ts
│   │       ├── mobile/work-orders/[workOrderId]/status/route.ts
│   │       ├── mobile/work-orders/[workOrderId]/proof/route.ts
│   │       └── dev/reset/route.ts
│   ├── features/
│   │   ├── portal-catalogue/{components,types.ts,api.ts,hooks.ts}
│   │   ├── portal-dashboard/{components,types.ts,api.ts,hooks.ts}
│   │   ├── portal-contract/{components,types.ts,api.ts,hooks.ts}
│   │   ├── management-dashboard/{components,types.ts,api.ts,hooks.ts}
│   │   ├── management-requests/{components,types.ts,api.ts,hooks.ts}
│   │   ├── management-contracts/{components,types.ts,api.ts,hooks.ts}
│   │   ├── management-workorders/{components,types.ts,api.ts,hooks.ts}
│   │   ├── fitter-jobs/{components,types.ts,api.ts,hooks.ts}
│   │   └── fitter-job-detail/{components,types.ts,api.ts,hooks.ts}
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   └── collections.ts
│   │   ├── domain/
│   │   │   ├── availability/
│   │   │   │   ├── dateRange.ts
│   │   │   │   ├── exclusiveAsset.ts
│   │   │   │   └── capacityPool.ts
│   │   │   ├── contracts/stateMachine.ts
│   │   │   ├── workOrders/stateMachine.ts
│   │   │   └── idempotency.ts
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   └── session.ts
│   │   ├── schemas/                     # zod schemas, one file per entity
│   │   ├── fetcher.ts                   # shared fetch wrapper
│   │   └── queryClient.ts               # TanStack Query provider setup
│   ├── stores/
│   │   ├── shortlistStore.ts            # zustand + persist
│   │   └── uploadQueueStore.ts
│   └── components/ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── StatusPill.tsx
│       ├── EmptyState.tsx
│       └── Table.tsx
├── tests/
│   ├── domain/
│   │   ├── exclusiveAsset.test.ts
│   │   ├── capacityPool.test.ts
│   │   ├── idempotency.test.ts
│   │   └── stateMachines.test.ts
│   ├── api/
│   │   ├── booking-requests.test.ts
│   │   ├── contracts.test.ts
│   │   ├── work-orders.test.ts
│   │   └── org-isolation.test.ts
│   └── e2e/
│       └── connected-journey.test.ts
└── public/
    └── manifest.json                    # PWA manifest for fitter app
```

---

## 12. 30-commit build plan

Each commit is a complete, working vertical slice. Domain logic ships with its own tests (no separate "add tests" commits — keeps this inside 30).

### Phase 0 — Foundation (1–4)
1. Scaffold — Next.js App Router + TS + Tailwind + `app/`/`features/`/`lib/`/`components/ui`/`stores` folders + TanStack Query provider + Zustand store shells + lint/format + README skeleton.
2. MongoDB layer — `lib/db` client singleton, env config, `/api/dev/reset` stub.
3. Data model + seed — Zod schemas for every fixture entity; seed script loads `island-media-fixtures.json` into Mongo, preserving IDs.
4. Dual-mode auth — `middleware.ts` resolves user from `X-Prototype-User-Id` header (spec-compatible) or JWT cookie fallback; register/switch endpoints issue cookie; Zustand `persist` wired for shortlist + upload queue (reload-survival).

### Phase 1 — Domain logic core (5–8) — highest-weighted area, build + test before any UI
5. Exclusive-asset availability engine + tests (incl. `request-001` zero-availability case).
6. Capacity-pool availability engine + tests (incl. `pool-hub-screen` 4/4 + expired-hold case).
7. Idempotency utility + tests (duplicate booking-request submission).
8. Contract + work-order state machines + tests (blocked-needs-reason, completed-needs-proof guards).

### Phase 2 — Public/client API (9–10) → Scenario A backend
9. `/api/products` + `/api/products/[id]` (search/filter, availability, price-on-request handling).
10. `/api/booking-requests` (idempotent) + `/api/client/summary` + `/api/client/contracts` + `/api/client/contracts/[id]` (org-scoped; covers cross-org isolation test).

### Phase 3 — Management API (11–13) → Scenario B + C backend
11. Requests + decisions — dashboard, list/detail, PATCH decision endpoint that re-checks availability, 409 on conflict.
12. Contract creation/issue + client action endpoint — activates campaign, writes service event.
13. Work-order creation/assignment.

### Phase 4 — Mobile/fitter API (14–15) → Scenario D backend
14. Fitter work-order list/detail + status-update endpoint (transitions, blocked-reason validation).
15. Proof endpoint (simulated upload) — completion-note requirement, writes client-visible service event.

### Phase 5 — Shared UI system (16)
16. `components/ui` design tokens + primitives used identically across all three interfaces.

### Phase 6 — Client portal UI (17–20) → Scenario A frontend + client side of B/D
17. Registration + portal shell/nav.
18. Catalogue + product detail + filters + shortlist + request submission.
19. Portal home/dashboard — no-contract state, attention items, contract list.
20. Contract detail — accept/change/cancel, service timeline, proof display.

### Phase 7 — Management web UI (21–24) → Scenario B + C frontend
21. Management shell + attention-led dashboard.
22. Requests list/detail + decision actions + live availability.
23. Contract creation/issue UI + client/account detail.
24. Work-order creation/assignment + service history/proof visibility.

### Phase 8 — Fitter mobile PWA (25–27) → Scenario D frontend
25. Fitter shell (mobile-first, PWA manifest) + today/upcoming jobs list.
26. Job detail + progress actions + blocked-reason modal.
27. Completion note + proof capture/upload + offline/retry/failed-upload treatment (simulated).

### Phase 9 — Cross-cutting hardening (28)
28. Loading/empty/validation/success/conflict/retry/service-error states across all three interfaces + one connected end-to-end test (request → contract → work order → completion → client sees proof — required test #10).

### Phase 10 — Delivery (29–30)
29. README + productionisation note + completed `SUBMISSION_TEMPLATE.md` + visual-consistency notes.
30. Deploy (Vercel + Atlas free tier) + final `/dev/reset` check + tag release + link walkthrough video.

---

## 13. Required-test coverage map

| # | Required check | Landed in commit |
|---|---|---|
| 1 | Overlapping exclusive-asset bookings | 5 |
| 2 | Expired vs active holds | 6 |
| 3 | Capacity-pool availability | 6 |
| 4 | Duplicate idempotency-key submission | 7 |
| 5 | No-contract client can use catalogue | 10, 19 |
| 6 | Contract issue + accept/change-request | 12, 20 |
| 7 | Blocked work order requires reason | 8, 14 |
| 8 | Completed work order requires proof + updates history | 8, 15 |
| 9 | Org A cannot fetch Org B's contract | 10 |
| 10 | One connected UI journey | 28 |

---

## 14. Open assumptions to state in the submission

- Timezone: all dates treated as UTC calendar dates, no local-TZ conversion.
- Auth supports both the spec's `X-Prototype-User-Id` header and a JWT cookie fallback — same resolved-user semantics, dual transport for spec compatibility + browser convenience.
- Proof storage is local/simulated (e.g. base64 or local disk + metadata record), not real object storage.
- MongoDB native driver chosen over an ODM to keep the data layer thin and easy to explain in the productionisation note.

---

## 15. Notes

- 30 commits is tight for this scope — each one above is a real multi-file slice, not a single-file change. If a slice genuinely needs splitting in practice, collapse elsewhere rather than inflating the count.
- Phases 1–4 (domain + API) come before any UI so availability/contract/work-order logic is correct and tested against the fixture data before it's wrapped in screens.
- This document plus the original `fixtures/island-media-fixtures.json` and `api/openapi.yaml` are the only source-of-truth files needed to build — everything else from the pack is summarised above.

---

## 16. Technical-expectations cross-check (original brief §8, verified against this plan)

| Requirement | Covered by |
|---|---|
| Next.js, React, TypeScript | Commit 1; whole tree |
| Three clearly distinguishable interfaces | `app/portal`, `app/management`, `app/fitter` route groups |
| Consistent, candidate-chosen visual style | §5, Commit 16 |
| Responsive management + client web views | §5 "Responsiveness" |
| Mobile-first fitter experience | Commit 25, PWA manifest |
| Clear client/server or API boundary | `app/api/*` route handlers, §8 |
| Working prototype registration | Commit 4, 17 |
| Important account/request/contract/work-order/status changes persist across reload | **MongoDB is the actual source of truth for every mutation** (bookings, requests, contracts, work orders, service events) — this is real server persistence, distinct from the Zustand `persist` cache in §10, which only speeds up session/shortlist hydration on first paint |
| Deterministic fixture seeding | `scripts/seed.ts` + `/api/dev/reset` — wipes collections and reloads the exact fixture JSON every call, same result every time, no random IDs/timestamps generated at seed time |
| Proportionate automated tests | §13 test-coverage map |
| Loading, empty, validation, success, conflict, retry, service-error states | Commit 28 |
| Sensible component, domain, data boundaries | `features/*` (UI) vs `lib/domain/*` (business rules) vs `lib/db/*` (persistence) kept separate, never mixed in one file |
| No secrets, credentials, or production data | `.env.example` only in repo, real values via deployment platform env vars, never committed |
| Deployed preview, no card required | Commit 30 — Vercel + MongoDB Atlas free tier |

Nothing from the original brief is outstanding once this plan is followed as written.

---

## 17. Type-safety approach

One rule: **Zod schemas in `lib/schemas/` are the single source of truth.** Both the API route handler and the matching `features/*/api.ts` import the same schema — types derived via `z.infer`, never hand-written interfaces. React Hook Form uses `zodResolver` with those same schemas so forms can never submit a shape the API doesn't expect. `tsconfig.json` uses `"strict": true`. MongoDB documents use `string` IDs (matching fixture IDs like `"product-bus-rear"` directly, no ObjectId conversion).

---

## 18. One useful improvement (initiative — 10% weight)

Only attempted after all four connected scenarios work. Chosen improvement:

**Availability conflict helper on the management request-detail screen.** When the manager opens a booking request that has zero available assets (like `request-001`), instead of just showing "unavailable," surface a short explanation of *why* (which assets are blocked and by what — booking, hold, or outage) and suggest the nearest available dates or alternative assets for the same product. This directly reduces operator effort (the manager doesn't have to manually cross-reference bookings/outages) and demonstrates understanding of the availability engine.

Keep it simple: a read-only "conflict summary" panel on the existing request-detail page, not a separate feature or modal wizard.

---

## 19. AI mistake documentation plan

The `SUBMISSION_TEMPLATE.md` requires documenting one AI-generated mistake caught and corrected. Track this actively during development — likely candidates:

- AI using `new Date()` instead of the fixed `fixtureClock` for availability checks.
- AI treating `hold-002` (expired) as blocking inventory.
- AI letting `product-ev-screen` (`amount: null`) pass through a budget filter as £0.
- AI omitting org-scoping on a client endpoint, allowing cross-tenant data access.

Document whichever actually happens first: what was generated, why it was wrong, how it was caught (which test failed or which manual check), what was changed, and what test proves the fix.
