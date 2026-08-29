"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { errorMessage, isAuthError } from "@/features/portal/hooks/use-portal-data";

export const SignedOutNotice = () => (
  <Card className="mx-auto max-w-lg">
    <CardHeader>
      <CardTitle>You are not signed in as a client</CardTitle>
      <CardDescription>
        The client portal needs a client session. Register a new organisation, or
        pick a seeded client from the role switcher in the header.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex flex-wrap gap-2">
      <Button asChild size="sm">
        <Link href="/register">Register an organisation</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/">Back to surfaces</Link>
      </Button>
    </CardContent>
  </Card>
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
