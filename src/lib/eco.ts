export type RequestStatus =
  | "pending"
  | "reviewed"
  | "scheduled"
  | "assigned"
  | "on_the_way"
  | "completed"
  | "cancelled";

export const STATUS_META: Record<
  RequestStatus,
  { label: string; dot: string; chip: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-warm",
    chip: "bg-warm-soft text-warm-foreground border-warm/30",
  },
  reviewed: {
    label: "Reviewed",
    dot: "bg-info",
    chip: "bg-info-soft text-info border-info/30",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-info",
    chip: "bg-info-soft text-info border-info/30",
  },
  assigned: {
    label: "Assigned",
    dot: "bg-purple",
    chip: "bg-purple-soft text-purple border-purple/30",
  },
  on_the_way: {
    label: "On the Way",
    dot: "bg-warm",
    chip: "bg-warm-soft text-warm-foreground border-warm/40",
  },
  completed: {
    label: "Completed",
    dot: "bg-primary",
    chip: "bg-primary-soft text-primary-deep border-primary/30",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-destructive",
    chip: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

export const ALL_STATUSES: RequestStatus[] = [
  "pending",
  "reviewed",
  "scheduled",
  "assigned",
  "on_the_way",
  "completed",
  "cancelled",
];

export const TIMELINE_STAGES: { status: RequestStatus; label: string }[] = [
  { status: "pending", label: "Request Submitted" },
  { status: "reviewed", label: "Request Reviewed" },
  { status: "scheduled", label: "Pickup Scheduled" },
  { status: "assigned", label: "Collector Assigned" },
  { status: "on_the_way", label: "On the Way" },
  { status: "completed", label: "Waste Collected" },
];

export const TIME_SLOTS = [
  "9:00 AM – 12:00 PM",
  "12:00 PM – 3:00 PM",
  "3:00 PM – 6:00 PM",
  "6:00 PM – 8:00 PM",
];

export const QUANTITY_UNITS = ["kg", "bags", "pieces"];

export const WASTE_CATEGORIES = [
  { name: "Plastic", icon: "🧴", description: "Bottles, wrappers and packaging" },
  { name: "Paper", icon: "📄", description: "Newspapers, cartons and books" },
  { name: "E-Waste", icon: "🔌", description: "Phones, chargers and appliances" },
  { name: "Metal", icon: "🥫", description: "Cans, utensils and scrap metal" },
  { name: "Glass", icon: "🍾", description: "Bottles, jars and glassware" },
  { name: "Organic Waste", icon: "🥬", description: "Kitchen and garden waste" },
  { name: "Bulk Waste", icon: "🪑", description: "Furniture and large items" },
  { name: "Mixed Recyclables", icon: "♻️", description: "Assorted recyclables" },
  { name: "Other", icon: "🗑️", description: "Anything else to collect" },
];

export const PUNE_AREAS = [
  "Kothrud",
  "Baner",
  "Wakad",
  "Hadapsar",
  "Viman Nagar",
  "Shivajinagar",
];

export const DEMO_USER = { email: "demo@ecocollect.demo", password: "demo1234" };
export const DEMO_ADMIN = { email: "admin@ecocollect.demo", password: "admin123" };

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function categoryIcon(name: string) {
  return WASTE_CATEGORIES.find((c) => c.name === name)?.icon ?? "♻️";
}

export function toKg(quantity: number, unit: string) {
  if (unit === "bags") return quantity * 4;
  if (unit === "pieces") return quantity * 3;
  return quantity;
}
