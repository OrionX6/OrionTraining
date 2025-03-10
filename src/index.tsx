import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import AppProviders from './components/AppProviders';
import App from './App';
import { monitoring } from './services/MonitoringService';

// Initialize monitoring
monitoring.init();

// Start timing app load
const loadMark = monitoring.startMetric('app_load');

// Get root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find root element');
}

// Create root
const root = createRoot(container);

// Render app
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <CssBaseline />
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);

// Mark app load complete
loadMark();

// Report initial load
monitoring.startMetric('initial_load_complete', {
  timestamp: Date.now(),
  url: window.location.href,
});

// Handle unhandled errors and rejections
window.addEventListener('error', (event) => {
  monitoring.captureError(event.error, {
    context: 'UnhandledError',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  monitoring.captureError(event.reason, {
    context: 'UnhandledRejection',
    message: event.reason?.message || String(event.reason),
  });
});

// Report web vitals
import { ReportHandler, Metric } from 'web-vitals';
const reportWebVitals = (onReport: ReportHandler) => {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(onReport);
    getFID(onReport);
    getFCP(onReport);
    getLCP(onReport);
    getTTFB(onReport);
  });
};

// Report metrics to monitoring service
reportWebVitals((metric: Metric) => {
  monitoring.startMetric(`web_vital_${metric.name.toLowerCase()}`, {
    value: metric.value,
    name: metric.name,
    id: metric.id,
    delta: metric.delta
  });
});
