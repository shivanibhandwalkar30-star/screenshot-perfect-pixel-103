import { createFileRoute, Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/eco/EmptyState";
import { RequireAuth } from "@/components/eco/RequireAuth";
import { SiteFooter } from "@/components/eco/SiteFooter";
import { SiteHeader } from "@/components/eco/SiteHeader";
import { StatTile } from "@/components/eco/StatTile";
import { StatusBadge } from "@/components/eco/StatusBadge";
import { Button } from "@/components/ui/button";
import { categoryIcon, formatDate, toKg } from "@/lib/eco";
import { useAuth } from "@/lib/auth";
import { useMyRequests } from "@/lib/requests";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — EcoCollect" },
      {
        name: "description",
        content: "See your active pickup requests, completed collections and waste totals.",
      },
      { property: "og:title", content: "Your Dashboard — EcoCollect" },
      {
        property: "og:description",
        content: "Track active pickups and review your recycling contribution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const { profile, user } = useAuth();
  const { data: requests = [], isLoading } = useMyRequests(user?.id);

  const pending = requests.filter((r) => r.status === "pending");
  const completed = requests.filter((r) => r.status === "completed");
  const active = requests.filter((r) => !["completed", "cancelled"].includes(r.status));
  const collectedKg = completed.reduce(
    (sum, r) => sum + toKg(Number(r.quantity), r.quantity_unit),
    0,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Welcome, {profile?.name || "there"} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Here is your collection activity.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active Requests" value={active.length} icon="🚚" />
          <StatTile label="Completed Pickups" value={completed.length} icon="♻️" tone="info" />
          <StatTile label="Pending Requests" value={pending.length} icon="🕒" tone="warm" />
          <StatTile
            label="Total Waste Collected"
            value={`${Math.round(collectedKg)} kg`}
            icon="📊"
            tone="purple"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/request-pickup">
            <Button>Request Pickup</Button>
          </Link>
          <Link to="/track">
            <Button variant="outline">Track Request</Button>
          </Link>
          <Link to="/history">
            <Button variant="secondary">Pickup History</Button>
          </Link>
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Active Requests</h2>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your requests…</p>
          ) : active.length === 0 ? (
            <EmptyState
              title="No pickup requests yet ♻️"
              description="Schedule your first waste collection and it will show up here."
              action={
                <Link to="/request-pickup">
                  <Button>Request Pickup</Button>
                </Link>
              }
            />
          ) : (
            active.map((request) => (
              <Link
                key={request.id}
                to="/track"
                search={{ id: request.request_id }}
                className="eco-card block p-4 transition-shadow hover:shadow-lift"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-primary-deep">
                      {request.request_id}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {request.waste_categories.map((c) => `${categoryIcon(c)} ${c}`).join(", ")}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      📍 {request.area}, {request.city}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={request.status} />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      📅 {formatDate(request.pickup_date)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
