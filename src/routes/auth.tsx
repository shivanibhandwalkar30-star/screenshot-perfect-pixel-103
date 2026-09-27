import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteFooter } from "@/components/eco/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_ADMIN, DEMO_USER } from "@/lib/eco";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Register — EcoCollect" },
      {
        name: "description",
        content: "Sign in to EcoCollect to request waste pickups and track your collections.",
      },
      { property: "og:title", content: "Login or Register — EcoCollect" },
      {
        property: "og:description",
        content: "Access your EcoCollect dashboard to schedule and track waste pickups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email address").max(120),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number"),
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function AuthPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: isAdmin ? "/admin" : "/dashboard", replace: true });
    }
  }, [loading, session, isAdmin, navigate]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back to EcoCollect ♻️");
    } catch {
      toast.error("Invalid email or password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      password: String(form.get("password") ?? ""),
      confirm: String(form.get("confirm") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: parsed.data.name, phone: parsed.data.phone },
        },
      });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await signIn(parsed.data.email, parsed.data.password);
      }
      toast.success("Account created. Welcome to EcoCollect ♻️");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create your account. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin(kind: "user" | "admin") {
    const creds = kind === "admin" ? DEMO_ADMIN : DEMO_USER;
    setBusy(true);
    try {
      try {
        await signIn(creds.email, creds.password);
      } catch {
        const { error } = await supabase.auth.signUp({
          email: creds.email,
          password: creds.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name: kind === "admin" ? "EcoCollect Admin" : "Demo User",
              phone: "9822011001",
            },
          },
        });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        if (!data.session) await signIn(creds.email, creds.password);
      }
      toast.success(kind === "admin" ? "Signed in as admin ⚙️" : "Signed in as demo user 👤");
    } catch {
      toast.error("Demo sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col eco-surface">
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-card text-xl">♻️</span>
          <span className="font-display text-xl font-bold text-primary-deep">EcoCollect</span>
        </Link>

        <div className="eco-card mt-6 p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" placeholder="••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-5">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input id="reg-name" name="name" placeholder="Aarti Joshi" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone">Phone</Label>
                  <Input id="reg-phone" name="phone" inputMode="numeric" placeholder="9822011001" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" name="password" type="password" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-confirm">Confirm Password</Label>
                    <Input id="reg-confirm" name="confirm" type="password" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-2 border-t border-border pt-5">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quick demo access
            </p>
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() => void demoLogin("user")}
            >
              👤 Continue as Demo User
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void demoLogin("admin")}
            >
              ⚙️ Continue as Demo Admin
            </Button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
