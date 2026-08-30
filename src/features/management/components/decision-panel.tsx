"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { BlockerList } from "@/features/management/components/blocker-list";
import {
  asApiError,
  blockersFromError,
  useRequestDecision,
} from "@/features/management/hooks/use-management-actions";
import { formatMoment as formatDateTime } from "@/lib/format";
import { FIXTURE_CLOCK } from "@/lib/constants";
import type { AssetOption } from "@/lib/schemas";
import { SectionTitle } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";

type DecisionAction = "approve" | "decline" | "request_information";

const actions: {
  value: DecisionAction;
  label: string;
  variant: "default" | "outline";
}[] = [
  { value: "approve", label: "Approve", variant: "default" },
  { value: "request_information", label: "Request information", variant: "outline" },
  { value: "decline", label: "Decline", variant: "outline" },
];

export const DecisionPanel = ({
  requestId,
  status,
  allocationModel,
  assetOptions,
  assetOptionsPending,
  requestedAssetId,
}: {
  requestId: string;
  status: string;
  allocationModel: "exclusive_asset" | "capacity_pool";
  assetOptions: AssetOption[];
  assetOptionsPending: boolean;
  requestedAssetId?: string | null;
}) => {
  const [action, setAction] = useState<DecisionAction>("approve");
  const [note, setNote] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState(requestedAssetId ?? "");

  const decision = useRequestDecision(requestId);
  const apiError = asApiError(decision.error);
  const conflictBlockers = blockersFromError(decision.error);
  const needsNote = action !== "approve";
  const isExclusive = allocationModel === "exclusive_asset";
  const selectableAssets = assetOptions.filter(
    (asset) => asset.availability.state !== "unavailable"
  );

  const handleSubmit = () => {
    if (needsNote && note.trim().length === 0) return;

    decision.mutate({
      action,
      note: note.trim() ? note.trim() : null,
      selectedAssetId:
        action === "approve" && isExclusive && selectedAssetId ? selectedAssetId : null,
    });
  };

  if (status === "approved" || status === "declined") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <SectionTitle>
              Decision
            </SectionTitle>
            <StatusPill status={status} />
          </div>
          <p className="text-muted-foreground text-sm">
            This request has been {status}. The decision and its note are recorded in the
            history below.
          </p>
              </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <SectionTitle>
            Record a decision
          </SectionTitle>
          <p className="text-muted-foreground text-sm">
            Approving rechecks live inventory on the server before it commits.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={action === option.value ? "default" : "outline"}
              aria-pressed={action === option.value}
              onClick={() => setAction(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {action === "approve" && isExclusive && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="selected-asset">Asset to allocate</Label>
            {assetOptionsPending ? (
              <LoadingState label="Loading asset options" className="py-4" />
            ) : selectableAssets.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No asset is currently allocatable for these dates. Approving will be
                rejected by the availability recheck.
              </p>
            ) : (
              <>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger id="selected-asset" className="w-full sm:w-96">
                    <SelectValue placeholder="Let the system choose the first free asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ·{" "}
                        {asset.availability.state === "confirmation_required"
                          ? "needs verification"
                          : "free"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAssetId && (
                  <p className="text-muted-foreground text-xs">
                    {
                      assetOptions.find((asset) => asset.id === selectedAssetId)
                        ?.availability.reason
                    }
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decision-note">
            Note {needsNote ? "(required)" : "(optional)"}
          </Label>
          <Textarea
            id="decision-note"
            rows={3}
            value={note}
            placeholder={
              action === "approve"
                ? "Anything the team should know about this approval."
                : "Explain what the client needs to change or provide."
            }
            onChange={(event) => setNote(event.target.value)}
          />
          {needsNote && note.trim().length === 0 && (
            <p className="text-muted-foreground text-xs">
              A reason is required so the client understands the outcome.
            </p>
          )}
        </div>

        {apiError && apiError.code === "INVENTORY_CONFLICT" && (
          <Callout tone="stop" size="lg" subtle className="flex flex-col gap-3">
            <div>
              <p className="text-stop-foreground text-sm font-semibold">
                Approval rejected — inventory conflict
              </p>
              <p className="text-stop-foreground text-sm">{apiError.message}</p>
            </div>
            {conflictBlockers.length > 0 && (
              <>
                <p className="text-muted-foreground text-xs">
                  {conflictBlockers.length} conflicting record
                  {conflictBlockers.length === 1 ? "" : "s"} found during the server
                  recheck:
                </p>
                <BlockerList blockers={conflictBlockers} />
              </>
            )}
            <p className="text-muted-foreground text-xs">
              Resolve the conflict, choose a different asset, or decline the request with
              a note back to the client.
            </p>
          </Callout>
        )}

        {apiError && apiError.code !== "INVENTORY_CONFLICT" && (
          <Callout tone="stop" title={`Decision failed (${apiError.code})`}>
            {apiError.message}
          </Callout>
        )}

        {decision.isSuccess && (
          <Callout tone="ok" title="Decision recorded">
            Saved at {formatDateTime(FIXTURE_CLOCK)} — the client timeline has been
            updated.
          </Callout>
        )}

        <div>
          <Button
            type="button"
            disabled={decision.isPending || (needsNote && note.trim().length === 0)}
            onClick={handleSubmit}
          >
            {decision.isPending && <Loader2 className="size-4 animate-spin" />}
            {action === "approve"
              ? "Approve request"
              : action === "decline"
                ? "Decline request"
                : "Request information"}
          </Button>
        </div>
          </CardContent>
    </Card>
  );
};
