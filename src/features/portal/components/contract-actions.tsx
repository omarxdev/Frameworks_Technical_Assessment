"use client";

import { useState } from "react";
import { CircleCheck, MessageSquareWarning, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/ui/states";
import {
  errorCode,
  errorMessage,
  useContractAction,
} from "@/features/portal/hooks/use-portal-data";
import type { ContractActionName } from "@/features/portal/lib/types";
import type { ContractStatus } from "@/lib/schemas";

const dialogCopy = {
  accept: {
    title: "Accept this contract",
    description:
      "Accepting confirms the dates, line items and total below. We recheck live availability at this moment — if something has been taken since the contract was issued, acceptance is refused and nothing changes.",
    label: "Note for our team (optional)",
    confirm: "Accept contract",
    noteRequired: false,
  },
  request_changes: {
    title: "Request changes",
    description:
      "Tell us what needs to change. Your contract stays as it is until our team reviews the request and reissues it.",
    label: "What needs to change?",
    confirm: "Submit change request",
    noteRequired: true,
  },
  request_cancellation: {
    title: "Request cancellation",
    description:
      "Cancellation is a request, not an instruction. Your contract remains in force until our team reviews it and confirms the outcome with you.",
    label: "Why do you need to cancel?",
    confirm: "Submit cancellation request",
    noteRequired: true,
  },
};

export const ContractActions = ({
  contractId,
  status,
}: {
  contractId: string;
  status: ContractStatus;
}) => {
  const [openAction, setOpenAction] = useState<ContractActionName | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [conflictMessage, setConflictMessage] = useState("");
  const mutation = useContractAction(contractId);

  const canAccept = status === "issued";
  const canRequestChanges = status === "issued";
  const canRequestCancellation = status !== "completed" && status !== "cancelled";

  const handleOpen = (action: ContractActionName) => {
    setNote("");
    setNoteError("");
    mutation.reset();
    setOpenAction(action);
  };

  const handleClose = (open: boolean) => {
    if (open) return;
    setOpenAction(null);
    setNoteError("");
  };

  const handleConfirm = () => {
    if (!openAction) return;
    const copy = dialogCopy[openAction];

    if (copy.noteRequired && !note.trim()) {
      setNoteError("A note is required so management can review your request.");
      return;
    }

    setConflictMessage("");

    mutation.mutate(
      { action: openAction, note },
      {
        onSuccess: () => {
          setOpenAction(null);
          setNote("");
          toast.success(
            openAction === "accept"
              ? "Contract accepted — your campaign is now active"
              : "Submitted — awaiting management review"
          );
        },
        onError: (error) => {
          if (errorCode(error) === "INVENTORY_CONFLICT") {
            setConflictMessage(
              errorMessage(error, "This contract can no longer be activated.")
            );
            setOpenAction(null);
          }
          toast.error(errorMessage(error, "That action could not be completed."));
        },
      }
    );
  };

  const copy = openAction ? dialogCopy[openAction] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle size="lg">What you can do</CardTitle>
        <CardDescription>
          Change and cancellation requests are reviewed by our team — they are never
          applied automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {conflictMessage && (
          <Callout tone="stop" title="Acceptance refused — inventory conflict">
            <p>{conflictMessage}</p>
            <p className="mt-1">
              Nothing has changed on your contract. Our team has been notified and will
              come back to you with an alternative.
            </p>
          </Callout>
        )}

        <div className="flex flex-wrap gap-2">
          {canAccept && (
            <Button
              type="button"
              onClick={() => handleOpen("accept")}
              disabled={mutation.isPending}
            >
              <CircleCheck className="size-4" />
              Accept contract
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={!canRequestChanges || mutation.isPending}
            onClick={() => handleOpen("request_changes")}
          >
            <MessageSquareWarning className="size-4" />
            Request changes
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={!canRequestCancellation || mutation.isPending}
            onClick={() => handleOpen("request_cancellation")}
          >
            <Ban className="size-4" />
            Request cancellation
          </Button>
        </div>

        {!canAccept && (
          <p className="text-muted-foreground text-sm">
            Acceptance is only offered while a contract is issued for your review.
          </p>
        )}

        {!canRequestChanges && canRequestCancellation && (
          <p className="text-muted-foreground text-sm">
            Changes can only be requested while a contract is issued. For a live
            contract, raise a cancellation request or speak to your account manager.
          </p>
        )}
      </CardContent>

      <Dialog open={Boolean(openAction)} onOpenChange={handleClose}>
        <DialogContent>
          {copy && (
            <>
              <DialogHeader>
                <DialogTitle>{copy.title}</DialogTitle>
                <DialogDescription>{copy.description}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="actionNote">{copy.label}</Label>
                <Textarea
                  id="actionNote"
                  rows={4}
                  value={note}
                  aria-invalid={Boolean(noteError)}
                  onChange={(event) => {
                    setNote(event.target.value);
                    if (noteError) setNoteError("");
                  }}
                />
                {noteError && (
                  <p className="text-stop-foreground text-sm">{noteError}</p>
                )}
              </div>

              {mutation.isError && (
                <Callout tone="stop" title="We could not complete that">
                  {errorMessage(mutation.error, "Please try again.")}
                </Callout>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Submitting" : copy.confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
