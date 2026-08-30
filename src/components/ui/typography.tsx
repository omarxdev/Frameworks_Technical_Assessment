import { cn } from "@/lib/utils";

export const Eyebrow = ({
  as: Tag = "span",
  children,
  className,
}: {
  as?: "span" | "dt" | "p";
  children: React.ReactNode;
  className?: string;
}) => (
  <Tag
    className={cn(
      "text-eyebrow text-muted-foreground font-semibold tracking-eyebrow whitespace-nowrap uppercase",
      className
    )}
  >
    {children}
  </Tag>
);

export const PageTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h1
    className={cn(
      "font-heading text-2xl font-semibold tracking-tight sm:text-3xl",
      className
    )}
  >
    {children}
  </h1>
);

export const SectionTitle = ({
  as: Tag = "h2",
  children,
  className,
}: {
  as?: "h2" | "h3";
  children: React.ReactNode;
  className?: string;
}) => (
  <Tag
    className={cn(
      "font-heading text-lg font-semibold tracking-tight",
      className
    )}
  >
    {children}
  </Tag>
);

export const SubsectionLabel = ({
  as: Tag = "h3",
  children,
  className,
}: {
  as?: "h2" | "h3";
  children: React.ReactNode;
  className?: string;
}) => (
  <Tag
    className={cn(
      "flex items-center gap-2 text-sm font-semibold tracking-wide uppercase",
      className
    )}
  >
    {children}
  </Tag>
);
