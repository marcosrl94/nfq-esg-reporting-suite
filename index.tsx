import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;

import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { warnIfProductionGeminiKeyExposed } from './services/geminiProductionGuard';

warnIfProductionGeminiKeyExposed();

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (typeof sentryDsn === 'string' && sentryDsn.length > 0) {
  const release =
    import.meta.env.VITE_SENTRY_RELEASE ||
    import.meta.env.VITE_APP_VERSION ||
    `nfq-esg@${import.meta.env.MODE}`;
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);