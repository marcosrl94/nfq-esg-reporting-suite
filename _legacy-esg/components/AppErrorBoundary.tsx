import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const isDev = import.meta.env.DEV;
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#e5e5e5',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '2rem',
            maxWidth: '42rem',
            margin: '0 auto'
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            Algo salió mal
          </h1>
          <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
            La aplicación encontró un error y no pudo mostrarse. Recarga la página o revisa la
            consola del navegador (F12).
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              background: '#0066ff',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Recargar
          </button>
          {isDev && (
            <pre
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#000',
                border: '1px solid #2a2a2a',
                borderRadius: '0.5rem',
                overflow: 'auto',
                fontSize: '0.75rem',
                color: '#fca5a5',
                whiteSpace: 'pre-wrap'
              }}
            >
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
