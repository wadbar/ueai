import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UniversalErrorBoundary } from './components/UniversalErrorBoundary.tsx';

window.addEventListener('unhandledrejection', (event) => {
  console.error('[TELEMETRY_UNHANDLED_REJECTION] Promise failed synchronously:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[TELEMETRY_UNCAUGHT_EXCEPTION] Window exception intercepted:', event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UniversalErrorBoundary>
      <App />
    </UniversalErrorBoundary>
  </StrictMode>,
);
