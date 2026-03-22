
// APPCONSOLE — PATCH DE ONBOARDING CONVERSACIONAL
// Objetivo:
// 1) Não voltar para /auth após concluir onboarding
// 2) Trocar o formulário rígido por fluxo guiado pelo Orkio
// 3) Ao finalizar, continuar no chat normalmente
//
// Aplique os blocos abaixo no AppConsole.jsx atual.

// ===============================
// 1. NOVOS ESTADOS
// ===============================

const [onboardingStep, setOnboardingStep] = useState(0);
const [onboardingConversationMode, setOnboardingConversationMode] = useState(false);

const ONBOARDING_CHAT_STEPS = [
  {
    key: "user_type",
    speaker: "Orkio",
    question: (name) =>
      `Olá, ${name || "seja muito bem-vindo(a)"}.\n\nAntes de começarmos, quero entender rapidamente o seu perfil para personalizar sua experiência.\n\nQual destas opções melhor representa você hoje?`,
    options: ONBOARDING_USER_TYPES,
  },
  {
    key: "intent",
    speaker: "Orkio",
    question:
      "Perfeito. Agora me diga: qual é o seu principal objetivo ao entrar no Orkio neste momento?",
    options: ONBOARDING_INTENTS,
  },
  {
    key: "company",
    speaker: "Orkio",
    question:
      "Ótimo. Qual empresa, operação ou projeto você gostaria de associar ao seu contexto aqui?",
    freeText: true,
    placeholder: "Ex.: PatroAI, Fintegra, projeto pessoal...",
  },
  {
    key: "role",
    speaker: "Orkio",
    question:
      "E qual é a sua função ou posição atual?",
    freeText: true,
    placeholder: "Ex.: Founder, CEO, investidor, operador...",
  },
  {
    key: "notes",
    speaker: "Orkio",
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
    content: typeof step.question === "function" ? step.question(getFirstName(currentUser?.name)) : step.question,
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

// ===============================
// 2. ABRIR ONBOARDING EM MODO CONVERSA
// ===============================

// Dentro do bootstrapUser(), substitua:
if (!data?.onboarding_completed) {
  setOnboardingForm(sanitizeOnboardingForm(data));
  setOnboardingOpen(true);
}

// por:
if (!data?.onboarding_completed) {
  const clean = sanitizeOnboardingForm(data);
  setOnboardingForm(clean);
  setOnboardingConversationMode(true);
  setOnboardingOpen(true);
  setOnboardingStep(0);
  setMessages((prev) => {
    const alreadyHasGreeting = (prev || []).some((m) => m?.__system_onboarding === true);
    if (alreadyHasGreeting) return prev;
    return [...(prev || []), buildOnboardingAssistantMessage(0, data)];
  });
}

// ===============================
// 3. NOVAS FUNÇÕES DE AVANÇO
// ===============================

function answerOnboardingOption(fieldKey, value, label) {
  const nextForm = {
    ...onboardingForm,
    [fieldKey]: value,
  };
  setOnboardingForm(nextForm);

  setMessages((prev) => [
    ...(prev || []),
    buildOnboardingUserEcho(label),
  ]);

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

  setMessages((prev) => [
    ...(prev || []),
    buildOnboardingUserEcho(raw || "Sem observações"),
  ]);

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

// ===============================
// 4. SUBMIT FINAL — SEM VOLTAR AO LOGIN
// ===============================

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
    setSession({ token, user: nextUser, tenant });

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

// ===============================
// 5. INTERCEPTAR ENVIO ENQUANTO ONBOARDING ESTÁ ABERTO
// ===============================

// No começo de sendMessage(), adicione:
if (onboardingOpen && onboardingConversationMode) {
  const step = ONBOARDING_CHAT_STEPS[onboardingStep];
  if (step?.freeText) {
    answerOnboardingFreeText();
    return;
  }
}

// ===============================
// 6. RENDERIZAÇÃO DOS BOTÕES DO ONBOARDING
// ===============================

// No bloco de render do composer / mensagens, quando onboardingOpen && onboardingConversationMode,
// renderize as opções do step atual:

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
        onClick={() => answerOnboardingOption(ONBOARDING_CHAT_STEPS[onboardingStep].key, opt.value, opt.label)}
      >
        {opt.label}
      </button>
    ))}
  </div>
) : null}

// ===============================
// 7. DESATIVAR O MODAL/FORM LEGADO
// ===============================

// Remover o formulário rígido anterior do onboarding.
// Manter apenas o gate booleano, mas não redirecionar para /auth após submit.
// O onboarding agora é conduzido dentro da timeline do chat.
