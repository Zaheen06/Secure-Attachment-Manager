import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useMarkAttendance } from "@/hooks/use-attendance";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function StudentScanner() {
  const { mutate: markAttendance, isPending, isSuccess, error } = useMarkAttendance();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();

  // Load Fingerprint
  useEffect(() => {
    const loadFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setFingerprint(result.visitorId);
    };
    loadFingerprint();
  }, []);

  // Initialize Scanner
  useEffect(() => {
    // Prevent double initialization
    if (scannerRef.current || isSuccess || isPending) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        handleScan(decodedText);
        scanner.clear();
      },
      (errorMessage) => {
        // Ignored to prevent console spam
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [fingerprint, isSuccess, isPending]);

  const handleScan = (qrData: string) => {
    if (!fingerprint) {
      toast({ title: "Initializing", description: "Please wait for device check...", variant: "destructive" });
      return;
    }

    setScanResult(qrData);

    try {
      const parsedData = JSON.parse(qrData);
      const { sessionId, token } = parsedData;

      if (!sessionId || !token) throw new Error("Invalid QR Code");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          markAttendance({
            sessionId,
            qrToken: token,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            deviceFingerprint: fingerprint
          });
        },
        (err) => {
          toast({ title: "Location Error", description: "Location access is required.", variant: "destructive" });
        }
      );
    } catch (e) {
      toast({ title: "Invalid QR", description: "This code is not a valid attendance code.", variant: "destructive" });
    }
  };

  if (isSuccess) {
    return (
      <Card className="p-8 text-center space-y-4 border-green-200 bg-green-50 rounded-3xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-800">Attendance Marked!</h2>
        <p className="text-green-700">You have successfully checked in.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl bg-white relative">
      <div className="p-6 bg-gradient-to-r from-primary to-purple-600 text-white text-center">
        <h2 className="text-2xl font-bold">Scan QR Code</h2>
        <p className="text-white/80 mt-1">Point your camera at the teacher's screen</p>
      </div>

      <div className="p-6">
        {isPending ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-lg font-medium text-muted-foreground">Verifying attendance...</p>
          </div>
        ) : (
          <div id="reader" className="overflow-hidden rounded-xl border-2 border-dashed border-gray-200" />
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error.message}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
