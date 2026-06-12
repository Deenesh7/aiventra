import { Component } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const err = this.state.error;
    return (
      <div className="min-h-[60vh] grid place-items-center px-6">
        <div className="panel p-8 max-w-2xl text-center border-neon-red/30">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neon-red/15 border border-neon-red/40 grid place-items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-neon-red" />
          </div>
          <h2 className="font-display text-xl text-zinc-100 mb-2">
            Module crashed
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-4">
            This page hit an error and stopped rendering. Other modules still work.
            Try refreshing, or open the browser console for the full stack trace.
          </p>
          {err && (
            <pre className="text-[10px] font-mono text-neon-red bg-ink-950 border border-ink-800 rounded-lg p-3 text-left overflow-auto max-h-32 mb-4">
              {String(err?.message || err)}
            </pre>
          )}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={this.reset}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <RotateCw className="w-3 h-3" /> Retry
            </button>
            <Link
              to="/app/dashboard"
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Home className="w-3 h-3" /> Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
