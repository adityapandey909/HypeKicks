function currency(value = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function getDefaultSize(product) {
  const options = Array.isArray(product?.sizeOptions) ? product.sizeOptions : [];
  const inStock = options.find((option) => Number(option.stock) > 0);
  return inStock?.size || "";
}

export default function Wishlist({ items = [], onNavigate, onToggleWishlist, onAddToCart }) {
  return (
    <section className="wishlist-shell section-reveal">
      <div className="drops-header">
        <div>
          <p className="section-kicker">Saved collection</p>
          <h2 className="section-title">Your Wishlist</h2>
        </div>
        <p className="section-subtitle">{items.length} saved pairs</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state wishlist-empty">
          <h3>No saved sneakers yet</h3>
          <p>Tap the heart icon on any product to save it here.</p>
          <button type="button" className="cta-primary" onClick={() => onNavigate("/#drops")}>Browse drops</button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map((item) => (
            <article key={item.productId} className="wishlist-card">
              <button
                type="button"
                className="wishlist-heart active"
                aria-label={`Remove ${item.name} from wishlist`}
                onClick={() => onToggleWishlist(item)}
              >
                ♥
              </button>

              <img src={item.image} alt={item.name} loading="lazy" />
              <div>
                <p>{item.brand || "HypeKicks"}</p>
                <h3>{item.name}</h3>
                <strong>{currency(item.price)}</strong>
              </div>

              <div className="wishlist-actions">
                <button type="button" className="ghost-btn" onClick={() => onNavigate(`/product/${item.productId}`)}>
                  View details
                </button>
                <button
                  type="button"
                  className="add-button"
                  onClick={() =>
                    onAddToCart(
                      {
                        _id: item.productId,
                        name: item.name,
                        brand: item.brand,
                        image: item.image,
                        price: item.price,
                        sizeOptions: item.sizeOptions,
                      },
                      {
                        quantity: 1,
                        size: getDefaultSize(item),
                      }
                    )
                  }
                >
                  Add to cart
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
