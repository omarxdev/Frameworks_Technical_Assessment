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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout, EmptyState, LoadingState } from "@/components/ui/states";
import { StatusPill } from "@/components/ui/status-pill";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import { Timeline, serviceEventItems } from "@/components/shared/timeline";
import { Eyebrow, PageTitle, SectionTitle } from "@/components/ui/typography";
import { useClientSummary } from "@/features/portal/hooks/use-portal-data";
import { useShortlistCount } from "@/features/portal/hooks/use-shortlist";
import { formatDateRange, formatMoney } from "@/lib/format";
import type { PortalAttentionItem, PortalSummary } from "@/features/portal/lib/types";
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
      <Card className="border-primary/25 bg-accent/40 overflow-hidden">
        <CardHeader>
          <CardTitle size="lg">
            Welcome to Island Media Co, {organisationName}
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm">
            Your account is live and you have no contracts yet. Advertising here starts
            with an enquiry, not a checkout — find the media you like, tell us what you
            want to achieve, and we will come back with a contract you can review.
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
            <span className="text-muted-foreground text-sm">
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
                <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <Icon className="text-primary size-4" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Callout tone="info" title="Nothing you do here is binding">
        Submitting a request never reserves inventory and never commits you to spend. A
        contract only becomes active once our team issues it and you accept it in this
        portal.
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
      <SectionTitle>Needs your attention</SectionTitle>
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SectionTitle>Your contracts</SectionTitle>
      <Button asChild size="sm" variant="ghost">
        <Link href="/portal/contracts">See all</Link>
      </Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{contract.id}</CardTitle>
              <StatusPill status={contract.status} />
            </div>
            <CardDescription>
              {formatDateRange(contract.startDate, contract.endDate)} ·{" "}
              {formatMoney(contract.total)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            {contract.actionRequired ? (
              <p className="text-warn-foreground text-sm">{contract.actionRequired}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
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
        <SectionTitle>Service activity</SectionTitle>
        <Card>
          <CardContent>
            {summary.recentServiceEvents.length === 0 ? (
              <EmptyState
                title="No service updates yet"
                message="Installation, artwork and maintenance updates will appear here as your campaign progresses."
              />
            ) : (
              <Timeline items={serviceEventItems(summary.recentServiceEvents)} />
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
        <Eyebrow>Client portal</Eyebrow>
        <PageTitle>
          {data ? data.organisation.name : "Your account"}
        </PageTitle>
        {data && (
          <p className="text-muted-foreground text-sm">
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
            <CardTitle>
              <ClipboardCheck className="text-primary mr-2 inline size-4" />
              Planning something new?
            </CardTitle>
            <CardDescription>
              Requests are non-binding. Browse the catalogue for your dates and send an
              enquiry — we will confirm availability before anything is committed.
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
