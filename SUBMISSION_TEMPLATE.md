# Submission template

## Candidate

- Name: Omar
- Upwork profile: _to complete_
- Accountable delivery lead: Omar
- Other contributors and exact contribution: None. All work is my own, produced with AI assistance as recorded below.

## Links

- Private repository: _to complete_
- Confirm `@niko-frameworks` has access: _to complete_
- Deployed preview: _to complete_
- Walkthrough video: _to complete_

## Prototype access

- Management user or switcher option: Role switcher in the header — "Agency Manager (Morgan Reed)", `user-manager-01`
- Fitter user or switcher option: Role switcher — "Field Engineer / Fitter (Casey Morgan)", `user-fitter-01`
- Existing client user or switcher option: Role switcher — "Lighthouse Learning (Jordan Ellis)" has an issued contract awaiting acceptance; "Oak Legal (Taylor Quinn)" has an active campaign and service history; "Silverline Fitness (Avery Stone)" has zero contracts
- New-client registration route: `/register`

## Setup and checks

- Required runtime: Bun 1.2+ and a MongoDB connection string (falls back to an in-memory server outside production if none is reachable)
- Install command: `bun install`
- Seed or reset command: `bun run seed`, or `POST /api/dev/reset` during a demo
- Development command: `bun dev`
- Test command: `bun run test`
- Production build command: `bun run build`

## Active time

- Active working time: _to complete_
- Unattended agent elapsed time: _to complete_
- Delivery started: _to complete_
- Delivery submitted: _to complete_

## What works

### Scenario A: signup and product discovery

A visitor browses `/portal/catalogue`, filters by date range, media type, location and maximum
monthly budget, and opens a product to see its rate label, minimum term, creative specification and
calculated availability. Registration at `/register` creates a real user and organisation, sets a
signed httpOnly session cookie, and persists across reload. Products can be shortlisted (persisted to
localStorage) and a non-binding booking request submitted from the product detail page.

Verify: register a new account, or switch to Silverline Fitness, which has zero contracts and still
gets a useful portal home rather than an empty page.

### Scenario B: management request to contract and campaign

`/management` leads with an attention list rather than metrics. Opening a request shows the client,
requested dates, product and live availability. Approve, decline and request-information are all
available; approval rechecks availability server-side and returns 409 with the named blockers on
conflict. An approved request can be turned into a draft contract and issued; the client then sees it
in their portal and can accept or request changes. Acceptance rechecks inventory again before
confirming bookings, then activates the contract and its campaign.

Verify: `request-001` is deliberately unavailable — approving it must fail with all three blockers
named. `request-002` is already approved and is the happy path into contract creation.

### Scenario C: management creates and assigns field work

`/management/work-orders/new` creates a work order against a campaign with job type, scheduled window,
asset, location, instructions, internal notes and an assigned fitter. It appears immediately in that
fitter's app, and management sees the latest field status on the work-order list and dashboard.

### Scenario D: fitter completion updates management and client service visibility

The fitter app at `/fitter` is mobile-first and splits jobs into today and upcoming using the fixture
clock. A job moves through `assigned → travelling → on_site → blocked → completed`, with only legal
transitions offered. Blocking requires a reason. Completion requires a completion note and at least
one proof attachment, enforced server-side. The completion writes a client-visible service event, and
the client sees an updated timeline and the proof on their contract page.

Verify: try to complete before uploading proof — the server returns 422 `PROOF_REQUIRED`. The
"simulate poor signal" toggle forces the 503 path so the retry queue can be demonstrated on demand.

## Deliberate exclusions and known limitations

Not built, per the brief's exclusions: production authentication and identity verification, real
electronic signature, payments, live email/SMS/push, real CRM/ledger/media-scheduling integrations,
App Store deployment, full offline synchronisation, AI planning, a map product, a brand system.

Known limitations:

- No pagination anywhere — correct at fixture scale, wrong at real scale.
- Availability loads all bookings, holds and outages per request. Fine for 12 assets, needs indexed
  date-range queries beyond a few hundred.
- Registration verifies nothing beyond email uniqueness.
- Contract versions are a counter plus history rather than immutable stored versions.
- No service worker; offline behaviour is a persisted queue plus a simulated failure path.
- Attention items are the only notification channel.

## Assumptions

- All dates are UTC calendar dates, half-open `[start, end)`. No local-timezone conversion anywhere.
- The fixture clock `2027-01-15T09:00:00Z` is the prototype's present. No code path calls `new Date()`
  to mean now, so "today" for a fitter is 15 January 2027.
- Stale verification is defined as `verifiedAt` more than 30 days before the fixture clock. The
  fixtures do not state a threshold; 30 days surfaces both stale assets, including
  `asset-ev-screen-02`, which carries no advisory note and would be missed by matching on note text.
- A client organisation maps to one signup; multi-user organisations exist in the data model but
  there is no invite flow.
- API contract adaptations: added `GET /api/session/current` so the browser can resolve its own
  session without the prototype header, and `GET /api/management/work-orders` so management can list
  field work. Everything else matches `api/openapi.yaml`.

## Shared data model

- **Users and client organisations.** A `User` has a role (`client`, `manager`, `fitter`) and an
  optional `organisationId`. An `Organisation` is the tenant. Managers and fitters have no
  organisation; every client-facing query filters on the organisation resolved from the session,
  never from a request parameter.
- **Products, physical assets and capacity pools.** A `Product` is what is sold. An `Asset` is the
  named vehicle, door or screen that delivers an `exclusive_asset` product. A `CapacityPool` is
  shared capacity for a `capacity_pool` product. These are three separate collections and are never
  collapsed; availability is computed differently for each allocation model.
- **Requests, bookings, contracts and campaigns.** A `BookingRequest` is a non-binding client
  enquiry. A `Booking` is confirmed inventory consumption and is only created when a contract
  activates. A `Contract` carries version, dates, items, total, status and history. A `Campaign` is
  the delivery of an accepted contract. Four separate records with four separate lifecycles.
- **Work orders, service events and proof records.** A `WorkOrder` is one field job against a
  campaign. A `ServiceEvent` is an audit entry with a `clientVisible` flag and a safe `clientSummary`.
  A `ProofRecord` is a completion attachment linked to a work order. Client timelines are built only
  from `clientVisible` events.

## Contract behaviour

Statuses: `draft → issued → change_requested → accepted → active → completed → cancelled`, enforced by
a transition table in `src/lib/domain/contracts/stateMachine.ts` rather than ad-hoc checks.

Management creates a draft and issues it. The client sees the issued contract and can accept or
request changes. **A client action never rewrites an issued contract** — requesting changes moves it
to `change_requested` and records a pending client request; management reissuing it increments the
version. A test asserts the total, dates and version are untouched by a change request.

Acceptance is transactional in intent: it rechecks availability for every contract item, returns 409
with the conflict reason if inventory has moved, and only then confirms bookings, sets `acceptedAt`
and `activatedAt`, activates the campaign and writes a client-visible event. Both the acceptance and
the activation are recorded in history with actor and timestamp.

Cancellation requests never change contract status. They create a pending client request and the
portal shows "awaiting management review" — the portal never implies approval.

## Mobile and field-work behaviour

An installable PWA with its own manifest, designed mobile-first at 375px with large tap targets. The
production recommendation is to stay a PWA: the job is a form, a camera capture and a status
transition, with no background location or BLE requirement, so one codebase and no store-review
latency wins. I would revisit native only if iOS background upload or offline maps became a real
requirement, and I would validate that with actual fitters first.

Proof handling is the main prototype shortcut: files are stored as base64 data URIs on the proof
record, capped at 2MB with a server-side type allow-list, and nothing is scanned. Production uses
pre-signed direct-to-object-storage upload, malware scanning in a quarantine bucket before the record
becomes client-visible, short-lived signed reads, and EXIF stripping on the client-visible copy.

Retry behaviour is real, not decorative. Uploads are queued in a persisted store with attempt counts
and failure reasons, connectivity is tracked, and the queue auto-flushes when connection returns.
Critically, **each queued upload keeps its original idempotency key across retries**, so an upload
that succeeded but whose response was lost does not create a duplicate proof record — there is a test
for exactly that. A visible "simulate poor signal" toggle drives the server's 503 path so a reviewer
can exercise the whole retry flow on demand.

## Visual consistency

- Colour and typography choices: one typeface, Geist, loaded via `next/font`. A single OKLCH token set
  defined once in `src/app/globals.css` — a deep maritime teal primary for Island Media Co, a neutral
  surface scale, and four semantic status tones (`ok`, `warn`, `stop`, `info`) that carry every state
  in the domain. Radius and spacing come from shared tokens.
- Where this style is applied across the three interfaces: every surface consumes the same tokens and
  the same shared components. `StatusPill` maps every domain status string to a tone in one place, so
  "blocked" looks identical in the fitter app, the management dashboard and the client timeline.
  Loading, empty and error states come from one shared module.
- Third-party or generated asset sources and licences: shadcn/ui components (MIT), Radix UI
  primitives (MIT), lucide-react icons (ISC), Geist font (SIL OFL 1.1). No Frameworks assets and no
  imitation of a real client identity.

## Access boundaries

The prototype scopes client data by resolving the session to a user, taking the `organisationId` from
that user, and filtering every client query on it. Organisation identity is never accepted from a
request parameter. Cross-organisation reads and actions return 403, and a manager session is likewise
refused on client-scoped routes. Role guards gate every management and field route.

Field-level scoping is enforced at the route boundary: `internalNotes` is stripped from every mobile
payload, and client timelines include only `clientVisible` service events. The connected-journey test
asserts that internal note text never appears anywhere in the client's contract response.

Two prototype shortcuts replace real identity. First, the role switcher, which posts to
`/api/session/switch` and issues a signed httpOnly JWT cookie — no password, no verification. Second,
the `X-Prototype-User-Id` header, which any caller can set to assert an identity; it exists so the
API stays curl-testable against the supplied contract. **Both must be removed before any real
deployment.** In production these are replaced by a real IdP with email and business verification,
short-lived rotating tokens with server-side revocation, row-level security in the database so a
missing tenant filter fails closed, and explicit per-audience response DTOs so field-level leaks
cannot happen by forgetting to omit a new field.

## Persistence

MongoDB is the source of truth for every mutation: registrations, booking requests, decisions,
contracts, campaigns, bookings, work orders, status transitions, service events and proof records all
survive a reload and a server restart. Seeding is deterministic — `bun run seed` clears every
collection and reloads the fixture file with IDs preserved, so repeated runs give an identical state.

Two pieces of genuinely client-only state live in `localStorage` via Zustand's persist middleware: the
catalogue shortlist and the fitter's pending upload queue. Neither is a cache of server data. The
session itself is a signed httpOnly cookie, so it is not readable by client JavaScript.

Production alternative: managed Postgres with point-in-time recovery, versioned forward-only
migrations run as a separate deploy step, tested restores on a schedule, and proof bytes in object
storage rather than in the database.

## Architecture and productionisation note

[docs/productionisation-note.md](docs/productionisation-note.md)

## AI and development tools

| Tool                                | Contribution                                                                                                                                                                                                              | How you verified the output                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code (Opus 5)                | Repository analysis, the Next 16 / React 19 / Tailwind 4 upgrade, the security and lifecycle fixes to the API layer, the availability and idempotency domain work, the full test suite, README and productionisation note | `bunx tsc --noEmit`, `bun run test` (61 tests), `bun run build`, plus manual `curl` probes against a seeded database for role enforcement, org isolation, the 409 conflict path and all four idempotency behaviours |
| Claude Code subagents (3, parallel) | First-pass implementation of the three UI surfaces from a shared written brief (`docs/ui-build-brief.md`)                                                                                                                 | Reviewed every file, then re-ran typecheck, the full test suite and a production build; drove each surface in a browser against seeded data                                                                         |

## Representative prompts or agent instructions

The most load-bearing artefact was `docs/ui-build-brief.md`, written before any UI existed and given
to all three UI agents as a binding contract. It fixed the stack, the house code style, the exact
shared components to reuse rather than reinvent, the full API table with which endpoints require an
idempotency key, the error codes each surface must handle, the domain rules (fixture clock, half-open
dates, rate-label handling, the never-imply-approval rule), and a per-surface definition of done.

The instruction that mattered most, repeated to every agent: _"The fixture clock is
`2027-01-15T09:00:00Z`. Import `FIXTURE_CLOCK` from `@/lib/constants`. Never call `new Date()` to mean
'now' — the seeded data lives in 2027."_

Also material: _"Display `indicativeRate.label` verbatim. If `amount` is null the label is already
'Price on request' — never render £0. `monthlyEquivalent` is for the budget filter only."_

And for the field app: _"Each queued upload keeps its ORIGINAL idempotency key. A retry after a
partial success must not double-create."_

## AI-generated mistake or unsafe assumption

- **What the tool generated or assumed:** The availability engine classified an asset as
  `confirmation_required` by testing whether its free-text `note` contained the substring
  "confirmation" — `asset.note.toLowerCase().includes("confirmation")`. The same substring test was
  used to raise the management dashboard's stale-verification warnings.
- **Why it was wrong or unsafe:** It inferred a business rule from prose. The fixture asset
  `asset-door-b` happens to carry the note "Owner confirmation recommended before approval", so the
  check appeared to work. But `asset-ev-screen-02` was verified on 2026-09-01 — a month _staler_ than
  `asset-door-b` — and carries no note at all, so it was silently treated as fully verified. The real
  signal is the `verifiedAt` timestamp, which every asset has; the note is an optional human comment.
  In production this fails in the dangerous direction: a manager approves against an asset nobody has
  confirmed with the media owner for months, and nothing warns them.
- **How you noticed:** Auditing the fixture data directly rather than trusting the code, I listed
  every asset with its `verifiedAt` and note. Two assets were stale by date; only one had a note. The
  code only ever flagged one.
- **What you changed:** Replaced the substring test with `isVerificationStale(verifiedAt, clock)`,
  which compares the timestamp against the fixture clock with a 30-day threshold, and used it in both
  the availability engine and the dashboard. The note is now shown as supporting context when present
  rather than being the trigger.
- **What check proved the correction:** Two tests in `tests/domain/exclusiveAsset.test.ts` — one
  asserting `asset-door-b` is `confirmation_required` while the freshly verified `asset-door-a` is
  `available`, and one asserting `asset-ev-screen-02` is `confirmation_required` _and_ has no note,
  which fails against the old implementation. The management dashboard now returns two stale-asset
  warnings where it previously returned one.

## One useful improvement

An **availability conflict explainer** on the management request-detail screen. When a request cannot
be approved, the screen does not just say "unavailable" — it names each blocker: which asset, whether
it is a confirmed booking, an active hold or an outage, the campaign or reason, and the exact dates.
The same structured `blockers` array is returned in the 409 body when an approval is attempted, so
the failure path and the read path tell the same story.

This helps management. Approving `request-001` is the one decision in the seeded data that must fail,
and without this panel a manager sees a dead end and has to cross-reference bookings, holds and
outages by hand to find out why. With it, the answer is on screen: three assets, two confirmed
bookings and one maintenance outage, with dates. It earned its place because it is built from data the
availability engine already computes, cost one extra field on the response, and converts the system's
hardest "no" into an explanation the operator can act on or relay to the client.

## What I would do next

1. **Delete the `X-Prototype-User-Id` header and put a real IdP behind the session.** It is the single
   most dangerous line in the repository and everything else is secondary to it.
2. **Move proof to pre-signed object storage with malware scanning in quarantine**, and stop storing
   attacker-supplied bytes in the database.
3. **Make contract versions immutable rows with a content hash**, and record which hash the client
   accepted — that is the only thing that settles a dispute.
4. **Replace the history arrays with an append-only event log** written in the same transaction as the
   state change, so the audit trail is not mutable by anything with write access.
5. **Sit with the fitters and the media owners before building further.** The offline story and the
   inventory reconciliation model are the two largest assumptions in the build, and both are cheap to
   validate and expensive to get wrong.
