import { useState } from "react";
import api from "../src/lib/api";

const MODES = {
  LOGIN: "login",
  REGISTER: "register",
  FORGOT: "forgot",
};

export default function Login({ onAuthSuccess, onNavigate }) {
  const [mode, setMode] = useState(MODES.LOGIN);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");

  const resetFeedback = () => {
    setError("");
    setMessage("");
    setDevLink("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetFeedback();
    setLoading(true);

    try {
      if (mode === MODES.LOGIN) {
        const res = await api.post("/auth/login", { email, password });
        onAuthSuccess(res.data);
        onNavigate("/");
      } else if (mode === MODES.REGISTER) {
        const res = await api.post("/auth/register", { name, email, password });
        onAuthSuccess(res.data);
        setMessage("Account created successfully. Please verify your email.");
        if (res.data?.dev?.verifyLink) {
          setDevLink(res.data.dev.verifyLink);
        }
        onNavigate("/");
      } else {
        const res = await api.post("/auth/forgot-password", { email });
        setMessage(res.data?.message || "Reset link generated");
        if (res.data?.dev?.resetLink) {
          setDevLink(res.data.dev.resetLink);
        }
      }
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form onSubmit={handleSubmit} className="auth-card">
        <p className="auth-kicker">Member Access</p>
        <h2>
          {mode === MODES.LOGIN && "Welcome back to HypeKicks"}
          {mode === MODES.REGISTER && "Create your HypeKicks account"}
          {mode === MODES.FORGOT && "Reset your password"}
        </h2>

        <div className="mode-switch">
          <button
            type="button"
            className={mode === MODES.LOGIN ? "active" : ""}
            onClick={() => {
              setMode(MODES.LOGIN);
              resetFeedback();
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === MODES.REGISTER ? "active" : ""}
            onClick={() => {
              setMode(MODES.REGISTER);
              resetFeedback();
            }}
          >
            Register
          </button>
          <button
            type="button"
            className={mode === MODES.FORGOT ? "active" : ""}
            onClick={() => {
              setMode(MODES.FORGOT);
              resetFeedback();
            }}
          >
            Forgot
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        {devLink && (
          <p className="auth-link-preview">
            Dev link:{" "}
            <a href={devLink} target="_blank" rel="noreferrer">
              {devLink}
            </a>
          </p>
        )}

        {mode === MODES.REGISTER && (
          <label className="auth-label">
            Name
            <input
              className="auth-input"
              placeholder="Your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}

        <label className="auth-label">
          Email
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {mode !== MODES.FORGOT && (
          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        )}

        <button disabled={loading} className="auth-submit">
          {loading ? "Please wait..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
