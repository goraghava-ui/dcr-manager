// Auto-generated types from Supabase schema — placeholder until generated via CLI
// Run: npx supabase gen types typescript --project-id tlwodgygfillyiewrcrs > src/types/database.ts

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          name: string;
          role: "rep" | "manager" | "distributor" | "producer" | "admin";
          email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["users"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["users"]["Insert"]
        >;
      };
      // Add remaining table types as schema is finalized
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type UserRole = "rep" | "manager" | "distributor" | "producer" | "admin";

export type CDRStatus = "draft" | "submitted" | "approved" | "rejected";

export type SettlementStatus =
  | "draft"
  | "sent"
  | "acknowledged"
  | "paid"
  | "disputed";

export type PaymentMode = "cash" | "upi" | "bank" | "cheque";
