import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useSession, useSessionAttendance } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, RefreshCw, MapPin, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function SessionDetails() {
  const { id } = useParams();
  const sessionId = id as string;
  const { data: session, isLoading: sessionLoading } = useSession(sessionId);
  const { data: attendanceList, isLoading: attendanceLoading } = useSessionAttendance(sessionId);

  const generateQrMutation = useMutation(api.sessions.generateQr);

  const [qrData, setQrData] = useState<{ token: string, expiresAt: number } | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);

  const teacherId = localStorage.getItem("userId") as Id<"users">;

  const refetchQr = useCallback(async () => {
    if (!sessionId || !teacherId) return;
    try {
      setQrLoading(true);
      const data = await generateQrMutation({
        sessionId: sessionId as Id<"sessions">,
        teacherId
      });
      setQrData(data);
    } catch (e) {
      console.error("Failed to generate QR:", e);
    } finally {
      setQrLoading(false);
    }
  }, [sessionId, teacherId, generateQrMutation]);

  // Initial QR load
  useEffect(() => {
    refetchQr();
  }, [refetchQr]);

  // Timer for QR refresh logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          refetchQr();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refetchQr]);

  // Sync timeLeft with actual expiry if available
  useEffect(() => {
    if (qrData?.expiresAt) {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((qrData.expiresAt - now) / 1000));
      setTimeLeft(diff);
    }
  }, [qrData]);

  if (sessionLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
  if (!session) return <div className="p-8 text-center">Session not found</div>;

  const qrValue = qrData ? JSON.stringify({ sessionId: session._id, token: qrData.token }) : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg">{session.subject}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Geofence: {session.radius}m
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
              {attendanceList?.length || 0} Present
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: QR Code */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/20 shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-primary/10 text-center pb-6">
              <CardTitle className="text-xl">Scan to Mark Attendance</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                QR Code refreshes automatically
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
              {qrLoading && !qrData ? (
                <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative bg-white p-4 rounded-xl">
                    <QRCodeSVG value={qrValue} size={256} level="H" includeMargin />
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center gap-2 text-sm font-medium text-muted-foreground bg-gray-100 px-4 py-2 rounded-full">
                <RefreshCw className={`w-4 h-4 ${timeLeft < 5 ? 'animate-spin text-red-500' : ''}`} />
                Refreshing in {timeLeft}s
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Student List */}
        <div className="space-y-6">
          <Card className="h-full max-h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Attendance Log
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {attendanceLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : attendanceList && attendanceList.length > 0 ? (
                <div className="divide-y divide-border">
                  {attendanceList.map((record: any) => (
                    <div key={record._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm bg-primary/10 text-primary">
                          <AvatarFallback className="font-bold">
                            {record.student?.name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{record.student?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{record.student?.email || ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-muted-foreground">
                          {format(new Date(record.timestamp), "h:mm:ss a")}
                        </span>
                        {record.verified && (
                          <div className="flex items-center justify-end gap-1 text-[10px] text-green-600 font-medium mt-1">
                            <MapPin className="w-3 h-3" /> Verified
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-muted-foreground opacity-60">
                  <Users className="w-12 h-12 mb-2" />
                  <p>No attendance marked yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
