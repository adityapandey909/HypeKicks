import { useEffect, useMemo, useState } from "react";
import RecentlyViewed from "../src/components/RecentlyViewed";
import api from "../src/lib/api";
import { buildRelatedProducts, findProductById, loadDemoCatalog } from "../src/lib/demoCatalog";
import { getResponsiveImageProps } from "../src/lib/media";

const fallbackReviewTemplates = [
  {
    author: "Jordan M.",
    title: "Perfect daily wear",
    body: "Great comfort and better in hand than photos. Sizing feels true for me.",
    rating: 5,
  },
  {
    author: "Ariana K.",
    title: "Clean colorway",
    body: "Really easy to style with streetwear and the build quality feels premium.",
    rating: 4,
  },
  {
    author: "Marcus T.",
    title: "Solid pickup",
    body: "Cushioning is responsive and the pair arrived fast with secure packaging.",
    rating: 5,
  },
];

function currency(value = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function resolveProductId(product) {
  return String(product?._id || product?.productId || "").trim();
}

function getInitialSize(product) {
  const options = Array.isArray(product?.sizeOptions) ? product.sizeOptions : [];
  const inStock = options.find((option) => option.stock > 0);
  return inStock?.size || options[0]?.size || "";
}

function totalStock(product) {
  if (Array.isArray(product?.sizeOptions) && product.sizeOptions.length > 0) {
    return product.sizeOptions.reduce((sum, option) => sum + (Number(option.stock) || 0), 0);
  }

  return Number(product?.totalStock) || 0;
}

function buildFallbackReviews(product) {
  const seed = String(resolveProductId(product) || product?.name || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return fallbackReviewTemplates.map((review, index) => ({
    id: `${resolveProductId(product)}-fallback-${index}`,
    userName: review.author,
    rating: Math.max(4, Math.min(5, review.rating - ((seed + index) % 2))),
    title: review.title,
    body: review.body,
    createdAt: new Date(Date.now() - (index + 2) * 86400000).toISOString(),
  }));
}

function normalizeReviewPayload(payload = {}) {
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  const summary = payload.summary || {};
  const average = Number(summary.average) || 0;
  const count = Number(summary.count) || reviews.length;

  return {
    reviews,
    summary: {
      average,
      count,
    },
  };
}

export default function ProductDetail({
  productId,
  onAddToCart,
  onNavigate,
  onToggleWishlist,
  isWishlisted,
  recentItems = [],
  currentUser = null,
  onRecordRecentlyViewed,
}) {
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, title: "", body: "" });

  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      setLoading(true);
      setError("");
      setReviewFeedback("");

      try {
        const [productRes, relatedRes] = await Promise.all([
          api.get(`/products/${productId}`),
          api.get(`/products/related/${productId}`),
        ]);

        if (!active) return;
        const productData = productRes.data?.product;
        const images =
          Array.isArray(productData?.images) && productData.images.length > 0
            ? productData.images
            : [productData?.image].filter(Boolean);

        let normalizedReviews = { reviews: [], summary: { average: 0, count: 0 } };
        try {
          const reviewsRes = await api.get(`/products/${productId}/reviews`);
          normalizedReviews = normalizeReviewPayload(reviewsRes.data);
        } catch {
          // non-blocking: product details should still load without reviews endpoint
        }

        setProduct(productData);
        setSelectedImage(images[0] || "");
        setSelectedSize(getInitialSize(productData));
        setRelated(relatedRes.data?.products || []);
        setReviews(normalizedReviews.reviews);
        setReviewSummary(normalizedReviews.summary);

        if (onRecordRecentlyViewed) {
          onRecordRecentlyViewed(productData);
        }
      } catch {
        if (!active) return;
        try {
          const demoCatalog = await loadDemoCatalog();
          const demoProduct = findProductById(demoCatalog, productId);
          if (!demoProduct) {
            setError("Could not load product details.");
            return;
          }

          const demoImages =
            Array.isArray(demoProduct.images) && demoProduct.images.length > 0
              ? demoProduct.images
              : [demoProduct.image].filter(Boolean);

          const fallbackReviews = buildFallbackReviews(demoProduct);

          setProduct(demoProduct);
          setSelectedImage(demoImages[0] || "");
          setSelectedSize(getInitialSize(demoProduct));
          setRelated(buildRelatedProducts(demoCatalog, demoProduct, 4));
          setReviews(fallbackReviews);
          setReviewSummary({
            average:
              fallbackReviews.length > 0
                ? Math.round(
                  (fallbackReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
                    fallbackReviews.length) *
                    10
                ) / 10
                : 0,
            count: fallbackReviews.length,
          });
          setError("");

          if (onRecordRecentlyViewed) {
            onRecordRecentlyViewed(demoProduct);
          }
        } catch {
          if (!active) return;
          setError("Could not load product details.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProduct();
    return () => {
      active = false;
    };
  }, [productId, onRecordRecentlyViewed]);

  const sizeOptions = useMemo(
    () => (Array.isArray(product?.sizeOptions) ? product.sizeOptions : []),
    [product]
  );

  const inStockForSelectedSize = useMemo(() => {
    if (sizeOptions.length === 0) return Number(product?.totalStock) || 0;
    const match = sizeOptions.find((option) => option.size === selectedSize);
    return match?.stock || 0;
  }, [product?.totalStock, selectedSize, sizeOptions]);

  const averageRating = useMemo(() => {
    if (reviewSummary.average > 0) return reviewSummary.average;
    if (!reviews.length) return 0;

    return (
      Math.round(
        (reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length) * 10
      ) / 10
    );
  }, [reviewSummary.average, reviews]);

  const reviewCount = useMemo(
    () => Number(reviewSummary.count) || reviews.length,
    [reviewSummary.count, reviews.length]
  );

  const recentWithoutCurrent = useMemo(
    () => recentItems.filter((item) => String(item.productId || "") !== String(productId || "")),
    [recentItems, productId]
  );

  const mainImageProps = useMemo(
    () =>
      getResponsiveImageProps(selectedImage || product?.image, {
        sizes: "(max-width: 760px) 96vw, 58vw",
      }),
    [selectedImage, product]
  );

  const submitReview = async () => {
    if (!currentUser) {
      onNavigate("/login");
      return;
    }

    const cleanBody = String(reviewDraft.body || "").trim();
    if (!cleanBody) {
      setReviewFeedback("Please write a short review before submitting.");
      return;
    }

    setReviewSubmitting(true);
    setReviewFeedback("");

    try {
      const res = await api.post(`/products/${productId}/reviews`, {
        rating: Number(reviewDraft.rating) || 5,
        title: reviewDraft.title,
        body: cleanBody,
      });

      const normalized = normalizeReviewPayload(res.data);
      setReviews(normalized.reviews);
      setReviewSummary(normalized.summary);
      setReviewDraft({ rating: 5, title: "", body: "" });
      setReviewFeedback("Thanks. Your review was saved.");
    } catch (submitError) {
      const serverMessage = submitError?.response?.data?.message;
      setReviewFeedback(serverMessage || "Could not submit review right now.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="detail-shell">
        <div className="detail-card skeleton-card">
          <div className="skeleton-image" />
          <div className="skeleton-body">
            <div className="skeleton-line skeleton-line-lg" />
            <div className="skeleton-line skeleton-line-md" />
            <div className="skeleton-line skeleton-line-sm" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="detail-shell">
        <div className="detail-card">
          <p className="drops-error">{error || "Product not found"}</p>
          <button type="button" className="auth-submit" onClick={() => onNavigate("/")}>
            Back to store
          </button>
        </div>
      </section>
    );
  }

  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image].filter(Boolean);

  const productIsWishlisted = Boolean(isWishlisted?.(resolveProductId(product)));
  const total = totalStock(product);

  return (
    <section className="detail-shell detail-shell-upgraded section-reveal">
      <article className="detail-showcase">
        <div className="detail-gallery detail-gallery-upgraded">
          <div className="detail-main-image detail-main-image-upgraded">
            <img
              src={mainImageProps.src}
              srcSet={mainImageProps.srcSet}
              sizes={mainImageProps.sizes}
              alt={product.name}
              decoding="async"
            />
            <span className="image-watermark" aria-hidden="true">HYPEKICKS</span>
          </div>
          <div className="detail-thumbs detail-thumbs-upgraded" role="list" aria-label="Product gallery">
            {gallery.map((image) => (
              <button
                key={image}
                type="button"
                role="listitem"
                className={selectedImage === image ? "active" : ""}
                onClick={() => setSelectedImage(image)}
              >
              <img src={image} alt={`${product.name} preview`} loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </div>

        <aside className="detail-buy-box" aria-label="Purchase options">
          <p className="section-kicker">{product.brand || "HypeKicks"}</p>
          <h1 className="detail-title">{product.name}</h1>
          <p className="detail-price">{currency(product.price)}</p>
          <p className={`stock-pill ${total > 0 ? "in" : "out"}`}>
            {total > 0 ? `${total} in stock` : "Out of stock"}
          </p>
          <p className="detail-description">
            {product.description || "Designed for everyday wear with premium comfort and standout styling."}
          </p>

          {sizeOptions.length > 0 && (
            <div className="size-grid">
              <p>Choose size</p>
              <div>
                {sizeOptions.map((option) => (
                  <button
                    key={option.size}
                    type="button"
                    disabled={option.stock <= 0}
                    className={selectedSize === option.size ? "active" : ""}
                    onClick={() => setSelectedSize(option.size)}
                  >
                    US {option.size}
                    <small>{option.stock > 0 ? `${option.stock} left` : "Sold out"}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions">
            <label>
              Qty
              <input
                type="number"
                min="1"
                max={Math.max(inStockForSelectedSize, 1)}
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1)))
                }
              />
            </label>
            <button
              type="button"
              className="auth-submit"
              disabled={inStockForSelectedSize <= 0}
              onClick={() =>
                onAddToCart(product, {
                  quantity,
                  size: selectedSize,
                })
              }
            >
              {inStockForSelectedSize > 0 ? "Add to cart" : "Out of stock"}
            </button>
          </div>

          <div className="detail-secondary-actions">
            <button
              type="button"
              className={`wishlist-heart ${productIsWishlisted ? "active" : ""}`}
              onClick={() => onToggleWishlist?.(product)}
            >
              {productIsWishlisted ? "♥ Saved" : "♡ Save"}
            </button>
            <button type="button" className="ghost-btn" onClick={() => onNavigate("/")}>
              Back to catalogue
            </button>
          </div>

          <ul className="detail-trust-points">
            <li>Verified authentic pairs</li>
            <li>Secure checkout with Stripe</li>
            <li>Easy returns within 14 days</li>
          </ul>
        </aside>
      </article>

      <section className="review-section" aria-label="Product reviews">
        <div className="review-head">
          <h3>Reviews</h3>
          <p>
            <strong>{averageRating}</strong> / 5 from {reviewCount} buyers
          </p>
        </div>

        <div className="review-form">
          <h4>Share your review</h4>
          {currentUser ? (
            <>
              <label>
                Rating
                <select
                  value={reviewDraft.rating}
                  onChange={(event) =>
                    setReviewDraft((prev) => ({
                      ...prev,
                      rating: Number(event.target.value) || 5,
                    }))
                  }
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Great</option>
                  <option value="3">3 - Good</option>
                  <option value="2">2 - Fair</option>
                  <option value="1">1 - Poor</option>
                </select>
              </label>
              <label>
                Title
                <input
                  type="text"
                  value={reviewDraft.title}
                  onChange={(event) =>
                    setReviewDraft((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Short review title"
                />
              </label>
              <label>
                Review
                <textarea
                  value={reviewDraft.body}
                  onChange={(event) =>
                    setReviewDraft((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                  placeholder="How did this pair fit and feel?"
                />
              </label>
              <button
                type="button"
                className="cta-primary"
                disabled={reviewSubmitting}
                onClick={submitReview}
              >
                {reviewSubmitting ? "Submitting..." : "Submit review"}
              </button>
            </>
          ) : (
            <p className="section-subtitle">
              Please <button type="button" className="inline-link" onClick={() => onNavigate("/login")}>login</button> to write a review.
            </p>
          )}
          {reviewFeedback && <p className="review-feedback">{reviewFeedback}</p>}
        </div>

        <div className="review-grid">
          {reviews.length === 0 ? (
            <div className="empty-state">
              <h3>No reviews yet</h3>
              <p>Be the first to share sizing and comfort feedback for this pair.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <article key={review.id || `${review.userName}-${review.createdAt}`} className="review-card">
                <header>
                  <p>{review.userName || "HypeKicks Member"}</p>
                  <span>{"★".repeat(Number(review.rating) || 0)}{"☆".repeat(5 - (Number(review.rating) || 0))}</span>
                </header>
                <h4>{review.title || "Verified purchase"}</h4>
                <p>{review.body}</p>
                <small>
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                    : ""}
                </small>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="related-section">
        <h3>Related pairs</h3>
        <div className="related-grid">
          {related.map((item) => (
            <button
              key={resolveProductId(item)}
              type="button"
              className="related-card"
              onClick={() => onNavigate(`/product/${resolveProductId(item)}`)}
            >
              <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
              <div>
                <p>{item.name}</p>
                <span>{currency(item.price)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <RecentlyViewed
        items={recentWithoutCurrent}
        onOpenProduct={(id) => onNavigate(`/product/${id}`)}
        onAddToCart={onAddToCart}
        title="Recently viewed pairs"
        subtitle="Your last viewed silhouettes"
      />
    </section>
  );
}
