"use client";

import { humanise } from "@/components/ui/status-pill";
import { formatDateTime } from "@/features/fitter/lib/format";
import type { HistoryEntry } from "@/lib/schemas";

export const HistoryTimeline = ({ history }: { history: HistoryEntry[] }) => (
  <section className="flex flex-col gap-2.5">
    <h2 className="text-sm font-semibold tracking-wide uppercase">History</h2>

    {history.length === 0 ? (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Nothing recorded yet.
      </p>
    ) : (
      <ol className="flex flex-col gap-0">
        {history.map((entry, index) => (
          <li
            key={`${entry.at}-${entry.action}-${index}`}
            className="flex gap-3 border-l border-border pb-4 pl-4 last:border-transparent last:pb-0"
          >
            <span className="-ml-[1.3125rem] mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm font-medium">{humanise(entry.action)}</p>
              <p className="text-xs text-muted-foreground">
                {entry.actor} · {formatDateTime(entry.at)}
              </p>
              {entry.note && <p className="text-sm">{entry.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
);
