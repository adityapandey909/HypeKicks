import { useEffect, useState } from "react";
import api from "../lib/api";
import { loadDemoCatalog } from "../lib/demoCatalog";
import { getResponsiveImageProps } from "../lib/media";

function currency(value = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function resolveProductId(product) {
  return String(product?._id || product?.productId || "").trim();
}

function totalStock(product) {
  if (Array.isArray(product?.sizeOptions) && product.sizeOptions.length > 0) {
    return product.sizeOptions.reduce((sum, option) => sum + (Number(option.stock) || 0), 0);
  }

  return Number(product?.totalStock) || 0;
}

function getDefaultSize(product) {
  const options = Array.isArray(product?.sizeOptions) ? product.sizeOptions : [];
  const inStock = options.find((option) => Number(option.stock) > 0);
  return inStock?.size || "";
}

export default function CartDrawer({
  open,
  onClose,
  cartItems,
  subtotal,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onCheckout,
  onAddRecommendation,
  onOpenProduct,
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  useEffect(() => {
    if (!open || cartItems.length > 0) return;

    let active = true;

    const loadRecommendations = async () => {
      setRecommendationsLoading(true);
      setRecommendationsError("");
      try {
        const response = await api.get("/products", {
          params: {
            sort: "featured",
            limit: 12,
          },
        });

        if (!active) return;
        const payload = response.data;
        const rows = Array.isArray(payload) ? payload : payload.products || [];
        setRecommendations(rows.filter((product) => totalStock(product) > 0).slice(0, 3));
      } catch {
        if (!active) return;
        try {
          const demoProducts = await loadDemoCatalog();
          if (!active) return;
          setRecommendations(demoProducts.filter((product) => totalStock(product) > 0).slice(0, 3));
        } catch {
          if (!active) return;
          setRecommendations([]);
          setRecommendationsError("Could not load recommendations right now.");
        }
      } finally {
        if (active) setRecommendationsLoading(false);
      }
    };

    loadRecommendations();

    return () => {
      active = false;
    };
  }, [open, cartItems.length]);

  return (
    <>
      <div
        role="presentation"
        className={`drawer-overlay ${open ? "open" : ""}`}
        onClick={onClose}
      />

      <aside className={`cart-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <header className="cart-drawer-header">
          <h3>Your Cart</h3>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-empty-badge">HK</span>
            <h4>Your cart is waiting</h4>
            <p>Add a pair and start your checkout.</p>
            <button type="button" className="ghost-btn" onClick={onClose}>
              Browse drops
            </button>

            {recommendationsLoading && (
              <p className="section-subtitle">Loading recommendations...</p>
            )}
            {!recommendationsLoading && recommendationsError && (
              <p className="section-subtitle">{recommendationsError}</p>
            )}
            {!recommendationsLoading && !recommendationsError && recommendations.length === 0 && (
              <p className="section-subtitle">No recommendations available yet.</p>
            )}

            {recommendations.length > 0 && (
              <div className="cart-cross-sell" aria-label="Recommended pairs">
                <p className="section-kicker">You may also like</p>
                {recommendations.map((product) => {
                  const imageProps = getResponsiveImageProps(product.image, {
                    sizes: "80px",
                    widths: [120, 240, 320],
                  });

                  return (
                    <article key={resolveProductId(product)}>
                      <img
                        src={imageProps.src}
                        srcSet={imageProps.srcSet}
                        sizes={imageProps.sizes}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                      />
                    <div>
                      <h5>{product.name}</h5>
                      <span>{currency(product.price)}</span>
                    </div>
                    <div className="cart-cross-actions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => onOpenProduct?.(resolveProductId(product))}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="add-button"
                        onClick={() =>
                          onAddRecommendation?.(product, {
                            quantity: 1,
                            size: getDefaultSize(product),
                          })
                        }
                      >
                        Add
                      </button>
                    </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <article key={`${item.productId}-${item.size || "default"}`} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div className="cart-item-body">
                    <h4>{item.name}</h4>
                    <p>
                      {item.size ? `Size ${item.size}` : "Standard"} • {currency(item.price)}
                    </p>
                    <div className="qty-row">
                      <button type="button" onClick={() => onDecrement(item)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onIncrement(item)}>
                        +
                      </button>
                    </div>
                    <button type="button" className="remove-link" onClick={() => onRemove(item)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <footer className="cart-footer">
              <div className="cart-total">
                <span>Subtotal</span>
                <strong>{currency(subtotal)}</strong>
              </div>
              <button type="button" className="checkout-btn" onClick={onCheckout}>
                Go to checkout
              </button>
              <button type="button" className="clear-btn" onClick={onClear}>
                Clear cart
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
