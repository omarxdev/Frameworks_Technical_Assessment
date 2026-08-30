"use client";

import Link from "next/link";
import { ArrowLeft, EyeOff } from "lucide-react";
import { ProofGallery } from "@/components/shared/proof-gallery";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Callout, LoadingState } from "@/components/ui/states";
import { Timeline, historyItems } from "@/components/shared/timeline";
import { useWorkOrder } from "@/features/management/hooks/use-management-data";
import { formatMoment as formatDateTime } from "@/lib/format";
import { PageTitle, SectionTitle } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="border-border flex flex-col gap-0.5 border-b py-2.5 last:border-b-0">
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="text-sm font-medium break-words">{value}</dd>
  </div>
);

export const WorkOrderDetailView = ({ workOrderId }: { workOrderId: string }) => {
  const { data, isPending, isError, error, refetch } = useWorkOrder(workOrderId);

  if (isPending) return <LoadingState label="Loading the work order" />;

  if (isError) {
    return (
      <ManagementErrorState
        error={error}
        title="This work order could not be loaded"
        fallback="The work order could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  const blockedEntry = [...data.history]
    .reverse()
    .find((entry) => entry.action === "blocked");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit">
          <Link href="/management/work-orders">
            <ArrowLeft className="size-4" />
            All work orders
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <PageTitle>
              {data.locationLabel}
            </PageTitle>
            <p className="text-muted-foreground text-sm">
              {data.id} · {data.type} · {data.assetName}
            </p>
          </div>
          <StatusPill status={data.status} />
        </div>
      </div>

      {data.status === "blocked" && (
        <Callout tone="stop" title="Blocked on site">
          {blockedEntry?.note ?? "No reason was recorded."}
        </Callout>
      )}

      <div className="grid gap-6 xl:grid-cols-detail">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <SectionTitle>
                Instructions
              </SectionTitle>
              <p className="text-sm">{data.instructions}</p>

              {data.internalNotes && (
                <div className="border-border bg-muted/50 rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
                    <EyeOff className="size-4" />
                    Internal only — never shown to the client or the fitter
                  </p>
                  <p className="mt-1 text-sm">{data.internalNotes}</p>
                </div>
              )}
                      </CardContent>
          </Card>

          <section className="flex flex-col gap-3">
            <SectionTitle>
              Completion proof
            </SectionTitle>
            {data.completionNote && (
              <Callout tone="ok" size="sm" subtle>
                {data.completionNote}
              </Callout>
            )}
            <ProofGallery
              records={data.proofRecords}
              emptyTitle="No proof captured yet"
              emptyMessage="Photos and completion notes appear here once the fitter closes this job."
            />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <SectionTitle className="mb-2">
                Job facts
              </SectionTitle>
              <dl>
                <DetailRow label="Client" value={data.organisationName} />
                <DetailRow
                  label="Contract"
                  value={
                    <Link
                      href={`/management/contracts/${data.contractId}`}
                      className="underline underline-offset-4"
                    >
                      {data.contractId}
                    </Link>
                  }
                />
                <DetailRow label="Campaign" value={data.campaignName ?? "—"} />
                <DetailRow label="Assigned fitter" value={data.assignedUserName} />
                <DetailRow label="Asset" value={data.assetName} />
                <DetailRow
                  label="Scheduled start"
                  value={formatDateTime(data.scheduledStart)}
                />
                <DetailRow
                  label="Scheduled end"
                  value={formatDateTime(data.scheduledEnd)}
                />
              </dl>
                      </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionTitle className="mb-3">
                Field history
              </SectionTitle>
              <Timeline items={historyItems(data.history)} />
                      </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
