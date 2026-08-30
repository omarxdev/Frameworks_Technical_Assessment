# Island Media Co — connected advertising operations prototype

A single operating model behind three interfaces: a client portal, a management web surface and a
mobile-first fitter app. Built for the Frameworks technical assessment with fictional seeded data.

## Setup

Requires [Bun](https://bun.sh) 1.2+ and a MongoDB connection string.

```bash
bun install
```

Copy the example environment file and fill it in:

```bash
cp .env.example .env.local
```

| Variable              | Required          | Notes                                                                                                  |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `MONGODB_URI`         | yes               | Local `mongodb://127.0.0.1:27017/island-media` or an Atlas URI                                         |
| `MONGODB_DB`          | no                | Database name, defaults to `island-media`                                                              |
| `JWT_SECRET`          | yes in production | Minimum 32 characters. Falls back to a development value locally and **throws** in production if unset |
| `NEXT_PUBLIC_APP_URL` | no                | Defaults to `http://localhost:3000`                                                                    |

If no MongoDB is reachable outside production, the app falls back to an in-memory server for that
process so it still boots. That fallback is disabled in production.

## Commands

| Task                      | Command             |
| ------------------------- | ------------------- |
| Install                   | `bun install`       |
| Seed / reset fixture data | `bun run seed`      |
| Development               | `bun dev`           |
| Tests                     | `bun run test`      |
| Typecheck                 | `bun run typecheck` |
| Production build          | `bun run build`     |

`bun run seed` is deterministic: it clears every collection and reloads
`fixtures/island-media-fixtures.json` with the fixture IDs preserved. `POST /api/dev/reset` does the
same thing over HTTP for use during a demo.

## Prototype access

Use the role switcher in the header of any surface. No passwords — this is a prototype switcher, not
authentication.

| Role                    | User                              | What they demonstrate                                 |
| ----------------------- | --------------------------------- | ----------------------------------------------------- |
| Agency manager          | Morgan Reed (`user-manager-01`)   | Attention dashboard, requests, contracts, work orders |
| Fitter                  | Casey Morgan (`user-fitter-01`)   | Assigned jobs, progress, proof capture                |
| Client, no contracts    | Avery Stone, Silverline Fitness   | The zero-contract portal journey                      |
| Client, issued contract | Jordan Ellis, Lighthouse Learning | Contract acceptance / change request                  |
| Client, active campaign | Taylor Quinn, Oak Legal           | Service timeline, pending change request              |

New-client registration is at `/register` and persists a real user and organisation.

## Architecture

```
src/
  app/
    api/          route handlers — the client/server boundary
    portal/       client portal
    management/   management web
    fitter/       mobile-first field app
  components/
    ui/           shadcn primitives + status pill and state components
    shared/       role switcher
    providers/    TanStack Query provider
  features/       per-surface components and hooks
  lib/
    domain/       business rules, no framework or database imports
    api/          idempotency and other route-handler helpers
    db/           MongoDB access and deterministic seeding
    auth/         session resolution and role guards
    schemas/      Zod schemas — the single source of truth for types
  stores/         Zustand (shortlist, fitter upload queue), persisted
tests/
  domain/         pure business-rule tests
  api/            route-handler integration tests
  e2e/            the connected journey across all three surfaces
```

The rule that keeps this maintainable: `lib/domain` holds the business rules and imports nothing from
Next.js or MongoDB, so availability and the state machines are testable without a server and
extractable later. Helpers that do need the framework, such as idempotency, live in `lib/api` instead.
Route handlers orchestrate; `features/` renders.

Zod schemas in `lib/schemas` are the single source of truth. Types come from `z.infer`, the API
validates against them, and forms use the same schemas through `zodResolver`.

**Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui,
TanStack Query for server state, Zustand for the two pieces of genuinely client-only state, MongoDB
via the native driver, Vitest with an in-memory MongoDB for tests.

## Business rules implemented

- **Dates** are half-open `[start, end)`. Overlap is `max(startA, startB) < min(endA, endB)`. All
  dates are treated as UTC calendar dates.
- **The fixture clock is `2027-01-15T09:00:00Z`** and is used everywhere "now" is needed. No code
  path calls `new Date()` to mean the current time.
- **Exclusive assets** are available when at least one active asset has no overlapping confirmed
  booking, active hold or confirmed outage.
- **Capacity pools** are available when overlapping confirmed bookings plus active holds use less
  than the pool capacity.
- **Holds** block only while `expiresAt > fixtureClock`. Availability is rechecked at approval _and_
  again at contract activation before any booking is confirmed.
- **Rates** display the supplied label verbatim. A null amount renders "Price on request" and is
  excluded from a budget-filtered search rather than passing as zero.
- **Stale verification** is derived from `verifiedAt` being more than 30 days before the fixture
  clock, which surfaces both stale fixture assets rather than only the one carrying a note.
- **Idempotency** is scoped to `(endpoint, actor, key)`. The same key with the same body replays the
  stored response; the same key with a _different_ body returns 409 rather than replaying the original.
  The brief can be read as "return the existing record" in that case, but silently ignoring changed
  dates would confirm something the client did not ask for, so this follows the Stripe convention and
  makes the mismatch explicit. A new key always creates a new request.
- **Client visibility**: `internalNotes` and non-`clientVisible` service events never reach a client
  payload, and the connected-journey test asserts it.

## Tests

```bash
bun run test
```

78 tests across 8 files, covering all ten required checks:

| #   | Required check                             | Where                                  |
| --- | ------------------------------------------ | -------------------------------------- |
| 1   | Overlapping exclusive-asset bookings       | `tests/domain/exclusive-asset.test.ts` |
| 2   | Expired versus active holds                | `tests/domain/capacity-pool.test.ts`   |
| 3   | Capacity-pool availability                 | `tests/domain/capacity-pool.test.ts`   |
| 4   | Duplicate idempotency key                  | `tests/api/booking-requests.test.ts`   |
| 5   | No-contract client can use the catalogue   | `tests/api/booking-requests.test.ts`   |
| 6   | Contract issue, acceptance, change request | `tests/api/contracts.test.ts`          |
| 7   | Blocked work order requires a reason       | `tests/api/work-orders.test.ts`        |
| 8   | Completion requires proof, updates history | `tests/api/work-orders.test.ts`        |
| 9   | Organisation A cannot read B's contract    | `tests/api/contracts.test.ts`          |
| 10  | One connected journey                      | `tests/e2e/connected-journey.test.ts`  |

Tests run against an in-memory MongoDB, so no running database is required.

## Deliberate shortcuts, and what production does instead

Full detail in [docs/productionisation-note.md](docs/productionisation-note.md). The four that matter:

1. **`X-Prototype-User-Id` header.** Any caller can assert an identity with it. It exists so the API
   is curl- and Postman-testable per the supplied contract, and the browser uses a signed httpOnly
   cookie instead. **This header must be deleted before any real deployment.**
2. **Proof storage.** Files are stored as base64 data URIs on the proof record, capped at 2MB with a
   server-side type allow-list, and nothing is scanned. Production uses pre-signed direct-to-S3
   upload, malware scanning in quarantine, and short-lived signed reads.
3. **Contract acceptance is not an electronic signature.** It records actor, timestamp and note and
   is labelled a prototype action throughout the UI.
4. **Offline behaviour is simulated.** The upload queue, retry and failure states are real and
   persisted, but there is no service worker. The "simulate poor signal" toggle in the fitter app
   drives the real 503 path so a reviewer can exercise retry on demand.

## Deployment

Deploys to Vercel as a standard Next.js app. Two things must be set before the first deploy:

1. **Environment variables** — `MONGODB_URI` (an Atlas connection string, not `localhost`),
   `JWT_SECRET` (32+ characters; the app **throws** in production if it is unset rather than
   falling back), and `NEXT_PUBLIC_APP_URL` set to the deployed URL. The in-memory MongoDB
   fallback is deliberately disabled in production, so a missing or unreachable `MONGODB_URI`
   fails the deploy rather than silently serving an empty database.
2. **Atlas network access** — allow connections from anywhere (`0.0.0.0/0`), since Vercel
   functions do not have static egress IPs on the lower tiers.

Seed the deployed database once by calling `POST /api/dev/reset` against the deployment. That
route exists for demo resets and is another thing to delete before any real use.

## Known limitations

- No pagination anywhere. Correct at fixture scale, wrong at real scale.
- The availability calculation loads all bookings, holds and outages per request. Fine for 12 assets;
  needs indexed date-range queries beyond a few hundred.
- Registration verifies nothing beyond email uniqueness.
- No email, SMS or push — attention items are the only notification channel.
- Contract versions are a counter plus a history trail rather than immutable stored versions.
- No dark-mode toggle in the UI, though the full token set is defined and every surface themes
  correctly if the class is set.

## Assumptions

- All dates are UTC calendar dates; no local-timezone conversion anywhere.
- The fixture clock is the prototype's present, so "today" for a fitter means 15 January 2027.
- A client organisation maps to exactly one signup; multi-user organisations are modelled in the data
  but there is no invite flow.
- Adapting the supplied API contract: two additions, both explained above — `GET /api/session/current`
  so the browser can resolve its own session without the prototype header, and a `GET` on
  `/api/management/work-orders` so management can list field work. Everything else matches
  `api/openapi.yaml`.
