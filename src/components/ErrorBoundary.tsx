import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Last-resort net for render-time crashes. Project Showcase visitors have no way to reach a
// developer console, so a thrown error must land on a screen with a way back in, never a blank
// page. Demo mode routes almost everything through DemoStore, but a bad response shape or an
// unexpected state combination is still possible — this keeps that failure contained instead of
// taking down the whole app.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth-shell">
          <div className="auth-card" style={{ textAlign: "center" }}>
            <AlertOctagon size={36} color="var(--danger)" style={{ margin: "0 auto 14px" }} />
            <div style={{ fontSize: 16, fontWeight: 650, marginBottom: 8 }}>Something went wrong</div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 18 }}>
              This screen ran into an unexpected error. You can try again without losing anything else in this
              session.
            </p>
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
