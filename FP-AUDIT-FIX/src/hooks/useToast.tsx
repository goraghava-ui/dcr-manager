import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ToastCtx {
  toasts: Toast[];
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now().toString(36);
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const colors: Record<string, { bg: string; border: string; text: string }> = {
    success: { bg: "var(--ok-soft)", border: "var(--ok)", text: "var(--ok)" },
    error: { bg: "var(--bad-soft)", border: "var(--bad)", text: "var(--bad)" },
    warning: { bg: "var(--warn-soft)", border: "var(--warn)", text: "var(--warn)" },
    info: { bg: "var(--accent-soft)", border: "var(--accent)", text: "var(--accent)" },
  };

  return (
    <ToastContext.Provider value={{ toasts, success: (m) => add("success", m), error: (m) => add("error", m), warning: (m) => add("warning", m), info: (m) => add("info", m), dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
          {toasts.map((t) => {
            const c = colors[t.type];
            return (
              <div key={t.id} onClick={() => dismiss(t.id)} style={{
                padding: "12px 16px", borderRadius: 8, background: c.bg,
                borderLeft: `3px solid ${c.border}`, color: c.text,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                animation: "slideIn .2s ease-out",
              }}>
                {t.message}
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
