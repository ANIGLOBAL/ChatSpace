/**
 * Live smoke test cho ChatSpace (spec §17/§21 smoke).
 * Du truoc: CHATSPACE_E2E=1, QA_GATE_KEY=<gia tri>, API=https://chatindex.aniviet.workers.dev
 */
const API = process.env.API || "https://chatindex.aniviet.workers.dev";
const GATE = process.env.QA_GATE_KEY || "";
const assert = (cond, label) => {
  if (!cond) {
    console.error("FAIL:", label);
    process.exitCode = 1;
  } else {
    console.log("PASS:", label);
  }
};

async function api(path, init = {}, cookieJar = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "omit",
    ...init,
    headers: {
      origin: process.env.CHATSPACE_ORIGIN || "https://chatspace.pages.dev",
      "content-type": "application/json",
      ...(Object.keys(cookieJar).length ? { cookie: Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      ...(init.headers || {}),
    },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookie) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, json };
}

if (process.env.CHATSPACE_E2E === "1") {
  const a = {};
  const signIn = await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: process.env.QA_EMAIL || "qa-cs-a@chatindex.local", password: process.env.QA_PASSWORD || "Passw0rd!1", cfTurnstileToken: GATE }) }, a);
  assert(signIn.status === 200, "sign-in gate OK");
  const spaces = await api("/api/spaces", {}, a);
  assert(spaces.status === 200 && Array.isArray(spaces.json.spaces), "spaces list");
  if (process.env.QA_GROUP_ID) {
    const meta = await api(`/api/spaces/${process.env.QA_GROUP_ID}/members`, {}, a);
    assert(meta.status === 200, "roster access");
  }
}
