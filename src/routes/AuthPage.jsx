
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, forgotPassword, resetPassword, validateInvestorAccessCode } from "../ui/api.js";
import { setSession, getTenant } from "../lib/auth.js";

export default function AuthPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState("login");
  const [tenant, setTenant] = useState(getTenant() || "public");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordConfirm, setShowRegisterPasswordConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const rt = p.get("reset_token");
    if (rt) {
      setResetMode(true);
      setResetToken(rt);
      setTab("login");
    }
    if (p.get("session_expired") === "1") {
      setStatus("Sua sessão expirou. Entre novamente para continuar.");
    } else if (p.get("pending_approval") === "1") {
      setPendingApproval(true);
      setStatus("Seu acesso ainda está aguardando aprovação.");
    } else if (p.get("approved_now") === "1") {
      setStatus("Seu acesso foi aprovado. Entre para continuar.");
    }
  }, []);

  function showAwaitingApproval(message) {
    setPendingApproval(true);
    setOtpMode(false);
    setStatus(message || "Identity verified. Your access is awaiting manual approval.");
  }

  async function doLogin() {
    setBusy(true);
    setPendingApproval(false);
    setStatus("Signing in...");
    try {
      const { data } = await apiFetch("/api/auth/login", {
        method: "POST",
        org: tenant,
        body: { tenant, email, password },
      });
      if (data?.pending_otp) {
        setOtpMode(true);
        setPendingEmail(data.email || email);
        setStatus(data.message || "Enter the verification code sent to your e-mail. If your account is still pending, access will remain awaiting manual approval after verification.");
        return;
      }
      if (data?.pending_approval || data?.auth_status === "pending_approval") {
        showAwaitingApproval(data.message || "Identity verified. Awaiting manual approval.");
        return;
      }
      if (!data?.access_token || !data?.user) {
        setStatus(data?.message || "Não foi possível concluir o login.");
        return;
      }
      setSession({ token: data.access_token, user: data.user, tenant });
      nav(data.user?.role === "admin" ? "/admin" : "/app");
    } catch (e) {
      setStatus(e.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function doVerifyOtp() {
    setBusy(true);
    setStatus("Verifying code...");
    try {
      const { data } = await apiFetch("/api/auth/login/verify-otp", {
        method: "POST",
        org: tenant,
        body: { tenant, email: pendingEmail || email, code: otpCode },
      });
      if (data?.pending_approval || data?.auth_status === "pending_approval") {
        showAwaitingApproval(data.message || "Identity verified. Awaiting manual approval.");
        return;
      }
      if (!data?.access_token || !data?.user) {
        setStatus(data?.message || "Não foi possível concluir o login.");
        return;
      }
      setSession({ token: data.access_token, user: data.user, tenant });
      nav(data.user?.role === "admin" ? "/admin" : "/app");
    } catch (e) {
      setStatus(e.message || "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function doRegister() {
    if (password !== passwordConfirm) {
      setStatus("Password confirmation does not match.");
      return;
    }
    if (!acceptTerms) {
      setStatus("You must accept the legal terms before continuing.");
      return;
    }
    setBusy(true);
    setPendingApproval(false);
    const emailNormalized = (email || "").trim().toLowerCase();
    const isExpectedSuperAdmin = emailNormalized === "daniel@patroai.com";
    setStatus(isExpectedSuperAdmin ? "Creating your account..." : "Validating access code...");
    try {
      if (!isExpectedSuperAdmin) {
        const { data: valid } = await validateInvestorAccessCode({ code: accessCode, org: tenant });
        if (!valid?.valid) {
          setStatus("Invalid access code.");
          return;
        }
      }
      setStatus("Creating your account...");
      const { data } = await apiFetch("/api/auth/register", {
        method: "POST",
        org: tenant,
        body: {
          tenant,
          email: emailNormalized,
          name: (name || "").trim(),
          password,
          access_code: isExpectedSuperAdmin ? "" : accessCode,
          accept_terms: acceptTerms,
          marketing_consent: false,
        },
      });
      if (data?.pending_approval) {
        setPendingApproval(true);
        setTab("login");
        setStatus(data.message || "Account created. Your identity is pending OTP verification and app access will remain awaiting manual approval.");
        return;
      }
      if (data?.pending_otp) {
        setOtpMode(true);
        setPendingEmail(data.email || email);
        setStatus(
          data.message ||
          "Account created. Enter the verification code sent to your e-mail. Access to the app will remain pending manual approval until approved."
        );
        return;
      }
      if (data?.access_token) {
        setSession({ token: data.access_token, user: data.user, tenant });
        nav(data.user?.role === "admin" ? "/admin" : "/app");
      } else {
        setStatus("Account created. Please sign in.");
        setTab("login");
      }
    } catch (e) {
      const detail = (e?.message || "").toString();
      if (/already registered/i.test(detail)) {
        setPendingApproval(false);
        setOtpMode(false);
        setTab("login");
        setStatus("Este e-mail já está cadastrado. Faça login ou use recuperar senha para continuar.");
      } else {
        setStatus(detail || "Registration failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function doForgotPassword() {
    setBusy(true);
    setStatus("Sending reset instructions...");
    try {
      const { data } = await forgotPassword({ email, tenant });
      setStatus(data?.message || "If this e-mail is registered, a reset link has been sent.");
      setForgotMode(false);
    } catch (e) {
      setStatus(e.message || "Could not start password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function doResetPassword() {
    if (password !== passwordConfirm) {
      setStatus("Password confirmation does not match.");
      return;
    }
    setBusy(true);
    setStatus("Updating password...");
    try {
      const { data } = await resetPassword({ token: resetToken, password, password_confirm: passwordConfirm, tenant });
      setStatus(data?.message || "Password updated successfully.");
      setResetMode(false);
      setTab("login");
    } catch (e) {
      setStatus(e.message || "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  function renderPasswordField({
    label,
    value,
    onChange,
    visible,
    onToggle,
    placeholder = "••••••••",
    autoComplete = "current-password",
  }) {
    return (
      <>
        <label style={lbl}>{label}</label>
        <div style={passwordWrap}>
          <input
            style={{ ...inp, paddingRight: 52 }}
            value={value}
            onChange={onChange}
            type={visible ? "text" : "password"}
            placeholder={placeholder}
            autoComplete={autoComplete}
          />
          <button type="button" style={togglePwdBtn} onClick={onToggle}>
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </>
    );
  }

  const cardStyle = {
    maxWidth: 560,
    margin: "24px auto",
    padding: 16,
    fontFamily: "system-ui",
    background: "#fff",
    borderRadius: 20,
    boxShadow: "0 18px 48px rgba(0,0,0,0.08)"
  };

  return (
    <div style={cardStyle}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <img src="/orkio-logo-app.png" alt="Orkio" style={{ width: 120, maxWidth: "60%" }} />
      </div>

      <h2 style={{ marginBottom: 4 }}>Investor access</h2>
      <p style={{ color: "#555", marginTop: 0 }}>
        Secure Summit access with password, e-mail verification and controlled follow-up.
      </p>

      {!resetMode && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button disabled={otpMode || forgotMode || busy} onClick={() => setTab("login")} style={tabBtn(tab === "login")}>Login</button>
          <button disabled={otpMode || forgotMode || busy} onClick={() => setTab("register")} style={tabBtn(tab === "register")}>Register</button>
        </div>
      )}

      <label style={lbl}>Tenant</label>
      <input style={inp} value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="public" />

      {!resetMode && tab === "register" && (
        <>
          <label style={lbl}>Full name</label>
          <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </>
      )}

      <label style={lbl}>E-mail</label>
      <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" />

      {(forgotMode || resetMode) ? null : (
        tab === "register"
          ? renderPasswordField({
              label: "Password",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              visible: showRegisterPassword,
              onToggle: () => setShowRegisterPassword((v) => !v),
              autoComplete: "new-password",
            })
          : renderPasswordField({
              label: "Password",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              visible: showLoginPassword,
              onToggle: () => setShowLoginPassword((v) => !v),
              autoComplete: "current-password",
            })
      )}

      {(tab === "register" || resetMode) && !otpMode && !forgotMode ? (
        renderPasswordField({
          label: resetMode ? "Confirm new password" : "Confirm password",
          value: passwordConfirm,
          onChange: (e) => setPasswordConfirm(e.target.value),
          visible: resetMode ? showResetPasswordConfirm : showRegisterPasswordConfirm,
          onToggle: () => {
            if (resetMode) setShowResetPasswordConfirm((v) => !v);
            else setShowRegisterPasswordConfirm((v) => !v);
          },
          autoComplete: "new-password",
        })
      ) : null}

      {tab === "register" && !otpMode && !forgotMode && !resetMode ? (
        <>
          <label style={lbl}>Event access code</label>
          <input style={inp} value={accessCode} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} placeholder="Enter your Summit code" />
          <label style={{ ...lbl, display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10 }}>
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            <span>I accept the Terms of Use, Privacy Policy and AI Governance disclosures.</span>
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" style={btnSecondary} onClick={() => window.open("/legal/terms", "_blank")}>Terms</button>
            <button type="button" style={btnSecondary} onClick={() => window.open("/legal/privacy", "_blank")}>Privacy</button>
            <button type="button" style={btnSecondary} onClick={() => window.open("/legal/ai-governance", "_blank")}>AI Governance</button>
          </div>
        </>
      ) : null}

      {otpMode ? (
        <>
          <label style={lbl}>Verification code</label>
          <input style={inp} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="000000" />
        </>
      ) : null}

      {forgotMode ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>We will send a secure reset link to your e-mail.</div>
          <button disabled={busy} style={btnPrimary} onClick={doForgotPassword}>Send reset link</button>
          <button disabled={busy} style={{ ...btnSecondary, marginLeft: 8 }} onClick={() => setForgotMode(false)}>Cancel</button>
        </div>
      ) : null}

      {resetMode ? (
        <>
          <label style={lbl}>Reset token</label>
          <input style={inp} value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Paste the reset token or open the reset link" />
          {renderPasswordField({
            label: "New password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            visible: showResetPassword,
            onToggle: () => setShowResetPassword((v) => !v),
            autoComplete: "new-password",
          })}
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button disabled={busy} style={btnPrimary} onClick={doResetPassword}>Reset password</button>
            <button disabled={busy} style={btnSecondary} onClick={() => { setResetMode(false); setStatus(""); }}>Cancel</button>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tab === "login" ? (
            otpMode ? (
              <>
                <button disabled={busy} style={btnPrimary} onClick={doVerifyOtp}>Verify code</button>
                <button disabled={busy} style={btnSecondary} onClick={doLogin}>Resend code</button>
                <button disabled={busy} style={btnSecondary} onClick={() => { setOtpMode(false); setOtpCode(""); setPendingEmail(""); setStatus(""); }}>Back</button>
              </>
            ) : (
              <>
                <button disabled={busy} style={btnPrimary} onClick={doLogin}>Sign in</button>
                <button disabled={busy} style={btnSecondary} onClick={() => setForgotMode(true)}>Forgot password</button>
              </>
            )
          ) : (
            <button disabled={busy} style={btnPrimary} onClick={doRegister}>Create account</button>
          )}
          <button disabled={busy} style={btnSecondary} onClick={() => nav("/")}>Back</button>
        </div>
      )}

      {pendingApproval ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fffbeb", border: "1px solid #f59e0b", color: "#78350f" }}>
          Your identity is confirmed, but access to the app is still awaiting manual approval.
        </div>
      ) : null}

      {status ? <p style={{ marginTop: 14, color: "#444" }}>{status}</p> : null}
    </div>
  );
}

const lbl = { display: "block", marginTop: 12, marginBottom: 6, color: "#333" };
const inp = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", color: "#111" };
const btnPrimary = { background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer" };
const btnSecondary = { background: "#f3f3f3", color: "#111", padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" };
const tabBtn = (active) => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid " + (active ? "#111" : "#ddd"),
  background: active ? "#111" : "#fff",
  color: active ? "#fff" : "#111",
  cursor: "pointer",
});

const passwordWrap = { position: "relative" };
const togglePwdBtn = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  color: "#374151",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};
