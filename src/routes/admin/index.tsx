import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/eco/AdminShell";
import { RequireAuth } from "@/components/eco/RequireAuth";
import { StatTile } from "@/components/eco/StatTile";
import { StatusBadge } from "@/components/eco/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate, toKg } from "@/lib/eco";
import { useAllRequests } from "@/lib/requests";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — EcoCollect" },
      {
        name: "description",
        content: "Operations overview of pickup requests, collections and recycling performance.",
      },
      { property: "og:title", content: "Admin Dashboard — EcoCollect" },
      {
        property: "og:description",
        content: "Monitor requests, schedules and collection statistics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth adminOnly>
      <AdminOverview />
    </RequireAuth>
  ),
});

function AdminOverview() {
  const { data: requests = [] } = useAllRequests();

  const pending = requests.filter((r) => r.status === "pending");
  const scheduled = requests.filter((r) => ["scheduled", "assigned", "on_the_way"].includes(r.status));
  const completed = requests.filter((r) => r.status === "completed");
  const collectedKg = completed.reduce(
    (sum, r) => sum + toKg(Number(r.quantity), r.quantity_unit),
    0,
  );
  const decided = requests.filter((r) => r.status !== "cancelled").length || 1;
  const recyclingRate = Math.round((completed.length / decided) * 100);

  return (
    <RequireAuth adminOnly>
      <AdminShell title="Dashboard" subtitle="Live operations overview">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Total Requests" value={requests.length} icon="📋" />
          <StatTile label="Pending" value={pending.length} icon="🕒" tone="warm" />
          <StatTile label="Scheduled" value={scheduled.length} icon="📅" tone="info" />
          <StatTile label="Completed" value={completed.length} icon="✅" />
          <StatTile
            label="Waste Collected"
            value={`${Math.round(collectedKg).toLocaleString("en-IN")} kg`}
            icon="📊"
            tone="purple"
          />
          <StatTile label="Recycling Rate" value={`${recyclingRate}%`} icon="♻️" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Latest Requests</h2>
          <Link to="/admin/requests">
            <Button variant="outline" size="sm">
              Manage all requests
            </Button>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {requests.slice(0, 6).map((request) => (
            <Link
              key={request.id}
              to="/admin/requests"
              search={{ q: request.request_id }}
              className="eco-card block p-4 transition-shadow hover:shadow-lift"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-primary-deep">{request.request_id}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {request.contact_name} • {request.waste_categories.join(", ")}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    📍 {request.area}, {request.city} • 📅 {formatDate(request.pickup_date)}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            </Link>
          ))}
        </div>
      </AdminShell>
    </RequireAuth>
  );
}
