import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { I18nProvider } from "./lib/i18n";

// Eager
import LoginPage from "./routes/login";
import RepHomePage from "./routes/rep/home";

// Lazy
const CDREntryPage = lazy(() => import("./routes/rep/cdr-entry"));
const HistoryPage = lazy(() => import("./routes/rep/history"));
const ManagerDashboardPage = lazy(() => import("./routes/manager/dashboard"));
const ExpensesPage = lazy(() => import("./routes/manager/expenses"));
const DailySheetPage = lazy(() => import("./routes/manager/daily-sheet"));
const DistributorDashboardPage = lazy(() => import("./routes/distributor/dashboard"));
const SettlementsPage = lazy(() => import("./routes/distributor/settlements"));
const ReportsPage = lazy(() => import("./routes/distributor/reports"));
const AdminDashboardPage = lazy(() => import("./routes/admin/dashboard"));
const GSTSummaryPage = lazy(() => import("./routes/reports/gst-summary"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function Loader() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center" }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="18" rx="2" stroke="var(--accent)" strokeWidth="1.6" />
          <rect x="2" y="3" width="3" height="18" fill="var(--accent)" />
          <rect x="19" y="3" width="3" height="18" fill="var(--accent)" />
          <text x="12" y="16" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="9" fill="var(--accent)">FP</text>
        </svg>
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>Loading…</div>
      </div>
    </div>
  );
}

/** Auth guard — must be logged in */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Role guard — must have correct role to access */
function RoleRoute({ allowed, children }: { allowed: string[]; children: React.ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;
  if (role && !allowed.includes(role)) {
    // Wrong role — redirect to their correct dashboard
    return <HomeRedirect />;
  }
  return <>{children}</>;
}

/** Role-based home redirect */
function HomeRedirect() {
  const { role } = useAuth();
  switch (role) {
    case "rep": return <Navigate to="/rep" replace />;
    case "manager": return <Navigate to="/manager" replace />;
    case "distributor": return <Navigate to="/distributor" replace />;
    case "producer": return <Navigate to="/distributor" replace />;
    case "admin": return <Navigate to="/admin" replace />;
    default: return <Navigate to="/rep" replace />;
  }
}

/** Logout page — clears session and redirects */
function LogoutPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    signOut().then(() => navigate("/login", { replace: true }));
  }, []);
  return <Loader />;
}

function useServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
}

export default function App() {
  useServiceWorker();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/logout" element={<LogoutPage />} />

                <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />

                {/* Rep — only rep can access */}
                <Route path="/rep" element={<RoleRoute allowed={["rep"]}><RepHomePage /></RoleRoute>} />
                <Route path="/rep/cdr/:showId" element={<RoleRoute allowed={["rep"]}><CDREntryPage /></RoleRoute>} />
                <Route path="/rep/history" element={<RoleRoute allowed={["rep"]}><HistoryPage /></RoleRoute>} />

                {/* Manager — only manager + admin */}
                <Route path="/manager" element={<RoleRoute allowed={["manager", "admin"]}><ManagerDashboardPage /></RoleRoute>} />
                <Route path="/manager/daily-sheet" element={<RoleRoute allowed={["manager", "admin"]}><DailySheetPage /></RoleRoute>} />
                <Route path="/manager/expenses" element={<RoleRoute allowed={["manager", "admin"]}><ExpensesPage /></RoleRoute>} />

                {/* Distributor — distributor + producer + admin */}
                <Route path="/distributor" element={<RoleRoute allowed={["distributor", "producer", "admin"]}><DistributorDashboardPage /></RoleRoute>} />
                <Route path="/distributor/settlements" element={<RoleRoute allowed={["distributor", "admin"]}><SettlementsPage /></RoleRoute>} />
                <Route path="/distributor/reports" element={<RoleRoute allowed={["distributor", "producer", "admin"]}><ReportsPage /></RoleRoute>} />

                {/* Admin — only admin */}
                <Route path="/admin" element={<RoleRoute allowed={["admin"]}><AdminDashboardPage /></RoleRoute>} />

                {/* Reports */}
                <Route path="/reports/gst" element={<RoleRoute allowed={["distributor", "producer", "admin"]}><GSTSummaryPage /></RoleRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
