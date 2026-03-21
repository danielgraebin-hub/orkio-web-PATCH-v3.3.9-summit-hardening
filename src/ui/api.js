
import { getTenant as readTenant, getToken as readToken } from "../lib/auth.js";

const ORKIO_ENV =
  typeof window !== "undefined" && window.__ORKIO_ENV__ ? window.__ORKIO_ENV__ : {};

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function resolveApiBase() {
  const envBase = normalizeBase(
    ORKIO_ENV.VITE_API_BASE_URL ||
    ORKIO_ENV.VITE_API_URL ||
    ORKIO_ENV.API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ""
  );
  if (envBase) return envBase;
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBase(window.location.origin);
  }
  return "";
}

export function joinApi(path = "") {
  const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${resolveApiBase()}${cleanPath}`;
}

export function headers({ token, org, json = true, extra = {} } = {}) {
  const out = { Accept: "application/json", ...(extra || {}) };
  const finalToken = token || readToken();
  const finalOrg = org || readTenant();

  if (json) out["Content-Type"] = "application/json";
  if (finalToken) out.Authorization = `Bearer ${finalToken}`;
  if (finalOrg) out["X-Org-Slug"] = finalOrg;
  return out;
}

async function parseResponse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return await res.json();
  if (ct.startsWith("text/")) return await res.text();
  return await res.arrayBuffer();
}

async function readError(res) {
  let payload = null;
  try {
    payload = await parseResponse(res);
  } catch {
    payload = null;
  }
  if (payload && typeof payload === "object") {
    const msg = payload.detail || payload.message || payload.error;
    if (msg) return String(msg);
    try {
      return JSON.stringify(payload);
    } catch {}
  }
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  return `HTTP ${res.status}`;
}

async function request(path, opts = {}) {
  const {
    method = "GET",
    body,
    token,
    org,
    headers: customHeaders,
    json = true,
    credentials = "include",
    raw = false,
  } = opts;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const shouldSerializeJson =
    json &&
    body !== undefined &&
    body !== null &&
    !isFormData &&
    typeof body === "object" &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  const finalHeaders = headers({
    token,
    org,
    json: json && !isFormData,
    extra: customHeaders,
  });

  const finalBody = shouldSerializeJson ? JSON.stringify(body) : body;

  const res = await fetch(joinApi(path), {
    method,
    headers: finalHeaders,
    body: finalBody,
    credentials,
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  if (raw) return res;
  return await parseResponse(res);
}

export function getToken() {
  return readToken() || null;
}

export async function apiFetch(path, opts = {}) {
  const data = await request(path, opts);
  return { data };
}

export async function uploadFile(file, { token, org, threadId, agentId, agentIds, intent, institutionalRequest, linkAllAgents } = {}) {
  const fd = new FormData();
  fd.append("file", file);
  if (threadId) fd.append("thread_id", threadId);
  if (agentId) fd.append("agent_id", agentId);
  if (Array.isArray(agentIds) && agentIds.length) fd.append("agent_ids", agentIds.join(","));
  if (intent) fd.append("intent", intent);
  if (institutionalRequest) fd.append("institutional_request", "true");
  if (linkAllAgents) fd.append("link_all_agents", "true");
  return await request("/api/files/upload", {
    method: "POST",
    token,
    org,
    body: fd,
    json: false,
  });
}

export async function chat(payload, { token, org } = {}) {
  return await request("/api/chat", {
    method: "POST",
    token,
    org,
    body: JSON.stringify(payload || {}),
  });
}

export async function chatStream(payload, { token, org, onChunk } = {}) {
  const res = await request("/api/chat/stream", {
    method: "POST",
    token,
    org,
    body: JSON.stringify(payload || {}),
    raw: true,
  });

  if (!res.body || typeof onChunk !== "function") {
    return { ok: true };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  while (!done) {
    const part = await reader.read();
    done = part.done;
    if (part.value) onChunk(decoder.decode(part.value, { stream: !done }));
  }
  return { ok: true };
}

export async function transcribeAudio(blob, { token, org, trace_id, language } = {}) {
  const fd = new FormData();
  fd.append("file", blob, "audio.webm");
  if (language) fd.append("language", language);
  return await request("/api/transcribe", {
    method: "POST",
    token,
    org,
    body: fd,
    json: false,
    headers: trace_id ? { "X-Trace-Id": trace_id } : undefined,
  });
}

export async function requestFounderHandoff(payload) {
  return await request("/api/founder/handoff", {
    method: "POST",
    token: payload?.token,
    org: payload?.org,
    body: JSON.stringify(payload || {}),
  });
}

export async function getRealtimeClientSecret(payload = {}) {
  return await request("/api/realtime/client_secret", {
    method: "POST",
    token: payload?.token,
    org: payload?.org,
    body: JSON.stringify(payload),
  });
}

export async function startRealtimeSession(payload = {}) {
  return await request("/api/realtime/start", {
    method: "POST",
    token: payload?.token,
    org: payload?.org,
    body: JSON.stringify(payload),
  });
}

export async function startSummitSession(payload = {}) {
  return await startRealtimeSession({ ...payload, mode: payload.mode || "summit" });
}

export async function postRealtimeEventsBatch(payload = {}) {
  return await request("/api/realtime/events:batch", {
    method: "POST",
    token: payload?.token,
    org: payload?.org,
    body: JSON.stringify(payload),
  });
}

export async function endRealtimeSession(payload = {}) {
  return await request("/api/realtime/end", {
    method: "POST",
    token: payload?.token,
    org: payload?.org,
    body: JSON.stringify(payload),
  });
}

export async function getRealtimeSession({ session_id, finals_only = true, token, org } = {}) {
  const qs = new URLSearchParams();
  if (finals_only !== undefined) qs.set("finals_only", String(!!finals_only));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return await request(`/api/realtime/sessions/${encodeURIComponent(session_id || "")}${suffix}`, {
    token,
    org,
  });
}

export async function getSummitSessionScore({ session_id, token, org } = {}) {
  const data = await request(`/api/realtime/sessions/${encodeURIComponent(session_id || "")}/score`, {
    token,
    org,
  });
  return { data };
}

export async function submitSummitSessionReview({ session_id, token, org, ...body } = {}) {
  const data = await request(`/api/realtime/sessions/${encodeURIComponent(session_id || "")}/review`, {
    method: "POST",
    token,
    org,
    body: JSON.stringify(body),
  });
  return { data };
}

export async function downloadRealtimeAta({ session_id, token, org } = {}) {
  const sid = session_id || (typeof window !== "undefined" ? (window.__ORKIO_LAST_REALTIME_SESSION_ID__ || "") : "");
  if (!sid) throw new Error("Missing realtime session id");
  const res = await request(`/api/realtime/sessions/${encodeURIComponent(sid)}/ata.txt`, {
    token,
    org,
    raw: true,
  });
  const blob = await res.blob();
  if (typeof window !== "undefined") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orkio-ata-${sid}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { ok: true, session_id: sid };
}

export async function guardRealtimeTranscript({ thread_id, message, token, org } = {}) {
  const data = await request("/api/realtime/guard", {
    method: "POST",
    token,
    org,
    body: JSON.stringify({ thread_id, message }),
  });
  return { data };
}

export async function forgotPassword({ email, tenant } = {}) {
  const data = await request("/api/auth/forgot-password", {
    method: "POST",
    org: tenant,
    body: JSON.stringify({ email, tenant }),
  });
  return { data };
}

export async function resetPassword({ token, password, password_confirm, tenant } = {}) {
  const data = await request("/api/auth/reset-password", {
    method: "POST",
    org: tenant,
    body: JSON.stringify({ token, password, password_confirm, tenant }),
  });
  return { data };
}

export async function validateInvestorAccessCode({ code, org } = {}) {
  const data = await request("/api/investor/access/validate", {
    method: "POST",
    org,
    body: JSON.stringify({ plain_code: code, label: code }),
  });
  return { data };
}

export async function getFounderEscalations({ token, org } = {}) {
  const data = await request("/api/admin/investor/escalations", { token, org });
  return { data };
}

export async function getFounderEscalation({ escalation_id, token, org } = {}) {
  const data = await request(`/api/admin/investor/escalations/${encodeURIComponent(escalation_id || "")}`, { token, org });
  return { data };
}

export async function setFounderEscalationAction({ escalation_id, action_type, token, org } = {}) {
  const data = await request(`/api/admin/investor/escalations/${encodeURIComponent(escalation_id || "")}/action`, {
    method: "POST",
    token,
    org,
    body: JSON.stringify({ action_type }),
  });
  return { data };
}

export async function publicChat(payload = {}) {
  return await request("/api/public/chat", {
    method: "POST",
    org: payload?.org,
    body: JSON.stringify(payload),
  });
}
