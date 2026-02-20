import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useEffect } from "react";
import { Id } from "../../../convex/_generated/dataModel";

export function useAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Custom simple token auth implementation using localStorage
  const [userId, setUserId] = useState<Id<"users"> | null>(() => {
    return (localStorage.getItem("userId") as Id<"users">) || null;
  });

  const user = useQuery(api.auth.me, { userId: userId || undefined });
  const isLoading = user === undefined;

  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);

  const login = useCallback(async (credentials: any) => {
    try {
      const id = await loginMutation(credentials);
      localStorage.setItem("userId", id);
      setUserId(id);
      toast({ title: "Welcome back!", description: "Successfully logged in." });

      // We don't have user role immediately synchronously returned here, 
      // but the route protector will handle redirect when user query resolves
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [loginMutation, toast, setLocation]);

  const register = useCallback(async (data: any) => {
    try {
      await registerMutation(data);
      toast({ title: "Account created", description: "Please log in with your new account." });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [registerMutation, toast, setLocation]);

  const logout = useCallback(() => {
    localStorage.removeItem("userId");
    setUserId(null);
    setLocation("/login");
    toast({ title: "Logged out" });
  }, [setLocation, toast]);

  return {
    user,
    isLoading,
    login,
    isLoggingIn: false,
    register,
    isRegistering: false,
    logout,
  };
}
