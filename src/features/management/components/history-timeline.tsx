"use client";

import { humanise } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/features/management/lib/format";
import type { HistoryEntry } from "@/features/management/lib/types";

export const HistoryTimeline = ({ entries }: { entries: HistoryEntry[] }) => {
  if (entries.length === 0) {
    return <EmptyState title="No history yet" message="Actions will be recorded here." />;
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            {index < entries.length - 1 && (
              <span className="w-px grow bg-border" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 pb-5">
            <p className="text-sm font-medium">{humanise(entry.action)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(entry.at)} · {entry.actor}
            </p>
            {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};
