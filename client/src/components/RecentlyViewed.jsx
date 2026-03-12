import { getResponsiveImageProps } from "../lib/media";

function currency(value = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

export default function RecentlyViewed({
  items = [],
  onOpenProduct,
  onAddToCart,
  title = "Recently viewed",
  subtitle = "Pick up where you left off",
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="recent-strip section-reveal" aria-label={title}>
      <div className="recent-head">
        <div>
          <p className="section-kicker">Smart history</p>
          <h3>{title}</h3>
        </div>
        <p className="section-subtitle">{subtitle}</p>
      </div>

      <div className="recent-row">
        {items.slice(0, 8).map((item) => {
          const imageProps = getResponsiveImageProps(item.image, {
            sizes: "(max-width: 640px) 80vw, 240px",
          });

          return (
            <article key={item.productId} className="recent-card">
              <img
                src={imageProps.src}
                srcSet={imageProps.srcSet}
                sizes={imageProps.sizes}
                alt={item.name}
                loading="lazy"
                decoding="async"
              />
            <div>
              <p>{item.name}</p>
              <span>{currency(item.price)}</span>
            </div>
            <div className="recent-actions">
              <button type="button" className="ghost-btn" onClick={() => onOpenProduct(item.productId)}>
                View
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
                    },
                    {
                      quantity: 1,
                      size: "",
                    }
                  )
                }
              >
                Add
              </button>
            </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
