import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegisterForm } from "@/features/portal/components/register-form";

const RegisterPage = () => (
  <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-12 sm:px-6">
    <div className="flex flex-col gap-3">
      <Button asChild size="sm" variant="ghost" className="w-fit">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>
      <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Island Media Co
      </span>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Register your organisation
      </h1>
      <p className="text-sm text-muted-foreground">
        Registering costs nothing and commits you to nothing. Everything in the
        portal — including requests — is non-binding until you accept a
        contract.
      </p>
    </div>

    <RegisterForm />
  </main>
);

export default RegisterPage;
