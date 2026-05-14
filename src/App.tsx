import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import { ErrorBoundary } from "./components/ui/error-boundary";

import LoginPage from "./routes/login";
import RepHomePage from "./routes/rep/home";

const CDREntryPage = lazy(() => import("./routes/rep/cdr-entry"));
const HistoryPage = lazy(() => import("./routes/rep/history"));
const ManagerDashboardPage = lazy(() => import("./routes/manager/dashboard"));
const ExpensesPage = lazy(() => import("./routes/manager/expenses"));
const DailySheetPage = lazy(() => import("./routes/manager/daily-sheet"));
const ManagerReportsPage = lazy(() => import("./routes/manager/reports"));
const DistributorDashboardPage = lazy(() => import("./routes/distributor/dashboard"));
const SettlementsPage = lazy(() => import("./routes/distributor/settlements"));
const ReportsPage = lazy(() => import("./routes/distributor/reports"));
const AdminDashboardPage = lazy(() => import("./routes/admin/dashboard"));
const GSTSummaryPage = lazy(() => import("./routes/reports/gst-summary"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function Loader() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid var(--line)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto" }} />
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>Loading…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ allowed, children }: { allowed: string[]; children: React.ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;
  if (role && !allowed.includes(role)) return <HomeRedirect />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { role } = useAuth();
  switch (role) {
    case "rep": return <Navigate to="/rep" replace />;
    case "manager": return <Navigate to="/manager" replace />;
    case "distributor": case "producer": return <Navigate to="/distributor" replace />;
    case "admin": return <Navigate to="/admin" replace />;
    default: return <Navigate to="/rep" replace />;
  }
}

function LogoutPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { signOut().then(() => navigate("/login", { replace: true })); }, []);
  return <Loader />;
}

export default function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<Loader />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/logout" element={<LogoutPage />} />
                  <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />

                  <Route path="/rep" element={<RoleRoute allowed={["rep"]}><RepHomePage /></RoleRoute>} />
                  <Route path="/rep/cdr/:showId" element={<RoleRoute allowed={["rep"]}><CDREntryPage /></RoleRoute>} />
                  <Route path="/rep/history" element={<RoleRoute allowed={["rep"]}><HistoryPage /></RoleRoute>} />

                  <Route path="/manager" element={<RoleRoute allowed={["manager","admin"]}><ManagerDashboardPage /></RoleRoute>} />
                  <Route path="/manager/daily-sheet" element={<RoleRoute allowed={["manager","admin"]}><DailySheetPage /></RoleRoute>} />
                  <Route path="/manager/expenses" element={<RoleRoute allowed={["manager","admin"]}><ExpensesPage /></RoleRoute>} />
                  <Route path="/manager/reports" element={<RoleRoute allowed={["manager","admin"]}><ManagerReportsPage /></RoleRoute>} />

                  <Route path="/distributor" element={<RoleRoute allowed={["distributor","producer","admin"]}><DistributorDashboardPage /></RoleRoute>} />
                  <Route path="/distributor/settlements" element={<RoleRoute allowed={["distributor","manager","admin"]}><SettlementsPage /></RoleRoute>} />
                  <Route path="/distributor/reports" element={<RoleRoute allowed={["distributor","producer","manager","admin"]}><ReportsPage /></RoleRoute>} />

                  <Route path="/admin" element={<RoleRoute allowed={["admin"]}><AdminDashboardPage /></RoleRoute>} />
                  <Route path="/reports/gst" element={<RoleRoute allowed={["distributor","producer","admin"]}><GSTSummaryPage /></RoleRoute>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
