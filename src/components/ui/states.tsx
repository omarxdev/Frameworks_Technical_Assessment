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
      "flex items-center justify-center gap-2.5 px-5 py-12 text-sm text-muted-foreground",
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
    className={cn(
      "flex flex-col items-center gap-3 px-5 py-12 text-center",
      className
    )}
  >
    <p className="text-sm font-medium">{title}</p>
    {message && (
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    )}
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
    className={cn(
      "flex flex-col items-center gap-3 px-5 py-12 text-center",
      className
    )}
  >
    <p className="text-sm font-medium text-stop-foreground">{title}</p>
    {message && (
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    )}
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

const calloutTones = {
  info: "border-info/25 bg-info-surface text-info-foreground",
  warn: "border-warn/25 bg-warn-surface text-warn-foreground",
  stop: "border-stop/25 bg-stop-surface text-stop-foreground",
  ok: "border-ok/25 bg-ok-surface text-ok-foreground",
};

export const Callout = ({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof calloutTones;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-lg border px-4 py-3 text-sm",
      calloutTones[tone],
      className
    )}
  >
    {title && <p className="mb-1 font-semibold">{title}</p>}
    {children}
  </div>
);
