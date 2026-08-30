import { SessionGuard } from "@/components/shared/session-guard";
import { PortalHeader } from "@/features/portal/components/portal-header";

const PortalLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-background flex min-h-dvh flex-col">
    <PortalHeader />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <SessionGuard requiredRole="client" surface="client portal">
        {children}
      </SessionGuard>
    </main>
    <footer className="border-border border-t">
      <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-4 text-xs sm:px-6">
        Prototype with fictional seeded data. Availability, rates and contracts shown
        here are indicative until confirmed by Island Media Co.
      </p>
    </footer>
  </div>
);

export default PortalLayout;
