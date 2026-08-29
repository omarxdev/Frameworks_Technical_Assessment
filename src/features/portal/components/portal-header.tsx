"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkCheck, Building2 } from "lucide-react";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { useShortlistCount } from "@/features/portal/hooks/use-shortlist";
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link
          href="/portal"
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-sm font-semibold tracking-tight">
              Island Media Co
            </span>
            <span className="text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Client portal
            </span>
          </span>
        </Link>

        <nav
          aria-label="Client portal"
          className="order-last flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto md:pl-4"
        >
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive(pathname, href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/portal/catalogue"
            aria-label={`Shortlist, ${shortlistCount} saved`}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <BookmarkCheck className="size-3.5" />
            <span className="hidden sm:inline">Shortlist</span>
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                shortlistCount > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {shortlistCount}
            </span>
          </Link>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
};
