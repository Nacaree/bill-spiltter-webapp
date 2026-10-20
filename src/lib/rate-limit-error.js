export function readableWait(seconds) {
  const value = Math.max(1, Math.ceil(seconds));
  if (value < 60) return `${value} second${value === 1 ? "" : "s"}`;
  if (value < 3600)
    return `${Math.ceil(value / 60)} minute${Math.ceil(value / 60) === 1 ? "" : "s"}`;
  return `${Math.ceil(value / 3600)} hour${Math.ceil(value / 3600) === 1 ? "" : "s"}`;
}
export class RateLimitError extends Error {
  constructor(seconds, policy) {
    super(
      policy === "extract_app"
        ? `Receipt scanning is temporarily unavailable. Try again in ${readableWait(seconds)}, or enter the expense manually.`
        : `Too many requests. Try again in ${readableWait(seconds)}.`,
    );
    this.code = "rate_limited";
    this.retryAfterSeconds = Math.max(1, Math.ceil(seconds));
  }
}
export class RateLimitUnavailableError extends Error {
  constructor() {
    super("We couldn’t check the request limit. Please try again shortly.");
    this.code = "rate_limit_unavailable";
  }
}
export function rateLimitFailure(error, upload = false) {
  if (!(
    error instanceof RateLimitError ||
    error instanceof RateLimitUnavailableError
  ))
    return null;
  return {
    code: error.code,
    ...(error.retryAfterSeconds
      ? { retryAfterSeconds: error.retryAfterSeconds }
      : {}),
    ...(upload
      ? { error: error.message, resetUpload: false }
      : { errors: { form: error.message } }),
  };
}
