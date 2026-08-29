import { humanise } from "@/components/ui/status-pill";
import { formatDateTime } from "@/features/portal/lib/format";
import type { HistoryEntry, ServiceEvent } from "@/lib/schemas";

export const ServiceEventTimeline = ({
  events,
}: {
  events: ServiceEvent[];
}) => (
  <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
    {events.map((event) => (
      <li key={event.id} className="relative">
        <span className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-primary ring-4 ring-background" />
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(event.at)} · {humanise(event.type)}
        </p>
        {event.clientSummary && (
          <p className="mt-1 text-sm text-muted-foreground">
            {event.clientSummary}
          </p>
        )}
      </li>
    ))}
  </ol>
);

export const HistoryTimeline = ({ history }: { history: HistoryEntry[] }) => (
  <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
    {history.map((entry, index) => (
      <li key={`${entry.at}-${entry.action}-${index}`} className="relative">
        <span className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-border ring-4 ring-background" />
        <p className="text-sm font-medium">{humanise(entry.action)}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(entry.at)} · {entry.actor}
        </p>
        {entry.note && (
          <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
        )}
      </li>
    ))}
  </ol>
);
