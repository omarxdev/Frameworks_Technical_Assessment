"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const NavLink = ({
  href,
  label,
  icon: Icon,
  active,
  className,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  active: boolean;
  className?: string;
}) => (
  <Link
    href={href}
    aria-current={active ? "page" : undefined}
    className={cn(
      "focus-visible:ring-ring flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2",
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      className
    )}
  >
    {Icon && <Icon className="size-4 shrink-0" />}
    <span>{label}</span>
  </Link>
);
