// Shared HTTP helpers: JSON responses, typed errors, CORS and security headers.

export class HttpError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.extra = extra; // e.g. { code: "plan_required", feature: "password" }
  }
}

export function httpError(statusCode, message, extra) {
  return new HttpError(statusCode, message, extra);
}

export function sendJson(response, statusCode, payload) {
  response.setHeader("Cache-Control", "no-store");
  response.status(statusCode).setHeader("Content-Type", "application/json").json(payload);
}

/**
 * Errors with a statusCode < 500 were raised on purpose and are safe to show.
 * Everything else is logged and replaced with a generic message.
 */
export function handleApiError(response, error) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error("API error", error);
  let message = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
  if (status === 401) message = "Oturumunuz geçersiz veya süresi dolmuş.";
  else if (status < 500) message = error.message;
  if (error.retryAfter) response.setHeader("Retry-After", String(error.retryAfter));
  return sendJson(response, status, { error: message, ...(status < 500 ? error.extra : {}) });
}

function allowedOrigins() {
  return (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Same-origin needs no CORS. Cross-origin is limited to FRONTEND_ORIGIN (never "*"). */
export function applyHeaders(response, request) {
  const origin = request?.headers?.origin;
  if (origin && allowedOrigins().includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Workspace");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.setHeader("Access-Control-Max-Age", "600");
  }
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}
