import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { RequireAuth } from "@/components/eco/RequireAuth";
import { SiteFooter } from "@/components/eco/SiteFooter";
import { SiteHeader } from "@/components/eco/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — EcoCollect" },
      {
        name: "description",
        content: "Update your contact details, saved pickup address and notification preferences.",
      },
      { property: "og:title", content: "Your Profile — EcoCollect" },
      {
        property: "og:description",
        content: "Manage your EcoCollect account details and alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number"),
  address: z.string().trim().max(200),
  area: z.string().trim().max(80),
  city: z.string().trim().max(60),
  pincode: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{6}$/.test(value), "Pincode must be 6 digits"),
});

function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    area: "",
    city: "Pune",
    pincode: "",
  });
  const [prefs, setPrefs] = useState({
    notify_reminders: true,
    notify_status: true,
    notify_completion: true,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
      area: profile.area,
      city: profile.city || "Pune",
      pincode: profile.pincode,
    });
    setPrefs({
      notify_reminders: profile.notify_reminders,
      notify_status: profile.notify_status,
      notify_completion: profile.notify_completion,
    });
  }, [profile]);

  async function save() {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, ...prefs })
      .eq("id", user!.id);
    setBusy(false);
    if (error) {
      toast.error("Could not save your profile.");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated ♻️");
  }

  async function updatePref(key: keyof typeof prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await supabase
      .from("profiles")
      .update({
        notify_reminders: next.notify_reminders,
        notify_status: next.notify_status,
        notify_completion: next.notify_completion,
      })
      .eq("id", user!.id);
    if (error) toast.error("Could not update your preference.");
    else await refreshProfile();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your Profile</h1>
        <p className="mt-1 text-muted-foreground">Keep your pickup details up to date.</p>

        <section className="eco-card mt-6 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Personal Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-phone">Phone</Label>
              <Input
                id="p-phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(event) => setForm((p) => ({ ...p, phone: event.target.value }))}
              />
            </div>
          </div>
        </section>

        <section className="eco-card mt-5 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Saved Pickup Address</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-address">Address</Label>
              <Textarea
                id="p-address"
                value={form.address}
                onChange={(event) => setForm((p) => ({ ...p, address: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-area">Area / Locality</Label>
                <Input
                  id="p-area"
                  value={form.area}
                  onChange={(event) => setForm((p) => ({ ...p, area: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-city">City</Label>
                <Input
                  id="p-city"
                  value={form.city}
                  onChange={(event) => setForm((p) => ({ ...p, city: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-pincode">Pincode</Label>
                <Input
                  id="p-pincode"
                  inputMode="numeric"
                  value={form.pincode}
                  onChange={(event) => setForm((p) => ({ ...p, pincode: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <Button className="mt-5" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
          </Button>
        </section>

        <section className="eco-card mt-5 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Notification Preferences</h2>
          <div className="mt-4 space-y-4">
            {(
              [
                ["notify_reminders", "Pickup reminders"],
                ["notify_status", "Status updates"],
                ["notify_completion", "Completion notifications"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label htmlFor={key} className="text-sm font-medium">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={prefs[key]}
                  onCheckedChange={(value) => void updatePref(key, value)}
                />
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
