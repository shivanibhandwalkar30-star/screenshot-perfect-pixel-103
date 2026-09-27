import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/eco/EmptyState";
import { RequireAuth } from "@/components/eco/RequireAuth";
import { SiteFooter } from "@/components/eco/SiteFooter";
import { SiteHeader } from "@/components/eco/SiteHeader";
import { StatusBadge } from "@/components/eco/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/eco";
import { useAuth } from "@/lib/auth";
import { useMyRequests } from "@/lib/requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Pickup History — EcoCollect" },
      {
        name: "description",
        content: "Browse and filter every waste pickup you have requested with EcoCollect.",
      },
      { property: "og:title", content: "Pickup History — EcoCollect" },
      {
        property: "og:description",
        content: "All your past and upcoming waste collections in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <History />
    </RequireAuth>
  ),
});

const filters = ["All", "Pending", "Scheduled", "Completed", "Cancelled"] as const;

function History() {
  const { user } = useAuth();
  const { data: requests = [] } = useMyRequests(user?.id);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [search, setSearch] = useState("");

  const rows = requests.filter((request) => {
    const matchesFilter = filter === "All" || request.status === filter.toLowerCase();
    const matchesSearch =
      !search.trim() ||
      request.request_id.toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Pickup History</h1>
        <p className="mt-1 text-muted-foreground">Every request you have raised so far.</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {filters.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {option}
            </button>
          ))}
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Request ID"
            className="w-full sm:ml-auto sm:w-64"
          />
        </div>

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No pickup requests yet ♻️"
              description="Schedule your first waste collection to build your history."
              action={
                <Link to="/request-pickup">
                  <Button>Request Pickup</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="eco-card mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Waste Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Pickup Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-semibold">{request.request_id}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(request.pickup_date)}
                    </TableCell>
                    <TableCell>{request.waste_categories.join(", ")}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {request.quantity} {request.quantity_unit}
                    </TableCell>
                    <TableCell>
                      {request.area}, {request.city}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to="/track" search={{ id: request.request_id }}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
