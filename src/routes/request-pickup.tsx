import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { RequireAuth } from "@/components/eco/RequireAuth";
import { SiteFooter } from "@/components/eco/SiteFooter";
import { SiteHeader } from "@/components/eco/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  PUNE_AREAS,
  QUANTITY_UNITS,
  TIME_SLOTS,
  WASTE_CATEGORIES,
  categoryIcon,
  formatDate,
} from "@/lib/eco";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/request-pickup")({
  head: () => ({
    meta: [
      { title: "Request a Pickup — EcoCollect" },
      {
        name: "description",
        content: "Choose your waste categories, quantity, address and a pickup slot in minutes.",
      },
      { property: "og:title", content: "Request a Pickup — EcoCollect" },
      {
        property: "og:description",
        content: "Book a waste collection slot with EcoCollect in a few simple steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <RequestPickup />
    </RequireAuth>
  ),
});

const today = () => new Date().toISOString().slice(0, 10);

const detailsSchema = z.object({
  waste_description: z.string().trim().min(3, "Describe the waste briefly").max(300),
  quantity: z.coerce.number().positive("Quantity must be greater than zero").max(10000),
  quantity_unit: z.string(),
});

const contactSchema = z.object({
  contact_name: z.string().trim().min(2, "Please enter your full name").max(80),
  contact_phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number"),
  pickup_address: z.string().trim().min(6, "Please enter your full address").max(200),
  area: z.string().trim().min(2, "Please enter the area or locality").max(80),
  city: z.string().trim().min(2, "Please enter the city").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"),
});

const STEPS = [
  "Waste Category",
  "Waste Details",
  "Pickup Information",
  "Schedule",
  "Instructions",
];

function RequestPickup() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<null | {
    request_id: string;
    categories: string[];
    pickup_date: string;
    time_slot: string;
    address: string;
  }>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    waste_description: "",
    quantity: "",
    quantity_unit: "kg",
    contact_name: "",
    contact_phone: "",
    pickup_address: "",
    area: "",
    city: "Pune",
    pincode: "",
    pickup_date: "",
    time_slot: TIME_SLOTS[0]!,
    instructions: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      contact_name: prev.contact_name || profile.name,
      contact_phone: prev.contact_phone || profile.phone,
      pickup_address: prev.pickup_address || profile.address,
      area: prev.area || profile.area,
      city: prev.city || profile.city || "Pune",
      pincode: prev.pincode || profile.pincode,
    }));
  }, [profile]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(name: string) {
    setCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  }

  function validateStep(index: number) {
    if (index === 0 && categories.length === 0) {
      toast.error("Please select at least one waste category.");
      return false;
    }
    if (index === 1) {
      const parsed = detailsSchema.safeParse(form);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please check the waste details.");
        return false;
      }
    }
    if (index === 2) {
      const parsed = contactSchema.safeParse(form);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please check your pickup information.");
        return false;
      }
    }
    if (index === 3) {
      if (!form.pickup_date) {
        toast.error("Please choose a preferred pickup date.");
        return false;
      }
      if (form.pickup_date < today()) {
        toast.error("Pickup date cannot be in the past.");
        return false;
      }
      if (!form.time_slot) {
        toast.error("Please choose a time slot.");
        return false;
      }
    }
    return true;
  }

  async function submit() {
    for (let i = 0; i <= 3; i += 1) if (!validateStep(i)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("pickup_requests")
        .insert({
          user_id: user!.id,
          contact_name: form.contact_name.trim(),
          contact_phone: form.contact_phone.trim(),
          contact_email: profile?.email ?? "",
          waste_categories: categories,
          waste_description: form.waste_description.trim(),
          quantity: Number(form.quantity),
          quantity_unit: form.quantity_unit,
          pickup_address: form.pickup_address.trim(),
          area: form.area.trim(),
          city: form.city.trim(),
          pincode: form.pincode.trim(),
          pickup_date: form.pickup_date,
          time_slot: form.time_slot,
          instructions: form.instructions.trim(),
        })
        .select("request_id")
        .single();
      if (error) throw error;
      setCreated({
        request_id: data.request_id,
        categories,
        pickup_date: form.pickup_date,
        time_slot: form.time_slot,
        address: `${form.pickup_address}, ${form.area}, ${form.city} ${form.pincode}`,
      });
      toast.success("Pickup request submitted successfully 🎉");
    } catch {
      toast.error("Could not submit your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
          <div className="eco-card p-6 text-center">
            <span className="text-4xl">🎉</span>
            <h1 className="mt-3 font-display text-2xl font-bold">
              Pickup Request Submitted Successfully
            </h1>
            <p className="mt-1 text-muted-foreground">
              Keep your request ID handy to track the collection.
            </p>

            <dl className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm">
              <SummaryRow label="Request ID" value={created.request_id} />
              <SummaryRow
                label="Waste Type"
                value={created.categories.map((c) => `${categoryIcon(c)} ${c}`).join(", ")}
              />
              <SummaryRow label="Pickup Date" value={formatDate(created.pickup_date)} />
              <SummaryRow label="Time Slot" value={created.time_slot} />
              <SummaryRow label="Pickup Address" value={created.address} />
              <SummaryRow label="Current Status" value="Pending" />
            </dl>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => navigate({ to: "/track", search: { id: created.request_id } })}
              >
                Track Request
              </Button>
              <Link to="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Request a Pickup</h1>
        <p className="mt-1 text-muted-foreground">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-4" />

        <div className="eco-card mt-6 p-5 sm:p-6">
          {step === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WASTE_CATEGORIES.map((category) => {
                const selected = categories.includes(category.name);
                return (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => toggleCategory(category.name)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <p className="mt-2 font-semibold text-primary-deep">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="waste-desc">Waste Type / Description</Label>
                <Input
                  id="waste-desc"
                  value={form.waste_description}
                  onChange={(event) => set("waste_description", event.target.value)}
                  placeholder="Household plastic bottles and wrappers"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Approximate Quantity</Label>
                  <Input
                    id="quantity"
                    inputMode="decimal"
                    value={form.quantity}
                    onChange={(event) => set("quantity", event.target.value)}
                    placeholder="12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity Unit</Label>
                  <Select
                    value={form.quantity_unit}
                    onValueChange={(value) => set("quantity_unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                Photo upload is optional and not needed for this pickup.
              </p>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.contact_name}
                    onChange={(event) => set("contact_name", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    value={form.contact_phone}
                    onChange={(event) => set("contact_phone", event.target.value)}
                    placeholder="9822011001"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={form.pickup_address}
                  onChange={(event) => set("pickup_address", event.target.value)}
                  placeholder="Flat 4B, Sunshine Residency"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Area / Locality</Label>
                  <Select value={form.area} onValueChange={(value) => set("area", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUNE_AREAS.map((area) => (
                        <SelectItem key={area} value={area}>
                          📍 {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(event) => set("city", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    inputMode="numeric"
                    value={form.pincode}
                    onChange={(event) => set("pincode", event.target.value)}
                    placeholder="411038"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">Preferred Date</Label>
                <Input
                  id="date"
                  type="date"
                  min={today()}
                  value={form.pickup_date}
                  onChange={(event) => set("pickup_date", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Time Slot</Label>
                <Select value={form.time_slot} onValueChange={(value) => set("time_slot", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        📅 {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="instructions">Additional Instructions</Label>
                <Textarea
                  id="instructions"
                  rows={4}
                  value={form.instructions}
                  onChange={(event) => set("instructions", event.target.value)}
                  placeholder="Any additional instructions for the collector…"
                />
              </div>
              <div className="rounded-xl bg-primary-soft p-4 text-sm text-primary-deep">
                <p className="font-semibold">Review</p>
                <p className="mt-1">
                  {categories.join(", ")} • {form.quantity} {form.quantity_unit} •{" "}
                  {formatDate(form.pickup_date)} • {form.time_slot}
                </p>
                <p className="mt-1">
                  📍 {form.pickup_address}, {form.area}, {form.city} {form.pincode}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => {
                  if (validateStep(step)) setStep((prev) => prev + 1);
                }}
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" disabled={busy} onClick={() => void submit()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit Pickup Request
              </Button>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2 border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium">{value}</dd>
    </div>
  );
}
