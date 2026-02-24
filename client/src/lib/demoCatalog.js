const DEMO_CATALOG_PATH = `${import.meta.env.BASE_URL}products-demo.json`;

function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

export async function loadDemoCatalog() {
  const res = await fetch(DEMO_CATALOG_PATH, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Demo catalog fetch failed");
  }

  const payload = await res.json();
  return normalizeProducts(payload);
}

export function buildCatalogFilters(products = []) {
  const brands = [...new Set(products.map((product) => String(product.brand || "").trim()).filter(Boolean))].sort();
  const categories = [
    ...new Set(products.map((product) => String(product.category || "").trim()).filter(Boolean)),
  ].sort();

  return { brands, categories };
}

export function applyCatalogFilters(products = [], filters = {}) {
  const {
    search = "",
    brand = "",
    category = "",
    minPrice = "",
    maxPrice = "",
    sort = "newest",
  } = filters;

  const cleanSearch = String(search || "").trim().toLowerCase();
  const cleanBrand = String(brand || "").trim().toLowerCase();
  const cleanCategory = String(category || "").trim().toLowerCase();
  const cleanMinPrice = parseOptionalNumber(minPrice);
  const cleanMaxPrice = parseOptionalNumber(maxPrice);

  const rows = products.filter((product) => {
    const productName = String(product.name || "").toLowerCase();
    const productBrand = String(product.brand || "").toLowerCase();
    const productCategory = String(product.category || "").toLowerCase();
    const productDescription = String(product.description || "").toLowerCase();
    const productTags = Array.isArray(product.tags)
      ? product.tags.map((tag) => String(tag || "").toLowerCase()).join(" ")
      : "";
    const price = Number(product.price) || 0;

    if (
      cleanSearch &&
      !(
        productName.includes(cleanSearch) ||
        productBrand.includes(cleanSearch) ||
        productDescription.includes(cleanSearch) ||
        productTags.includes(cleanSearch)
      )
    ) {
      return false;
    }

    if (cleanBrand && productBrand !== cleanBrand) return false;
    if (cleanCategory && productCategory !== cleanCategory) return false;
    if (Number.isFinite(cleanMinPrice) && price < cleanMinPrice) return false;
    if (Number.isFinite(cleanMaxPrice) && price > cleanMaxPrice) return false;

    return true;
  });

  const sorted = [...rows];
  if (sort === "price_asc") {
    sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (sort === "price_desc") {
    sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else if (sort === "oldest") {
    sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  } else if (sort === "featured") {
    sorted.sort((a, b) => {
      const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDiff !== 0) return featuredDiff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  } else {
    sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  return sorted;
}

export function findProductById(products = [], productId = "") {
  const target = String(productId || "").trim();
  if (!target) return null;
  return products.find((product) => String(product._id || "") === target) || null;
}

export function buildRelatedProducts(products = [], product = null, limit = 4) {
  if (!product) return [];

  const ownId = String(product._id || "");
  const brand = String(product.brand || "").trim().toLowerCase();
  const pool = products.filter((candidate) => String(candidate._id || "") !== ownId);

  const sameBrand = brand
    ? pool.filter((candidate) => String(candidate.brand || "").trim().toLowerCase() === brand)
    : [];

  if (sameBrand.length > 0) return sameBrand.slice(0, limit);
  return pool.slice(0, limit);
}
