"use client";

import { humanise } from "@/components/ui/status-pill";
import { Card, CardContent } from "@/components/ui/card";

const order = [
  "pendingRequests",
  "blockedWorkOrders",
  "openWorkOrders",
  "issuedContracts",
  "activeContracts",
  "activeCampaigns",
];

const labels: Record<string, string> = {
  pendingRequests: "Pending requests",
  blockedWorkOrders: "Blocked work orders",
  openWorkOrders: "Open work orders",
  issuedContracts: "Issued contracts",
  activeContracts: "Active contracts",
  activeCampaigns: "Active campaigns",
};

export const StatTiles = ({ counts }: { counts: Record<string, number> }) => {
  const keys = [
    ...order.filter((key) => key in counts),
    ...Object.keys(counts).filter((key) => !order.includes(key)),
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {keys.map((key) => (
        <Card key={key}>
          <CardContent className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs">
              {labels[key] ?? humanise(key)}
            </dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">
              {counts[key]}
            </dd>
                  </CardContent>
        </Card>
      ))}
    </dl>
  );
};
