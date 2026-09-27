import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/eco/AdminShell";
import { EmptyState } from "@/components/eco/EmptyState";
import { RequireAuth } from "@/components/eco/RequireAuth";
import { StatusBadge } from "@/components/eco/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { formatDate } from "@/lib/eco";
import { useAllRequests, type PickupRequest } from "@/lib/requests";

export const Route = createFileRoute("/admin/scheduled")({
  head: () => ({
    meta: [
      { title: "Scheduled Pickups — EcoCollect Admin" },
      {
        name: "description",
        content: "Upcoming waste collections grouped by date with collector assignments.",
      },
      { property: "og:title", content: "Scheduled Pickups — EcoCollect Admin" },
      {
        property: "og:description",
        content: "Plan the collection calendar and assign pickups by date.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScheduledPickups,
});

function ScheduledPickups() {
  const { data: requests = [] } = useAllRequests();
  const [selected, setSelected] = useState<PickupRequest | null>(null);

  const upcoming = useMemo(
    () =>
      requests
        .filter(
          (r) =>
            !["cancelled", "completed"].includes(r.status) &&
            r.pickup_date >= new Date().toISOString().slice(0, 10),
        )
        .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date)),
    [requests],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, PickupRequest[]>();
    for (const request of upcoming) {
      map.set(request.pickup_date, [...(map.get(request.pickup_date) ?? []), request]);
    }
    return [...map.entries()];
  }, [upcoming]);

  return (
    <RequireAuth adminOnly>
      <AdminShell title="Scheduled Pickups" subtitle={`${upcoming.length} upcoming collections`}>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming pickups ♻️" description="New requests will appear here." />
        ) : (
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <div className="eco-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Waste</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(request)}
                      >
                        <TableCell className="whitespace-nowrap font-semibold">
                          {request.request_id}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{request.contact_name}</TableCell>
                        <TableCell>{request.waste_categories.join(", ")}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(request.pickup_date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{request.time_slot}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {request.area}, {request.city}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {byDate.map(([date, items]) => (
                  <div key={date} className="eco-card p-4">
                    <p className="font-display font-semibold text-primary-deep">
                      📅 {formatDate(date)}
                    </p>
                    <p className="text-xs text-muted-foreground">{items.length} pickup(s)</p>
                    <ul className="mt-3 space-y-2">
                      {items.map((request) => (
                        <li key={request.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(request)}
                            className="w-full rounded-lg bg-primary-soft px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          >
                            <span className="font-semibold text-primary-deep">
                              {request.request_id}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {request.time_slot} • {request.area}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            {selected ? (
              <div className="space-y-4">
                <SheetTitle className="font-display text-xl">{selected.request_id}</SheetTitle>
                <StatusBadge status={selected.status} />
                <dl className="space-y-2 text-sm">
                  <Row label="User" value={selected.contact_name} />
                  <Row label="Phone" value={selected.contact_phone} />
                  <Row label="Waste" value={selected.waste_categories.join(", ")} />
                  <Row
                    label="Quantity"
                    value={`${selected.quantity} ${selected.quantity_unit}`}
                  />
                  <Row label="Date" value={formatDate(selected.pickup_date)} />
                  <Row label="Slot" value={selected.time_slot} />
                  <Row
                    label="Address"
                    value={`${selected.pickup_address}, ${selected.area}, ${selected.city}`}
                  />
                  <Row label="Collector" value={selected.collector || "Not assigned"} />
                </dl>
                <p className="text-xs text-muted-foreground">
                  Update status and collector from the Requests page.
                </p>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      </AdminShell>
    </RequireAuth>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium">{value}</dd>
    </div>
  );
}
