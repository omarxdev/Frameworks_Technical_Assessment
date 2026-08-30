"use client";

import { AccessDeniedState } from "@/components/shared/access-denied-state";
import { LoadingState } from "@/components/ui/states";
import { useSession } from "@/components/shared/role-switcher";
import type { UserRole } from "@/lib/schemas";
import type { ReactNode } from "react";

export const SessionGuard = ({
  requiredRole,
  surface,
  children,
}: {
  requiredRole: UserRole;
  surface: string;
  children: ReactNode;
}) => {
  const { data, isPending } = useSession();

  if (isPending) {
    return <LoadingState label="Checking your session" />;
  }

  if (!data?.user) {
    return <AccessDeniedState requiredRole={requiredRole} surface={surface} />;
  }

  return <>{children}</>;
};
