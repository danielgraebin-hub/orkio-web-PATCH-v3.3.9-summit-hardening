ORKIO — APPCONSOLE HOTFIX PACK (ONBOARDING + ORKIO DEFAULT + VTT BUTTON)

OBJETIVO
1) Fazer o chat abrir por padrão com ORKIO sozinho, não @Team
2) Fazer o onboarding continuar no console/chat, sem retorno ao login
3) Explicar e corrigir o botão de voice-to-text no chat
4) Reduzir latência inicial evitando Team mode como padrão

==================================================
PATCH 1 — TROCAR O DEFAULT DE TEAM PARA ORKIO
==================================================

LOCAL ATUAL:
const [destMode, setDestMode] = useState("team"); // team|single|multi

TROCAR POR:
const [destMode, setDestMode] = useState("single"); // team|single|multi

MANTER:
const [destSingle, setDestSingle] = useState(""); // agent id

OBS:
O loadAgents() atual já tenta apontar destSingle para Orkio quando encontra o agente padrão.
O erro real é que o modo nasce em "team", então o prefixo vira @Team e todos respondem.

==================================================
PATCH 2 — GARANTIR ORKIO COMO DEFAULT SEMPRE
==================================================

DENTRO DE loadAgents(), TROCAR O BLOCO:

// Default destination (single) to Orkio if exists
if (!destSingle && Array.isArray(data)) {
  const orkio = data.find(a => (a.name || "").toLowerCase() === "orkio") || data.find(a => a.is_default);
  if (orkio) setDestSingle(orkio.id);
}

POR:

// Default destination must always be Orkio in user console
if (Array.isArray(data)) {
  const orkio =
    data.find(a => (a.name || "").toLowerCase() === "orkio") ||
    data.find(a => a.is_default) ||
    null;

  if (orkio?.id) {
    setDestMode("single");
    setDestSingle(orkio.id);
  }
}

==================================================
PATCH 3 — ONBOARDING CONVERSACIONAL (ESTADO)
==================================================

ADICIONAR LOGO APÓS OS ESTADOS DE ONBOARDING:

const [onboardingConversationMode, setOnboardingConversationMode] = useState(false);
const [onboardingStep, setOnboardingStep] = useState(0);

const ONBOARDING_CHAT_STEPS = [
  {
    key: "user_type",
    question: (name) =>
      `Olá, ${name || "seja muito bem-vindo(a)"}.\n\nAntes de começarmos, quero entender rapidamente o seu perfil para personalizar sua experiência.\n\nQual destas opções melhor representa você hoje?`,
    options: ONBOARDING_USER_TYPES,
  },
  {
    key: "intent",
    question:
      "Perfeito. Agora me diga: qual é o seu principal objetivo ao entrar no Orkio neste momento?",
    options: ONBOARDING_INTENTS,
  },
  {
    key: "company",
    question:
      "Ótimo. Qual empresa, operação ou projeto você gostaria de associar ao seu contexto aqui?",
    freeText: true,
    placeholder: "Ex.: PatroAI, Fintegra, projeto pessoal...",
  },
  {
    key: "role",
    question:
      "E qual é a sua função ou posição atual?",
    freeText: true,
    placeholder: "Ex.: Founder, CEO, investidor, operador...",
  },
  {
    key: "notes",
    question:
      "Por fim: existe alguma prioridade, necessidade ou contexto importante que você queira me sinalizar antes de seguirmos?",
    freeText: true,
    placeholder: "Escreva aqui o que for importante para sua jornada...",
    optional: true,
  },
];

function getFirstName(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  return v.split(/\s+/)[0] || v;
}

function buildOnboardingAssistantMessage(stepIndex, currentUser) {
  const step = ONBOARDING_CHAT_STEPS[stepIndex];
  if (!step) return null;
  return {
    id: `onb-ass-${step.key}-${Date.now()}`,
    role: "assistant",
    content: typeof step.question === "function"
      ? step.question(getFirstName(currentUser?.name))
      : step.question,
    agent_name: "Orkio",
    created_at: Math.floor(Date.now() / 1000),
    __system_onboarding: true,
  };
}

function buildOnboardingUserEcho(label) {
  return {
    id: `onb-user-${Date.now()}`,
    role: "user",
    content: label,
    user_name: user?.name || user?.email,
    created_at: Math.floor(Date.now() / 1000),
    __system_onboarding: true,
  };
}

==================================================
PATCH 4 — ABRIR O ONBOARDING DENTRO DO CHAT
==================================================

NO bootstrapUser(), TROCAR ESTE TRECHO:

if (!data?.onboarding_completed) {
  setOnboardingForm(sanitizeOnboardingForm(data));
  setOnboardingOpen(true);
}

POR:

if (!data?.onboarding_completed) {
  const clean = sanitizeOnboardingForm(data);
  setOnboardingForm(clean);
  setOnboardingConversationMode(true);
  setOnboardingOpen(true);
  setOnboardingStep(0);

  setMessages((prev) => {
    const alreadyHasOnboardingMsg = (prev || []).some((m) => m?.__system_onboarding === true);
    if (alreadyHasOnboardingMsg) return prev;
    return [...(prev || []), buildOnboardingAssistantMessage(0, data)];
  });
}

==================================================
PATCH 5 — RESPOSTAS DO ONBOARDING CONVERSACIONAL
==================================================

ADICIONAR ESTAS FUNÇÕES:

function answerOnboardingOption(fieldKey, value, label) {
  const nextForm = {
    ...onboardingForm,
    [fieldKey]: value,
  };
  setOnboardingForm(nextForm);

  setMessages((prev) => [...(prev || []), buildOnboardingUserEcho(label)]);

  const nextStep = onboardingStep + 1;
  setOnboardingStep(nextStep);

  if (nextStep >= ONBOARDING_CHAT_STEPS.length) {
    submitOnboardingChat(nextForm);
    return;
  }

  const nextMessage = buildOnboardingAssistantMessage(nextStep, user);
  if (nextMessage) {
    setMessages((prev) => [...(prev || []), nextMessage]);
  }
}

function answerOnboardingFreeText() {
  const step = ONBOARDING_CHAT_STEPS[onboardingStep];
  if (!step?.freeText) return;

  const raw = String(text || "").trim();
  if (!raw && !step.optional) return;

  const nextForm = {
    ...onboardingForm,
    [step.key]: raw,
  };
  setOnboardingForm(nextForm);

  setMessages((prev) => [...(prev || []), buildOnboardingUserEcho(raw || "Sem observações")]);
  setText("");

  const nextStep = onboardingStep + 1;
  setOnboardingStep(nextStep);

  if (nextStep >= ONBOARDING_CHAT_STEPS.length) {
    submitOnboardingChat(nextForm);
    return;
  }

  const nextMessage = buildOnboardingAssistantMessage(nextStep, user);
  if (nextMessage) {
    setMessages((prev) => [...(prev || []), nextMessage]);
  }
}

==================================================
PATCH 6 — SUBMIT DO ONBOARDING SEM VOLTAR AO LOGIN
==================================================

SUBSTITUIR A FUNÇÃO submitOnboarding() INTEIRA POR:

async function submitOnboardingChat(formPayload) {
  if (onboardingBusy) return;

  const payload = sanitizeOnboardingForm({
    ...formPayload,
    onboarding_completed: true,
  });

  if (!payload.user_type || !payload.intent) {
    setOnboardingStatus("Ainda faltam algumas informações para concluir seu onboarding.");
    return;
  }

  setOnboardingBusy(true);
  setOnboardingStatus("Finalizando seu onboarding...");

  try {
    let data = null;

    try {
      const resp = await apiFetch("/api/user/onboarding", {
        method: "POST",
        token,
        org: tenant,
        body: {
          ...payload,
          onboarding_completed: true,
        },
      });
      data = resp?.data || null;
    } catch (postErr) {
      const detail = String(postErr?.detail || postErr?.message || "");
      const shouldRetryPut =
        postErr?.status === 405 ||
        /method not allowed/i.test(detail) ||
        /not allowed/i.test(detail);

      if (!shouldRetryPut) throw postErr;

      const resp = await apiFetch("/api/user/onboarding", {
        method: "PUT",
        token,
        org: tenant,
        body: {
          ...payload,
          onboarding_completed: true,
        },
      });
      data = resp?.data || null;
    }

    const nextUser = data?.user || {
      ...(user || {}),
      ...payload,
      profile_role: payload.role,
      onboarding_completed: true,
    };

    setUser(nextUser);
    try { setSession({ token, user: nextUser, tenant }); } catch {}

    setOnboardingOpen(false);
    setOnboardingConversationMode(false);
    setOnboardingStatus("");
    setOnboardingStep(0);

    await loadThreads();
    await loadAgents();

    setMessages((prev) => [
      ...(prev || []),
      {
        id: `onb-done-${Date.now()}`,
        role: "assistant",
        content:
          `Perfeito, ${getFirstName(nextUser?.name) || "vamos seguir"}.\n\nJá entendi o seu perfil e o seu objetivo inicial. A partir daqui, podemos continuar normalmente pelo chat. Estou à sua disposição para orientar você na plataforma, esclarecer dúvidas e avançar no que for prioridade agora.`,
        agent_name: "Orkio",
        created_at: Math.floor(Date.now() / 1000),
        __system_onboarding: true,
      },
    ]);
  } catch (e) {
    setOnboardingStatus(e?.message || "Falha ao concluir onboarding.");
  } finally {
    setOnboardingBusy(false);
  }
}

==================================================
PATCH 7 — SENDMESSAGE DEVE RESPONDER O ONBOARDING
==================================================

NO INÍCIO DE sendMessage(), ADICIONAR:

if (onboardingOpen && onboardingConversationMode) {
  const step = ONBOARDING_CHAT_STEPS[onboardingStep];
  if (step?.freeText) {
    answerOnboardingFreeText();
    return;
  }
}

==================================================
PATCH 8 — RENDERIZAR BOTÕES DO ONBOARDING NO CHAT
==================================================

ABAIXO DA ÁREA DE MENSAGENS OU LOGO ACIMA DO COMPOSER, ADICIONAR:

{onboardingOpen && onboardingConversationMode && ONBOARDING_CHAT_STEPS[onboardingStep]?.options ? (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
    {ONBOARDING_CHAT_STEPS[onboardingStep].options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        style={{
          background: "#fff",
          color: "#111",
          border: "1px solid #ddd",
          borderRadius: 999,
          padding: "10px 14px",
          cursor: "pointer",
        }}
        onClick={() => answerOnboardingOption(
          ONBOARDING_CHAT_STEPS[onboardingStep].key,
          opt.value,
          opt.label
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
) : null}

==================================================
PATCH 9 — DESATIVAR O FORMULÁRIO LEGADO
==================================================

REMOVER O BLOCO DE MODAL/FORM FIXO DO ONBOARDING.
O gate onboardingOpen permanece.
Mas a UI do onboarding agora acontece dentro da timeline do chat.

==================================================
PATCH 10 — BOTÃO DE VOICE-TO-TEXT NO CHAT
==================================================

DIAGNÓSTICO:
O botão JÁ EXISTE no AppConsole atual, mas ele só aparece quando:

SUMMIT_VOICE_MODE === "stt_tts"

Se o ambiente estiver em "realtime", o botão mostrado é o de raio (⚡), não o de microfone.

TRECHO ATUAL:
{SUMMIT_VOICE_MODE === "stt_tts" ? (
  <button
    type="button"
    style={{ ...styles.micBtn, opacity: speechSupported ? 1 : 0.6 }}
    onClick={toggleMic}
    title={micEnabled ? "Stop voice input" : "Start voice input"}
  >
    🎙️
  </button>
) : (
  <button ...>⚡</button>
)}

PARA DEIXAR O BOTÃO 🎙️ APARECER SEMPRE NO CHAT, TROCAR O BLOCO INTEIRO POR:

<button
  type="button"
  style={{ ...styles.micBtn, opacity: speechSupported ? 1 : 0.6 }}
  onClick={toggleMic}
  title={micEnabled ? "Parar ditado" : "Iniciar ditado"}
  disabled={!speechSupported}
>
  🎙️
</button>

<button
  type="button"
  style={{
    ...styles.micBtn,
    background: realtimeMode ? "rgba(80,160,255,0.25)" : "rgba(255,255,255,0.05)",
    border: realtimeMode ? "1px solid rgba(80,160,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
    position: "relative",
    opacity: 1,
    cursor: "pointer",
  }}
  onClick={toggleRealtimeMode}
  title={realtimeMode ? "Desativar realtime" : "Ativar realtime"}
>
  <span style={{ fontSize: "16px" }}>⚡</span>
  {realtimeMode && (
    <span
      style={{
        position: "absolute",
        top: "-2px",
        right: "-2px",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: "#50a0ff",
        animation: "pulse 1.5s infinite",
      }}
    />
  )}
</button>

OBS:
- 🎙️ = ditado / voice-to-text do chat
- ⚡ = realtime conversacional
- os dois podem coexistir visualmente

==================================================
PATCH 11 — AJUSTAR toggleMic PARA FUNCIONAR FORA DO MODO stt_tts
==================================================

FUNÇÃO ATUAL:
function toggleMic() {
  if (SUMMIT_VOICE_MODE !== "stt_tts" || !speechSupported) return;
  if (micEnabled) stopMic();
  else startMic();
}

TROCAR POR:
function toggleMic() {
  if (!speechSupported) return;
  if (micEnabled) stopMic();
  else startMic();
}

==================================================
PATCH 12 — REDUZIR LATÊNCIA NO CHAT
==================================================

O principal ganho aqui vem do Patch 1:
destMode = "single"

Porque hoje o prefixo é:
@Team

e isso amplia a resposta e aumenta latência.

Com Orkio sozinho por padrão:
- menos custo
- menos latência
- menos ruído
- UX mais elegante

==================================================
RESUMO DO QUE ESTE HOTFIX ENTREGA
==================================================

1. Orkio sozinho responde por padrão
2. Team deixa de ser padrão
3. onboarding deixa de ser formulário rígido
4. onboarding vira conversa guiada pelo Orkio
5. onboarding termina e segue no chat
6. sem retorno ao login
7. botão de voice-to-text aparece no chat
8. botão de realtime continua existindo
