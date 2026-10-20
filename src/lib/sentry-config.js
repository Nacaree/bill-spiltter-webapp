// A DSN is a public ingestion address, not an API/auth token.
export const SENTRY_DSN =
  "https://3a6c818f40bbc595dd8b4385b78a67e3@o4512284286124032.ingest.us.sentry.io/4512284373745664";

const operations = new Set([
  "rate_limit",
  "bill_create",
  "bill_join",
  "participant_claim",
  "participant_add",
  "expense_change",
  "receipt_change",
  "payment_change",
  "image_upload",
  "ledger_load",
  "receipts_load",
  "balances_load",
  "receipt_extract",
  "receipt_failure_write",
  "upload_cleanup",
  "qr_cleanup",
]);

export function safeOperation(value) {
  return operations.has(value) ? value : "application";
}

// Keep route shapes and code locations, never capability URLs or query strings.
export function redactLocation(value) {
  if (typeof value !== "string") return undefined;
  return value
    .split(/[?#]/, 1)[0]
    .replace(/\/b\/[^/\s]+/g, "/b/[shareToken]")
    .replace(/\/receipts\/[^/\s]+/g, "/receipts/[receiptScanId]")
    .replace(/\/storage\/v1\/object\/[^\s]*/g, "/storage/[private-image]")
    .replace(/\/Users\/[^/]+/g, "/user")
    .replace(/\/home\/[^/]+/g, "/user")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .slice(0, 500);
}

function safeMessage(operation) {
  return operation === "application"
    ? "Unexpected application error"
    : `Bill Splitter: ${operation} failed.`;
}

function safeFrame(frame) {
  // Stack-frame variables may contain receipt data, even when headers are off.
  const clean = { ...frame };
  delete clean.vars;
  if (clean.filename) clean.filename = redactLocation(clean.filename);
  if (clean.abs_path) clean.abs_path = redactLocation(clean.abs_path);
  return clean;
}

export function scrubSentryEvent(event) {
  const operation = safeOperation(event.tags?.operation);
  const clean = {};
  for (const key of [
    "event_id",
    "timestamp",
    "platform",
    "level",
    "environment",
    "release",
    "dist",
    "sdk",
    "type",
  ])
    if (event[key] !== undefined) clean[key] = event[key];
  if (event.debug_meta?.images)
    clean.debug_meta = {
      images: event.debug_meta.images.map((image) => ({
        type: image.type,
        code_file: redactLocation(image.code_file),
        debug_id: image.debug_id,
      })),
    };
  // Explicitly avoid automatic client-IP lookup and omit every user identity.
  clean.user = { ip_address: "0.0.0.0" };
  clean.tags = { operation };
  clean.transaction = redactLocation(event.transaction);
  if (event.message) clean.message = safeMessage(operation);
  if (event.exception)
    clean.exception = {
      values: event.exception.values?.map((exception) => ({
        type: /^[A-Za-z]{1,60}Error$|^Error$/.test(exception.type ?? "")
          ? exception.type
          : "Error",
        value: safeMessage(operation),
        mechanism: exception.mechanism
          ? {
              type: exception.mechanism.type,
              handled: exception.mechanism.handled,
            }
          : undefined,
        stacktrace: exception.stacktrace
          ? {
              frames: exception.stacktrace.frames?.map(safeFrame),
            }
          : undefined,
      })),
    };
  if (event.request)
    clean.request = {
      method: event.request.method,
      url: redactLocation(event.request.url),
    };
  if (event.contexts?.trace) {
    const trace = event.contexts.trace;
    clean.contexts = {
      trace: {
        trace_id: trace.trace_id,
        span_id: trace.span_id,
        parent_span_id: trace.parent_span_id,
        op: trace.op,
        status: trace.status,
      },
    };
  }
  // No arbitrary extras, console/DOM breadcrumbs, attachments or user payloads.
  return clean;
}

export function scrubSentrySpan(span) {
  const attributes = {};
  for (const key of [
    "sentry.op",
    "sentry.origin",
    "sentry.source",
    "sentry.status_code",
    "sentry.environment",
    "sentry.release",
    "sentry.segment.id",
    "sentry.sdk.name",
    "sentry.sdk.version",
    "sentry.trace_lifecycle",
    "http.request.method",
    "http.response.status_code",
    "db.system",
  ]) {
    const original = span.attributes?.[key];
    const value = typeof original === "object" ? original?.value : original;
    if (
      typeof value === "number" ||
      (typeof value === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(value))
    ) {
      attributes[key] = value;
    }
  }
  if (span.attributes?.["sentry.segment.name"]) {
    const name = span.attributes["sentry.segment.name"];
    attributes["sentry.segment.name"] = redactLocation(
      typeof name === "object" ? name?.value : name,
    );
  }
  return {
    trace_id: span.trace_id,
    parent_span_id: span.parent_span_id,
    span_id: span.span_id,
    start_timestamp: span.start_timestamp,
    end_timestamp: span.end_timestamp,
    status: span.status,
    is_segment: span.is_segment,
    name: span.is_segment
      ? redactLocation(span.name)
      : (attributes["sentry.op"] ?? "operation"),
    attributes,
  };
}

export function sentryOptions() {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      (process.env.NODE_ENV === "development" ? "development" : "production"),
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
    strictTraceContinuation: true,
    tracePropagationTargets: [/^\/b\//, /^\/api\//],
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    beforeSend: scrubSentryEvent,
    beforeSendSpan: scrubSentrySpan,
    beforeBreadcrumb: () => null,
    beforeSendLog: () => null,
    beforeSendMetric: () => null,
  };
}
