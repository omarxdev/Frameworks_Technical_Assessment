"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  homeForRole,
  usePrototypeAccounts,
  useSession,
  useSwitchAccount,
} from "@/components/shared/role-switcher";
import type { UserRole } from "@/lib/schemas";
import { Card } from "@/components/ui/card";

const surfaceLabels: Record<UserRole, string> = {
  manager: "management console",
  fitter: "field app",
  client: "client portal",
};

export const AccessDeniedState = ({
  requiredRole,
  surface,
}: {
  requiredRole: UserRole;
  surface: string;
}) => {
  const { data: session } = useSession();
  const { data: accounts } = usePrototypeAccounts();
  const switchAccount = useSwitchAccount();

  const current = session?.user;
  const candidates = (accounts?.items ?? []).filter(
    (account) => account.role === requiredRole
  );

  return (
    <Card className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center" role="alert">
      <ShieldAlert className="text-warn size-6" />

      <div className="flex flex-col gap-1.5">
        <p className="font-medium">This is the {surface}</p>
        <p className="text-muted-foreground text-sm">
          {current
            ? `You are signed in as ${current.name}, who works in the ${surfaceLabels[current.role]}. Switch to a ${requiredRole} account to continue.`
            : `Choose a ${requiredRole} account to continue.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {candidates.slice(0, 3).map((account) => (
          <Button
            key={account.id}
            size="sm"
            disabled={switchAccount.isPending}
            onClick={() => switchAccount.mutate(account.id)}
          >
            Continue as {account.name}
          </Button>
        ))}

        {current && (
          <Button asChild size="sm" variant="outline">
            <Link href={homeForRole(current.role)}>
              Back to my {surfaceLabels[current.role]}
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
};
