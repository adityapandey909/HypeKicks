import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { applyCatalogFilters, buildCatalogFilters, loadDemoCatalog } from "../lib/demoCatalog";

function formatPrice(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getDefaultSize(product) {
  const available = Array.isArray(product?.sizeOptions)
    ? product.sizeOptions.find((option) => option.stock > 0)
    : null;

  return available?.size || "";
}

function totalStock(product) {
  if (Array.isArray(product?.sizeOptions) && product.sizeOptions.length > 0) {
    return product.sizeOptions.reduce((sum, option) => sum + (Number(option.stock) || 0), 0);
  }

  return Number(product?.totalStock) || 0;
}

export default function ProductGrid({ onAddToCart, onOpenProduct, initialCategory = "" }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    setCategory(initialCategory || "");
  }, [initialCategory]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        if (!active) return;
        setLoading(true);
        setError("");

        const res = await api.get("/products", {
          params: {
            search,
            brand,
            category,
            sort,
            minPrice,
            maxPrice,
          },
        });

        if (!active) return;
        const payload = res.data;
        const rows = Array.isArray(payload) ? payload : payload.products || [];
        setProducts(rows);
        setBrands(payload?.filters?.brands || []);
        setCategories(payload?.filters?.categories || []);
      } catch {
        if (!active) return;
        try {
          const demoCatalog = await loadDemoCatalog();
          if (!active) return;

          const demoRows = applyCatalogFilters(demoCatalog, {
            search,
            brand,
            category,
            sort,
            minPrice,
            maxPrice,
          });
          const demoFilters = buildCatalogFilters(demoCatalog);

          setProducts(demoRows);
          setBrands(demoFilters.brands);
          setCategories(demoFilters.categories);
          setError("Live API is unavailable. Showing demo catalog.");
        } catch {
          if (!active) return;
          setProducts([]);
          setError("Could not load products. Please try again shortly.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, brand, category, sort, minPrice, maxPrice]);

  const itemCountLabel = useMemo(() => {
    if (loading) return "Loading inventory...";
    return `${products.length} pairs available`;
  }, [loading, products.length]);

  return (
    <section id="drops" className="drops-section">
      <div className="drops-header">
        <div>
          <p className="section-kicker">Seasonal release board</p>
          <h2 className="section-title">Latest Drops</h2>
        </div>
        <p className="section-subtitle">{itemCountLabel}</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, brand, or tag"
          aria-label="Search products"
        />

        <select value={brand} onChange={(event) => setBrand(event.target.value)} aria-label="Filter by brand">
          <option value="">All brands</option>
          {brands.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="featured">Featured</option>
        </select>

        <input
          type="number"
          min="0"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
          placeholder="Min $"
          aria-label="Minimum price"
        />
        <input
          type="number"
          min="0"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          placeholder="Max $"
          aria-label="Maximum price"
        />
      </div>

      {error && <p className="drops-error">{error}</p>}

      <div className="drops-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="skeleton-card">
                <div className="skeleton-image" />
                <div className="skeleton-body">
                  <div className="skeleton-line skeleton-line-lg" />
                  <div className="skeleton-line skeleton-line-sm" />
                  <div className="skeleton-line skeleton-line-md" />
                </div>
              </div>
            ))
          : products.length === 0
            ? (
              <div className="empty-state">
                <h3>No products match your filters</h3>
                <p>Try clearing filters or searching with another keyword.</p>
              </div>
              )
            : products.map((product, index) => {
                const stock = totalStock(product);
                const defaultSize = getDefaultSize(product);

                return (
                  <article
                    key={product._id}
                    className="sneaker-card"
                    style={{ "--card-index": index + 1 }}
                  >
                    <div className="sneaker-media">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading={index < 4 ? "eager" : "lazy"}
                      />
                      {product.brand && <span className="brand-chip">{product.brand}</span>}
                    </div>

                    <div className="sneaker-body">
                      <div>
                        <h3 className="sneaker-name">{product.name}</h3>
                        <p className="sneaker-price">{formatPrice(product.price)}</p>
                        <p className={`stock-pill ${stock > 0 ? "in" : "out"}`}>
                          {stock > 0 ? `${stock} in stock` : "Out of stock"}
                        </p>
                      </div>

                      <div className="card-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => onOpenProduct(product._id)}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="add-button"
                          disabled={stock <= 0}
                          onClick={() =>
                            onAddToCart(product, {
                              quantity: 1,
                              size: defaultSize,
                            })
                          }
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
      </div>
    </section>
  );
}
