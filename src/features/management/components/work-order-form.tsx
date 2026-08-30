"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { usePrototypeAccounts } from "@/components/shared/role-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Callout, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { ManagementErrorState } from "@/features/management/components/management-states";
import {
  asApiError,
  useCreateWorkOrder,
} from "@/features/management/hooks/use-management-actions";
import { useWorkOrders } from "@/features/management/hooks/use-management-data";
import { toIsoFromLocalInput } from "@/lib/format";
import { WorkOrderTypeSchema } from "@/lib/schemas";
import { PageTitle } from "@/components/ui/typography";

const WorkOrderFormSchema = z
  .object({
    campaignId: z.string().min(1, "Choose the campaign this job belongs to"),
    contractId: z.string().min(1, "Choose the contract this job bills against"),
    type: WorkOrderTypeSchema,
    assignedUserId: z.string().min(1, "Assign a fitter"),
    assetId: z.string().min(1, "Choose the asset being worked on"),
    scheduledStart: z.string().min(1, "Set a start time"),
    scheduledEnd: z.string().min(1, "Set an end time"),
    locationLabel: z.string().min(2, "Give the fitter a location they can find"),
    instructions: z
      .string()
      .min(10, "Tell the fitter what to do and what to photograph"),
    internalNotes: z.string(),
  })
  .refine((values) => values.scheduledStart < values.scheduledEnd, {
    path: ["scheduledEnd"],
    message: "The end time must be after the start time",
  });

type WorkOrderFormValues = z.infer<typeof WorkOrderFormSchema>;

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="text-stop-foreground text-xs">
      {message}
    </p>
  ) : null;

export const WorkOrderForm = () => {
  const router = useRouter();
  const references = useWorkOrders("all");
  const accounts = usePrototypeAccounts();
  const createWorkOrder = useCreateWorkOrder();
  const apiError = asApiError(createWorkOrder.error);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(WorkOrderFormSchema),
    defaultValues: {
      campaignId: "",
      contractId: "",
      type: "installation",
      assignedUserId: "",
      assetId: "",
      scheduledStart: "2027-01-20T09:00",
      scheduledEnd: "2027-01-20T12:00",
      locationLabel: "",
      instructions: "",
      internalNotes: "",
    },
  });

  if (references.isPending)
    return <LoadingState label="Loading contracts and assets" />;

  if (references.isError) {
    return (
      <ManagementErrorState
        error={references.error}
        title="The work order form could not be prepared"
        fallback="Contracts and assets could not be loaded."
        onRetry={() => references.refetch()}
      />
    );
  }

  const { campaigns, contracts, assets } = references.data.references;
  const activeAssets = assets.filter((asset) => asset.status === "active");
  const fitters = (accounts.data?.items ?? []).filter(
    (account) => account.role === "fitter"
  );

  const handleCampaignChange = (value: string) => {
    setValue("campaignId", value, { shouldValidate: true });
    const campaign = campaigns.find((entry) => entry.id === value);
    if (campaign) {
      setValue("contractId", campaign.contractId, { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit((values) => {
    createWorkOrder.mutate(
      {
        ...values,
        scheduledStart: toIsoFromLocalInput(values.scheduledStart),
        scheduledEnd: toIsoFromLocalInput(values.scheduledEnd),
        internalNotes: values.internalNotes.trim() || undefined,
      },
      { onSuccess: () => router.push("/management/work-orders") }
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit">
          <Link href="/management/work-orders">
            <ArrowLeft className="size-4" />
            All work orders
          </Link>
        </Button>
        <div>
          <PageTitle>
            New work order
          </PageTitle>
          <p className="text-muted-foreground text-sm">
            Assign a field job against a campaign. The client sees an
            &ldquo;installation scheduled&rdquo; update, never the internal notes.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="bg-card ring-foreground/10 flex max-w-3xl flex-col gap-5 rounded-xl p-4 ring-1"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign">Campaign</Label>
            <Controller
              control={control}
              name="campaignId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleCampaignChange}>
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
              )}
            />
            <FieldError message={errors.campaignId?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract">Contract</Label>
            <Controller
              control={control}
              name="contractId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
            <FieldError message={errors.contractId?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WorkOrderTypeSchema.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.type?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fitter">Assigned fitter</Label>
            <Controller
              control={control}
              name="assignedUserId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="fitter" className="w-full">
                    <SelectValue placeholder="Select a fitter" />
                  </SelectTrigger>
                  <SelectContent>
                    {fitters.map((fitter) => (
                      <SelectItem key={fitter.id} value={fitter.id}>
                        {fitter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.assignedUserId?.message} />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="asset">Asset</Label>
            <Controller
              control={control}
              name="assetId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
            <FieldError message={errors.assetId?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduled-start">Scheduled start (UTC)</Label>
            <Controller
              control={control}
              name="scheduledStart"
              render={({ field }) => (
                <DateTimePicker
                  id="scheduled-start"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError message={errors.scheduledStart?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduled-end">Scheduled end (UTC)</Label>
            <Controller
              control={control}
              name="scheduledEnd"
              render={({ field }) => (
                <DateTimePicker
                  id="scheduled-end"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError message={errors.scheduledEnd?.message} />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="location-label">Location label</Label>
            <Input
              id="location-label"
              placeholder="ParcelFleet East depot"
              {...register("locationLabel")}
            />
            <FieldError message={errors.locationLabel?.message} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instructions">Instructions for the fitter</Label>
          <Textarea
            id="instructions"
            rows={3}
            placeholder="What to fit, what to photograph, who to report to on arrival."
            {...register("instructions")}
          />
          <FieldError message={errors.instructions?.message} />
        </div>

        <div className="border-border bg-muted/50 flex flex-col gap-1.5 rounded-lg border p-4">
          <Label htmlFor="internal-notes" className="flex items-center gap-1.5">
            <EyeOff className="size-4" />
            Internal notes
          </Label>
          <p className="text-muted-foreground text-xs">
            Management only. These notes are stripped from the field app payload and
            never appear in the client portal or any client-visible timeline.
          </p>
          <Textarea
            id="internal-notes"
            rows={3}
            placeholder="Depot gate codes, margin notes, escalation contacts."
            {...register("internalNotes")}
          />
        </div>

        {apiError && (
          <Callout
            tone="stop"
            title={`Could not create the work order (${apiError.code})`}
          >
            {apiError.message}
          </Callout>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={createWorkOrder.isPending}>
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
