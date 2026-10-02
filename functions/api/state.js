// Shared plan state (order + done) stored in Workers KV binding PLANS.
// Writes need header x-edit-key matching the EDIT_KEY secret.
const ok = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const planOf = (url) => (new URL(url).searchParams.get("plan") || "").replace(/[^a-z0-9-]/gi, "").slice(0, 60);

export async function onRequestGet({ request, env }) {
  const plan = planOf(request.url);
  if (!plan) return ok({ error: "plan fehlt" }, 400);
  const raw = await env.PLANS.get("plan:" + plan);
  return ok(raw ? JSON.parse(raw) : { rev: 0 });
}

export async function onRequestPost({ request, env }) {
  const plan = planOf(request.url);
  if (!plan) return ok({ error: "plan fehlt" }, 400);
  if (!env.EDIT_KEY || request.headers.get("x-edit-key") !== env.EDIT_KEY) return ok({ error: "unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body) return ok({ error: "bad json" }, 400);
  if (body.check) return ok({ ok: true });
  const order = body.order && typeof body.order === "object" ? body.order : {};
  const done = body.done && typeof body.done === "object" ? body.done : {};
  const raw = await env.PLANS.get("plan:" + plan);
  const rev = (raw ? JSON.parse(raw).rev || 0 : 0) + 1;
  const doc = { rev, order, done, updated: new Date().toISOString() };
  await env.PLANS.put("plan:" + plan, JSON.stringify(doc));
  return ok(doc);
}
