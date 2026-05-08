import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { UserRole } from "../types/database";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  profile: { name: string; phone: string } | null;
  loading: boolean;
  signInWithOTP: (phone: string) => Promise<{ error: Error | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<{ name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          fetchProfile(session.user.id);
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
      const { data, error } = await supabase
        .from("profiles")
        .select("name, role, phone")
        .eq("id", userId)
        .single() as { data: { name: string; role: string; phone: string } | null; error: Error | null };

      if (error) throw error;
      if (data) {
        // Map profile roles to app roles
        const roleMap: Record<string, UserRole> = {
          representative: "rep",
          exhibitor: "manager",
          distributor: "distributor",
          producer: "producer",
          admin: "admin",
          // Also accept direct app role names
          rep: "rep",
          manager: "manager",
        };
        setRole(roleMap[data.role] || "rep");
        setProfile({ name: data.name, phone: data.phone });
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithOTP(phone: string) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: "+91" + phone.replace(/\s/g, ""),
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function verifyOTP(phone: string, token: string) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: "+91" + phone.replace(/\s/g, ""),
        token,
        type: "sms",
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
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
