import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, PageTitle } from "@/components/ui/typography";
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
      <Eyebrow>Island Media Co</Eyebrow>
      <PageTitle>
        Register your organisation
      </PageTitle>
      <p className="text-muted-foreground text-sm">
        Registering costs nothing and commits you to nothing. Everything in the portal —
        including requests — is non-binding until you accept a contract.
      </p>
    </div>

    <RegisterForm />
  </main>
);

export default RegisterPage;
