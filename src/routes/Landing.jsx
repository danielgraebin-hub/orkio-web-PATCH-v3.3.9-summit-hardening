import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken, getUser, isAdmin } from "../lib/auth.js";
import PublicChatWidget from "../ui/PublicChatWidget.jsx";
import Footer from "../ui/Footer.jsx";

export default function Landing() {
  const nav = useNavigate();
  const token = getToken();
  const user = getUser();

  const isLogged = !!token;
  const userIsAdmin = isLogged && isAdmin(user);

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes orkioMouth { 0%,100%{ transform: translateX(-50%) scaleY(.55); opacity:.75 } 50%{ transform: translateX(-50%) scaleY(1.35); opacity:1 } }
        @keyframes orkioPulse { 0%{ box-shadow:0 0 0 0 rgba(52,211,153,.22);} 70%{ box-shadow:0 0 0 18px rgba(52,211,153,0);} 100%{ box-shadow:0 0 0 0 rgba(52,211,153,0);} }
        .orkio-mouth{ animation: orkioMouth .9s infinite ease-in-out; transform-origin:center; }
        .orkio-pulse{ animation: orkioPulse 1.8s infinite ease-out; }
      `}</style>
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_10%,rgba(124,92,255,0.25),transparent_60%),radial-gradient(900px_600px_at_85%_15%,rgba(53,208,255,0.14),transparent_60%),linear-gradient(180deg,#070910,#070910)]" />
        <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2230%22%20height=%2230%22%20viewBox=%220%200%2030%2030%22%3E%3Cg%20fill=%22none%22%20stroke=%22%23ffffff%22%20stroke-opacity=%220.06%22%3E%3Cpath%20d=%22M0%2015H30%22/%3E%3Cpath%20d=%22M15%200V30%22/%3E%3C/g%3E%3C/svg%3E')]" />
      </div>

      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070910]/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between py-4">
<nav className="hidden items-center gap-2 md:flex">
              <a className="rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white" href="#what">
                What
              </a>
              <a className="rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white" href="#how">
                How it works
              </a>
              <a
                className="rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                href="#features"
              >
                Features
              </a>
              <a
                className="rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                href="#security"
              >
                Security
              </a>

              {isLogged ? (
                <>
                  <button
                    onClick={() => nav("/app")}
                    className="ml-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                  >
                    Open Console
                  </button>
                  {userIsAdmin ? (
                    <button
                      onClick={() => nav("/admin")}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                    >
                      Admin
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    onClick={() => nav("/auth")}
                    className="ml-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => nav("/auth")}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-extrabold text-black hover:brightness-110"
                  >
                    Request access
                  </button>
                </>
              )}
            </nav>

            {/* Mobile */}
            <button
              onClick={() => nav(isLogged ? "/app" : "/auth")}
              className="md:hidden rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-extrabold text-black hover:brightness-110"
            >
              {isLogged ? "Open" : "Get started"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
          <div className="mb-8 flex justify-center">
  <div className="relative inline-block cursor-pointer" onClick={() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Bem-vindo ao Orkio. Sua central de agentes para governança, automação e inteligência artificial com rastreabilidade total. Clique para entrar e começar.');
      u.lang = 'pt-BR'; u.rate = 0.95; u.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.startsWith('pt'));
      if (ptVoice) u.voice = ptVoice;
      window.speechSynthesis.speak(u);
    }
  }} title="Clique para ouvir o Orkio">
    <img src="/orkio-logo-v2.png" alt="Orkio" className="h-48 w-auto drop-shadow-[0_22px_55px_rgba(0,0,0,0.55)] md:h-56" />
    <span className="absolute left-1/2 top-[67%] h-[10px] w-[32px] -translate-x-1/2 rounded-full bg-white/85 shadow-[0_2px_14px_rgba(0,0,0,0.35)] orkio-mouth" />
    <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/20 orkio-pulse" />
    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white/50 flex items-center gap-1">🔊 Clique no logo para ouvir</span>
  </div>
</div>


            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">
              The{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">
                Autonomous Intelligence
              </span>{" "}
              Core for Modern Organizations.
            </h1>

            <p className="mt-5 text-base leading-7 text-white/70">
              Orkio turns goals into execution across <span className="text-white/90 font-semibold">agents</span>,{" "}
              <span className="text-white/90 font-semibold">humans</span>, and{" "}
              <span className="text-white/90 font-semibold">APIs</span> — with explicit contracts, audit trails, and
              governance. It’s not a chatbot. It’s an operating system for intelligence.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {isLogged ? (
                <>
                  <button
                    onClick={() => nav("/app")}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-extrabold text-black hover:brightness-110"
                  >
                    Open User Console
                  </button>
                  {userIsAdmin ? (
                    <button
                      onClick={() => nav("/admin")}
                      className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                    >
                      Open Admin Console
                    </button>
                  ) : (
                    <button
                      onClick={() => nav("/app")}
                      className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                    >
                      Continue
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => nav("/auth")}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-extrabold text-black hover:brightness-110"
                  >
                    Get started
                  </button>
                  <a
                    href="#how"
                    className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                  >
                    Architecture overview
                  </a>
                </>
              )}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Principle</div>
                <div className="mt-1 text-sm font-bold">Sanity before features</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Contracts</div>
                <div className="mt-1 text-sm font-bold">Schemas are the truth</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Audit</div>
                <div className="mt-1 text-sm font-bold">Traceable execution</div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-3">
            <div className="rounded-3xl border border-white/10 bg-[radial-gradient(500px_220px_at_30%_10%,rgba(124,92,255,0.18),transparent_60%),radial-gradient(500px_220px_at_80%_0%,rgba(53,208,255,0.10),transparent_60%),rgba(255,255,255,0.05)] p-5 shadow-[0_12px_50px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-extrabold text-white/85">
                  Operating loop
                </span>
                <span className="text-xs text-white/60">CEO → CFO → CTO → Execution</span>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ["CEO", "Vision", "Define objectives and priorities."],
                  ["CFO", "Feasibility", "Assess risk, cost, ROI and constraints."],
                  ["CTO", "Architecture", "Define contracts, stability, deployment."],
                  ["OPS", "Execution", "Agents + humans + APIs with supervision."],
                ].map(([tag, title, desc]) => (
                  <div key={tag} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="grid h-10 w-16 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/35 to-cyan-300/15 text-xs font-black">
                      {tag}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold">{title}</div>
                      <div className="text-xs text-white/65">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
                <button
                  onClick={() => nav(isLogged ? "/app" : "/auth")}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                >
                  {isLogged ? "Open console" : "Login / Register"}
                </button>
                <button
                  onClick={() => nav("/auth")}
                  className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-extrabold text-black hover:brightness-110"
                >
                  Start now
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Auditability</div>
                <div className="mt-1 text-sm font-extrabold">Evidence & lineage</div>
                <div className="mt-2 text-xs leading-6 text-white/65">
                  Every decision and action is traceable to inputs, contracts, and outputs.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Reliability</div>
                <div className="mt-1 text-sm font-extrabold">Graceful fallbacks</div>
                <div className="mt-2 text-xs leading-6 text-white/65">
                  If optional components fail (vector/streaming), core operations keep working.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What */}
      <section id="what" className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="mt-4 text-white/70 leading-7">
              Orkio is a platform designed to transform high-level intent into operational outcomes. It combines an{" "}
              <span className="text-white/90 font-semibold">Intelligence Core</span> (planning + reasoning), an{" "}
              <span className="text-white/90 font-semibold">Execution Layer</span> (agents + humans + APIs), and an{" "}
              <span className="text-white/90 font-semibold">Audit Layer</span> (traceability + governance).
            </p>
            <p className="mt-4 text-white/70 leading-7">
              Unlike prompt-only systems, Orkio is built around <span className="text-white/90 font-semibold">explicit contracts</span>:
              schemas define what is allowed, what is expected, what is stored, and what is verified.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-extrabold">Orkio is NOT</h3>
            <ul className="mt-4 space-y-3 text-white/70">
              {[
                "Just a chatbot interface.",
                "A single AI model or a magic prompt.",
                "A black box with no accountability.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-white/40" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <div className="text-sm font-extrabold">Orkio is</div>
              <div className="mt-2 text-sm leading-7 text-white/75">
                An operating system for intelligence — designed for repeatable execution, supervised autonomy,
                and enterprise-grade governance.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="mt-3 max-w-3xl text-white/70 leading-7">
            Orkio decomposes objectives into structured tasks, delegates execution, and records evidence — while keeping
            core stability independent from optional components.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {[
              ["01", "Intent ingestion", "Receive goals, messages, documents, and context across channels."],
              ["02", "Planning", "Convert intent into steps, roles, and measurable outputs."],
              ["03", "Orchestration", "Delegate to AI agents, humans, or external APIs with contracts."],
              ["04", "Verification", "Validate outputs, apply approvals, capture evidence and logs."],
              ["05", "Memory", "Store structured artifacts for retrieval, audit and improvement."],
            ].map(([n, title, desc]) => (
              <div key={n} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-extrabold text-white/70">{n}</div>
                <div className="mt-2 text-sm font-extrabold">{title}</div>
                <div className="mt-2 text-xs leading-6 text-white/65">{desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="text-sm font-extrabold">Operational principle</div>
                <div className="mt-2 text-sm text-white/70">
                  Health → Auth → Core (threads/messages) → Upload/ingestion → RAG/streaming optional.
                </div>
              </div>
              <a
                href="#security"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
              >
                See governance model
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-black tracking-tight md:text-3xl">Core capabilities</h2>
        <p className="mt-3 max-w-3xl text-white/70 leading-7">
          Orkio is engineered for clarity, stability, and repeatable execution. It supports multi-tenant operation,
          document intelligence, and supervised autonomy — without sacrificing traceability.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Autonomous orchestration", "Coordinate specialized agents and human operators as a single team — with explicit steps, retries, and outcomes."],
            ["Document intelligence", "Upload and extract text deterministically, persist it for retrieval, and use optional embeddings/RAG when available. No blindness if vector search fails."],
            ["Audit & evidence", "Maintain lineage across inputs → contracts → actions → outputs, enabling operational review, compliance, and debugging."],
            ["Multi-tenant governance", "Run multiple organizations with clear isolation and policies. Control access via roles and verified contracts."],
            ["Human-in-the-loop", "Require approvals for sensitive actions (deployments, payments, exports). Autonomy stays supervised."],
            ["API-first design", "Integrate Orkio with automation tools (like n8n), messaging channels, and internal services via clear, versioned endpoints."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-extrabold">{title}</div>
              <div className="mt-3 text-sm leading-7 text-white/70">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Security & governance</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-7">
            Autonomy means nothing without control. Orkio is built to operate safely: role-based access, tenant isolation,
            explicit contracts, and audit trails.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-extrabold">Policy-driven access</div>
              <ul className="mt-4 space-y-2 text-sm text-white/70 leading-7">
                <li>• Role-based access (user/admin)</li>
                <li>• Tenant isolation (org scopes)</li>
                <li>• Admin actions protected by contracts</li>
                <li>• CORS explicitly configured</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-extrabold">Operational traceability</div>
              <ul className="mt-4 space-y-2 text-sm text-white/70 leading-7">
                <li>• Health-first deployment discipline</li>
                <li>• Deterministic ingestion pipeline</li>
                <li>• Graceful fallbacks (optional components)</li>
                <li>• Evidence for debugging and review</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-6">
            <div className="text-sm font-extrabold">Autonomy without chaos</div>
            <div className="mt-2 text-sm leading-7 text-white/75">
              Orkio’s core remains stable as capabilities evolve. Streaming, embeddings, and advanced agents are optional
              layers — not single points of failure.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}