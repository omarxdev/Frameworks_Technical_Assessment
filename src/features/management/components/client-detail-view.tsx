"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Card, CardContent } from "@/components/ui/card";
import { PageTitle, SectionTitle } from "@/components/ui/typography";
import { DetailRow } from "@/components/shared/detail-row";
import { Metric } from "@/components/ui/metric";
import { useOrganisation } from "@/features/management/hooks/use-management-data";
import { formatDateRange, formatDay as formatDate, formatMoney } from "@/lib/format";

export const ClientDetailView = ({ organisationId }: { organisationId: string }) => {
  const { data, isPending, isError, error, refetch } = useOrganisation(organisationId);

  if (isPending) return <LoadingState label="Loading the client" />;

  if (isError) {
    return (
      <ManagementErrorState
        error={error}
        title="This client could not be loaded"
        fallback="The client organisation could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  const primaryContact = data.contacts[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild size="sm" variant="ghost" className="w-fit">
          <Link href="/management/clients">
            <ArrowLeft className="size-4" />
            All clients
          </Link>
        </Button>

        <div>
          <PageTitle>{data.name}</PageTitle>
          <p className="text-muted-foreground text-sm">
            {data.id} · Client since {formatDate(data.createdAt)}
          </p>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <Metric label="Contracts" value={data.contractCount} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Metric label="Booking requests" value={data.bookingRequests.length} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Metric
              label="Primary contact"
              value={primaryContact?.name ?? "None on file"}
            />
          </CardContent>
        </Card>
      </dl>

      <div className="grid gap-6 xl:grid-cols-detail">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <SectionTitle className="mb-3">Contracts</SectionTitle>
              {data.contracts.length === 0 ? (
                <EmptyState
                  title="No contracts yet"
                  message="This client has not been issued a contract."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.contracts.map((contract) => (
                    <li
                      key={contract.id}
                      className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <Link
                          href={`/management/contracts/${contract.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {contract.id}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {formatDateRange(contract.startDate, contract.endDate)} ·{" "}
                          {formatMoney(contract.total)}
                        </p>
                      </div>
                      <StatusPill status={contract.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionTitle className="mb-3">Booking requests</SectionTitle>
              {data.bookingRequests.length === 0 ? (
                <EmptyState
                  title="No booking requests yet"
                  message="This client has not submitted a request."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.bookingRequests.map((request) => (
                    <li
                      key={request.id}
                      className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <Link
                          href={`/management/requests/${request.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {request.id}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {formatDateRange(request.startDate, request.endDate)}
                        </p>
                      </div>
                      <StatusPill status={request.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <SectionTitle className="mb-2">Contacts</SectionTitle>
              {data.contacts.length === 0 ? (
                <EmptyState
                  title="No contacts on file"
                  message="No client user is registered against this organisation."
                />
              ) : (
                <dl>
                  {data.contacts.map((contact) => (
                    <DetailRow
                      key={contact.id}
                      label={contact.name}
                      value={contact.email}
                    />
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
