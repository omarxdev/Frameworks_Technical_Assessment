import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export const LoadingState = ({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      "text-muted-foreground flex items-center justify-center gap-2.5 px-5 py-12 text-sm",
      className
    )}
  >
    <Loader2 className="size-4 animate-spin" />
    {label}
  </div>
);

export const EmptyState = ({
  title,
  message,
  action,
  className,
}: {
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn("flex flex-col items-center gap-3 px-5 py-12 text-center", className)}
  >
    <p className="text-sm font-medium">{title}</p>
    {message && <p className="text-muted-foreground max-w-sm text-sm">{message}</p>}
    {action}
  </div>
);

export const ErrorState = ({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) => (
  <div
    role="alert"
    className={cn("flex flex-col items-center gap-3 px-5 py-12 text-center", className)}
  >
    <p className="text-stop-foreground text-sm font-medium">{title}</p>
    {message && <p className="text-muted-foreground max-w-sm text-sm">{message}</p>}
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

const calloutTones = {
  info: "border-info/25 text-info-foreground",
  warn: "border-warn/25 text-warn-foreground",
  stop: "border-stop/25 text-stop-foreground",
  ok: "border-ok/25 text-ok-foreground",
};

const calloutSurfaces = {
  info: { solid: "bg-info-surface", subtle: "bg-info-surface/40" },
  warn: { solid: "bg-warn-surface", subtle: "bg-warn-surface/40" },
  stop: { solid: "bg-stop-surface", subtle: "bg-stop-surface/40" },
  ok: { solid: "bg-ok-surface", subtle: "bg-ok-surface/40" },
};

const calloutSizes = {
  sm: "rounded-lg px-3 py-2",
  default: "rounded-lg px-4 py-3",
  lg: "rounded-xl p-4",
};

export type CalloutTone = keyof typeof calloutTones;

export const Callout = ({
  tone = "info",
  size = "default",
  subtle = false,
  title,
  children,
  className,
}: {
  tone?: CalloutTone;
  size?: keyof typeof calloutSizes;
  subtle?: boolean;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "border text-sm",
      calloutSizes[size],
      calloutTones[tone],
      calloutSurfaces[tone][subtle ? "subtle" : "solid"],
      className
    )}
  >
    {title && <p className="mb-1 font-semibold">{title}</p>}
    {children}
  </div>
);
