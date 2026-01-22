// Create global test setup to neutralize Next.js after() in non-request contexts
// and avoid request-scope errors during unit tests.

// Mock next/server's after to a safe no-op in tests
jest.mock('next/server', () => {
  const original = jest.requireActual('next/server');
  return {
    ...original,
    // In tests, calling after() throws "wrong-context" if no request scope.
    // Provide a no-op to keep behavior deterministic.
    after: (cb?: () => void) => {
      // Intentionally do nothing in tests. If a callback is provided, we can invoke it immediately
      // to keep side-effects (like flushing logs) from being lost, but here we no-op.
      return undefined as unknown as void;
    },
  };
});

// Optionally stub serverLogger.flush if it appears at import-time in some modules
try {
  const serverLib = require('@/app/_lib/axiom/server');
  if (serverLib && serverLib.serverLogger && typeof serverLib.serverLogger.flush === 'function') {
    jest.spyOn(serverLib.serverLogger, 'flush').mockImplementation(() => undefined as unknown as any);
  }
  // eslint-disable-next-line no-empty
} catch {}