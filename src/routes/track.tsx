import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { RequestTimeline } from "@/components/eco/RequestTimeline";
import { SiteFooter } from "@/components/eco/SiteFooter";
import { SiteHeader } from "@/components/eco/SiteHeader";
import { StatusBadge } from "@/components/eco/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, formatDate } from "@/lib/eco";
import { useAuth } from "@/lib/auth";
import { useRequestByCode } from "@/lib/requests";

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "Track Your Pickup — EcoCollect" },
      {
        name: "description",
        content: "Enter your EcoCollect request ID to follow every stage of your waste pickup.",
      },
      { property: "og:title", content: "Track Your Pickup — EcoCollect" },
      {
        property: "og:description",
        content: "Live status timeline for your waste collection request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [term, setTerm] = useState(id ?? "");
  const { data, isLoading, refetch } = useRequestByCode(id);

  useEffect(() => setTerm(id ?? ""), [id]);

  const request = data?.request;
  const canCancel =
    request &&
    request.user_id === user?.id &&
    (request.status === "pending" || request.status === "scheduled");

  async function cancelRequest() {
    if (!request) return;
    const { error } = await supabase
      .from("pickup_requests")
      .update({ status: "cancelled" })
      .eq("id", request.id);
    if (error) {
      toast.error("Could not cancel this request.");
      return;
    }
    toast.success("Request cancelled.");
    void refetch();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Track Your Pickup</h1>
        <p className="mt-1 text-muted-foreground">
          Enter your request ID to see the live collection status.
        </p>

        <form
          className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = term.trim();
            if (!value) {
              toast.error("Please enter a request ID.");
              return;
            }
            void navigate({ to: "/track", search: { id: value } });
          }}
        >
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Enter Request ID e.g. REQ-2026-00125"
          />
          <Button type="submit">
            <Search className="h-4 w-4" /> Track
          </Button>
        </form>

        {isLoading && id ? (
          <p className="mt-8 text-sm text-muted-foreground">Looking up {id}…</p>
        ) : null}

        {id && !isLoading && !request ? (
          <div className="eco-card mt-8 p-6 text-center">
            <p className="font-display text-lg font-semibold">No request found for “{id}”</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Double-check the ID from your confirmation screen.
            </p>
          </div>
        ) : null}

        {request ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="eco-card p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold text-primary-deep">
                    {request.request_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Raised on {formatDate(request.created_at)}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <Row
                  label="Waste Category"
                  value={request.waste_categories
                    .map((c) => `${categoryIcon(c)} ${c}`)
                    .join(", ")}
                />
                <Row label="Quantity" value={`${request.quantity} ${request.quantity_unit}`} />
                <Row
                  label="Pickup Address"
                  value={`${request.pickup_address}, ${request.area}, ${request.city} ${request.pincode}`}
                />
                <Row label="Scheduled Date" value={formatDate(request.pickup_date)} />
                <Row label="Time Slot" value={request.time_slot} />
                <Row label="Collector" value={request.collector || "Not assigned yet"} />
                <Row label="Instructions" value={request.instructions || "—"} />
              </dl>

              <div className="mt-5 rounded-xl bg-primary-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-deep">
                  Estimated Pickup
                </p>
                <p className="mt-1 text-sm font-medium text-primary-deep">
                  {formatDate(request.pickup_date)} | {request.time_slot}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    Back to Dashboard
                  </Button>
                </Link>
                {canCancel ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Cancel Request
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this pickup?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {request.request_id} will be cancelled and no collector will be sent.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep request</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void cancelRequest()}>
                          Yes, cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>

            <div className="eco-card p-5">
              <h2 className="font-display text-lg font-semibold">Status Timeline</h2>
              <div className="mt-4">
                <RequestTimeline status={request.status} history={data?.history} />
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-foreground">{value}</dd>
    </div>
  );
}
