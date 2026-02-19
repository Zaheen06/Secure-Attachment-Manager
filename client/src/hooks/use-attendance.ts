import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMarkAttendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sessionId: number;
      qrToken: string;
      location: { lat: number; lng: number };
      deviceFingerprint: string;
    }) => {
      const res = await fetch(api.attendance.mark.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to mark attendance");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success!", 
        description: "Attendance marked successfully.",
        className: "bg-green-500 text-white border-green-600"
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Attendance Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}
