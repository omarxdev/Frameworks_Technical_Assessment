"use client";

import { AccessDeniedState } from "@/components/shared/access-denied-state";
import { ErrorState } from "@/components/ui/states";
import { errorMessageFrom, isAccessError } from "@/lib/api-client";

export const ManagementErrorState = ({
  error,
  title,
  fallback,
  onRetry,
}: {
  error: unknown;
  title: string;
  fallback: string;
  onRetry?: () => void;
}) => {
  if (isAccessError(error)) {
    return <AccessDeniedState requiredRole="manager" surface="management console" />;
  }

  return (
    <ErrorState
      title={title}
      message={errorMessageFrom(error, fallback)}
      onRetry={onRetry}
    />
  );
};
