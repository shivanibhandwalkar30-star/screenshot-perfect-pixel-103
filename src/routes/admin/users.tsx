import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/eco/AdminShell";
import { RequireAuth } from "@/components/eco/RequireAuth";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toKg } from "@/lib/eco";
import { useAllRequests } from "@/lib/requests";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — EcoCollect Admin" },
      {
        name: "description",
        content: "Citizens raising pickup requests, with their request volume and waste totals.",
      },
      { property: "og:title", content: "Users — EcoCollect Admin" },
      {
        property: "og:description",
        content: "Review citizen activity across all collection requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const { data: requests = [] } = useAllRequests();
  const [search, setSearch] = useState("");

  const users = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; area: string; requests: number; completed: number; kg: number }
    >();
    for (const request of requests) {
      const key = request.contact_phone;
      const existing = map.get(key) ?? {
        name: request.contact_name,
        phone: request.contact_phone,
        area: `${request.area}, ${request.city}`,
        requests: 0,
        completed: 0,
        kg: 0,
      };
      existing.requests += 1;
      if (request.status === "completed") {
        existing.completed += 1;
        existing.kg += toKg(Number(request.quantity), request.quantity_unit);
      }
      map.set(key, existing);
    }
    return [...map.values()].sort((a, b) => b.requests - a.requests);
  }, [requests]);

  const rows = users.filter((user) =>
    `${user.name} ${user.phone} ${user.area}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <RequireAuth adminOnly>
      <AdminShell title="Users" subtitle={`${users.length} citizens have raised requests`}>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone or area"
          className="max-w-sm"
        />
        <div className="eco-card mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Waste (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.phone}>
                  <TableCell className="whitespace-nowrap font-semibold">{user.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{user.phone}</TableCell>
                  <TableCell className="whitespace-nowrap">{user.area}</TableCell>
                  <TableCell>{user.requests}</TableCell>
                  <TableCell>{user.completed}</TableCell>
                  <TableCell>{Math.round(user.kg)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminShell>
    </RequireAuth>
  );
}
