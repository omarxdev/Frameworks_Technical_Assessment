# Walkthrough script

Target 7 minutes. The fixtures already contain the narrative — a blocked request, an issued
contract waiting for acceptance, and an assigned field job — so nothing needs to be invented on
camera.

**Before recording:** `bun run seed`, then `bun dev`. Recording at a phone-width window for the
fitter section is worth the extra 20 seconds; it is a mobile-first surface and looks wrong at
desktop width.

The fixture clock is 15 January 2027. Say this once, early — otherwise every date on screen looks
like a bug.

---

## 0:00 — What this is (30s)

Land on `/`. Three surfaces, one operating model, one database.

> "Island Media sells advertising space on buses, transport hubs and EV chargers. A client browses
> and requests, the agency approves and contracts, a fitter installs and photographs it. Three
> different jobs, three different interfaces, one set of rules underneath."

Point at the role switcher. Be explicit that it is a prototype device, not authentication.

---

## 0:30 — Client portal, the zero-contract case (60s)

Switch to **Avery Stone / Silverline Fitness**. Lands on `/portal` — a welcome panel, not an empty
table. Say why: a brand-new client with no contracts is the most common first visit, and an empty
data grid is the worst possible answer to it.

Go to **Catalogue**. Set dates 12 Feb → 18 Feb 2027.

- Bus rear panel shows **Unavailable**, with the reason in plain English.
- Note the rate labels: "From £950 per month", "per 2 weeks". These are printed verbatim from the
  data, never recomputed into a common unit — the units genuinely differ between products.
- Point out one **Price on request** product and say it is excluded from budget filtering rather
  than being treated as zero.

Open **Bus rear panel**. Per-asset blockers, each naming what blocks it and when.

Change the dates to **2 Apr → 1 May 2027**. It flips to available. Submit a request. Land on the
confirmation and read the line aloud: nothing is reserved, no payment has been taken, awaiting
review.

> "A request is a request. The client cannot book themselves into the inventory."

---

## 1:30 — Management, and the conflict explainer (90s)

Switch to **Morgan Reed**. `/management` opens on attention, not a dashboard of totals — the queue
is the job.

Open **request-001** (Silverline, Bus rear panel, 12–18 Feb).

This is the screen to spend time on. It is the piece I added beyond the brief:

> "The brief says approval must fail when inventory is not free. It does. But 'unavailable' is not
> a useful answer to give a manager who has a client on the phone. So the same availability engine
> that returns the yes/no also returns _why_ — every blocker, named, with its dates and what it is."

Three conflicts: two confirmed bookings and a maintenance outage, each with the window it blocks.

Click **Approve**. It fails with a 409 and the same explanation. Show that the status stays
**Submitted**.

> "The check runs server-side at the moment of approval, not from what the page was showing. If
> someone else had taken that window while this page was open, this still fails."

Then approve the Silverline request submitted a minute ago — the April window — and show it
succeeding. Create the draft contract, issue it.

---

## 3:00 — The client accepts (60s)

Switch to **Jordan Ellis / Lighthouse Learning**. Open **contract-001**, status **Issued**.

Show the line items and the version number. Accept it.

> "Availability is rechecked _again_ here, at activation — not just at approval. Between issuing a
> contract and a client accepting it, days pass. That is the window where a double-booking gets in."

The contract goes **Active** and the bookings become confirmed.

Also worth 15 seconds: **Request changes** on an active contract is disabled, with the reason
stated. The server rejects that transition, so the button does not pretend otherwise.

---

## 4:00 — The fitter, at phone width (105s)

Switch to **Casey Morgan**, narrow the window. `/fitter`.

Jobs split into Today and Upcoming against the fixture clock. Open **Van 12 rear**.

Walk the state machine, and let the UI make the point:

- Only legal transitions are offered. From **Assigned** there is no "complete" button.
- Completion is gated: _"Mark yourself on site before completing this job."_
- **Report blocked** demands a reason before it will submit. Show the refusal, then cancel out.
- **Mark complete** demands a note and a photo.

Move to **On my way**, then **Arrived on site**.

Now the part worth the most: flip **Simulate poor signal** on. Attach a photo and complete.

The upload fails with a 503. The proof does not vanish — it is queued on the device with a visible
retry.

> "The idempotency key is generated on the device when the photo is taken, and reused on every
> retry. That is what makes the dangerous case safe: the upload reached the server, the response
> did not reach the phone. Retrying cannot create a second proof record."

Flip the toggle off, retry, watch it upload and the job close.

---

## 5:45 — The loop closes (45s)

Back to the client portal for that campaign. The proof and the completion are on the client's
timeline.

> "That is the whole point of the exercise: one fitter's photo, taken on a phone in a depot, is
> what the client sees as evidence their advert is live."

Then state what the client does _not_ see: internal notes on the work order, and any service event
not marked client-visible. Both stripped at the route boundary, both asserted in a test.

---

## 6:30 — Decisions and honesty (60s)

Close on judgement rather than features.

**The domain layer.** `src/lib/domain` imports nothing from Next.js or MongoDB. Availability, the
state machines and idempotency are testable without a server, and extractable later. Availability
is computed, never stored — caching it is exactly how the double-booking bug gets in.

**The bug worth admitting.** Stale verification was first written as a substring match on an
asset's note. It passed, because the asset carrying that note is genuinely stale. But a second
asset, verified even longer ago and carrying no note, was silently treated as fresh. It is now
computed from the `verifiedAt` timestamp, and both assets surface. A green test on a wrong rule is
worse than no test.

**The shortcut that must not ship.** The `X-Prototype-User-Id` header lets any caller assert an
identity. It exists so the API is curl-testable against the supplied contract; the browser uses a
signed httpOnly cookie instead. It is documented as the single most dangerous line in the repo and
it must be deleted before any real deployment.

Close on the productionisation note: what changes, what it costs, and the five things worth
validating before anyone commits to building this properly.
