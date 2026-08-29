"use client";

import { useState } from "react";
import { Loader2, MapPin, OctagonAlert, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/states";
import { BlockedDialog } from "@/features/fitter/components/blocked-dialog";
import { useStatusTransition } from "@/features/fitter/hooks/use-status-transition";
import { VALID_WORK_ORDER_TRANSITIONS } from "@/lib/domain/workOrders/stateMachine";
import type { WorkOrderStatus } from "@/lib/schemas";

const progressSteps = [
  { status: "travelling" as const, label: "On my way", icon: Truck },
  { status: "on_site" as const, label: "Arrived on site", icon: MapPin },
];

export const ProgressActions = ({
  workOrderId,
  status,
}: {
  workOrderId: string;
  status: WorkOrderStatus;
}) => {
  const [isBlockedOpen, setIsBlockedOpen] = useState(false);
  const transition = useStatusTransition(workOrderId);

  const allowed = VALID_WORK_ORDER_TRANSITIONS[status];
  const steps = progressSteps.filter((step) => allowed.includes(step.status));
  const canBlock = allowed.includes("blocked");

  const handleStep = (next: WorkOrderStatus) => {
    transition.mutate({ status: next });
  };

  const handleBlockedConfirm = (reason: string) => {
    transition.mutate(
      { status: "blocked", note: reason },
      { onSuccess: () => setIsBlockedOpen(false) }
    );
  };

  if (status === "completed") {
    return (
      <Callout tone="ok" title="Job complete">
        Proof and completion notes have been filed. No further progress updates
        are needed.
      </Callout>
    );
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold tracking-wide uppercase">
        Update progress
      </h2>

      {steps.length === 0 && !canBlock && (
        <Callout tone="info">
          No progress updates are available from the {status.replace(/_/g, " ")}{" "}
          state.
        </Callout>
      )}

      {steps.map(({ status: next, label, icon: Icon }) => (
        <Button
          key={next}
          className="h-14 w-full justify-start gap-3 text-base"
          disabled={transition.isPending}
          onClick={() => handleStep(next)}
        >
          {transition.isPending && transition.variables?.status === next ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Icon className="size-5" />
          )}
          {label}
        </Button>
      ))}

      {canBlock && (
        <Button
          variant="destructive"
          className="h-14 w-full justify-start gap-3 text-base"
          disabled={transition.isPending}
          onClick={() => setIsBlockedOpen(true)}
        >
          <OctagonAlert className="size-5" />
          Report blocked
        </Button>
      )}

      <BlockedDialog
        open={isBlockedOpen}
        onOpenChange={setIsBlockedOpen}
        isPending={transition.isPending && transition.variables?.status === "blocked"}
        serverError={
          transition.error && transition.variables?.status === "blocked"
            ? transition.error.message
            : null
        }
        onConfirm={handleBlockedConfirm}
      />
    </section>
  );
};
