"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/ui/states";
import { UploadQueuePanel } from "@/features/fitter/components/upload-queue-panel";
import { useProofQueue } from "@/features/fitter/hooks/use-proof-queue";
import { useStatusTransition } from "@/features/fitter/hooks/use-status-transition";
import { formatDateTime } from "@/features/fitter/lib/format";
import {
  ALLOWED_PROOF_LABEL,
  validateProofFile,
} from "@/features/fitter/lib/proof";
import { canTransitionWorkOrder } from "@/lib/domain/workOrders/stateMachine";
import type { FitterWorkOrderDetail } from "@/features/fitter/lib/types";

export const CompletionPanel = ({
  workOrder,
}: {
  workOrder: FitterWorkOrderDetail;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(workOrder.completionNote ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  const { isOnline, pending, queueProof, retry, discard } = useProofQueue(
    workOrder.id
  );
  const transition = useStatusTransition(workOrder.id);

  const proofCount = workOrder.proofRecords.length;
  const canComplete = canTransitionWorkOrder(workOrder.status, "completed");
  const hasNote = note.trim().length >= 3;
  const readyToComplete = canComplete && hasNote && proofCount > 0;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }

    const invalid = validateProofFile(selected);
    if (invalid) {
      toast.error(invalid);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(selected);
  };

  const handleAttach = async () => {
    if (!file) {
      toast.error("Choose or capture a photo first.");
      return;
    }

    if (!hasNote) {
      toast.error("Add a completion note of at least 3 characters.");
      return;
    }

    setIsAttaching(true);
    await queueProof({
      workOrderId: workOrder.id,
      file,
      completionNote: note,
    });
    setIsAttaching(false);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleComplete = () => {
    if (proofCount === 0) {
      toast.error(
        "Upload at least one proof attachment before marking this job complete."
      );
      return;
    }

    transition.mutate({ status: "completed", note: note.trim() });
  };

  if (workOrder.status === "completed") {
    return (
      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-semibold tracking-wide uppercase">
          Completion record
        </h2>
        {workOrder.completionNote && (
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            {workOrder.completionNote}
          </p>
        )}
        {workOrder.proofRecords.map((proof) => (
          <p
            key={proof.id}
            className="flex items-center gap-2 rounded-xl border border-ok/25 bg-ok-surface px-4 py-3 text-sm text-ok-foreground"
          >
            <FileCheck2 className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{proof.fileName}</span>
            <span className="shrink-0 text-xs">
              {formatDateTime(proof.createdAt)}
            </span>
          </p>
        ))}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide uppercase">
        Complete the job
      </h2>

      {proofCount === 0 && (
        <Callout tone="warn" title="Proof required">
          A completion note and at least one photo are needed before this job
          can be closed.
        </Callout>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="completion-note">Completion note</Label>
        <Textarea
          id="completion-note"
          value={note}
          rows={3}
          placeholder="Describe the finished work, e.g. Rear panel fitted and aligned, asset ID photographed."
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="proof-file">Proof photo</Label>
        <input
          ref={inputRef}
          id="proof-file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="block h-14 w-full cursor-pointer rounded-lg border border-border bg-card p-3 text-sm file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-primary file:px-3 file:text-sm file:font-medium file:text-primary-foreground"
        />
        <p className="text-xs text-muted-foreground">
          {ALLOWED_PROOF_LABEL}, up to 2MB. Opens the camera on a phone.
        </p>
      </div>

      <Button
        className="h-14 w-full gap-2 text-base"
        disabled={!file || isAttaching}
        onClick={handleAttach}
      >
        {isAttaching ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Camera className="size-5" />
        )}
        {isOnline ? "Attach proof" : "Save proof for later"}
      </Button>

      {proofCount > 0 && (
        <div className="flex flex-col gap-2">
          {workOrder.proofRecords.map((proof) => (
            <p
              key={proof.id}
              className="flex items-center gap-2 rounded-xl border border-ok/25 bg-ok-surface px-4 py-3 text-sm text-ok-foreground"
            >
              <FileCheck2 className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{proof.fileName}</span>
              <span className="shrink-0 text-xs">
                {formatDateTime(proof.createdAt)}
              </span>
            </p>
          ))}
        </div>
      )}

      <UploadQueuePanel
        items={pending}
        isOnline={isOnline}
        onRetry={(item) => void retry(item)}
        onDiscard={discard}
      />

      {!canComplete && (
        <Callout tone="info">
          Mark yourself on site before completing this job.
        </Callout>
      )}

      <Button
        className="h-14 w-full gap-2 text-base"
        disabled={!readyToComplete || transition.isPending}
        onClick={handleComplete}
      >
        {transition.isPending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <CheckCircle2 className="size-5" />
        )}
        Mark complete
      </Button>
    </section>
  );
};
