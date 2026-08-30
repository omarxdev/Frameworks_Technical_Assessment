"use client";

import Link from "next/link";
import { ManagementErrorState } from "@/features/management/components/management-states";
import { Callout, EmptyState, LoadingState } from "@/components/ui/states";
import { Card, CardContent } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/typography";
import { Metric } from "@/components/ui/metric";
import { useOrganisations } from "@/features/management/hooks/use-management-data";
import { formatDay as formatDate } from "@/lib/format";

export const ClientsView = () => {
  const { data, isPending, isError, error, refetch } = useOrganisations();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageTitle>Clients</PageTitle>
        <p className="text-muted-foreground text-sm">
          Every client organisation, their contact and their contract history.
        </p>
      </div>

      {isPending ? (
        <Card>
          <LoadingState label="Loading clients" />
        </Card>
      ) : isError ? (
        <Card>
          <ManagementErrorState
            error={error}
            title="Clients could not be loaded"
            fallback="Clients could not be loaded."
            onRetry={() => refetch()}
          />
        </Card>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            title="No client organisations yet"
            message="Client organisations appear here once someone registers."
          />
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {data.items.map((organisation) => (
            <li key={organisation.id}>
              <Card>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/management/clients/${organisation.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {organisation.name}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {organisation.id} · Client since{" "}
                        {formatDate(organisation.createdAt)}
                      </p>
                    </div>
                    {organisation.pendingRequestCount > 0 && (
                      <Callout tone="warn" size="sm" subtle>
                        {organisation.pendingRequestCount} pending request
                        {organisation.pendingRequestCount === 1 ? "" : "s"}
                      </Callout>
                    )}
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <Metric
                      as="dl"
                      label="Contact"
                      value={organisation.contact?.name ?? "No contact on file"}
                      size="sm"
                    />
                    <Metric
                      as="dl"
                      label="Contracts"
                      value={organisation.contractCount}
                      size="sm"
                    />
                  </dl>

                  {organisation.contact && (
                    <p className="text-muted-foreground text-sm">
                      {organisation.contact.email}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
