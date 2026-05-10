import { Component, type ReactNode } from "react";
import { FPMark } from "./shared";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, this would go to Sentry
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg)", padding: 24,
        }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <FPMark size={32} />
            <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 16, color: "var(--ink-1)" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>
              An unexpected error occurred. Please reload the page.
              {import.meta.env.DEV && this.state.error && (
                <span style={{ display: "block", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--bad)" }}>
                  {this.state.error.message}
                </span>
              )}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
              <button className="btn" onClick={() => window.location.href = "/login"}>
                Go to Login
              </button>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
