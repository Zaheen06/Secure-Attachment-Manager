import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";
import { Id } from "../../../convex/_generated/dataModel";

export function useMarkAttendance() {
  const { toast } = useToast();
  const markMutation = useMutation(api.attendance.mark);

  return {
    mutate: useCallback(async (data: {
      sessionId: Id<"sessions">;
      qrToken: string;
      location: { lat: number; lng: number };
      deviceFingerprint: string;
    }) => {
      try {
        const studentId = localStorage.getItem("userId") as Id<"users">;
        if (!studentId) throw new Error("Not logged in");

        await markMutation({
          sessionId: data.sessionId,
          studentId: studentId,
          qrToken: data.qrToken,
          location: data.location,
          deviceFingerprint: data.deviceFingerprint,
          // Basic IP grab since Convex doesn't easily expose it safely without a custom function header
          ipAddress: "127.0.0.1"
        });

        toast({
          title: "Success!",
          description: "Attendance marked successfully.",
          className: "bg-green-500 text-white border-green-600"
        });
      } catch (error: any) {
        toast({
          title: "Attendance Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    }, [markMutation, toast]),
    isPending: false
  };
}
