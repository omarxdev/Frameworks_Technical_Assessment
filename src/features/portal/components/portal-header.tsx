"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkCheck, Building2 } from "lucide-react";
import { NavLink } from "@/components/shared/nav-link";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useShortlistCount } from "@/features/portal/hooks/use-shortlist";
import { Eyebrow } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/portal", label: "Home" },
  { href: "/portal/catalogue", label: "Catalogue" },
  { href: "/portal/contracts", label: "Contracts" },
];

const isActive = (pathname: string, href: string) =>
  href === "/portal" ? pathname === href : pathname.startsWith(href);

export const PortalHeader = () => {
  const pathname = usePathname();
  const shortlistCount = useShortlistCount();

  return (
    <header className="border-border bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link
          href="/portal"
          className="focus-visible:ring-ring flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2"
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
            <Building2 className="size-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-sm font-semibold tracking-tight">
              Island Media Co
            </span>
            <Eyebrow>Client portal</Eyebrow>
          </span>
        </Link>

        <nav
          aria-label="Client portal"
          className="order-last flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto md:pl-4"
        >
          {navItems.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              active={isActive(pathname, href)}
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link
              href="/portal/catalogue"
              aria-label={`Shortlist, ${shortlistCount} saved`}
            >
              <BookmarkCheck />
              <span className="hidden sm:inline">Shortlist</span>
              <StatusPill
                status={String(shortlistCount)}
                tone={shortlistCount > 0 ? "info" : "neutral"}
              />
            </Link>
          </Button>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
};
