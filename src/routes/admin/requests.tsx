import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AdminShell } from "@/components/eco/AdminShell";
import { EmptyState } from "@/components/eco/EmptyState";
import { RequestTimeline } from "@/components/eco/RequestTimeline";
import { RequireAuth } from "@/components/eco/RequireAuth";
import { StatusBadge } from "@/components/eco/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  ALL_STATUSES,
  PUNE_AREAS,
  STATUS_META,
  WASTE_CATEGORIES,
  formatDate,
  formatTime,
  type RequestStatus,
} from "@/lib/eco";
import { useAllRequests, useRequestHistory, type PickupRequest } from "@/lib/requests";

export const Route = createFileRoute("/admin/requests")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" ? { q: search["q"] } : {},
  head: () => ({
    meta: [
      { title: "Request Management — EcoCollect Admin" },
      {
        name: "description",
        content: "Search, filter and update the status of every waste pickup request.",
      },
      { property: "og:title", content: "Request Management — EcoCollect Admin" },
      {
        property: "og:description",
        content: "Manage pickup requests and keep citizens updated in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminRequests,
});

function AdminRequests() {
  const { q } = Route.useSearch();
  const { data: requests = [] } = useAllRequests();
  const [search, setSearch] = useState(q ?? "");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [area, setArea] = useState("all");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<PickupRequest | null>(null);

  const rows = requests.filter((request) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [request.request_id, request.contact_name, request.contact_phone, request.area, request.city]
        .join(" ")
        .toLowerCase()
        .includes(term);
    const matchesStatus = status === "all" || request.status === status;
    const matchesCategory = category === "all" || request.waste_categories.includes(category);
    const matchesArea = area === "all" || request.area === area;
    const matchesDate = !date || request.pickup_date === date;
    return matchesSearch && matchesStatus && matchesCategory && matchesArea && matchesDate;
  });

  const current = selected ? requests.find((r) => r.id === selected.id) ?? selected : null;

  return (
    <RequireAuth adminOnly>
      <AdminShell title="Requests" subtitle={`${rows.length} of ${requests.length} requests`}>
        <div className="eco-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <Label className="text-xs">Search</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ID, name, phone, area"
              className="mt-1"
            />
          </div>
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
            ]}
          />
          <FilterSelect
            label="Waste Category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "All categories" },
              ...WASTE_CATEGORIES.map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` })),
            ]}
          />
          <FilterSelect
            label="City / Area"
            value={area}
            onChange={setArea}
            options={[
              { value: "all", label: "All areas" },
              ...PUNE_AREAS.map((a) => ({ value: a, label: `📍 ${a}` })),
            ]}
          />
          <div>
            <Label className="text-xs">Pickup Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No requests match these filters ♻️" />
          </div>
        ) : (
          <div className="eco-card mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Waste</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Pickup Date</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {request.request_id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{request.contact_name}</TableCell>
                    <TableCell>{request.waste_categories.join(", ")}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {request.quantity} {request.quantity_unit}
                    </TableCell>
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
                    <TableCell className="whitespace-nowrap">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(request)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Sheet open={Boolean(current)} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
            {current ? <RequestDetails request={current} /> : null}
          </SheetContent>
        </Sheet>
      </AdminShell>
    </RequireAuth>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RequestDetails({ request }: { request: PickupRequest }) {
  const { data: history = [] } = useRequestHistory(request.id);
  const [nextStatus, setNextStatus] = useState<RequestStatus>(request.status);
  const [collector, setCollector] = useState(request.collector ?? "");
  const [busy, setBusy] = useState(false);

  async function updateStatus() {
    setBusy(true);
    const { error } = await supabase
      .from("pickup_requests")
      .update({ status: nextStatus, collector: collector.trim() || null })
      .eq("id", request.id);
    setBusy(false);
    if (error) {
      toast.error("Could not update this request.");
      return;
    }
    toast.success(`${request.request_id} is now ${STATUS_META[nextStatus].label}.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <SheetTitle className="font-display text-xl">{request.request_id}</SheetTitle>
        <div className="mt-2">
          <StatusBadge status={request.status} />
        </div>
      </div>

      <Section title="Customer Details">
        <Row label="Name" value={request.contact_name} />
        <Row label="Phone" value={request.contact_phone} />
        <Row label="Email" value={request.contact_email || "—"} />
      </Section>

      <Section title="Waste Details">
        <Row label="Category" value={request.waste_categories.join(", ")} />
        <Row label="Quantity" value={`${request.quantity} ${request.quantity_unit}`} />
        <Row label="Description" value={request.waste_description || "—"} />
      </Section>

      <Section title="Pickup Details">
        <Row
          label="Address"
          value={`${request.pickup_address}, ${request.area}, ${request.city} ${request.pincode}`}
        />
        <Row label="Date" value={formatDate(request.pickup_date)} />
        <Row label="Time Slot" value={request.time_slot} />
        <Row label="Instructions" value={request.instructions || "—"} />
      </Section>

      <Section title="Request Timeline">
        <ul className="space-y-2 text-sm">
          {history.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span className="whitespace-nowrap text-muted-foreground">
                {formatTime(entry.created_at)}
              </span>
              <span className="min-w-0">
                {STATUS_META[entry.status].label} — {entry.note}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <RequestTimeline status={request.status} history={history} />
        </div>
      </Section>

      <Section title="Status Management">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as RequestStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_META[option].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Collector</Label>
            <Input
              value={collector}
              onChange={(event) => setCollector(event.target.value)}
              placeholder="Assign a collection agent"
              className="mt-1"
            />
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void updateStatus()}>
            Update Status
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-sm font-bold uppercase tracking-wide text-primary-deep">
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 font-medium">{value}</span>
    </div>
  );
}
