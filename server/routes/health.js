import { httpError } from "../lib/http.js";

export async function handle(ctx) {
  if (ctx.method !== "GET") throw httpError(405, "Method not allowed");
  await ctx.db.collection("_health").limit(1).get();
  return { body: { ok: true } };
}
