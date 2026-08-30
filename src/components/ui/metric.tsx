import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/typography";

const metricValueSizes = {
  sm: "text-lg",
  default: "text-xl",
  lg: "text-2xl",
};

export const MetricValue = ({
  as: Tag = "span",
  size = "default",
  children,
  className,
}: {
  as?: "span" | "dd";
  size?: keyof typeof metricValueSizes;
  children: React.ReactNode;
  className?: string;
}) => (
  <Tag
    className={cn(
      "font-heading font-semibold tabular-nums",
      metricValueSizes[size],
      className
    )}
  >
    {children}
  </Tag>
);

export const Metric = ({
  as = "div",
  size = "default",
  label,
  value,
  unit,
  className,
}: {
  as?: "div" | "dl";
  size?: keyof typeof metricValueSizes;
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-0.5", className)}>
    <Eyebrow as={as === "dl" ? "dt" : "span"} className="whitespace-normal">
      {label}
    </Eyebrow>
    <MetricValue as={as === "dl" ? "dd" : "span"} size={size}>
      {value}
      {unit ? (
        <span className="text-muted-foreground ml-1 text-sm font-medium">
          {unit}
        </span>
      ) : null}
    </MetricValue>
  </div>
);
