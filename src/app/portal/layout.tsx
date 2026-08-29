import { PortalHeader } from "@/features/portal/components/portal-header";

const PortalLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-dvh flex-col bg-background">
    <PortalHeader />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      {children}
    </main>
    <footer className="border-t border-border">
      <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
        Prototype with fictional seeded data. Availability, rates and contracts
        shown here are indicative until confirmed by Island Media Co.
      </p>
    </footer>
  </div>
);

export default PortalLayout;
