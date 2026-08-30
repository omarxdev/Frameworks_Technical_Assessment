"use client";

import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Users, Wrench } from "lucide-react";
import { NavLink } from "@/components/shared/nav-link";
import { cn } from "@/lib/utils";

const links = [
  { href: "/management", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/management/requests", label: "Requests", icon: ClipboardList, exact: false },
  { href: "/management/work-orders", label: "Work orders", icon: Wrench, exact: false },
  { href: "/management/clients", label: "Clients", icon: Users, exact: false },
];

export const ManagementNav = ({ className }: { className?: string }) => {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-1", className)} aria-label="Management sections">
      {links.map(({ href, label, icon, exact }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          icon={icon}
          active={exact ? pathname === href : pathname.startsWith(href)}
        />
      ))}
    </nav>
  );
};
