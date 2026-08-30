"use client";

import { AccessDeniedState } from "@/components/shared/access-denied-state";
import { ErrorState } from "@/components/ui/states";
import { errorMessage, isAuthError } from "@/features/portal/hooks/use-portal-data";

export const SignedOutNotice = () => (
  <AccessDeniedState requiredRole="client" surface="client portal" />
);

export const PortalErrorState = ({
  error,
  fallback,
  onRetry,
}: {
  error: unknown;
  fallback: string;
  onRetry?: () => void;
}) => {
  if (isAuthError(error)) return <SignedOutNotice />;

  return (
    <ErrorState
      title="We could not load this"
      message={errorMessage(error, fallback)}
      onRetry={onRetry}
    />
  );
};
