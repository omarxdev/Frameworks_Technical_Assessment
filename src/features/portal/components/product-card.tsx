"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusPill, humanise } from "@/components/ui/status-pill";
import { ShortlistButton } from "@/features/portal/components/shortlist-button";
import type { CatalogueFilters } from "@/features/portal/lib/types";
import type { ProductSearchResult } from "@/lib/schemas";

export const ProductCard = ({
  product,
  filters,
}: {
  product: ProductSearchResult;
  filters: CatalogueFilters;
}) => {
  const detailHref = `/portal/catalogue/${product.id}?startDate=${filters.startDate}&endDate=${filters.endDate}`;

  return (
    <Card className="justify-between">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{product.name}</CardTitle>
          <StatusPill status={product.availability.state} />
        </div>
        <CardDescription>
          {product.mediaOwnerName} · {humanise(product.mediaType)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p className="font-heading text-lg font-semibold">
          {product.indicativeRate.label}
        </p>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            {product.locationNames.join(", ")}
          </span>
          <span>Minimum term {product.minimumTermDays} days</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {product.availability.reason}
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={detailHref}>View details</Link>
        </Button>
        <ShortlistButton
          productId={product.id}
          productName={product.name}
          rateLabel={product.indicativeRate.label}
          startDate={filters.startDate}
          endDate={filters.endDate}
        />
      </CardFooter>
    </Card>
  );
};
