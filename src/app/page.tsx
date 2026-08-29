import Link from "next/link";
import { Building2, HardHat, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-10 px-6 py-16">
    <header className="flex flex-col gap-3">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Island Media Co
      </span>
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Connected advertising operations
      </h1>
      <p className="max-w-2xl text-muted-foreground">
        One operating model behind three surfaces. Choose a surface to begin, or
        switch role at any time from the header.
      </p>
    </header>

    <div className="grid gap-4 sm:grid-cols-3">
      {surfaces.map(({ href, icon: Icon, title, description }) => (
        <Card key={href} className="justify-between">
          <CardHeader>
            <Icon className="size-5 text-primary" />
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

    <p className="text-xs text-muted-foreground">
      Prototype with fictional seeded data. Fixture clock is 15 January 2027.
    </p>
  </main>
);

export default Home;
