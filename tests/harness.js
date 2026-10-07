import { mock } from "node:test";
import { createFakeDb, mockResponse } from "./fakeFirestore.js";

console.error = () => {};
console.warn = () => {};

export const db = createFakeDb();
const realFirebase = await import("../server/lib/firebase.js");

// Token format in tests: "<uid>" or "<uid>|<email>".
mock.module("../server/lib/firebase.js", {
  namedExports: {
    ...realFirebase,
    getFirebaseAdmin: async () => ({
      db,
      auth: {
        verifyIdToken: async (token) => {
          if (!token || token === "bad") throw Object.assign(new Error("bad token"), { code: "auth/invalid-id-token" });
          const [uid, email] = token.split("|");
          return { uid, email: email || `${uid}@example.com`, name: uid };
        },
        deleteUser: async () => {},
      },
    }),
  },
});
mock.module("@vercel/functions", { namedExports: { waitUntil: (p) => p } });

export const dnsState = { txt: {}, cname: {} };
mock.module("node:dns/promises", {
  defaultExport: {
    resolveTxt: async (name) => { if (!dnsState.txt[name]) throw new Error("ENOTFOUND"); return [[dnsState.txt[name]]]; },
    resolveCname: async (name) => { if (!dnsState.cname[name]) throw new Error("ENODATA"); return [dnsState.cname[name]]; },
    resolve4: async () => { throw new Error("ENODATA"); },
  },
});

export const webhookCalls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://hooks.example.com")) {
    webhookCalls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return new Response("ok", { status: 200 });
  }
  return realFetch(url, init);
};

const { handleRequest } = await import("../server/router.js");
export const redirect = (await import("../api/redirect/[slug].js")).default;
export const paytrCallback = (await import("../api/billing/paytr-callback.js")).default;
export const paytrRecurring = (await import("../api/billing/paytr-recurring.js")).default;

export const CHROME = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

/** call("POST", "links/bulk", { user: "alice", body: {...}, workspace: "ws_x", key: "loss_..." }) */
export async function call(method, path, { user, key, body, query = {}, headers = {}, workspace } = {}) {
  const res = mockResponse();
  const auth = key ? `Bearer ${key}` : user ? `Bearer ${user}` : undefined;
  await handleRequest(
    {
      method, body, query: { ...query, path: path.split("/").filter(Boolean) },
      headers: { ...(auth ? { authorization: auth } : {}), ...(workspace ? { "x-workspace": workspace } : {}), "user-agent": CHROME, host: "loss.tr", ...headers },
      socket: { remoteAddress: "1.2.3.4" },
    },
    res,
  );
  return res;
}

export async function callRedirect(slug, { method = "GET", headers = {}, query = {} } = {}) {
  const res = mockResponse();
  await redirect({ method, query: { slug, ...query }, headers: { "user-agent": CHROME, host: "loss.tr", ...headers }, socket: { remoteAddress: "1.2.3.4" } }, res);
  return res;
}

export const tick = () => new Promise((r) => setTimeout(r, 15));
export const upgrade = (uid, tier = "pro") => db.seed(`users/${uid}`, { tier, subscription: { status: "active" } });
export { mockResponse };
