import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "ok" | "warn" | "stop";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-info-surface text-info-foreground ring-info/25",
  ok: "bg-ok-surface text-ok-foreground ring-ok/25",
  warn: "bg-warn-surface text-warn-foreground ring-warn/25",
  stop: "bg-stop-surface text-stop-foreground ring-stop/25",
};

const statusTones: Record<string, Tone> = {
  draft: "neutral",
  submitted: "info",
  information_required: "warn",
  approved: "ok",
  declined: "stop",
  issued: "info",
  change_requested: "warn",
  accepted: "ok",
  active: "ok",
  completed: "ok",
  cancelled: "stop",
  assigned: "info",
  travelling: "info",
  on_site: "info",
  blocked: "stop",
  available: "ok",
  unavailable: "stop",
  confirmation_required: "warn",
  awaiting_contract_acceptance: "warn",
  pending: "warn",
  resolved: "ok",
};

export const toneForStatus = (status: string): Tone => statusTones[status] ?? "neutral";

export const humanise = (value: string) =>
  value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export const StatusPill = ({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
      tones[tone ?? toneForStatus(status)],
      className
    )}
  >
    {humanise(status)}
  </span>
);
