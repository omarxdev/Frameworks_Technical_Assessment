"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Callout, ErrorState, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import {
  asApiError,
  useCreateWorkOrder,
} from "@/features/management/hooks/use-management-actions";
import { useWorkOrders } from "@/features/management/hooks/use-management-data";
import { toIsoFromLocalInput } from "@/features/management/lib/format";
import { PROTOTYPE_USER_PROFILES } from "@/lib/constants";

const workOrderTypes = ["survey", "production", "installation", "maintenance", "removal"];

const fitters = PROTOTYPE_USER_PROFILES.filter((profile) => profile.role === "fitter");

export const WorkOrderForm = () => {
  const router = useRouter();
  const references = useWorkOrders("all");
  const createWorkOrder = useCreateWorkOrder();
  const apiError = asApiError(createWorkOrder.error);

  const [campaignId, setCampaignId] = useState("");
  const [contractId, setContractId] = useState("");
  const [type, setType] = useState("installation");
  const [assignedUserId, setAssignedUserId] = useState(fitters[0]?.id ?? "");
  const [assetId, setAssetId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("2027-01-20T09:00");
  const [scheduledEnd, setScheduledEnd] = useState("2027-01-20T12:00");
  const [locationLabel, setLocationLabel] = useState("");
  const [instructions, setInstructions] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  if (references.isPending) return <LoadingState label="Loading contracts and assets" />;

  if (references.isError) {
    return (
      <ErrorState
        title="The work order form could not be prepared"
        message={
          references.error instanceof Error ? references.error.message : undefined
        }
        onRetry={() => references.refetch()}
      />
    );
  }

  const { campaigns, contracts, assets } = references.data.references;
  const activeAssets = assets.filter((asset) => asset.status === "active");

  const handleCampaignChange = (value: string) => {
    setCampaignId(value);
    const campaign = campaigns.find((entry) => entry.id === value);
    if (campaign) setContractId(campaign.contractId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    createWorkOrder.mutate(
      {
        campaignId,
        contractId,
        type,
        assignedUserId,
        assetId,
        scheduledStart: toIsoFromLocalInput(scheduledStart),
        scheduledEnd: toIsoFromLocalInput(scheduledEnd),
        locationLabel,
        instructions,
        internalNotes: internalNotes.trim() ? internalNotes.trim() : undefined,
      },
      { onSuccess: () => router.push("/management/work-orders") }
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit gap-1.5 px-2">
          <Link href="/management/work-orders">
            <ArrowLeft className="size-3.5" />
            All work orders
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            New work order
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign a field job against a campaign. The client sees an
            &ldquo;installation scheduled&rdquo; update, never the internal notes.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex max-w-3xl flex-col gap-5 rounded-xl border border-border bg-card p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign">Campaign</Label>
            <Select value={campaignId} onValueChange={handleCampaignChange} required>
              <SelectTrigger id="campaign" className="w-full">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract">Contract</Label>
            <Select value={contractId} onValueChange={setContractId} required>
              <SelectTrigger id="contract" className="w-full">
                <SelectValue placeholder="Select a contract" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.id} · {contract.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workOrderTypes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fitter">Assigned fitter</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId} required>
              <SelectTrigger id="fitter" className="w-full">
                <SelectValue placeholder="Select a fitter" />
              </SelectTrigger>
              <SelectContent>
                {fitters.map((fitter) => (
                  <SelectItem key={fitter.id} value={fitter.id}>
                    {fitter.name} · {fitter.badge}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={assetId} onValueChange={setAssetId} required>
              <SelectTrigger id="asset" className="w-full">
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {activeAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} · {asset.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduled-start">Scheduled start (UTC)</Label>
            <Input
              id="scheduled-start"
              type="datetime-local"
              required
              value={scheduledStart}
              onChange={(event) => setScheduledStart(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduled-end">Scheduled end (UTC)</Label>
            <Input
              id="scheduled-end"
              type="datetime-local"
              required
              value={scheduledEnd}
              onChange={(event) => setScheduledEnd(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="location-label">Location label</Label>
            <Input
              id="location-label"
              required
              placeholder="ParcelFleet East depot"
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instructions">Instructions for the fitter</Label>
          <Textarea
            id="instructions"
            rows={3}
            required
            placeholder="What to fit, what to photograph, who to report to on arrival."
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/50 p-4">
          <Label htmlFor="internal-notes" className="flex items-center gap-1.5">
            <EyeOff className="size-3.5" />
            Internal notes
          </Label>
          <p className="text-xs text-muted-foreground">
            Visible to management and the assigned fitter only. This is never sent to the
            client portal or included in any client-visible timeline.
          </p>
          <Textarea
            id="internal-notes"
            rows={3}
            placeholder="Depot gate codes, margin notes, escalation contacts."
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
          />
        </div>

        {apiError && (
          <Callout tone="stop" title={`Could not create the work order (${apiError.code})`}>
            {apiError.message}
          </Callout>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={createWorkOrder.isPending || !campaignId || !contractId || !assetId}
          >
            {createWorkOrder.isPending && <Loader2 className="size-4 animate-spin" />}
            Create and assign
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/management/work-orders">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
};
