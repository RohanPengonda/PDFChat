import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-dvh items-center justify-center bg-[#161b27] p-6 text-[#e8eaf0]">
        <div className="max-w-md w-full rounded-2xl border border-[#2d3548] bg-[#1e2433] p-6 text-center">
          <h1 className="text-base font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-[#6b7a99]">
            The interface hit an unexpected error. Reloading usually fixes it.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-[#161b27] p-3 text-left text-[11px] text-[#a0b0cc]">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.handleReload}
            className="mt-4 rounded-lg bg-[#2979ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#1565c0]"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
