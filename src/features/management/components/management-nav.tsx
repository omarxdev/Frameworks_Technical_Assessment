"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/management", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/management/requests", label: "Requests", icon: ClipboardList, exact: false },
  { href: "/management/work-orders", label: "Work orders", icon: Wrench, exact: false },
];

export const ManagementNav = ({ className }: { className?: string }) => {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-1", className)} aria-label="Management sections">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
