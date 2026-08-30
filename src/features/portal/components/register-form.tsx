"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/states";
import { errorCode, errorMessage } from "@/features/portal/hooks/use-portal-data";
import { apiFetch } from "@/lib/api-client";
import { RegisterInputSchema, type RegisterInput } from "@/lib/schemas";
import type { Organisation, User } from "@/lib/schemas";

interface RegisterResponse {
  user: User;
  organisation: Organisation;
}

export const RegisterForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: { organisationName: "", contactName: "", email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterInput) =>
      apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: values,
      }),
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: (created) => {
        queryClient.clear();
        toast.success(`Welcome, ${created.organisation.name}`);
        router.push("/portal");
        router.refresh();
      },
      onError: (error) => {
        if (errorCode(error) === "EMAIL_IN_USE") {
          setError("email", {
            message: errorMessage(error, "An account already exists for this email."),
          });
          return;
        }
        toast.error(errorMessage(error, "We could not create your account."));
      },
    });
  });

  const showGeneralError =
    mutation.isError && errorCode(mutation.error) !== "EMAIL_IN_USE";

  return (
    <Card>
      <CardHeader>
        <CardTitle size="lg">
          Create your client account
        </CardTitle>
        <CardDescription>
          One organisation, one contact. You will land straight in the portal and can
          browse the catalogue immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organisationName">Organisation name</Label>
            <Input
              id="organisationName"
              autoComplete="organization"
              placeholder="Silverline Fitness"
              aria-invalid={Boolean(errors.organisationName)}
              {...register("organisationName")}
            />
            {errors.organisationName && (
              <p className="text-stop-foreground text-sm">
                {errors.organisationName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactName">Contact name</Label>
            <Input
              id="contactName"
              autoComplete="name"
              placeholder="Avery Stone"
              aria-invalid={Boolean(errors.contactName)}
              {...register("contactName")}
            />
            {errors.contactName && (
              <p className="text-stop-foreground text-sm">
                {errors.contactName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="avery@silverline.example"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-stop-foreground text-sm">{errors.email.message}</p>
            )}
          </div>

          {showGeneralError && (
            <Callout tone="stop" title="Registration failed">
              {errorMessage(mutation.error, "Please try again.")}
            </Callout>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating your account" : "Create account"}
          </Button>

          <p className="text-muted-foreground text-xs">
            Already registered? Pick your organisation from the role switcher once you
            are inside the{" "}
            <Link href="/portal" className="underline underline-offset-2">
              client portal
            </Link>
            .
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
