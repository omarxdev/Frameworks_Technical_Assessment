"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import { useClientContracts } from "@/features/portal/hooks/use-portal-data";
import { formatDateRange, formatMoney } from "@/lib/format";
import type { ContractSummary } from "@/lib/schemas";
import { PageTitle } from "@/components/ui/typography";

const contractColumns: DataColumn<ContractSummary>[] = [
  {
    header: "Contract",
    role: "title",
    cell: (contract) => contract.id,
  },
  {
    header: "Status",
    role: "badge",
    cell: (contract) => <StatusPill status={contract.status} />,
  },
  {
    header: "Period",
    nowrap: true,
    cell: (contract) => formatDateRange(contract.startDate, contract.endDate),
  },
  { header: "Total", cell: (contract) => formatMoney(contract.total) },
  {
    header: "Next step",
    className: "text-muted-foreground",
    cell: (contract) => contract.actionRequired ?? "No action needed",
  },
  {
    header: "Detail",
    role: "action",
    align: "right",
    cell: (contract) => (
      <Button asChild size="sm" variant="outline">
        <Link href={`/portal/contracts/${contract.id}`}>Open</Link>
      </Button>
    ),
  },
];

const ContractRows = ({ contracts }: { contracts: ContractSummary[] }) => (
  <DataTable
    rows={contracts}
    rowKey={(contract) => contract.id}
    columns={contractColumns}
  />
);

export const ContractsView = () => {
  const { data, isPending, isError, error, refetch } = useClientContracts();
  const contracts = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <PageTitle>
          Contracts
        </PageTitle>
        <p className="text-muted-foreground text-sm">
          Every contract we have issued to your organisation, with its current status
          and what happens next.
        </p>
      </div>

      {isPending && <LoadingState label="Loading your contracts" />}

      {isError && (
        <PortalErrorState
          error={error}
          fallback="We could not load your contracts."
          onRetry={() => refetch()}
        />
      )}

      {data && contracts.length === 0 && (
        <EmptyState
          title="No contracts yet"
          message="Contracts appear here once our team has reviewed your enquiry and issued one. Start by browsing the catalogue for your dates."
          action={
            <Button asChild size="sm">
              <Link href="/portal/catalogue">Browse the catalogue</Link>
            </Button>
          }
        />
      )}

      {data && contracts.length > 0 && <ContractRows contracts={contracts} />}
    </div>
  );
};
