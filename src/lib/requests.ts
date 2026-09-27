import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { RequestStatus } from "@/lib/eco";

export type PickupRequest = {
  id: string;
  request_id: string;
  user_id: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  waste_categories: string[];
  waste_description: string;
  quantity: number;
  quantity_unit: string;
  pickup_address: string;
  area: string;
  city: string;
  pincode: string;
  pickup_date: string;
  time_slot: string;
  instructions: string;
  image_url: string | null;
  collector: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
};

export type StatusHistoryRow = {
  id: string;
  request_uuid: string;
  status: RequestStatus;
  note: string;
  updated_by: string;
  created_at: string;
};

async function fetchAll(): Promise<PickupRequest[]> {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PickupRequest[];
}

/** Live-updating list of every request (admin views + statistics). */
export function useAllRequests() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["requests"], queryFn: fetchAll });

  useEffect(() => {
    const channel = supabase
      .channel("pickup_requests_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_requests" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["requests"] });
        void queryClient.invalidateQueries({ queryKey: ["request"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useMyRequests(userId: string | undefined) {
  const all = useAllRequests();
  return {
    ...all,
    data: (all.data ?? []).filter((r) => r.user_id === userId),
  };
}

export function useRequestByCode(code: string | undefined) {
  return useQuery({
    queryKey: ["request", code],
    enabled: Boolean(code),
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select("*")
        .ilike("request_id", code!.trim())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: history } = await supabase
        .from("request_status_history")
        .select("*")
        .eq("request_uuid", (data as PickupRequest).id)
        .order("created_at", { ascending: true });
      return {
        request: data as PickupRequest,
        history: (history ?? []) as StatusHistoryRow[],
      };
    },
  });
}

export function useRequestHistory(requestUuid: string | undefined) {
  return useQuery({
    queryKey: ["history", requestUuid],
    enabled: Boolean(requestUuid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_status_history")
        .select("*")
        .eq("request_uuid", requestUuid!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StatusHistoryRow[];
    },
  });
}
