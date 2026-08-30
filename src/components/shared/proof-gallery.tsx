import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import type { ProofRecord } from "@/lib/schemas";

const formatCapturedAt = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

const galleryColumns = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
};

export const ProofGallery = ({
  records,
  columns = 2,
  emptyTitle = "No proof captured yet",
  emptyMessage = "Photos and completion notes appear here once the field team closes the job.",
  className,
}: {
  records: ProofRecord[];
  columns?: keyof typeof galleryColumns;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}) => {
  if (!records || records.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className={cn("grid gap-4", galleryColumns[columns], className)}>
      {records.map((record) => (
        <figure
          key={record.id}
          className="bg-card ring-foreground/10 shadow-card flex flex-col gap-2 overflow-hidden rounded-xl ring-1"
        >
          {record.previewUrl ? (
            <img
              src={record.previewUrl}
              alt={`Installation proof ${record.fileName}`}
              className="h-44 w-full object-cover"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex h-44 w-full items-center justify-center">
              <FileText className="size-6" />
            </div>
          )}
          <figcaption className="flex flex-col gap-1 px-4 pb-4 text-sm">
            <span className="font-medium break-all">{record.fileName}</span>
            {record.completionNote && (
              <span className="text-muted-foreground">{record.completionNote}</span>
            )}
            <span className="text-muted-foreground text-xs">
              Captured {formatCapturedAt(record.createdAt)}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
};
