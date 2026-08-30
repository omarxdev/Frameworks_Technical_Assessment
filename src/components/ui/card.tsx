import * as React from "react";

import { cn } from "@/lib/utils";

const cardTones = {
  default: "ring-foreground/10",
  accent: "ring-primary/25",
  info: "ring-info/30",
  ok: "ring-ok/30",
  warn: "ring-warn/30",
  stop: "ring-stop/30",
};

function Card({
  className,
  size = "default",
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm";
  tone?: keyof typeof cardTones;
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/card bg-card text-card-foreground shadow-card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm ring-1 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        cardTones[tone],
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

const cardTitleSizes = {
  sm: "text-sm",
  default: "text-base group-data-[size=sm]/card:text-sm",
  lg: "text-lg",
};

function CardTitle({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: keyof typeof cardTitleSizes }) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading leading-snug font-medium",
        cardTitleSizes[size],
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "bg-muted/50 flex items-center rounded-b-xl border-t p-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
