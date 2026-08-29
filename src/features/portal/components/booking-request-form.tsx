"use client";

import { useEffect } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CircleCheckBig, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/ui/states";
import {
  errorMessage,
  useBookingRequest,
} from "@/features/portal/hooks/use-portal-data";
import { FIXTURE_TODAY } from "@/features/portal/lib/catalogue-options";
import { daysBetween, formatDateRange } from "@/features/portal/lib/format";

const bookingFormSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
    budget: z
      .string()
      .min(1, "Tell us your indicative budget")
      .refine(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
        "Budget must be a number of £0 or more"
      ),
    objective: z
      .string()
      .min(5, "Describe your objective in at least 5 characters"),
    notes: z.string().optional(),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: "The end date must be after the start date",
    path: ["endDate"],
  });

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export const BookingRequestForm = ({
  productId,
  productName,
  minimumTermDays,
  startDate,
  endDate,
  requestedAssetId,
  requestedAssetName,
}: {
  productId: string;
  productName: string;
  minimumTermDays: number;
  startDate: string;
  endDate: string;
  requestedAssetId: string;
  requestedAssetName: string | null;
}) => {
  const mutation = useBookingRequest();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      startDate,
      endDate,
      budget: "",
      objective: "",
      notes: "",
    },
  });

  useEffect(() => {
    setValue("startDate", startDate);
    setValue("endDate", endDate);
  }, [startDate, endDate, setValue]);

  const watchedStart = watch("startDate");
  const watchedEnd = watch("endDate");
  const requestedDays = daysBetween(watchedStart, watchedEnd);
  const belowMinimumTerm = requestedDays > 0 && requestedDays < minimumTermDays;

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        productId,
        requestedAssetId: requestedAssetId || null,
        startDate: values.startDate,
        endDate: values.endDate,
        budget: Number(values.budget),
        objective: values.objective,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      },
      {
        onSuccess: (created) => {
          toast.success(`Enquiry ${created.id} submitted for review`);
        },
        onError: (error) => {
          toast.error(errorMessage(error, "We could not submit your request."));
        },
      }
    );
  });

  if (mutation.isSuccess && mutation.data) {
    return (
      <Card className="border-info/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-info-foreground">
            <CircleCheckBig className="size-5" />
            <CardTitle className="text-lg">
              Enquiry submitted — nothing is booked yet
            </CardTitle>
          </div>
          <CardDescription>
            Reference {mutation.data.id} · {productName} ·{" "}
            {formatDateRange(mutation.data.startDate, mutation.data.endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Callout tone="warn" title="This is a non-binding request">
            You have not booked or paid for anything. Inventory is not reserved
            and prices stay indicative. Our team now reviews live availability
            and will either issue a contract or come back with alternatives.
          </Callout>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">Awaiting management review</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Your budget</dt>
              <dd className="font-medium">£{mutation.data.budget}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Objective</dt>
              <dd className="font-medium">{mutation.data.objective}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/portal/catalogue">Back to catalogue</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/portal">Go to portal home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Request this</CardTitle>
        <CardDescription>
          Sends a non-binding enquiry to our team. Nothing is reserved and no
          payment is taken.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requestStartDate">Start date</Label>
              <Input
                id="requestStartDate"
                type="date"
                min={FIXTURE_TODAY}
                aria-invalid={Boolean(errors.startDate)}
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-sm text-stop-foreground">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requestEndDate">End date</Label>
              <Input
                id="requestEndDate"
                type="date"
                min={watchedStart || FIXTURE_TODAY}
                aria-invalid={Boolean(errors.endDate)}
                {...register("endDate")}
              />
              {errors.endDate && (
                <p className="text-sm text-stop-foreground">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget">Indicative budget (£)</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              placeholder="3000"
              aria-invalid={Boolean(errors.budget)}
              {...register("budget")}
            />
            {errors.budget && (
              <p className="text-sm text-stop-foreground">
                {errors.budget.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="objective">Campaign objective</Label>
            <Input
              id="objective"
              placeholder="Drive awareness of our new East district branch"
              aria-invalid={Boolean(errors.objective)}
              {...register("objective")}
            />
            {errors.objective && (
              <p className="text-sm text-stop-foreground">
                {errors.objective.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes for our team (optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Anything we should know about artwork, timing or approvals"
              {...register("notes")}
            />
          </div>

          {requestedAssetName && (
            <p className="text-sm text-muted-foreground">
              Preferred asset: <span className="font-medium">{requestedAssetName}</span>
            </p>
          )}

          {belowMinimumTerm && (
            <Callout tone="warn" title="Below the minimum term">
              This product has a {minimumTermDays} day minimum term and you have
              asked for {requestedDays} days. You can still send the enquiry —
              our team will confirm what is possible.
            </Callout>
          )}

          {mutation.isError && (
            <Callout tone="stop" title="We could not submit your request">
              {errorMessage(mutation.error, "Please try again.")}
            </Callout>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              <Send className="size-4" />
              {mutation.isPending ? "Submitting" : "Submit non-binding request"}
            </Button>
            <span className="text-xs text-muted-foreground">
              No payment, no reservation, no commitment.
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
