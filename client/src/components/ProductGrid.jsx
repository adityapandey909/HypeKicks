import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { applyCatalogFilters, buildCatalogFilters, loadDemoCatalog } from "../lib/demoCatalog";
import { getResponsiveImageProps } from "../lib/media";

const BRAND_SWATCHES = {
  Nike: ["#f8f8f8", "#202020", "#e8412f", "#f2ba3a"],
  Adidas: ["#f6f6f6", "#192028", "#3761ff", "#9aa4b2"],
  Jordan: ["#1a1a1a", "#eb3f32", "#f7f7f7", "#474d57"],
  Puma: ["#171717", "#f4f4f4", "#3b6af5", "#f25d2b"],
  "New Balance": ["#f5f5f5", "#1e2939", "#8c919b", "#d14f42"],
  ASICS: ["#f4f6fa", "#203250", "#4f75a5", "#adbfd5"],
  Converse: ["#fcfcfc", "#151515", "#d15b43", "#8f97a0"],
  Reebok: ["#fbfbfb", "#0d1d38", "#e4543b", "#a4b2bf"],
  Vans: ["#f6f6f6", "#111111", "#c53d2d", "#7b8591"],
};

function resolveProductId(product) {
  return String(product?._id || product?.productId || "").trim();
}

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

function getGallery(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images.filter(Boolean);
  }
  return [product?.image].filter(Boolean);
}

function getColorSwatches(product) {
  if (Array.isArray(product?.colorways) && product.colorways.length > 0) {
    return product.colorways.slice(0, 4);
  }

  const brandPalette = BRAND_SWATCHES[product?.brand] || ["#f7f7f7", "#1d2736", "#ff6a42", "#95a3b4"];
  return brandPalette.slice(0, 4);
}

function getSizePreview(product) {
  if (!Array.isArray(product?.sizeOptions) || product.sizeOptions.length === 0) return [];
  return product.sizeOptions.slice(0, 4);
}

function estimateWeight(product) {
  if (Number(product?.weight) > 0) return `${Number(product.weight)} g`;

  const seed = String(resolveProductId(product) || product?.name || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return `${260 + (seed % 120)} g`;
}

function renderComparisonValue(value = "") {
  if (value === "" || value === null || value === undefined) return "-";
  return value;
}

export default function ProductGrid({
  onAddToCart,
  onOpenProduct,
  onToggleWishlist,
  isWishlisted,
  initialCategory = "",
  initialSearch = "",
  focusSearch = false,
}) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(initialSearch);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewImage, setQuickViewImage] = useState("");
  const [quickViewSize, setQuickViewSize] = useState("");
  const [quickViewQuantity, setQuickViewQuantity] = useState(1);
  const [addFlashId, setAddFlashId] = useState("");
  const [compareItems, setCompareItems] = useState([]);

  useEffect(() => {
    setCategory(initialCategory || "");
  }, [initialCategory]);

  useEffect(() => {
    setSearch(initialSearch || "");
  }, [initialSearch]);

  useEffect(() => {
    if (!focusSearch) return;

    const isMobileViewport = window.matchMedia("(max-width: 979px)").matches;
    if (isMobileViewport) {
      setMobileFiltersOpen(true);
      window.setTimeout(() => {
        const mobileInput = document.getElementById("mobile-search");
        if (mobileInput instanceof HTMLElement) {
          mobileInput.focus();
        }
      }, 80);
      return;
    }

    const node = document.getElementById("desktop-search");
    if (node instanceof HTMLElement) {
      node.focus();
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusSearch]);

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

  useEffect(() => {
    if (!addFlashId) return undefined;
    const timer = window.setTimeout(() => setAddFlashId(""), 900);
    return () => window.clearTimeout(timer);
  }, [addFlashId]);

  useEffect(() => {
    const hasOverlay = mobileFiltersOpen || Boolean(quickViewProduct);
    if (!hasOverlay) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFiltersOpen, quickViewProduct]);

  useEffect(() => {
    if (!mobileFiltersOpen && !quickViewProduct) return undefined;

    const onEscape = (event) => {
      if (event.key === "Escape") {
        setMobileFiltersOpen(false);
        setQuickViewProduct(null);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [mobileFiltersOpen, quickViewProduct]);

  const itemCountLabel = useMemo(() => {
    if (loading) return "Loading inventory...";
    return `${products.length} pairs available`;
  }, [loading, products.length]);

  const activeQuickViewGallery = useMemo(() => getGallery(quickViewProduct), [quickViewProduct]);
  const activeQuickViewSizes = useMemo(
    () => (Array.isArray(quickViewProduct?.sizeOptions) ? quickViewProduct.sizeOptions : []),
    [quickViewProduct]
  );

  const quickViewStock = useMemo(() => {
    if (!quickViewProduct) return 0;
    if (activeQuickViewSizes.length === 0) return totalStock(quickViewProduct);
    const selected = activeQuickViewSizes.find((option) => option.size === quickViewSize);
    return selected?.stock || 0;
  }, [activeQuickViewSizes, quickViewProduct, quickViewSize]);

  const quickViewMainImageProps = useMemo(
    () =>
      getResponsiveImageProps(quickViewImage || quickViewProduct?.image, {
        sizes: "(max-width: 760px) 94vw, 48vw",
      }),
    [quickViewImage, quickViewProduct]
  );

  const comparedRows = useMemo(
    () => compareItems.map((item) => {
      const productId = resolveProductId(item);
      const latest = products.find((row) => resolveProductId(row) === productId);
      return latest || item;
    }),
    [compareItems, products]
  );

  const openQuickView = (product) => {
    const gallery = getGallery(product);
    setQuickViewProduct(product);
    setQuickViewImage(gallery[0] || "");
    setQuickViewSize(getDefaultSize(product));
    setQuickViewQuantity(1);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    setQuickViewImage("");
    setQuickViewSize("");
    setQuickViewQuantity(1);
  };

  const clearFilters = () => {
    setSearch("");
    setBrand("");
    setCategory("");
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
  };

  const handleQuickAdd = (product, size) => {
    onAddToCart(product, {
      quantity: 1,
      size,
    });
    setAddFlashId(resolveProductId(product));
  };

  const applyQuickViewAdd = () => {
    if (!quickViewProduct) return;
    onAddToCart(quickViewProduct, {
      quantity: quickViewQuantity,
      size: quickViewSize,
    });
    closeQuickView();
  };

  const toggleCompare = (product) => {
    const productId = resolveProductId(product);
    setCompareItems((prev) => {
      const exists = prev.some((item) => resolveProductId(item) === productId);
      if (exists) {
        return prev.filter((item) => resolveProductId(item) !== productId);
      }

      if (prev.length >= 3) return prev;
      return [...prev, product];
    });
  };

  const clearCompare = () => setCompareItems([]);

  const buildFilterFields = (prefix = "desktop") => (
    <>
      <label htmlFor={`${prefix}-search`}>
        Search
        <input
          id={`${prefix}-search`}
          data-hk-search="true"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, brand, tag"
          aria-label="Search products"
        />
      </label>

      <label htmlFor={`${prefix}-brand`}>
        Brand
        <select
          id={`${prefix}-brand`}
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          aria-label="Filter by brand"
        >
          <option value="">All brands</option>
          {brands.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor={`${prefix}-category`}>
        Category
        <select
          id={`${prefix}-category`}
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
      </label>

      <label htmlFor={`${prefix}-sort`}>
        Sort
        <select
          id={`${prefix}-sort`}
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort products"
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="featured">Featured</option>
        </select>
      </label>

      <label htmlFor={`${prefix}-min-price`}>
        Min Price
        <input
          id={`${prefix}-min-price`}
          type="number"
          min="0"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
          placeholder="Min $"
          aria-label="Minimum price"
        />
      </label>

      <label htmlFor={`${prefix}-max-price`}>
        Max Price
        <input
          id={`${prefix}-max-price`}
          type="number"
          min="0"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          placeholder="Max $"
          aria-label="Maximum price"
        />
      </label>
    </>
  );

  return (
    <section id="drops" className="drops-section section-reveal">
      <div className="drops-header">
        <div>
          <p className="section-kicker">Seasonal release board</p>
          <h2 className="section-title">Latest Drops</h2>
        </div>

        <div className="drops-meta">
          <p className="section-subtitle">{itemCountLabel}</p>
          <button
            type="button"
            className="mobile-filter-trigger"
            onClick={() => setMobileFiltersOpen(true)}
          >
            Filters
          </button>
        </div>
      </div>

      {error && <p className="drops-error">{error}</p>}

      <div className="catalog-layout">
        <aside className="filter-sidebar" aria-label="Product filters">
          <div className="filter-sidebar-head">
            <p className="section-kicker">Refine</p>
            <button type="button" className="ghost-btn" onClick={clearFilters}>
              Reset
            </button>
          </div>
          <h3>Filter products</h3>
          <div className="filter-form">{buildFilterFields("desktop")}</div>
        </aside>

        <div>
          <div className="drops-grid">
            {loading
              ? Array.from({ length: 9 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="skeleton-card">
                    <div className="skeleton-image" />
                    <div className="skeleton-body">
                      <div className="skeleton-line skeleton-line-lg" />
                      <div className="skeleton-line skeleton-line-sm" />
                      <div className="skeleton-line skeleton-line-md" />
                      <div className="skeleton-line skeleton-line-sm" />
                    </div>
                  </div>
                ))
              : products.length === 0
                ? (
                  <div className="empty-state catalog-empty">
                    <p className="hero-kicker">No matching drops</p>
                    <h3>Try a broader filter combination</h3>
                    <p>
                      Clear one or two filters and refresh your search to reveal more
                      in-stock sneakers.
                    </p>
                    <button type="button" className="cta-secondary" onClick={clearFilters}>
                      Clear filters
                    </button>
                  </div>
                  )
                : products.map((product, index) => {
                    const productId = resolveProductId(product);
                    const stock = totalStock(product);
                    const defaultSize = getDefaultSize(product);
                    const gallery = getGallery(product);
                    const primaryImage = gallery[0] || product.image;
                    const secondaryImage = gallery[1] || "";
                    const primaryImageProps = getResponsiveImageProps(primaryImage, {
                      sizes: "(max-width: 640px) 92vw, (max-width: 980px) 44vw, 30vw",
                    });
                    const secondaryImageProps = getResponsiveImageProps(secondaryImage, {
                      sizes: "(max-width: 640px) 92vw, (max-width: 980px) 44vw, 30vw",
                    });
                    const swatches = getColorSwatches(product);
                    const sizePreview = getSizePreview(product);
                    const wished = Boolean(isWishlisted?.(productId));
                    const compared = compareItems.some((item) => resolveProductId(item) === productId);
                    const compareFull = compareItems.length >= 3 && !compared;

                    return (
                      <article
                        key={productId}
                        className="sneaker-card"
                        style={{ "--card-index": index + 1 }}
                      >
                        <div className="sneaker-media">
                          <button
                            type="button"
                            className={`wishlist-heart ${wished ? "active" : ""}`}
                            aria-label={`${wished ? "Remove" : "Add"} ${product.name} from wishlist`}
                            onClick={() => onToggleWishlist?.(product)}
                          >
                            ♥
                          </button>

                          <img
                            className="media-primary"
                            src={primaryImageProps.src}
                            srcSet={primaryImageProps.srcSet}
                            sizes={primaryImageProps.sizes}
                            alt={product.name}
                            loading={index < 4 ? "eager" : "lazy"}
                            decoding="async"
                          />
                          {secondaryImage && (
                            <img
                              className="media-secondary"
                              src={secondaryImageProps.src}
                              srcSet={secondaryImageProps.srcSet}
                              sizes={secondaryImageProps.sizes}
                              alt={`${product.name} alternate view`}
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                          {product.brand && <span className="brand-chip">{product.brand}</span>}
                          <span className="image-watermark image-watermark-card" aria-hidden="true">HYPEKICKS</span>
                        </div>

                        <div className="sneaker-body">
                          <div>
                            <h3 className="sneaker-name">{product.name}</h3>
                            <p className="sneaker-price">{formatPrice(product.price)}</p>
                            <p className={`stock-pill ${stock > 0 ? "in" : "out"}`}>
                              {stock > 0 ? `${stock} in stock` : "Out of stock"}
                            </p>
                          </div>

                          <div className="swatch-row" aria-label={`${product.name} color options`}>
                            {swatches.map((swatch, swatchIndex) => (
                              <span
                                key={`${productId}-swatch-${swatchIndex}`}
                                style={{ "--swatch-color": swatch }}
                              />
                            ))}
                          </div>

                          {sizePreview.length > 0 && (
                            <div className="size-preview-block" aria-label={`${product.name} sizes`}>
                              <p className="size-preview-label">Sizes</p>
                              <div className="size-chip-row">
                                {sizePreview.map((option) => (
                                  <span
                                    key={`${productId}-size-${option.size}`}
                                    className={option.stock > 0 ? "in" : "out"}
                                  >
                                    US {option.size}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="card-actions">
                            <button
                              type="button"
                              className="ghost-btn card-quick-view"
                              onClick={() => openQuickView(product)}
                            >
                              Quick view
                            </button>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => toggleCompare(product)}
                              disabled={compareFull}
                            >
                              {compared ? "Compared" : "Compare"}
                            </button>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => onOpenProduct(productId)}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="add-button"
                              disabled={stock <= 0}
                              onClick={() => handleQuickAdd(product, defaultSize)}
                            >
                              {addFlashId === productId ? "Added" : "Add"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
          </div>
        </div>
      </div>

      {comparedRows.length === 1 && (
        <div className="compare-hint" role="status">
          Select one more pair to activate side-by-side compare.
        </div>
      )}

      {comparedRows.length > 1 && (
        <section className="compare-panel section-reveal" aria-label="Compare sneakers">
          <div className="compare-head">
            <h3>Compare up to 3 pairs</h3>
            <button type="button" className="ghost-btn" onClick={clearCompare}>
              Clear
            </button>
          </div>

          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Spec</th>
                  {comparedRows.map((item) => (
                    <th key={`head-${resolveProductId(item)}`}>{item.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Price</td>
                  {comparedRows.map((item) => (
                    <td key={`price-${resolveProductId(item)}`}>{formatPrice(Number(item.price) || 0)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Weight</td>
                  {comparedRows.map((item) => (
                    <td key={`weight-${resolveProductId(item)}`}>{estimateWeight(item)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Category</td>
                  {comparedRows.map((item) => (
                    <td key={`category-${resolveProductId(item)}`}>
                      {renderComparisonValue(item.category || "Lifestyle")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Stock</td>
                  {comparedRows.map((item) => (
                    <td key={`stock-${resolveProductId(item)}`}>{totalStock(item)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Actions</td>
                  {comparedRows.map((item) => (
                    <td key={`action-${resolveProductId(item)}`}>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => onOpenProduct(resolveProductId(item))}
                      >
                        View
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div
        role="presentation"
        className={`sheet-overlay ${mobileFiltersOpen ? "open" : ""}`}
        onClick={() => setMobileFiltersOpen(false)}
      />

      <aside
        className={`filters-sheet ${mobileFiltersOpen ? "open" : ""}`}
        aria-hidden={!mobileFiltersOpen}
      >
        <header>
          <h3>Filter products</h3>
          <button type="button" onClick={() => setMobileFiltersOpen(false)}>
            Close
          </button>
        </header>
        <div className="filter-form">{buildFilterFields("mobile")}</div>
        <div className="filters-sheet-actions">
          <button type="button" className="ghost-btn" onClick={clearFilters}>
            Reset
          </button>
          <button type="button" className="cta-primary" onClick={() => setMobileFiltersOpen(false)}>
            Apply
          </button>
        </div>
      </aside>

      {quickViewProduct && (
        <>
          <div role="presentation" className="quick-view-overlay" onClick={closeQuickView} />
          <aside className="quick-view-modal" role="dialog" aria-modal="true" aria-label="Quick view">
            <button type="button" className="quick-view-close" onClick={closeQuickView}>
              Close
            </button>

            <div className="quick-view-grid">
              <div className="quick-view-gallery">
                <div className="quick-view-main-image">
                  <img
                    src={quickViewMainImageProps.src}
                    srcSet={quickViewMainImageProps.srcSet}
                    sizes={quickViewMainImageProps.sizes}
                    alt={quickViewProduct.name}
                    decoding="async"
                  />
                  <span className="image-watermark image-watermark-focus" aria-hidden="true">HYPEKICKS</span>
                </div>
                <div className="quick-view-thumbs">
                  {activeQuickViewGallery.map((image) => (
                    <button
                      key={image}
                      type="button"
                      className={quickViewImage === image ? "active" : ""}
                      onClick={() => setQuickViewImage(image)}
                    >
                      <img src={image} alt={`${quickViewProduct.name} thumbnail`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="quick-view-content">
                <div className="quick-view-top-row">
                  <p className="section-kicker">{quickViewProduct.brand || "HypeKicks"}</p>
                  <button
                    type="button"
                    className={`wishlist-heart ${isWishlisted?.(resolveProductId(quickViewProduct)) ? "active" : ""}`}
                    aria-label="Toggle wishlist"
                    onClick={() => onToggleWishlist?.(quickViewProduct)}
                  >
                    ♥
                  </button>
                </div>
                <h3>{quickViewProduct.name}</h3>
                <p className="featured-price">{formatPrice(quickViewProduct.price)}</p>
                <p className="featured-copy">
                  {quickViewProduct.description || "Premium build with comfort cushioning and bold styling."}
                </p>

                {activeQuickViewSizes.length > 0 && (
                  <div className="quick-view-sizes">
                    <p>Select size</p>
                    <div>
                      {activeQuickViewSizes.map((option) => (
                        <button
                          key={option.size}
                          type="button"
                          disabled={option.stock <= 0}
                          className={quickViewSize === option.size ? "active" : ""}
                          onClick={() => setQuickViewSize(option.size)}
                        >
                          US {option.size}
                          <small>{option.stock > 0 ? `${option.stock} left` : "Sold out"}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="quick-view-controls">
                  <label>
                    Qty
                    <input
                      type="number"
                      min="1"
                      max={Math.max(quickViewStock, 1)}
                      value={quickViewQuantity}
                      onChange={(event) =>
                        setQuickViewQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1)))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="cta-primary"
                    disabled={quickViewStock <= 0}
                    onClick={applyQuickViewAdd}
                  >
                    {quickViewStock > 0 ? "Add to cart" : "Out of stock"}
                  </button>
                  <button
                    type="button"
                    className="cta-secondary"
                    onClick={() => {
                      onOpenProduct(resolveProductId(quickViewProduct));
                      closeQuickView();
                    }}
                  >
                    Open full page
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
