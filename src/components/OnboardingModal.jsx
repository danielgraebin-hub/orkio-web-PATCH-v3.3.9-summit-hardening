import React, { useMemo, useState } from "react";
import { getTenant, getToken } from "../lib/auth.js";


const USER_TYPES = [
  { value: "founder", label: "Founder" },
  { value: "investor", label: "Investor" },
  { value: "operator", label: "Operator" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

const INTENTS = [
  { value: "explore", label: "Explorar a plataforma" },
  { value: "meeting", label: "Agendar conversa" },
  { value: "pilot", label: "Avaliar piloto" },
  { value: "funding", label: "Discutir investimento" },
  { value: "other", label: "Outro" },
];

function normalizeUserType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const aliases = {
    founder: "founder",
    investor: "investor",
    operator: "operator",
    enterprise: "operator",
    developer: "operator",
    partner: "partner",
    other: "other",
  };
  return aliases[raw] || "";
}

function normalizeIntent(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const aliases = {
    explore: "explore",
    exploring: "explore",
    curious: "explore",
    meeting: "meeting",
    partnership: "meeting",
    pilot: "pilot",
    company_eval: "pilot",
    funding: "funding",
    investment: "funding",
    other: "other",
  };
  return aliases[raw] || "";
}

function sanitizeOnboardingPayload(payload) {
  return {
    company: String(payload?.company || "").trim(),
    role: String(payload?.role || payload?.profile_role || "").trim(),
    user_type: normalizeUserType(payload?.user_type),
    intent: normalizeIntent(payload?.intent),
    notes: String(payload?.notes || "").trim(),
  };
}


const ORKIO_ENV =
  typeof window !== "undefined" && window.__ORKIO_ENV__ ? window.__ORKIO_ENV__ : {};

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function resolveApiBase() {
  const envBase = normalizeBase(
    ORKIO_ENV.VITE_API_BASE_URL ||
    ORKIO_ENV.VITE_API_URL ||
    ORKIO_ENV.API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ""
  );

  // v3.3.1d — NETWORK HARDENING
  // Prefer explicit API base when present to avoid web/proxy ambiguity.
  if (envBase) return envBase;

  // Fallback to same-origin only if env is absent.
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBase(window.location.origin);
  }
  return "";
}

function buildUrl(path) {
  const base = resolveApiBase();
  const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function buildHeaders(token, org) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (org) headers["X-Org-Slug"] = org;
  return headers;
}

async function readErrorMessage(res) {
  try {
    const data = await res.json();
    return data?.detail || data?.message || JSON.stringify(data);
  } catch {
    try {
      return await res.text();
    } catch {
      return `${res.status} ${res.statusText}`;
    }
  }
}

async function saveOnboarding(payload, token, org) {
  // Single contract only:
  // POST /api/user/onboarding
  const url = buildUrl("/api/user/onboarding");
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(token, org),
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const msg = await readErrorMessage(res);
    const currentOrigin = typeof window !== "undefined" ? window.location?.origin || "" : "";
    if (res.status === 405 && url.startsWith(currentOrigin)) {
      throw new Error(
        "Onboarding endpoint is not available on the web service. Configure VITE_API_BASE_URL / VITE_API_URL to point to the real API service."
      );
    }
    throw new Error(msg || `Onboarding failed (${res.status})`);
  }

  try {
    return await res.json();
  } catch {
    return { status: "ok" };
  }
}

const fieldStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  padding: "14px 16px",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const optionStyle = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: "rgba(255,255,255,0.72)",
};

export default function OnboardingModal({ user, onComplete }) {
  const [form, setForm] = useState(() => sanitizeOnboardingPayload(user));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fullName = useMemo(() => (user?.name || "").trim(), [user]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();

    if (!form.user_type || !form.intent) {
      setError("Please choose your user type and main interest.");
      return;
    }

    const payload = {
      company: form.company || null,
      role: form.role || null,
      user_type: form.user_type,
      intent: form.intent,
      notes: form.notes || null,
      onboarding_completed: true,
    };

    setBusy(true);
    setError("");

    try {
      const token = getToken();
      const org = getTenant();

      const result = await saveOnboarding(payload, token, org);
      const nextUser = result?.user
        ? { ...user, ...result.user }
        : {
            ...user,
            company: payload.company,
            profile_role: payload.role,
            user_type: payload.user_type,
            intent: payload.intent,
            notes: payload.notes,
            onboarding_completed: true,
          };

      onComplete?.(nextUser);
    } catch (err) {
      setError(err?.message || "Could not save onboarding.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(5,8,18,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "linear-gradient(180deg, rgba(18,24,41,0.98), rgba(9,14,26,0.98))",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          color: "#fff",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Summit private mode
          </div>
          <h2 style={{ margin: "8px 0 6px", fontSize: 28, lineHeight: 1.1 }}>
            Welcome to Orkio
          </h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
            A quick 30-second setup so Orkio can focus the experience around you.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input value={fullName} readOnly style={{ ...fieldStyle, opacity: 0.85 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="Your company"
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Role / Title</label>
              <input
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                placeholder="Founder, Partner, CTO..."
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>User type</label>
              <select
                value={form.user_type}
                onChange={(e) => setField("user_type", e.target.value)}
                style={fieldStyle}
              >
                <option value="" style={optionStyle}>Select...</option>
                {USER_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value} style={optionStyle}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Main interest</label>
              <select
                value={form.intent}
                onChange={(e) => setField("intent", e.target.value)}
                style={fieldStyle}
              >
                <option value="" style={optionStyle}>Select...</option>
                {INTENTS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={optionStyle}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Anything you'd like Orkio to focus on?</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Optional note"
              rows={5}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </div>

          {error ? (
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,120,120,0.25)",
                background: "rgba(120,20,20,0.18)",
                color: "#ffd6d6",
                padding: "12px 14px",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
              This appears only once after your approved login.
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                border: "none",
                borderRadius: 18,
                background: "#ffffff",
                color: "#111827",
                padding: "14px 22px",
                fontSize: 18,
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
                minWidth: 220,
              }}
            >
              {busy ? "Saving..." : "Continue to Orkio"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
