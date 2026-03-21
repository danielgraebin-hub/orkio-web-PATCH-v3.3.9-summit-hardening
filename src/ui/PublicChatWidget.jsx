import React, { useEffect, useMemo, useRef, useState } from "react";
import { publicChat } from "./api.js";

function readLead() {
  try {
    const raw = localStorage.getItem("orkio_lead");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PublicChatWidget({ autoOpen = false }) {
      const ENV = (typeof window !== "undefined" && window.__ORKIO_ENV__) ? window.__ORKIO_ENV__ : {};
      const WHATSAPP_PHONE_E164 = String(ENV.WHATSAPP_PHONE_E164 || "").replace(/\D/g,"");

  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState(() => readLead());
  const [threadId, setThreadId] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const boxRef = useRef(null);

  const hasLead = !!lead?.lead_id;

  const greet = useMemo(() => {
    const name = lead?.name || "there";
    const company = lead?.company || "your company";
    const role = lead?.role ? ` as ${lead.role}` : "";
    return `Hi ${name}. I’m Orkio — the CEO of CEOs.\n\nI see you’re with ${company}${role}.\nWhat is the #1 outcome you want AI to deliver — safely and auditable?`;
  }, [lead]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!open) return;
    // refresh lead from storage (in case just signed up)
    setLead(readLead());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!items.length) {
      setItems([{ role: "assistant", text: greet }]);
    }
  }, [open, items.length, greet]);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [items, open]);

  async function send(text) {
    if (!text.trim()) return;
    if (!hasLead) {
      setItems((x) => [...x, { role: "assistant", text: "To talk to Orkio, please enter via the quick signup first: /signup" }]);
      return;
    }

    setItems((x) => [...x, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await publicChat({ lead_id: lead.lead_id, message: text, thread_id: threadId });
      if (r?.ok) {
        setThreadId(r.thread_id);
        setItems((x) => [...x, { role: "assistant", text: r.reply || "—" }]);
      } else {
        setItems((x) => [...x, { role: "assistant", text: "Something went wrong. Try again?" }]);
      }
    } catch {
      setItems((x) => [...x, { role: "assistant", text: "Network issue. Try again?" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-extrabold shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur hover:bg-white/15"
        aria-label="Talk to Orkio"
      >
        💬 Talk to Orkio
      </button>

      {open ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(460px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-white/15 bg-[#0a0d16]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
  <img src="/orkio-logo-v2.png" alt="Orkio" className="h-10 w-10 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.55)]" />
  {/* "Talking mouth" */}
  <span className="absolute left-1/2 top-[62%] h-[6px] w-[18px] -translate-x-1/2 rounded-full bg-white/85 shadow-[0_2px_10px_rgba(0,0,0,0.35)] orkio-mouth" />
  {/* Pulse ring */}
  <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/25 orkio-pulse" />
</div>
              <div>
                <div className="text-sm font-extrabold">Orkio — CEO of CEOs</div>
                <div className="text-xs text-white/60">{hasLead ? "Governed autonomy concierge" : "Signup required to chat"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
  {hasLead && WHATSAPP_PHONE_E164 ? (
    <button
      type="button"
      onClick={() => {
        const name = encodeURIComponent(lead?.name || "");
        const email = encodeURIComponent(lead?.email || "");
        const company = encodeURIComponent(lead?.company || "");
        const role = encodeURIComponent(lead?.role || "");
        const segment = encodeURIComponent(lead?.segment || "");
        const leadId = encodeURIComponent(lead?.lead_id || "");
        const msg =
          `New ORKIO lead (ID ${leadId})%0A` +
          `Name: ${name}%0A` +
          `Email: ${email}%0A` +
          `Company: ${company}%0A` +
          `Role: ${role}%0A` +
          `Segment: ${segment}%0A%0A` +
          `Orkio: Please book a demo.`;
        window.open(`https://wa.me/${WHATSAPP_PHONE_E164}?text=${msg}`, "_blank", "noopener,noreferrer");
      }}
      className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/15"
      title="Send lead to WhatsApp"
    >
      WhatsApp
    </button>
  ) : null}
  <button onClick={() => setOpen(false)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10">Close</button>
</div>
          </div>

          <div ref={boxRef} className="max-h-[420px] overflow-auto px-4 py-3">
            {items.map((it, idx) => (
              <div key={idx} className={`my-2 flex ${it.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl border px-3 py-2 text-sm leading-relaxed ${
                  it.role === "user"
                    ? "border-violet-400/20 bg-violet-500/15 text-white"
                    : "border-white/10 bg-white/5 text-white"
                }`}>
                  {it.text}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="my-2 flex justify-start">
                <div className="max-w-[88%] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                  Orkio is thinking…
                </div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = msg;
              setMsg("");
              send(t);
            }}
            className="flex gap-2 border-t border-white/10 px-3 py-3"
          >
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={hasLead ? "Ask Orkio…" : "Go to /signup first"}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
            <button
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-emerald-400 px-3 py-2 text-sm font-extrabold text-black disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
