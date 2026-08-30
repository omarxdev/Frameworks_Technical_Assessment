"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export const BlockedDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  serverError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  serverError: string | null;
}) => {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const clientError =
    touched && !trimmed
      ? "A reason is required before a job can be marked blocked."
      : null;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setTouched(false);
    }
    onOpenChange(next);
  };

  const handleConfirm = () => {
    setTouched(true);
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Why is this job blocked?</DialogTitle>
          <DialogDescription>
            The reason is shared with the operations team so they can unblock you. It is
            required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="blocked-reason">Reason</Label>
          <Textarea
            id="blocked-reason"
            value={reason}
            rows={4}
            autoFocus
            placeholder="e.g. Depot gate locked, no key holder on site."
            aria-invalid={Boolean(clientError)}
            onBlur={() => setTouched(true)}
            onChange={(event) => setReason(event.target.value)}
          />
          {clientError && (
            <p role="alert" className="text-stop-foreground text-sm">
              {clientError}
            </p>
          )}
          {!clientError && serverError && (
            <p role="alert" className="text-stop-foreground text-sm">
              {serverError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="touch" className="flex-1"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="touch" className="flex-1" disabled={isPending} onClick={handleConfirm}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Mark blocked
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
