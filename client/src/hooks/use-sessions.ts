import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertSession } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSessions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: [api.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.list.path);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return await res.json();
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: InsertSession) => {
      const res = await fetch(api.sessions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Session Created", description: "Your class session is ready." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not create session", variant: "destructive" });
    },
  });

  return {
    sessions: sessionsQuery.data || [],
    isLoading: sessionsQuery.isLoading,
    createSession: createSessionMutation.mutate,
    isCreating: createSessionMutation.isPending,
  };
}

export function useSession(id: number) {
  return useQuery({
    queryKey: [api.sessions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sessions.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch session");
      return await res.json();
    },
    enabled: !!id,
  });
}

export function useSessionQr(id: number) {
  return useQuery({
    queryKey: [api.sessions.generateQr.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sessions.generateQr.path, { id });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate QR");
      return await res.json();
    },
    enabled: !!id,
    refetchInterval: 25000, // Refresh every 25s (before 30s expiry)
  });
}

export function useSessionAttendance(id: number) {
  return useQuery({
    queryKey: [api.attendance.list.path.replace(":id", String(id))],
    queryFn: async () => {
      const url = buildUrl(api.attendance.list.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch attendance list");
      return await res.json();
    },
    enabled: !!id,
    refetchInterval: 5000, // Live updates
  });
}
