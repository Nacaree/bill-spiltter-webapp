import * as Sentry from "@sentry/nextjs";
import { safeOperation } from "@/lib/sentry-config";

// Never attach arguments, cookies, form submissions, provider output or images.
export function monitorAction(name, work) {
  return Sentry.withServerActionInstrumentation(
    name,
    { recordResponse: false },
    work,
  );
}

export function reportAppError(error, operation) {
  const safe = safeOperation(operation);
  console.error(
    JSON.stringify({ event: "application_error", operation: safe }),
  );
  return Sentry.withScope((scope) => {
    scope.setTag("operation", safe);
    return Sentry.captureException(error);
  });
}
