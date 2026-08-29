"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { CatalogueFilterBar } from "@/features/portal/components/catalogue-filters";
import { PortalErrorState } from "@/features/portal/components/portal-states";
import { ProductCard } from "@/features/portal/components/product-card";
import { useCatalogue } from "@/features/portal/hooks/use-portal-data";
import { useHydrated } from "@/features/portal/hooks/use-shortlist";
import {
  DEFAULT_FILTERS,
  filtersToSearchParams,
} from "@/features/portal/lib/catalogue-options";
import { formatDateRange } from "@/features/portal/lib/format";
import type { CatalogueFilters } from "@/features/portal/lib/types";
import { useShortlistStore } from "@/stores/use-shortlist-store";

const ShortlistStrip = () => {
  const hydrated = useHydrated();
  const items = useShortlistStore((state) => state.items);
  const remove = useShortlistStore((state) => state.remove);
  const clear = useShortlistStore((state) => state.clear);

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Shortlist ({items.length}) — saved on this device only
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          Clear all
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.productId}>
            <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
              <Link
                href={`/portal/catalogue/${item.productId}?startDate=${item.startDate}&endDate=${item.endDate}`}
                className="font-medium hover:underline"
              >
                {item.productName}
              </Link>
              <span className="text-muted-foreground">{item.rateLabel}</span>
              <button
                type="button"
                aria-label={`Remove ${item.productName} from shortlist`}
                onClick={() => remove(item.productId)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const CatalogueView = ({
  initialFilters,
}: {
  initialFilters: CatalogueFilters;
}) => {
  const router = useRouter();
  const [filters, setFilters] = useState<CatalogueFilters>(initialFilters);
  const { data, isPending, isFetching, isError, error, refetch } =
    useCatalogue(filters);

  const handleApply = (next: CatalogueFilters) => {
    setFilters(next);
    router.replace(
      `/portal/catalogue?${filtersToSearchParams(next).toString()}`,
      { scroll: false }
    );
  };

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Catalogue
        </h1>
        <p className="text-sm text-muted-foreground">
          Availability for {formatDateRange(filters.startDate, filters.endDate)}.
          Everything here is indicative until we confirm it with the media owner.
        </p>
      </div>

      <CatalogueFilterBar
        filters={filters}
        onApply={handleApply}
        isFetching={isFetching}
      />

      <ShortlistStrip />

      {isPending && <LoadingState label="Checking availability" />}

      {isError && (
        <PortalErrorState
          error={error}
          fallback="We could not load the catalogue."
          onRetry={() => refetch()}
        />
      )}

      {data && items.length === 0 && (
        <EmptyState
          title="No products match these filters"
          message="Try a wider date range, a different location, or raise the monthly budget. Products priced on request are hidden while a budget is set."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApply(DEFAULT_FILTERS)}
            >
              Reset filters
            </Button>
          }
        />
      )}

      {data && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} filters={filters} />
          ))}
        </div>
      )}
    </div>
  );
};
