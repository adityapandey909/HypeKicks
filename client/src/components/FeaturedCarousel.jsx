import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { loadDemoCatalog } from "../lib/demoCatalog";
import { getResponsiveImageProps } from "../lib/media";

function formatPrice(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function totalStock(product) {
  if (Array.isArray(product?.sizeOptions) && product.sizeOptions.length > 0) {
    return product.sizeOptions.reduce((sum, option) => sum + (Number(option.stock) || 0), 0);
  }
  return Number(product?.totalStock) || 0;
}

function getDefaultSize(product) {
  const available = Array.isArray(product?.sizeOptions)
    ? product.sizeOptions.find((option) => option.stock > 0)
    : null;

  return available?.size || "";
}

function buildFeaturedRows(source = []) {
  const rows = Array.isArray(source) ? source : [];
  return rows
    .filter((product) => totalStock(product) > 0)
    .sort((a, b) => {
      const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDiff !== 0) return featuredDiff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })
    .slice(0, 6);
}

export default function FeaturedCarousel({ onAddToCart, onOpenProduct }) {
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadSlides = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/products", {
          params: {
            sort: "featured",
            limit: 30,
          },
        });

        if (!active) return;
        const payload = res.data;
        const rows = Array.isArray(payload) ? payload : payload.products || [];
        setSlides(buildFeaturedRows(rows));
      } catch {
        if (!active) return;
        try {
          const demoRows = await loadDemoCatalog();
          if (!active) return;
          setSlides(buildFeaturedRows(demoRows));
          setError("Showing featured demo drops.");
        } catch {
          if (!active) return;
          setSlides([]);
          setError("Could not load featured drops.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSlides();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5200);

    return () => {
      window.clearInterval(timer);
    };
  }, [slides.length]);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  const activeSlide = slides[activeIndex] || null;
  const gallery = useMemo(() => {
    if (!activeSlide) return [];
    if (Array.isArray(activeSlide.images) && activeSlide.images.length > 0) {
      return activeSlide.images.filter(Boolean);
    }
    return [activeSlide.image].filter(Boolean);
  }, [activeSlide]);

  const activeImage = gallery[0] || activeSlide?.image || "";
  const activeImageProps = getResponsiveImageProps(activeImage, {
    sizes: "(max-width: 760px) 96vw, 56vw",
  });

  if (loading) {
    return (
      <section className="featured-carousel" id="featured">
        <div className="featured-skeleton">
          <div className="featured-skeleton-media" />
          <div className="featured-skeleton-body">
            <div className="skeleton-line skeleton-line-lg" />
            <div className="skeleton-line skeleton-line-md" />
            <div className="skeleton-line skeleton-line-sm" />
            <div className="featured-skeleton-actions">
              <div className="skeleton-line skeleton-line-sm" />
              <div className="skeleton-line skeleton-line-sm" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!activeSlide) {
    return (
      <section className="featured-carousel" id="featured">
        <div className="empty-state featured-empty-state">
          <h3>Featured drops are warming up</h3>
          <p>Publish products to spotlight premium releases here.</p>
          {error && <p className="section-subtitle">{error}</p>}
        </div>
      </section>
    );
  }

  const stock = totalStock(activeSlide);
  const defaultSize = getDefaultSize(activeSlide);

  return (
    <section className="featured-carousel section-reveal" id="featured">
      <div className="featured-frame">
        <button
          type="button"
          className="carousel-nav prev"
          aria-label="Previous featured pair"
          onClick={() => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)}
        >
          ‹
        </button>

        <div className="featured-media">
          <img
            src={activeImageProps.src}
            srcSet={activeImageProps.srcSet}
            sizes={activeImageProps.sizes}
            alt={activeSlide.name}
            decoding="async"
          />
          <span className="image-watermark" aria-hidden="true">HYPEKICKS</span>
          <div className="featured-pills">
            <span>{activeSlide.brand || "HypeKicks"}</span>
            <span>{stock} in stock</span>
          </div>
        </div>

        <div className="featured-content">
          <p className="hero-kicker">Featured spotlight</p>
          <h3>{activeSlide.name}</h3>
          <p className="featured-copy">
            {activeSlide.description || "Handpicked release with premium materials and all-day comfort."}
          </p>
          <p className="featured-price">{formatPrice(activeSlide.price)}</p>

          <div className="featured-actions">
            <button
              type="button"
              className="cta-primary"
              disabled={stock <= 0}
              onClick={() =>
                onAddToCart(activeSlide, {
                  quantity: 1,
                  size: defaultSize,
                })
              }
            >
              {stock > 0 ? "Quick add" : "Sold out"}
            </button>
            <button
              type="button"
              className="cta-secondary"
              onClick={() => onOpenProduct(activeSlide._id)}
            >
              View pair
            </button>
          </div>

          <div className="carousel-dots" role="tablist" aria-label="Featured drops">
            {slides.map((slide, index) => (
              <button
                key={slide._id || slide.slug || slide.name}
                type="button"
                className={index === activeIndex ? "active" : ""}
                aria-label={`Show ${slide.name}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>

          {error && <p className="featured-note">{error}</p>}
        </div>

        <button
          type="button"
          className="carousel-nav next"
          aria-label="Next featured pair"
          onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
        >
          ›
        </button>
      </div>
    </section>
  );
}
