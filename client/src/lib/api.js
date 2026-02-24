import axios from "axios";
import { clearAuth, getToken } from "./auth";

function resolveApiOrigin() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
    return "https://hypekicks-api.onrender.com";
  }

  return "http://localhost:5001";
}

const API_ORIGIN = resolveApiOrigin();
const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 20000,
});

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
