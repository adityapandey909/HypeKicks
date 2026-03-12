const RECENT_KEY = "hk_recently_viewed";
const RECENT_EVENT = "hk:recent-updated";
const MAX_RECENT = 12;

function normalizeRecentItem(product) {
  if (!product) return null;
  const productId = String(product._id || product.productId || "").trim();
  if (!productId) return null;

  return {
    productId,
    name: product.name || "Untitled sneaker",
    brand: product.brand || "",
    image: product.image || "",
    images: Array.isArray(product.images) ? product.images : [],
    price: Number(product.price) || 0,
    category: product.category || "",
    totalStock: Number(product.totalStock) || 0,
    viewedAt: product.viewedAt || new Date().toISOString(),
  };
}

export function loadRecentlyViewed() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeRecentItem(item))
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(product) {
  const normalized = normalizeRecentItem(product);
  if (!normalized) return;

  const current = loadRecentlyViewed();
  const next = [normalized, ...current.filter((item) => item.productId !== normalized.productId)].slice(
    0,
    MAX_RECENT
  );

  localStorage.setItem(RECENT_KEY, JSON.stringify(next));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(RECENT_EVENT));
  }
}

export function listenRecentlyViewed(handler) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(RECENT_EVENT, handler);
  return () => window.removeEventListener(RECENT_EVENT, handler);
}
