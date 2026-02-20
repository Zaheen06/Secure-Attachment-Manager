import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import TeacherDashboard from "@/pages/TeacherDashboard";
import SessionDetails from "@/pages/SessionDetails";
import StudentScanPage from "@/pages/StudentScanPage";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

function PrivateRoute({
  component: Component,
  allowedRoles
}: {
  component: React.ComponentType<any>,
  allowedRoles: string[]
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Redirect to={user.role === 'teacher' ? '/dashboard' : '/student/scan'} />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/dashboard">
        <PrivateRoute component={TeacherDashboard} allowedRoles={['teacher', 'admin']} />
      </Route>

      <Route path="/session/:id">
        <PrivateRoute component={SessionDetails} allowedRoles={['teacher', 'admin']} />
      </Route>

      <Route path="/student/scan">
        <PrivateRoute component={StudentScanPage} allowedRoles={['student']} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function App() {
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ConvexProvider>
  );
}

export default App;
