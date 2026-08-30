# Design system

One operating model, three surfaces (client portal, management console, fitter field app).
Everything visual comes from tokens defined in `src/app/globals.css` under `@theme inline`.
There is no `tailwind.config.ts` — this is Tailwind v4.

## The one rule

**If a primitive exists in `src/components/ui`, use it.** Do not hand-roll a panel, pill,
callout, or heading. Every inconsistency this codebase has had traced back to a surface
being rebuilt by hand instead of reaching for the component.

## Component inventory

| Need | Use | Not |
| --- | --- | --- |
| Panel / card surface | `<Card>` + `<CardHeader>` / `<CardContent>` | a `div` with `rounded-xl border bg-card` |
| Status / state label | `<StatusPill status={...} />` | a hand-rolled `rounded-full` span |
| Tone-coloured message | `<Callout tone="warn">` | `bg-warn-surface` assembled inline |
| Page / section heading | `<PageTitle>`, `<SectionTitle>`, `<SubsectionLabel>` | `<h1 className="text-2xl …">` |
| Small uppercase kicker | `<Eyebrow>` | `text-xs tracking-[0.2em] uppercase` |
| Event history | `<Timeline items={historyItems(...)} />` | a per-feature timeline |
| Tabular data | `<DataTable columns={...} rows={...} />` | a bare `<Table>` |
| Date field | `<DatePicker>` / `<DateTimePicker>` | `<Input type="date">` |
| Loading / empty / error | `<LoadingState>`, `<EmptyState>`, `<ErrorState>` | inline dashed boxes |
| Nav item | `<NavLink>` | a `Link` with hand-written active styles |

`Card` carries the surface treatment: `rounded-xl`, `ring-1`, and `--card-spacing`.
Its edge is a **ring, not a border**. Anything that needs to look like a card but cannot be
one (a `form`, a `figure`, a tap-target `Link`) must use `ring-1 ring-foreground/10` so the
edges match.

## Button variants and sizes

Variants: `default` (primary action), `outline` (secondary), `ghost` (tertiary / nav-ish),
`destructive` (decline, cancel, discard), `secondary`, `link`.

Use `destructive` for every genuinely destructive action, not just some of them.

Sizes: `xs` `sm` `default` `lg`, the `icon-*` equivalents, and:

- **`touch` (44px)** and **`touch-lg` (56px)** — **mandatory on the fitter surface.**
  Every interactive control in `src/features/fitter` must meet the 44px minimum. Never
  reach for `className="h-11"`; if a new touch size is needed, add it to `buttonVariants`.

Never override `gap`, `px`, `text-*` or `h-*` on a `Button` — those come from the size
variant. If a size feels wrong, fix the variant once rather than at the call site.

## Semantic tones

Four tones, each with `-foreground` and `-surface`:

| Tone | Meaning |
| --- | --- |
| `ok` | Done, approved, accepted, available |
| `warn` | Needs a decision, awaiting someone, stale verification |
| `stop` | Blocked, declined, cancelled, unavailable |
| `info` | In flight, submitted, issued, assigned |

`src/components/ui/status-pill.tsx` is the **single source** of the status → tone mapping.
Add new statuses there, never inline. Border opacity on tone surfaces is `/25`.

Semantic tone is separate from the brand accent (`--primary`) and never substitutes for it.

## Type scale

| Component | Style |
| --- | --- |
| `<PageTitle>` | `font-heading text-2xl font-semibold tracking-tight sm:text-3xl` |
| `<SectionTitle>` | `font-heading text-lg font-semibold tracking-tight` |
| `<SubsectionLabel>` | `text-sm font-semibold tracking-wide uppercase` |
| `<Eyebrow>` | `text-eyebrow tracking-eyebrow font-semibold uppercase` |
| Body | `text-sm` |
| Meta / captions | `text-xs text-muted-foreground` |

Three weights only: `font-semibold`, `font-medium`, `font-normal`.

`--font-heading` currently aliases `--font-sans`. It is a **semantic hook for a future
display face**, not dead code — keep using `font-heading` on headings.

## Spacing

- Panel padding comes from `--card-spacing` (`Card`, or `Card size="sm"` for dense).
- Vertical stacks: `gap-3`. Page sections: `gap-6`.
- Form field wrapper: `flex flex-col gap-1.5` — the strongest existing convention, 40 usages.
- Prefer `gap` on a flex/grid parent over margins on children.

## Responsive

Every screen must work from **320px up** with no horizontal page scroll. The page body
never scrolls sideways; wide content scrolls inside its own container.

**Tables never scroll horizontally on mobile.** Use `<DataTable>`: it renders a real table
at `md:` and up, and one card per row below that. Give one column `role: "title"`, one
`role: "badge"`, and one `role: "action"` — the rest become label/value pairs on the card.
Pass `footer` for a totals row.

Three breakpoint rules. Apply them mechanically.

| Layout | Goes multi-column at |
| --- | --- |
| Form field grids, stat grids | `sm:grid-cols-2` |
| Compact card grids (products) | `sm:grid-cols-2 xl:grid-cols-3` |
| Dense card lists, page detail/sidebar splits | `lg:grid-cols-2` |

Page gutters step at `sm:px-6` on every shell.

Detail/sidebar splits use the `grid-cols-detail` token, not an inline `minmax()`.

## Container widths

Deliberately different per surface — do not "fix" this:

| Surface | Width | Why |
| --- | --- | --- |
| Management | `max-w-7xl` | Dense tables and multi-column detail views |
| Portal | `max-w-6xl` | Marketing-adjacent, comfortable reading measure |
| Fitter | `max-w-2xl` | Mobile-first, single column |

## Interaction states

Every interactive element needs a visible focus state. `Button` and `NavLink` handle it.
Anything hand-rolled must add:

```
focus-visible:ring-ring outline-none focus-visible:ring-2
```

The `* { outline-ring/50 }` base rule sets an outline *colour* only — it has no width and
does not provide a focus indicator on its own.

## Loading, empty, error

- Spinner + label: `<LoadingState label="Loading your jobs" />` — the default.
- Skeletons: only where the shape is known and a layout jump would be jarring
  (currently the fitter job list). Document any new use.
- Toasts: `sonner` only, via `toast.success` / `.error` / `.info`.

## Icons

`lucide-react` only. Standalone icons are `size-4`. Icons inside a `Button` are sized
automatically by the size variant — do not set a size class on them.

## Theme

**Light only.** There is no dark mode: no `.dark` block, no `dark:` variants, no
`next-themes`. Do not add `dark:` utilities — they will not compile to anything useful and
will drift. Style through the tokens in `:root`.

## No arbitrary values

There are none in `src/` and there should stay none. If you need a value that is not on a
Tailwind scale, add a named token to `@theme inline` — see `--text-eyebrow`,
`--spacing-touch`, `--grid-template-columns-detail`, `--radius-control-sm`.

The only hex literals live in `src/lib/constants.ts` (`THEME_COLOR`), because the browser
`theme-color` meta tag cannot read a CSS variable.

## Files and naming

- kebab-case filenames throughout, including `src/lib/domain`.
- Components: `export const Name = () => …`. `export default` only for Next.js route files.
- `components/ui` = primitives · `components/shared` = cross-surface composites ·
  `features/<surface>/{components,hooks,lib,store}` = surface-specific.
