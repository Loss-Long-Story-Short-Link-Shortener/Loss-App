import { authenticate } from "./lib/auth.js";
import { getFirebaseAdmin } from "./lib/firebase.js";
import { applyHeaders, handleApiError, httpError, sendJson } from "./lib/http.js";
import { getPlan } from "./lib/plans.js";
import { clientIp, memoryLimit } from "./lib/rateLimit.js";
import { resolveWorkspace } from "./lib/workspace.js";

import * as account from "./routes/account.js";
import * as admin from "./routes/admin.js";
import * as analytics from "./routes/analytics.js";
import * as audit from "./routes/audit.js";
import * as billing from "./routes/billing.js";
import * as domains from "./routes/domains.js";
import * as health from "./routes/health.js";
import * as keys from "./routes/keys.js";
import * as links from "./routes/links.js";
import * as me from "./routes/me.js";
import * as reports from "./routes/reports.js";
import * as team from "./routes/team.js";
import * as verifyPassword from "./routes/verifyPassword.js";
import * as webhooks from "./routes/webhooks.js";

// first path segment -> { handler, public }
const ROUTES = {
  links: { handler: links.handle },
  me: { handler: me.handle },
  analytics: { handler: analytics.handle },
  domains: { handler: domains.handle },
  keys: { handler: keys.handle },
  webhooks: { handler: webhooks.handle },
  workspaces: { handler: team.handle },
  invites: { handler: team.handleInvites },
  audit: { handler: audit.handle },
  account: { handler: account.handle },
  billing: { handler: billing.handle },
  admin: { handler: admin.handle },
  report: { handler: reports.handle, public: true },
  "verify-password": { handler: verifyPassword.handle, public: true },
  health: { handler: health.handle, public: true },
};

function parseBody(request) {
  const body = request.body;
  if (body && typeof body === "object") return body;
  if (typeof body === "string" && body) {
    try {
      return JSON.parse(body);
    } catch {
      throw httpError(400, "İstek gövdesi geçerli JSON olmalıdır.");
    }
  }
  return {};
}

export function normalizeSegments(raw) {
  const list = Array.isArray(raw) ? raw : raw ? String(raw).split("/") : [];
  const segments = list.map((s) => decodeURIComponent(String(s))).filter(Boolean);
  if (segments[0] === "v1") segments.shift();
  return segments;
}

export async function handleRequest(request, response) {
  applyHeaders(response, request);
  if (request.method === "OPTIONS") return response.status(204).end();

  try {
    const segments = normalizeSegments(request.query?.path);
    const route = ROUTES[segments[0]];
    if (!route) throw httpError(404, "Bulunamadı.");
    if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(request.method)) throw httpError(405, "Method not allowed");

    if (!memoryLimit(`ip:${clientIp(request)}`, 240, 60_000).ok) {
      throw Object.assign(httpError(429, "Çok fazla istek. Lütfen biraz bekleyin."), { retryAfter: 30 });
    }

    const { db } = await getFirebaseAdmin();
    const ctx = {
      request,
      response,
      db,
      method: request.method,
      segments: segments.slice(1),
      query: request.query || {},
      body: request.method === "GET" || request.method === "DELETE" ? parseBody(request) : parseBody(request),
      principal: null,
      workspace: null,
      _plan: null,
      async plan() {
        if (!ctx._plan) ctx._plan = await getPlan(db, ctx.workspace?.planOwnerId || ctx.principal.uid);
        return ctx._plan;
      },
    };

    if (!route.public) {
      ctx.principal = await authenticate(request);
      if (!memoryLimit(`p:${ctx.principal.via}:${ctx.principal.keyId || ctx.principal.uid}`, 300, 60_000).ok) {
        throw Object.assign(httpError(429, "İstek limitine ulaştınız."), { retryAfter: 30 });
      }
      const requested = request.headers["x-workspace"] || request.query?.workspace || "";
      ctx.workspace = await resolveWorkspace(db, ctx.principal, String(requested));
      if (ctx.principal.via === "apikey") {
        const { plan } = await ctx.plan();
        if (!plan.features.api) throw httpError(403, "API erişimi Pro ve üzeri paketlerde kullanılabilir.", { code: "plan_required", feature: "api", requiredPlan: "pro" });
      }
    }

    const result = await route.handler(ctx);
    if (result === undefined) throw httpError(404, "Bulunamadı.");
    return sendJson(response, result.status || 200, result.body);
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const ok = (body, status = 200) => ({ status, body });
