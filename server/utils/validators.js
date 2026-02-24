const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function isValidEmail(email = "") {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function sanitizeText(value = "", fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

export function validatePassword(password = "") {
  if (typeof password !== "string" || password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters",
    };
  }

  return { valid: true, message: "" };
}

export function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function parseSizeOptions(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      size: sanitizeText(item?.size),
      stock: Math.max(0, Math.floor(toSafeNumber(item?.stock, 0))),
    }))
    .filter((item) => item.size.length > 0);
}

export function normalizeImageList(images = [], fallbackImage = "") {
  const list = Array.isArray(images) ? images : [];
  const clean = list
    .map((value) => sanitizeText(value))
    .filter(Boolean);

  if (clean.length === 0 && fallbackImage) {
    clean.push(sanitizeText(fallbackImage));
  }

  return [...new Set(clean)];
}
