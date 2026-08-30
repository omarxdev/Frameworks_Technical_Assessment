import Link from "next/link";
import { Building2, HardHat, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, PageTitle } from "@/components/ui/typography";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const surfaces = [
  {
    href: "/portal",
    icon: Building2,
    title: "Client portal",
    description:
      "Browse the catalogue, submit a non-binding request, review contracts and follow service progress.",
  },
  {
    href: "/management",
    icon: LayoutDashboard,
    title: "Management",
    description:
      "Attention-led dashboard, booking requests, contract issue, work-order assignment and proof visibility.",
  },
  {
    href: "/fitter",
    icon: HardHat,
    title: "Fitter app",
    description:
      "Mobile-first job list, progress updates, blocked reasons and completion proof capture.",
  },
];

const Home = () => (
  <main className="bg-brand-surface text-brand-surface-foreground flex min-h-dvh flex-col justify-center px-4 py-16 sm:px-6">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
    <header className="flex flex-col gap-3">
      <Eyebrow>Island Media Co</Eyebrow>
      <PageTitle className="text-3xl sm:text-4xl">
        Connected advertising operations
      </PageTitle>
      <p className="text-muted-foreground max-w-2xl">
        One operating model behind three surfaces. Choose a surface to begin, or switch
        role at any time from the header.
      </p>
    </header>

    <div className="grid gap-4 sm:grid-cols-3">
      {surfaces.map(({ href, icon: Icon, title, description }) => (
        <Card key={href} className="justify-between">
          <CardHeader>
            <Icon className="text-primary size-5" />
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="w-full">
              <Link href={href}>Open</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>

    <p className="text-xs opacity-70">
      Prototype with fictional seeded data. Fixture clock is 15 January 2027.
    </p>
    </div>
  </main>
);

export default Home;
