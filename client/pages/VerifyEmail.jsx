import { useEffect, useMemo, useState } from "react";
import api from "../src/lib/api";

export default function VerifyEmail({ onNavigate }) {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!token) {
        if (!active) return;
        setStatus("error");
        setMessage("Verification token is missing");
        return;
      }

      try {
        const res = await api.post("/auth/verify-email", { token });
        if (!active) return;
        setStatus("success");
        setMessage(res.data?.message || "Email verified successfully");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error.response?.data?.message || "Failed to verify email");
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="auth-kicker">Email Verification</p>
        <h2>{status === "success" ? "All set" : "Verification status"}</h2>
        <p className={status === "error" ? "auth-error" : "auth-success"}>{message}</p>
        <button type="button" className="auth-submit" onClick={() => onNavigate("/login")}>
          Go to login
        </button>
      </div>
    </div>
  );
}
