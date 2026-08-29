"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import { useClientContracts } from "@/features/portal/hooks/use-portal-data";
import { formatDateRange, formatMoney } from "@/features/portal/lib/format";
import type { ContractSummary } from "@/lib/schemas";

const ContractRows = ({ contracts }: { contracts: ContractSummary[] }) => (
  <>
    <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contract</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next step</TableHead>
            <TableHead className="text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">{contract.id}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDateRange(contract.startDate, contract.endDate)}
              </TableCell>
              <TableCell>{formatMoney(contract.total)}</TableCell>
              <TableCell>
                <StatusPill status={contract.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {contract.actionRequired ?? "No action needed"}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/portal/contracts/${contract.id}`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <div className="flex flex-col gap-3 md:hidden">
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{contract.id}</CardTitle>
              <StatusPill status={contract.status} />
            </div>
            <CardDescription>
              {formatDateRange(contract.startDate, contract.endDate)} ·{" "}
              {formatMoney(contract.total)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {contract.actionRequired ?? "No action needed"}
            </p>
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link href={`/portal/contracts/${contract.id}`}>Open</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </>
);

export const ContractsView = () => {
  const { data, isPending, isError, error, refetch } = useClientContracts();
  const contracts = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Contracts
        </h1>
        <p className="text-sm text-muted-foreground">
          Every contract we have issued to your organisation, with its current
          status and what happens next.
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
