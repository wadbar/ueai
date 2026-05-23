import React, { Component, ReactNode } from 'react';

// Generalized Global Error Boundary Harvester from Core Matrix
// Standardizes graceful degradation and telemetry across all internal applications

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onExceptionCaptured?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface BoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class UniversalErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onExceptionCaptured) {
      this.props.onExceptionCaptured(error, errorInfo);
    } else {
      console.error("[TELEMETRY_UNCAUGHT_EXCEPTION] Runtime core error intercepted:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="m3-card !bg-red-500/10 !border-red-500/30 m-8 items-center justify-center min-h-[50vh] text-center">
          <div className="text-red-500 font-bold tracking-widest uppercase mb-4">Core System Fault Intercepted</div>
          <div className="m3-text-primary mb-6 font-mono text-xs">{this.state.error?.message}</div>
          <button 
            className="m3-button-filled !bg-red-500 !text-white"
            onClick={() => window.location.reload()}
          >
            Initiate Graceful Recovery
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
