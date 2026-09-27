import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminShell } from "@/components/eco/AdminShell";
import { RequireAuth } from "@/components/eco/RequireAuth";
import { StatTile } from "@/components/eco/StatTile";
import { ALL_STATUSES, STATUS_META, WASTE_CATEGORIES, toKg } from "@/lib/eco";
import { useAllRequests } from "@/lib/requests";

export const Route = createFileRoute("/admin/statistics")({
  head: () => ({
    meta: [
      { title: "Collection Statistics — EcoCollect Admin" },
      {
        name: "description",
        content: "Waste by category, monthly collection trends and request status breakdown.",
      },
      { property: "og:title", content: "Collection Statistics — EcoCollect Admin" },
      {
        property: "og:description",
        content: "Charts and key metrics for the EcoCollect collection network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Statistics,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

function Statistics() {
  const { data: requests = [] } = useAllRequests();

  const byCategory = useMemo(
    () =>
      WASTE_CATEGORIES.slice(0, 7)
        .map((category) => ({
          name: category.name,
          kg: Math.round(
            requests
              .filter((r) => r.waste_categories.includes(category.name))
              .reduce((sum, r) => sum + toKg(Number(r.quantity), r.quantity_unit), 0),
          ),
        }))
        .filter((row) => row.kg > 0),
    [requests],
  );

  const monthly = useMemo(() => {
    const months: { label: string; key: string; kg: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        kg: 0,
      });
    }
    for (const request of requests) {
      const key = request.pickup_date.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.kg += toKg(Number(request.quantity), request.quantity_unit);
    }
    return months.map((m) => ({ ...m, kg: Math.round(m.kg) }));
  }, [requests]);

  const byStatus = useMemo(
    () =>
      ALL_STATUSES.map((status) => ({
        name: STATUS_META[status].label,
        value: requests.filter((r) => r.status === status).length,
      })).filter((row) => row.value > 0),
    [requests],
  );

  const completed = requests.filter((r) => r.status === "completed");
  const collectedKg = completed.reduce(
    (sum, r) => sum + toKg(Number(r.quantity), r.quantity_unit),
    0,
  );
  const days = 30;
  const completionRate = requests.length
    ? Math.round((completed.length / requests.length) * 100)
    : 0;

  return (
    <RequireAuth adminOnly>
      <AdminShell title="Statistics" subtitle="Collection performance at a glance">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Total Requests" value={requests.length} icon="📋" />
          <StatTile label="Completed Pickups" value={completed.length} icon="✅" tone="info" />
          <StatTile
            label="Total Waste Collected"
            value={`${Math.round(collectedKg).toLocaleString("en-IN")} kg`}
            icon="📊"
            tone="purple"
          />
          <StatTile
            label="Average Daily Requests"
            value={(requests.length / days).toFixed(1)}
            icon="📈"
            tone="warm"
          />
          <StatTile label="Completion Rate" value={`${completionRate}%`} icon="♻️" />
          <StatTile
            label="Cancelled"
            value={requests.filter((r) => r.status === "cancelled").length}
            icon="🚫"
            tone="warm"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Waste by Category (kg)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} dy={10} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="kg" radius={[6, 6, 0, 0]}>
                  {byCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly Collection (kg)">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Request Status" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  label
                >
                  {byStatus.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </AdminShell>
    </RequireAuth>
  );
}

function ChartCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`eco-card p-5 ${className ?? ""}`}>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
