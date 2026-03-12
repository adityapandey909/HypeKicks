const WISHLIST_KEY = "hk_wishlist";

function normalizeWishlistItem(product) {
  if (!product) return null;

  const productId = String(product._id || product.productId || "").trim();
  if (!productId) return null;

  return {
    productId,
    name: product.name || "Untitled sneaker",
    brand: product.brand || "",
    image: product.image || "",
    price: Number(product.price) || 0,
    category: product.category || "",
    totalStock: Number(product.totalStock) || 0,
    sizeOptions: Array.isArray(product.sizeOptions) ? product.sizeOptions : [],
  };
}

export function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeWishlistItem(item))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function saveWishlist(items) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
}

export function wishlistHas(items = [], productId = "") {
  const target = String(productId || "").trim();
  if (!target) return false;
  return items.some((item) => String(item.productId || "") === target);
}

export function toggleWishlistItem(items = [], product) {
  const normalized = normalizeWishlistItem(product);
  if (!normalized) return items;

  if (wishlistHas(items, normalized.productId)) {
    return items.filter((item) => String(item.productId || "") !== normalized.productId);
  }

  return [normalized, ...items].slice(0, 40);
}
