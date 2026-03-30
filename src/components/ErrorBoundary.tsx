/**
 * React Error Boundary component.
 *
 * Catches JavaScript errors in child component tree, logs them,
 * and displays a fallback UI instead of crashing the entire app.
 */

import { Component } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={styles.container}>
          <div style={styles.icon}>!</div>
          <div style={styles.title}>Something went wrong</div>
          <div style={styles.message}>
            {this.props.name && (
              <span>
                Error in <strong>{this.props.name}</strong>
              </span>
            )}
          </div>
          <div style={styles.error}>{this.state.error?.message}</div>
          <button style={styles.retryBtn} onClick={this.handleRetry}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 24,
    color: '#94a3b8',
    textAlign: 'center',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#7f1d1d',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    marginBottom: 8,
  },
  error: {
    fontSize: 11,
    color: '#64748b',
    background: '#0f172a',
    padding: '4px 8px',
    borderRadius: 4,
    marginBottom: 12,
    maxWidth: 300,
    wordBreak: 'break-word',
  },
  retryBtn: {
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid #475569',
    background: 'transparent',
    color: '#e2e8f0',
    fontSize: 12,
    cursor: 'pointer',
  },
};
