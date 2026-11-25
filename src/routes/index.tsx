import { createFileRoute, Link } from "@tanstack/react-router";
import { Pill, BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediMinder — Never miss a dose" },
      { name: "description", content: "Sign in, add your medicines and get timely reminders for every dose." },
      { property: "og:title", content: "MediMinder — Never miss a dose" },
      { property: "og:description", content: "Sign in, add your medicines and get timely reminders for every dose." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>
          <Pill className="h-6 w-6 text-accent" /> MediMinder
        </div>
        <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-12">
        <h1 className="max-w-2xl text-5xl font-bold leading-tight md:text-6xl">
          Your medicines, <span className="text-accent">right on time.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Add your medicines once. MediMinder reminds you at every dose and keeps track of what you've taken today.
        </p>
        <Button asChild size="lg" className="mt-8 rounded-full px-8"><Link to="/auth">Get started — it's free</Link></Button>
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: Pill, t: "Add medicines", d: "Name, dose and the times you take them." },
            { icon: BellRing, t: "Get reminded", d: "A notification pops up when a dose is due." },
            { icon: CheckCircle2, t: "Track doses", d: "Tick off each dose and see today's progress." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border bg-card p-6 shadow-soft">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
