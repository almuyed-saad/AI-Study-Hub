import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/Button.tsx";
import { AlertOctagon, RefreshCcw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12 text-center transition-colors duration-200">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 mx-auto mb-6">
              <AlertOctagon className="h-6 w-6" />
            </div>

            <h1 className="font-sans text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-2">
              Something went wrong
            </h1>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              We encountered an unexpected layout error while preparing your academic workspace. Try refreshing the page or returning to the dashboard.
            </p>

            {this.state.error && (
              <div className="mb-6 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3.5 text-left font-mono text-[10px] text-rose-600 dark:text-rose-400 overflow-x-auto max-h-36 scrollbar-thin">
                <p className="font-semibold mb-1">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="opacity-85 whitespace-pre-wrap leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs py-2 h-10 border-slate-200 dark:border-slate-800"
                onClick={this.handleGoHome}
                icon={<Home className="h-3.5 w-3.5" />}
              >
                Go Home
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 text-xs py-2 h-10 bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-600 dark:hover:bg-violet-700"
                onClick={this.handleReset}
                icon={<RefreshCcw className="h-3.5 w-3.5" />}
              >
                Reload Page
              </Button>
            </div>
          </div>
          
          <p className="mt-8 text-[10px] font-mono text-slate-400 dark:text-slate-500">
            If this error persists, please clear your browser cache or check your connection.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
