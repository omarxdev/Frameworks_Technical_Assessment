import { EmptyState } from "@/components/ui/states";
import { humanise } from "@/components/ui/status-pill";
import { formatMoment } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HistoryEntry, ServiceEvent } from "@/lib/schemas";

const dotTones = {
  primary: "bg-primary",
  muted: "bg-border",
};

export type TimelineItem = {
  key: string;
  title: string;
  meta: string;
  note?: string | null;
};

export const historyItems = (entries: HistoryEntry[]): TimelineItem[] =>
  entries.map((entry, index) => ({
    key: `${entry.at}-${entry.action}-${index}`,
    title: humanise(entry.action),
    meta: `${formatMoment(entry.at)} · ${entry.actor}`,
    note: entry.note,
  }));

export const serviceEventItems = (events: ServiceEvent[]): TimelineItem[] =>
  events.map((event) => ({
    key: event.id,
    title: event.title,
    meta: `${formatMoment(event.at)} · ${humanise(event.type)}`,
    note: event.clientSummary,
  }));

export const Timeline = ({
  items,
  dotTone = "primary",
  emptyTitle = "No history yet",
  emptyMessage = "Actions will be recorded here.",
  className,
}: {
  items: TimelineItem[];
  dotTone?: keyof typeof dotTones;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}) => {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item, index) => (
        <li key={item.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                dotTones[dotTone]
              )}
            />
            {index < items.length - 1 && (
              <span className="bg-border w-px grow" aria-hidden="true" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-5 last:pb-0">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-muted-foreground text-xs">{item.meta}</p>
            {item.note && (
              <p className="text-muted-foreground text-sm">{item.note}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};
