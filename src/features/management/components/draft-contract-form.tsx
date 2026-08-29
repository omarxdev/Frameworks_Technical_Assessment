"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/states";
import {
  asApiError,
  useCreateContract,
} from "@/features/management/hooks/use-management-actions";
import { formatMoney } from "@/features/management/lib/format";
import type { AssetOption } from "@/lib/schemas";

interface LineItemDraft {
  key: string;
  productId: string;
  assetId: string;
  capacityPoolId: string;
  quantity: string;
  unitRate: string;
  rateUnit: string;
  lineTotal: string;
}

const makeLineItem = (
  productId: string,
  assetId: string,
  rateUnit: string
): LineItemDraft => ({
  key: `line-${Math.random().toString(36).slice(2, 10)}`,
  productId,
  assetId,
  capacityPoolId: "",
  quantity: "1",
  unitRate: "",
  rateUnit,
  lineTotal: "0",
});

export const DraftContractForm = ({
  bookingRequestId,
  organisationId,
  productId,
  startDate,
  endDate,
  rateUnit,
  isExclusive,
  assetOptions,
  requestedAssetId,
}: {
  bookingRequestId: string;
  organisationId: string;
  productId: string;
  startDate: string;
  endDate: string;
  rateUnit: string;
  isExclusive: boolean;
  assetOptions: AssetOption[];
  requestedAssetId?: string | null;
}) => {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [items, setItems] = useState<LineItemDraft[]>([
    makeLineItem(productId, requestedAssetId ?? "", rateUnit),
  ]);

  const createContract = useCreateContract();
  const apiError = asApiError(createContract.error);

  const total = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);

  const handleItemChange = (key: string, patch: Partial<LineItemDraft>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        if ("quantity" in patch || "unitRate" in patch) {
          const quantity = Number(next.quantity) || 0;
          const unitRate = Number(next.unitRate) || 0;
          next.lineTotal = String(quantity * unitRate);
        }
        return next;
      })
    );
  };

  const handleAddItem = () =>
    setItems((current) => [...current, makeLineItem(productId, "", rateUnit)]);

  const handleRemoveItem = (key: string) =>
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.key !== key)
    );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    createContract.mutate(
      {
        organisationId,
        bookingRequestId,
        startDate: start,
        endDate: end,
        total,
        items: items.map((item, index) => ({
          id: `contract-item-${index + 1}-${item.key}`,
          productId: item.productId,
          assetId: item.assetId || null,
          capacityPoolId: item.capacityPoolId || null,
          quantity: Number(item.quantity) || 1,
          unitRate: item.unitRate === "" ? null : Number(item.unitRate),
          rateUnit: item.rateUnit || null,
          lineTotal: Number(item.lineTotal) || 0,
        })),
      },
      {
        onSuccess: (contract) => router.push(`/management/contracts/${contract.id}`),
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Create draft contract
        </h2>
        <p className="text-sm text-muted-foreground">
          The draft stays internal until you issue it to the client.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contract-start">Start date</Label>
          <Input
            id="contract-start"
            type="date"
            required
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contract-end">End date (exclusive)</Label>
          <Input
            id="contract-end"
            type="date"
            required
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Line items</h3>
          <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
            <Plus className="size-3.5" />
            Add line
          </Button>
        </div>

        {items.map((item) => (
          <div
            key={item.key}
            className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`product-${item.key}`}>Product ID</Label>
              <Input
                id={`product-${item.key}`}
                required
                value={item.productId}
                onChange={(event) =>
                  handleItemChange(item.key, { productId: event.target.value })
                }
              />
            </div>

            {isExclusive ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`asset-${item.key}`}>Asset ID</Label>
                <Input
                  id={`asset-${item.key}`}
                  list={`asset-options-${item.key}`}
                  value={item.assetId}
                  placeholder="asset-…"
                  onChange={(event) =>
                    handleItemChange(item.key, { assetId: event.target.value })
                  }
                />
                <datalist id={`asset-options-${item.key}`}>
                  {assetOptions.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </datalist>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`pool-${item.key}`}>Capacity pool ID</Label>
                <Input
                  id={`pool-${item.key}`}
                  value={item.capacityPoolId}
                  placeholder="pool-…"
                  onChange={(event) =>
                    handleItemChange(item.key, { capacityPoolId: event.target.value })
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`quantity-${item.key}`}>Quantity</Label>
              <Input
                id={`quantity-${item.key}`}
                type="number"
                min={1}
                step={1}
                required
                value={item.quantity}
                onChange={(event) =>
                  handleItemChange(item.key, { quantity: event.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`unit-rate-${item.key}`}>Unit price (GBP)</Label>
              <Input
                id={`unit-rate-${item.key}`}
                type="number"
                min={0}
                step="0.01"
                value={item.unitRate}
                placeholder="Leave empty for price on request"
                onChange={(event) =>
                  handleItemChange(item.key, { unitRate: event.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`rate-unit-${item.key}`}>Rate unit</Label>
              <Input
                id={`rate-unit-${item.key}`}
                value={item.rateUnit}
                placeholder="month"
                onChange={(event) =>
                  handleItemChange(item.key, { rateUnit: event.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`line-total-${item.key}`}>Line total (GBP)</Label>
              <div className="flex gap-2">
                <Input
                  id={`line-total-${item.key}`}
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={item.lineTotal}
                  onChange={(event) =>
                    handleItemChange(item.key, { lineTotal: event.target.value })
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Remove line item"
                  disabled={items.length === 1}
                  onClick={() => handleRemoveItem(item.key)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
        <span className="text-sm text-muted-foreground">Contract total</span>
        <span className="font-heading text-xl font-semibold tabular-nums">
          {formatMoney(total)}
        </span>
      </div>

      {apiError && (
        <Callout tone="stop" title={`Could not create the draft (${apiError.code})`}>
          {apiError.message}
        </Callout>
      )}

      <div>
        <Button type="submit" disabled={createContract.isPending}>
          {createContract.isPending && <Loader2 className="size-4 animate-spin" />}
          Create draft contract
        </Button>
      </div>
    </form>
  );
};
