# Productionisation note

Island Media Co connected advertising operations — what changes between this prototype and a system
that runs a real advertising business.

## 1. Production architecture

As built, the prototype is a single Next.js app: route handlers under `/api`, a thin domain layer,
MongoDB. That shape survives to production, with the following changes.

**Keep the monolith at first.** Three interfaces over one operating model is exactly the case where
a modular monolith beats services: every graded hand-off in this brief (request → contract →
campaign → work order → proof) is a transaction across two or three of those tables. Splitting them
early buys distributed-transaction problems and buys nothing. The seam I would keep clean is the
domain layer (`src/lib/domain`) — it has no framework or database imports today, and that is what
makes later extraction cheap.

**Extract only the genuinely different workloads.** Two justify their own runtime: proof-file
processing (untrusted binaries, virus scanning, thumbnailing — must not share a process with request
handling) and scheduled reconciliation (below).

**Idempotency.** The prototype stores `(scope, actorId, key) → response hash` in a collection and
returns the stored response on replay, 409 on the same key with a different body. Production keeps
the model and adds: a TTL index (24h is the usual window), storing the response _before_ returning
it inside the same transaction as the write, and a `state` column so a crashed in-flight request is
retried rather than replayed as success. Every material create already requires the header; in
production I would also require it on every state transition, not just creates, because a fitter on
a flaky connection retries transitions more often than creates.

**Audit.** Today history is an array on each document — fine for a prototype, wrong for production
because it is mutable by anything with write access and cannot be queried across entities. Production
uses an append-only `events` table (actor, subject, action, before/after, request id, timestamp)
written in the same transaction as the state change, with the document arrays becoming a projection.
That is also what gives you "who changed this and when" during a client dispute.

**Webhooks and reconciliation.** Media-owner scheduling systems and the finance ledger will disagree
with us eventually. Every outbound integration gets an outbox table written transactionally with the
state change, drained by a worker with exponential backoff and a dead-letter queue. Every inbound
integration gets a nightly reconciliation job that compares our booking state against the media
owner's export and raises a discrepancy to the management attention queue rather than auto-correcting.
Silent auto-correction of inventory is how you double-sell a bus.

**Error monitoring and background jobs.** Sentry (or equivalent) for exceptions with release
tracking; structured JSON logs with a request id propagated from the edge. Background work — hold
expiry sweeps, reconciliation, proof scanning, notification sending — runs on a real queue
(BullMQ/Redis, or the cloud provider's native queue), never on request threads and never on
`setTimeout`.

## 2. Data model and source-of-truth boundaries

Product, physical asset, capacity pool, booking, request, contract, campaign, work order, service
event and proof record are deliberately kept as separate entities in the prototype. That separation
is the core of the model and does not change. What changes is where truth lives:

| Concern                                           | Source of truth         | Our role                                                           |
| ------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Client identity and contact                       | External CRM            | Cache a projection; never author                                   |
| Invoices, payments, revenue                       | Accounting ledger       | Emit billable events; never compute balances                       |
| Physical inventory and outages                    | Media owner's scheduler | Reconcile nightly; treat their export as authoritative on conflict |
| Proof files                                       | Object storage          | Store keys and metadata only, never bytes                          |
| Contracts, campaigns, work orders, service events | **Us**                  | Full authority                                                     |

Today the prototype stores proof as a base64 data URI inside the work order's related document.
That is the single largest shortcut in the build and is called out below.

Availability is a _derived_ value, never a stored one. It is computed from bookings, active holds and
confirmed outages at read time and rechecked at every decision point. Caching it would create exactly
the double-booking class of bug the fixtures are designed to catch.

## 3. Client signup, identity verification and recovery

Signup today creates a user and organisation from a form with no verification, and issues a signed
JWT cookie. Production:

- Email/password with Argon2id, or delegate entirely to an IdP (WorkOS/Auth0/Entra) — for a B2B
  product with a handful of users per client, delegated identity is cheaper than owning it.
- Mandatory email verification before an organisation can submit a request; the request is the point
  where our staff start spending time, so that is the right gate.
- Business verification before a contract can be _issued_, not at signup. Making a prospect prove
  company identity before they can browse a catalogue kills the discovery journey the brief asks for.
  Company registration number checked against the Jersey Financial Services Commission register, plus
  a named signatory.
- Recovery by signed, single-use, short-expiry token to a verified address; recovery must never
  reveal whether an account exists.
- Sessions: short-lived access token, rotating refresh token, server-side revocation list, and
  forced re-auth before contract acceptance.

## 4. Roles and permissions

The prototype's role switcher trusts an `X-Prototype-User-Id` header. **That header is a
deliberate prototype backdoor and must be deleted before any real deployment** — it is the single
most dangerous line in the repo.

Production needs three layers, and the prototype only implements the middle one:

- **Tenant isolation.** Every client-facing query filters on `organisationId`, which the prototype
  does and tests (`tests/api/contracts.test.ts`). Production hardens it: organisation id comes from
  the session, never from a parameter, and I would add row-level security in Postgres so a missing
  filter fails closed at the database rather than leaking.
- **Record-level authorisation.** Beyond "same org": a fitter sees only work orders assigned to them
  (implemented), a manager sees their accounts, an admin sees all.
- **Field-level.** `internalNotes` on a work order and non-`clientVisible` service events must never
  reach a client payload. The prototype strips these at the route boundary and asserts it in the
  connected-journey test. Production should enforce it with explicit response DTOs per audience
  rather than destructuring fields off the document, because "remember to omit the field" fails the
  first time someone adds a new one.

## 5. Contract versioning and the electronic-signature boundary

The prototype preserves version, dates, items, total, status and history, and a client action never
rewrites an issued contract — requesting changes moves it to `change_requested` and reissuing
increments the version.

Production makes each version an immutable row: issuing writes a new version with a content hash,
and the client accepts a specific version hash. Acceptance stores the hash, timestamp, user id and
IP. This matters because "which document did they actually agree to" is the only question that
matters in a dispute.

The prototype's accept button is **not** an electronic signature and is labelled as such. Production
draws the boundary at a qualified provider (DocuSign, Dropbox Sign) which handles signer identity,
tamper-evident sealing, the audit certificate and eIDAS/UK-eIDAS conformance. We store the envelope
id, the signed-document hash and the provider's completion webhook — we never rebuild signing
ourselves.

## 6. Proof files, scanning, signed access and field retry

Current shortcut: proof is a base64 data URI on the proof record, capped at 2MB, with the type
allow-list enforced server-side. Nothing is scanned. This keeps the prototype runnable with no cloud
account, which the brief asks for, but it is not shippable — it bloats documents, it cannot stream,
and it stores an unscanned attacker-controlled blob.

Production:

- Browser requests a short-lived pre-signed upload URL and uploads directly to S3/R2; the API never
  handles bytes.
- The object lands in a quarantine bucket. A scanner (ClamAV, or the cloud provider's native
  malware scanning) must pass before the object moves to the durable bucket and the proof record
  becomes visible. Client-visible until proven clean is the wrong default.
- Reads go through short-lived pre-signed GET URLs scoped to the requesting organisation. Never a
  public bucket.
- Strip EXIF (fitter location data) before the client-visible copy; keep the original internally.

**Offline and retry** is the field requirement that most affects real fitters. The prototype
implements a persisted upload queue with the original idempotency key retained across retries, an
online/offline listener, and a "simulate poor signal" toggle that exercises the 503 path on demand.
Production replaces the simulation with a service worker plus Background Sync, IndexedDB for
queued blobs rather than localStorage, and a visible per-item sync state. The idempotency key must be
generated on the device at capture time and reused on every retry — that is what makes "upload
succeeded but the response never arrived" safe.

## 7. PWA versus native

I would ship the fitter app as an installable PWA, not native, on this evidence: the job is a form,
a camera capture and a status transition; there is no background location, no BLE, no offline-first
sync of a large dataset. A PWA gives one codebase, no store review latency on a bug fix, and no
Apple/Google developer accounts. The honest cost: iOS PWA support for Background Sync and push is
weaker than Android's, and camera access is more constrained. I would revisit native only if
fitters need true background upload on iOS or offline maps — and I would validate that with the
actual fitters before spending the money.

## 8. Environments, CI/CD, migrations, backups, secrets

- Environments: preview per pull request, staging with anonymised data, production. Never a shared
  "dev" database.
- CI on every PR: typecheck, lint, unit and integration tests, a build, and dependency audit. The
  test suite here runs against an in-memory MongoDB so CI needs no service container.
- Migrations: versioned, forward-only, reviewed, run as a deploy step separate from the app rollout,
  and expand/contract for anything destructive so a rollback does not lose data.
- Backups: automated daily snapshots plus point-in-time recovery, and — the part usually skipped — a
  scheduled _restore_ test, because an untested backup is a hope.
- Rollback: immutable build artefacts, one-click revert to the previous release, feature flags for
  risky behaviour so a rollback does not require a deploy.
- Secrets: platform secret manager, injected at runtime, rotated on a schedule and on staff change,
  never in the repo. Dependency controls: lockfile committed, Dependabot/Renovate, and CI failing on
  known-critical advisories.

## 9. Approximate operating cost and what I would validate first

For a Jersey-scale deployment — one agency, tens of clients, low hundreds of work orders a month:

| Item                                               | Monthly        |
| -------------------------------------------------- | -------------- |
| App hosting (Vercel Pro or a small container host) | £20–£40        |
| Managed Postgres or MongoDB Atlas, backed up       | £25–£60        |
| Object storage + egress for proof                  | £5–£15         |
| Redis/queue                                        | £10–£20        |
| Error monitoring and logs                          | £0–£30         |
| Email/identity provider                            | £0–£40         |
| **Total**                                          | **≈ £60–£200** |

Infrastructure is not the cost of this system; maintenance is. Budget for a retained developer
day or two per month, and expect the media-owner reconciliation to be the recurring source of work.

**What I would validate before committing to production development**, in order:

1. **Sit with the fitters for a day.** The offline story, the camera flow and the completion
   requirements are all guesses until someone tries them in a depot with one bar of signal.
2. **Confirm how media owners actually publish availability.** The whole inventory model assumes we
   can reconcile against an export. If it is a phone call and a spreadsheet, the product changes
   shape and reconciliation becomes a human workflow, not a cron job.
3. **Test the contract flow with a real client and the agency's lawyer** to find where the
   prototype's acceptance step must become a real signature, and where it need not.
4. **Load-check the availability calculation** against a realistic asset count. It is O(assets ×
   bookings) per product today, which is free at 12 assets and will not be at 2,000.
5. **Agree the source of truth with whoever owns the accounting ledger** before writing a single
   billing line.
