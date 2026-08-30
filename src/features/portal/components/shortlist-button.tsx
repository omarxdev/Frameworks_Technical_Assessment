"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsShortlisted } from "@/features/portal/hooks/use-shortlist";
import { FIXTURE_CLOCK } from "@/lib/constants";
import { useShortlistStore } from "@/stores/use-shortlist-store";

export const ShortlistButton = ({
  productId,
  productName,
  rateLabel,
  startDate,
  endDate,
  className,
}: {
  productId: string;
  productName: string;
  rateLabel: string;
  startDate: string;
  endDate: string;
  className?: string;
}) => {
  const shortlisted = useIsShortlisted(productId);
  const add = useShortlistStore((state) => state.add);
  const remove = useShortlistStore((state) => state.remove);

  const handleToggle = () => {
    if (shortlisted) {
      remove(productId);
      toast.success(`${productName} removed from your shortlist`);
      return;
    }

    add({
      productId,
      productName,
      rateLabel,
      startDate,
      endDate,
      addedAt: FIXTURE_CLOCK,
    });
    toast.success(`${productName} added to your shortlist`);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleToggle}
      aria-pressed={shortlisted}
      className={className}
    >
      {shortlisted ? (
        <BookmarkCheck className="text-primary size-4" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {shortlisted ? "Shortlisted" : "Shortlist"}
    </Button>
  );
};
