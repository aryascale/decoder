export function initFrontendLogger() {
  if (typeof window === 'undefined') return;

  const sendLogError = async (message: string, stack?: string, source?: string) => {
    try {
      await fetch('/api/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FRONTEND_ERROR',
          detail: message,
          metadata: { stack, source, url: window.location.href, userAgent: navigator.userAgent }
        }),
      });
    } catch (e) {
      // Silently fail to avoid infinite error loops
      console.error('Failed to send frontend error log:', e);
    }
  };

  // Capture unhandled runtime errors
  window.addEventListener('error', (event) => {
    sendLogError(
      event.message || 'Unknown Error',
      event.error?.stack,
      event.filename
    );
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection');
    const stack = reason?.stack;
    sendLogError(message, stack, 'Promise Rejection');
  });
}

export const logClientActivity = async (action: string, detail?: string, metadata?: any) => {
  try {
    await fetch('/api/client-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        detail,
        metadata: { ...metadata, url: window.location.href }
      }),
    });
  } catch (e) {
    console.error('Failed to log client activity:', e);
  }
};
