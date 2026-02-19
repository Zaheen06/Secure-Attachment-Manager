import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessions } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { CalendarIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CreateSessionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { createSession, isCreating } = useSessions();
  const { user } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [radius, setRadius] = useState("100");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
      return;
    }

    // Get current location for the session geofence
    navigator.geolocation.getCurrentPosition(
      (position) => {
        createSession({
          subject,
          teacherId: user.id,
          startTime: new Date(),
          isActive: true,
          locationLat: position.coords.latitude,
          locationLng: position.coords.longitude,
          radius: parseInt(radius),
        }, {
          onSuccess: () => {
            setIsOpen(false);
            setSubject("");
          }
        });
      },
      (error) => {
        toast({ title: "Location Error", description: "Could not get location. Ensure permissions are granted.", variant: "destructive" });
        console.error(error);
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-display">Create Attendance Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject / Class Name</Label>
            <Input 
              id="subject" 
              placeholder="e.g. CS101: Intro to Algorithms" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="rounded-xl border-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="radius">Geofence Radius (meters)</Label>
            <Input 
              id="radius" 
              type="number" 
              min="10" 
              max="1000"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">Students must be within this range to mark attendance.</p>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full rounded-xl h-12 text-lg font-medium" 
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Start Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
