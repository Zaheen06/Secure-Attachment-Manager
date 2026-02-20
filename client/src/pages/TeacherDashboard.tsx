import { useAuth } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Users, QrCode, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { sessions, isLoading } = useSessions();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">AttendEase</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-sm text-muted-foreground">
              Hello, {user.name}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your class sessions and attendance</p>
          </div>
          <CreateSessionDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No sessions yet</h3>
                <p className="text-muted-foreground mb-6">Create your first session to start taking attendance</p>
                <CreateSessionDialog />
              </div>
            ) : (
              sessions.map((session: any) => (
                <Card key={session._id} className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/50 overflow-hidden">
                  <CardHeader className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 border-b">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-display text-xl">{session.subject}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(session.startTime), "MMM d, yyyy • h:mm a")}
                        </CardDescription>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {session.isActive ? 'Active' : 'Ended'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">Students</span>
                      </div>
                      {/* Placeholder count, real app would join attendance count */}
                      <span className="text-2xl font-bold tracking-tight">--</span>
                    </div>

                    <Link href={`/session/${session._id}`}>
                      <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                        View Session
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
