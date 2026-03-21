const express = require("express");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const app = express();
const distDir = path.join(__dirname, "dist");

function cleanEnv(v) {
  if (v === undefined || v === null) return "";
  let s = String(v).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function boolEnv(v, fallback = false) {
  const s = cleanEnv(v).toLowerCase();
  if (!s) return fallback;
  return !(s === "0" || s === "false" || s === "no" || s === "off");
}

function getApiBaseUrl() {
  return (cleanEnv(process.env.API_BASE_URL) || cleanEnv(process.env.VITE_API_BASE_URL) || cleanEnv(process.env.VITE_API_URL) || "").replace(/\/$/, "");
}

function getUseProxy() {
  return boolEnv(process.env.USE_API_PROXY, true);
}

function buildRuntimeEnv() {
  const useProxy = getUseProxy();
  return {
    VITE_API_BASE_URL: useProxy ? "" : getApiBaseUrl(),
    DEFAULT_TENANT: cleanEnv(process.env.VITE_DEFAULT_TENANT) || cleanEnv(process.env.DEFAULT_TENANT) || "public",
    APP_ENV: cleanEnv(process.env.VITE_APP_ENV) || cleanEnv(process.env.APP_ENV) || "production",
    ENABLE_COSTS: String(cleanEnv(process.env.VITE_ENABLE_COSTS) || "true"),
    ENABLE_APPROVALS: String(cleanEnv(process.env.VITE_ENABLE_APPROVALS) || "true"),
    ENABLE_UPLOADS: String(cleanEnv(process.env.VITE_ENABLE_UPLOADS) || "true"),
    APP_NAME: cleanEnv(process.env.VITE_APP_NAME) || "Orkio",
    SUPPORT_EMAIL: cleanEnv(process.env.VITE_SUPPORT_EMAIL) || "",
    WHATSAPP_PHONE_E164: (cleanEnv(process.env.VITE_WHATSAPP_PHONE_E164) || cleanEnv(process.env.WHATSAPP_PHONE_E164) || "").replace(/\D/g, ""),
    VITE_SUMMIT_VOICE_MODE: cleanEnv(process.env.VITE_SUMMIT_VOICE_MODE) || cleanEnv(process.env.SUMMIT_VOICE_MODE) || "realtime",
    VITE_SPEECH_RECOGNITION_LANG: cleanEnv(process.env.VITE_SPEECH_RECOGNITION_LANG) || cleanEnv(process.env.SPEECH_RECOGNITION_LANG) || "en-US",
    USE_API_PROXY: String(useProxy),
  };
}

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.get("/env.js", (_req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__ORKIO_ENV__=${JSON.stringify(buildRuntimeEnv())};`);
});

app.options("/api/*", (_req, res) => {
  res.status(204).end();
});

app.use("/api", (req, res, next) => {
  if (!getUseProxy()) return next();
  const base = getApiBaseUrl();
  if (!base) {
    res.status(500).json({ detail: "API_BASE_URL não configurado no web" });
    return;
  }
  let upstream;
  try {
    upstream = new URL(base);
  } catch {
    res.status(500).json({ detail: "API_BASE_URL inválido" });
    return;
  }
  const client = upstream.protocol === "https:" ? https : http;
  const headers = { ...req.headers };
  const blockedHeaders = [
    "host",
    "connection",
    "transfer-encoding",
    "content-length",
    "content-encoding",
    "origin",
  ];
  for (const h of blockedHeaders) delete headers[h];

  const options = {
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
    method: req.method,
    path: `${upstream.pathname.replace(/\/$/, "")}${req.originalUrl}`,
    headers,
  };
  const proxyReq = client.request(options, (proxyRes) => {
    res.statusCode = proxyRes.statusCode || 502;
    Object.entries(proxyRes.headers || {}).forEach(([k, v]) => {
      if (v !== undefined) res.setHeader(k, v);
    });
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("x-orkio-proxy", "1");
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({ detail: `Proxy API falhou: ${err.message}` });
    } else {
      res.end();
    }
  });
  if (req.readable) req.pipe(proxyReq);
  else proxyReq.end();
});

app.use(express.static(distDir, { index: false }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[orkio-web] listening on ${port}`);
});
