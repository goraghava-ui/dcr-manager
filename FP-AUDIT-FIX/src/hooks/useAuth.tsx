import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { UserRole } from "../types/database";

interface AuthState {
  session: Session | null;
  user: { id: string; phone?: string } | null;
  role: UserRole | null;
  profile: { name: string; phone: string } | null;
  loading: boolean;
  signInWithOTP: (phone: string) => Promise<{ error: Error | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const ROLE_MAP: Record<string, UserRole> = {
  representative: "rep",
  exhibitor: "manager",
  distributor: "distributor",
  producer: "producer",
  admin: "admin",
  rep: "rep",
  manager: "manager",
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<{ name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        setSession(s);
        if (event === "SIGNED_OUT") {
          setRole(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("name, role, phone")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile not found, using default:", error.message);
        // Profile doesn't exist yet — set defaults
        setRole("rep");
        setProfile({ name: "User", phone: "" });
        setLoading(false);
        return;
      }

      if (data) {
        setRole(ROLE_MAP[data.role] || "rep");
        setProfile({ name: data.name || "User", phone: data.phone || "" });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setRole("rep");
      setProfile({ name: "User", phone: "" });
    } finally {
      setLoading(false);
    }
  }

  async function signInWithOTP(phone: string) {
    try {
      const cleanPhone = phone.replace(/\s/g, "");
      const { error } = await supabase.auth.signInWithOtp({
        phone: "+91" + cleanPhone,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function verifyOTP(phone: string, token: string) {
    try {
      const cleanPhone = phone.replace(/\s/g, "");
      const { error } = await supabase.auth.verifyOtp({
        phone: "+91" + cleanPhone,
        token,
        type: "sms",
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setSession(null);
    setRole(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ? { id: session.user.id, phone: session.user.phone ?? undefined } : null,
        role,
        profile,
        loading,
        signInWithOTP,
        verifyOTP,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
