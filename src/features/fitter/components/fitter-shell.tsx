"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, HardHat } from "lucide-react";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/features/fitter/components/connection-banner";
import { useProofQueue } from "@/features/fitter/hooks/use-proof-queue";

export const FitterShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { isOnline, allPending, isWorking, flush } = useProofQueue();

  const isDetail = pathname !== "/fitter";

  const handleRetryAll = () => {
    void flush();
  };

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="border-border bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-2.5">
          {isDetail ? (
            <Button asChild variant="ghost" size="touch" className="-ml-2">
              <Link href="/fitter">
                <ChevronLeft className="size-4" />
                Jobs
              </Link>
            </Button>
          ) : (
            <span className="flex items-center gap-2 text-sm font-semibold">
              <HardHat className="text-primary size-4" />
              Island Media Field
            </span>
          )}
          <div className="ml-auto">
            <RoleSwitcher />
          </div>
        </div>
        <ConnectionBanner
          isOnline={isOnline}
          pendingCount={allPending.length}
          isWorking={isWorking}
          onRetryAll={handleRetryAll}
        />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-24">
        {children}
      </main>
    </div>
  );
};
