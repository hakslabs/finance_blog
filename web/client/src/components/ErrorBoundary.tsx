import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-background">
        <div className="w-full max-w-xl rounded-xl border border-destructive/40 bg-card/60 p-8 space-y-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold">
                예기치 못한 오류가 발생했습니다
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                페이지를 새로고침하거나 홈으로 돌아가 다시 시도해주세요.
              </p>
            </div>
          </div>

          {this.state.error && (
            <details className="rounded border border-border/60 bg-card/40">
              <summary className="px-3 py-2 text-xs font-mono cursor-pointer text-muted-foreground hover:text-foreground">
                오류 상세 (디버그)
              </summary>
              <pre className="px-3 py-2 text-[11px] text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64 border-t border-border/40">
                {this.state.error.stack ?? String(this.state.error)}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              새로고침
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-sm hover:bg-card/70"
            >
              <Home className="w-3.5 h-3.5" />
              홈으로
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
