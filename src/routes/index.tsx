import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, Recycle, Truck } from "lucide-react";

import heroImage from "@/assets/hero-recycling.jpg";
import { SiteFooter } from "@/components/eco/SiteFooter";
import { SiteHeader } from "@/components/eco/SiteHeader";
import { StatTile } from "@/components/eco/StatTile";
import { Button } from "@/components/ui/button";
import { WASTE_CATEGORIES, toKg } from "@/lib/eco";
import { useAllRequests } from "@/lib/requests";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoCollect — Dispose Responsibly, We'll Handle the Rest" },
      {
        name: "description",
        content:
          "Schedule a waste pickup in Pune, track your collection status live and recycle responsibly with EcoCollect.",
      },
      { property: "og:title", content: "EcoCollect — Smart Waste Collection & Recycling" },
      {
        property: "og:description",
        content: "Request a pickup, track your collection and contribute to a cleaner community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Recycle, title: "Select Waste", text: "Pick the categories you need collected." },
  { icon: CalendarCheck, title: "Schedule Pickup", text: "Choose a date and a time slot." },
  { icon: ClipboardList, title: "Track Request", text: "Follow every stage with your request ID." },
  { icon: Truck, title: "Waste Gets Collected", text: "Our partner collects and recycles it." },
];

function Landing() {
  const { session } = useAuth();
  const { data: requests = [] } = useAllRequests();

  const completed = requests.filter((r) => r.status === "completed");
  const active = requests.filter(
    (r) => !["completed", "cancelled"].includes(r.status),
  );
  const collectedKg = completed.reduce((sum, r) => sum + toKg(Number(r.quantity), r.quantity_unit), 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="eco-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card px-3 py-1 text-xs font-semibold text-primary">
              ♻️ Smart Waste Collection & Recycling
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Dispose Responsibly. We'll Handle the Rest.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Request a waste pickup, track your collection status, and contribute to a cleaner
              community.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={session ? "/request-pickup" : "/auth"}>
                <Button size="lg">Request a Pickup</Button>
              </Link>
              <Link to="/track">
                <Button size="lg" variant="outline">
                  Track My Request
                </Button>
              </Link>
            </div>
          </div>

          <div className="eco-card overflow-hidden p-4">
            <img
              src={heroImage}
              alt="Waste collected, transported by truck and sent for recycling"
              width={1200}
              height={912}
              className="w-full rounded-xl"
            />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-primary-deep">
              <span className="rounded-lg bg-primary-soft py-2">🗑️ Waste</span>
              <span className="rounded-lg bg-warm-soft py-2">🚚 Collection</span>
              <span className="rounded-lg bg-primary-soft py-2">♻️ Recycling</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Waste Collected"
            value={`${Math.round(collectedKg).toLocaleString("en-IN")} kg`}
            icon="📊"
          />
          <StatTile
            label="Pickups Completed"
            value={completed.length}
            icon="🚚"
            tone="info"
          />
          <StatTile label="Active Requests" value={active.length} icon="🗑️" tone="warm" />
          <StatTile label="Recycling Partners" value={18} icon="♻️" tone="purple" />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">How It Works</h2>
        <p className="mt-2 text-muted-foreground">Four simple steps from waste to recycling.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="eco-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold text-warm-foreground">STEP {index + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Waste Categories</h2>
        <p className="mt-2 text-muted-foreground">We collect and recycle all of these.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WASTE_CATEGORIES.slice(0, 6).map((category) => (
            <div key={category.name} className="eco-card p-5">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{category.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="eco-card eco-surface flex flex-col items-center gap-4 px-6 py-10 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Have waste waiting to be collected?
          </h2>
          <p className="max-w-lg text-muted-foreground">
            Book a slot in under a minute and we will take it from there.
          </p>
          <Link to={session ? "/request-pickup" : "/auth"}>
            <Button size="lg">Schedule a Pickup</Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
