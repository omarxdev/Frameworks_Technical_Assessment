"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookmarkCheck,
  ClipboardCheck,
  FileSignature,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Callout, EmptyState, LoadingState } from "@/components/ui/states";
import { StatusPill } from "@/components/ui/status-pill";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import { ServiceEventTimeline } from "@/features/portal/components/timelines";
import { useClientSummary } from "@/features/portal/hooks/use-portal-data";
import { useShortlistCount } from "@/features/portal/hooks/use-shortlist";
import {
  formatDateRange,
  formatMoney,
} from "@/features/portal/lib/format";
import type {
  PortalAttentionItem,
  PortalSummary,
} from "@/features/portal/lib/types";
import type { ContractSummary } from "@/lib/schemas";

const steps = [
  {
    icon: Search,
    title: "Browse the catalogue",
    description:
      "Pick your dates first — availability is always calculated for the exact period you enter.",
  },
  {
    icon: BookmarkCheck,
    title: "Shortlist and request",
    description:
      "Send a non-binding enquiry with your budget and objective. Nothing is reserved at this point.",
  },
  {
    icon: FileSignature,
    title: "Review your contract",
    description:
      "Our team checks live availability, then issues a contract here for you to accept or query.",
  },
];

const WelcomePanel = ({ organisationName }: { organisationName: string }) => {
  const shortlistCount = useShortlistCount();

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-primary/25 bg-accent/40">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Welcome to Island Media Co, {organisationName}
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm">
            Your account is live and you have no contracts yet. Advertising here
            starts with an enquiry, not a checkout — find the media you like,
            tell us what you want to achieve, and we will come back with a
            contract you can review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/portal/catalogue">
              Browse the catalogue
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {shortlistCount > 0 && (
            <span className="text-sm text-muted-foreground">
              You already have {shortlistCount} shortlisted{" "}
              {shortlistCount === 1 ? "product" : "products"}.
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, description }, index) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <Icon className="size-4 text-primary" />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Callout tone="info" title="Nothing you do here is binding">
        Submitting a request never reserves inventory and never commits you to
        spend. A contract only becomes active once our team issues it and you
        accept it in this portal.
      </Callout>
    </div>
  );
};

const AttentionList = ({ items }: { items: PortalAttentionItem[] }) => {
  const ordered = [...items].sort((a, b) =>
    a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">Needs your attention</h2>
      {ordered.map((item, index) => (
        <Callout
          key={`${item.type}-${item.contractId ?? index}`}
          tone={item.priority === "high" ? "warn" : "info"}
          title={item.title}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{item.message}</p>
            {item.contractId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/portal/contracts/${item.contractId}`}>
                  {item.priority === "high" ? "Review contract" : "View contract"}
                </Link>
              </Button>
            )}
          </div>
        </Callout>
      ))}
    </section>
  );
};

const ContractList = ({ contracts }: { contracts: ContractSummary[] }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-heading text-lg font-semibold">Your contracts</h2>
      <Button asChild size="sm" variant="ghost">
        <Link href="/portal/contracts">See all</Link>
      </Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
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
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            {contract.actionRequired ? (
              <p className="text-sm text-warn-foreground">
                {contract.actionRequired}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No action needed from you.
              </p>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href={`/portal/contracts/${contract.id}`}>Open</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);

const SummaryContent = ({ summary }: { summary: PortalSummary }) => {
  if (summary.contracts.length === 0) {
    return <WelcomePanel organisationName={summary.organisation.name} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {summary.attentionItems.length > 0 && (
        <AttentionList items={summary.attentionItems} />
      )}

      <ContractList contracts={summary.contracts} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Service activity</h2>
        <Card>
          <CardContent>
            {summary.recentServiceEvents.length === 0 ? (
              <EmptyState
                title="No service updates yet"
                message="Installation, artwork and maintenance updates will appear here as your campaign progresses."
              />
            ) : (
              <ServiceEventTimeline events={summary.recentServiceEvents} />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export const PortalHomeView = () => {
  const { data, isPending, isError, error, refetch } = useClientSummary();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Client portal
        </span>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {data ? data.organisation.name : "Your account"}
        </h1>
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.organisation.contractCount === 0
              ? "No contracts yet"
              : `${data.contracts.length} contract${data.contracts.length === 1 ? "" : "s"} on file`}
          </p>
        )}
      </div>

      {isPending && <LoadingState label="Loading your account" />}

      {isError && (
        <PortalErrorState
          error={error}
          fallback="We could not load your account summary."
          onRetry={() => refetch()}
        />
      )}

      {data && <SummaryContent summary={data} />}

      {data && data.contracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <ClipboardCheck className="mr-2 inline size-4 text-primary" />
              Planning something new?
            </CardTitle>
            <CardDescription>
              Requests are non-binding. Browse the catalogue for your dates and
              send an enquiry — we will confirm availability before anything is
              committed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/portal/catalogue">Browse the catalogue</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
