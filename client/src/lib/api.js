import axios from "axios";
import { clearAuth, getToken } from "./auth";

function normalizeOrigin(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveApiOrigin() {
  const configured = normalizeOrigin(import.meta.env.VITE_API_URL);
  if (configured) {
    return configured;
  }

  // On GitHub Pages, use demo mode unless an explicit API URL is configured.
  if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
    return "";
  }

  return "http://localhost:5001";
}

const API_ORIGIN = resolveApiOrigin();
const API_DISABLED = !API_ORIGIN;
const api = axios.create({
  baseURL: API_DISABLED ? "/api" : `${API_ORIGIN}/api`,
  timeout: 20000,
});

if (API_DISABLED) {
  api.interceptors.request.use(() =>
    Promise.reject(new Error("API is not configured"))
  );
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuth();
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default api;
