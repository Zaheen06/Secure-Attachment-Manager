import { useAuth } from "@/hooks/use-auth";
import { StudentScanner } from "@/components/StudentScanner";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useLocation } from "wouter";

export default function StudentScanPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <header className="max-w-md mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Hi, {user.name.split(' ')[0]}</h1>
            <p className="text-xs text-muted-foreground">Ready to learn?</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => logout()} className="rounded-full bg-white/50 backdrop-blur-sm">
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        <StudentScanner />
        
        <div className="text-center text-sm text-muted-foreground px-8">
          <p>Please ensure you are inside the classroom and have granted camera/location permissions.</p>
        </div>
      </main>
    </div>
  );
}
