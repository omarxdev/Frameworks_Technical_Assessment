"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import type { AttentionItem, AttentionPriority } from "@/features/management/lib/types";
import { SubsectionLabel } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";

const priorityOrder: Record<AttentionPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
};

const priorityMeta: Record<
  AttentionPriority,
  {
    label: string;
    tone: "stop" | "warn" | "info";
    card: string;
    iconClass: string;
    icon: typeof Bell;
  }
> = {
  urgent: {
    label: "Urgent",
    tone: "stop",
    card: "border-stop/25 bg-stop-surface/40",
    iconClass: "text-stop",
    icon: ShieldAlert,
  },
  high: {
    label: "High",
    tone: "warn",
    card: "border-warn/25 bg-warn-surface/40",
    iconClass: "text-warn",
    icon: AlertTriangle,
  },
  normal: {
    label: "Normal",
    tone: "info",
    card: "border-border bg-card",
    iconClass: "text-info",
    icon: Bell,
  },
};

const resolvePriority = (value: string): AttentionPriority =>
  value === "urgent" || value === "high" ? value : "normal";

const actionLabel = (type: string) => {
  if (type === "booking_request") return "Review request";
  if (type === "work_order_blocked") return "Open work order";
  if (type === "client_change_request") return "Review request";
  return "Open";
};

export const AttentionPanel = ({ items }: { items: AttentionItem[] }) => {
  const sorted = [...items].sort(
    (a, b) =>
      priorityOrder[resolvePriority(a.priority)] -
      priorityOrder[resolvePriority(b.priority)]
  );

  const groups = (["urgent", "high", "normal"] as AttentionPriority[])
    .map((priority) => ({
      priority,
      entries: sorted.filter((item) => resolvePriority(item.priority) === priority),
    }))
    .filter((group) => group.entries.length > 0);

  if (groups.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Nothing needs your attention"
          message="No pending requests, blocked work orders, client change requests or stale verifications."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ priority, entries }) => {
        const meta = priorityMeta[priority];
        const Icon = meta.icon;

        return (
          <section key={priority} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon className={cn("size-4", meta.iconClass)} />
              <SubsectionLabel>
                {meta.label}
                <span className="text-muted-foreground ml-2 font-normal">
                  {entries.length} item{entries.length === 1 ? "" : "s"}
                </span>
              </SubsectionLabel>
            </div>

            <ul className="grid gap-3 lg:grid-cols-2">
              {entries.map((item) => {
                const href = item.link ?? null;

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border p-4",
                      meta.card
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      <StatusPill status={meta.label} tone={meta.tone} />
                    </div>
                    <p className="text-muted-foreground text-sm">{item.message}</p>
                    {href ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="bg-background w-fit gap-1.5"
                      >
                        <Link href={href}>
                          {actionLabel(item.type)}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No linked record — resolve with the media owner directly.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
