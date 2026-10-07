import { demoRequest } from "./demo";

const API_BASE = (import.meta.env.VITE_SHORTENER_API_URL || "").trim().replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, extra = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = extra.code;
    this.feature = extra.feature;
    this.requiredPlan = extra.requiredPlan;
  }
}

// The active session is set by the auth provider.
const session = { getToken: null, demo: false, workspaceId: "" };
export function setSession(next) {
  Object.assign(session, { getToken: null, demo: false, workspaceId: "" }, next);
}

async function parse(res) {
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.ok ? "Sunucu yanıtı okunamadı." : `Sunucuya ulaşılamadı (${res.status}).`, res.status);
  }
  if (!res.ok) throw new ApiError(json.error || `İstek başarısız oldu (${res.status})`, res.status, json);
  return json;
}

export async function request(method, path, { body, query } = {}) {
  if (session.demo) {
    try {
      return await demoRequest(method, path, { body, query });
    } catch (e) {
      throw new ApiError(e.message, e.status || 500, e.extra || {});
    }
  }
  if (!session.getToken) throw new ApiError("Oturum bulunamadı.", 401);
  let token;
  try {
    token = await session.getToken();
  } catch {
    throw new ApiError("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.", 401);
  }
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""))}` : "";
  let res;
  try {
    res = await fetch(`${API_BASE}/api/${path}${qs}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(session.workspaceId ? { "X-Workspace": session.workspaceId } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.", 0);
  }
  return parse(res);
}

/** Unauthenticated endpoints (abuse report). */
export async function publicRequest(method, path, body) {
  if (session.demo) return demoRequest(method, path, { body });
  let res;
  try {
    res = await fetch(`${API_BASE}/api/${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("Ağ bağlantısı kurulamadı.", 0);
  }
  return parse(res);
}

const get = (p, query) => request("GET", p, { query });
const post = (p, body) => request("POST", p, { body: body ?? {} });
const patch = (p, body) => request("PATCH", p, { body });
const del = (p, query) => request("DELETE", p, { query });

export const api = {
  me: () => get("me"),
  links: {
    async listAll() {
      const all = [];
      let cursor = null;
      for (let page = 0; page < 10; page++) {
        const data = await get("links", { limit: 500, cursor });
        all.push(...data.links);
        cursor = data.nextCursor;
        if (!cursor) break;
      }
      return all;
    },
    create: (body) => post("links", body).then((r) => r.link),
    update: (id, body) => patch("links", { id, ...body }).then((r) => r.link),
    remove: (id) => del("links", { id }),
    bulk: (action, ids, extra = {}) => post("links/bulk", { action, ids, ...extra }),
    import: (rows) => post("links/import", { rows }),
  },
  analytics: (params) => get("analytics", params),
  domains: {
    list: () => get("domains"),
    add: (host) => post("domains", { host }),
    verify: (host) => post("domains/verify", { host }),
    remove: (host) => del("domains", { host }),
  },
  keys: {
    list: () => get("keys"),
    create: (name, role) => post("keys", { name, role }),
    revoke: (id) => del("keys", { id }),
  },
  webhooks: {
    list: () => get("webhooks"),
    create: (body) => post("webhooks", body),
    update: (id, body) => patch(`webhooks/${id}`, body),
    remove: (id) => del(`webhooks/${id}`),
    test: (id) => post(`webhooks/${id}/test`),
  },
  team: {
    list: () => get("workspaces"),
    create: (name) => post("workspaces", { name }),
    get: (id) => get(`workspaces/${id}`),
    rename: (id, name) => patch(`workspaces/${id}`, { name }),
    remove: (id) => del(`workspaces/${id}`),
    invite: (id, email, role) => post(`workspaces/${id}/invites`, { email, role }),
    revokeInvite: (id, token) => del(`workspaces/${id}/invites/${token}`),
    setRole: (id, uid, role) => patch(`workspaces/${id}/members/${uid}`, { role }),
    removeMember: (id, uid) => del(`workspaces/${id}/members/${uid}`),
    accept: (token) => post("invites/accept", { token }),
  },
  audit: () => get("audit"),
  billing: {
    checkout: (tier, billingPeriod) => post("billing/token", { tier, billingPeriod }),
    cancel: () => post("billing/cancel"),
    resume: () => post("billing/resume"),
    orders: () => get("billing/orders"),
  },
  account: {
    export: () => get("account/export"),
    remove: () => request("DELETE", "account", { body: { confirm: "DELETE" } }),
  },
  report: (body) => publicRequest("POST", "report", body),
};
