import Link from "next/link";
import { SessionGuard } from "@/components/shared/session-guard";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { ManagementNav } from "@/features/management/components/management-nav";
import { Eyebrow } from "@/components/ui/typography";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";

const ManagementLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-background text-foreground min-h-dvh">
    <header className="border-border bg-card/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <Link
            href="/"
            className="focus-visible:ring-ring flex min-w-0 flex-col rounded-md leading-tight outline-none focus-visible:ring-2"
          >
            <Eyebrow>Island Media Co</Eyebrow>
            <span className="font-heading text-base font-semibold tracking-tight">
              Management console
            </span>
          </Link>
          <div className="md:hidden">
            <RoleSwitcher />
          </div>
        </div>

        <ManagementNav className="-mx-1 overflow-x-auto md:mx-0" />

        <div className="hidden items-center gap-3 md:flex">
          <span className="text-muted-foreground hidden text-xs lg:inline">
            Operating date{" "}
            {FIXTURE_CLOCK_DATE.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <RoleSwitcher />
        </div>
      </div>
    </header>

    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:py-8">
      <SessionGuard requiredRole="manager" surface="management console">
        {children}
      </SessionGuard>
    </main>
  </div>
);

export default ManagementLayout;
