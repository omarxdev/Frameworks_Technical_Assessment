import Link from "next/link";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { ManagementNav } from "@/features/management/components/management-nav";
import { FIXTURE_CLOCK_DATE } from "@/lib/constants";

const ManagementLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-dvh bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/management" className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Island Media Co
            </span>
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
          <span className="hidden text-xs text-muted-foreground lg:inline">
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

    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>
  </div>
);

export default ManagementLayout;
