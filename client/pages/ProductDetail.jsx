import { useEffect, useMemo, useState } from "react";
import api from "../src/lib/api";
import { buildRelatedProducts, findProductById, loadDemoCatalog } from "../src/lib/demoCatalog";

function currency(value = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function getInitialSize(product) {
  const options = Array.isArray(product?.sizeOptions) ? product.sizeOptions : [];
  const inStock = options.find((option) => option.stock > 0);
  return inStock?.size || options[0]?.size || "";
}

export default function ProductDetail({ productId, onAddToCart, onNavigate }) {
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      setLoading(true);
      setError("");
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

        setProduct(productData);
        setSelectedImage(images[0] || "");
        setSelectedSize(getInitialSize(productData));
        setRelated(relatedRes.data?.products || []);
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

          setProduct(demoProduct);
          setSelectedImage(demoImages[0] || "");
          setSelectedSize(getInitialSize(demoProduct));
          setRelated(buildRelatedProducts(demoCatalog, demoProduct, 4));
          setError("");
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
  }, [productId]);

  const sizeOptions = useMemo(
    () => (Array.isArray(product?.sizeOptions) ? product.sizeOptions : []),
    [product]
  );

  const inStockForSelectedSize = useMemo(() => {
    if (sizeOptions.length === 0) return Number(product?.totalStock) || 0;
    const match = sizeOptions.find((option) => option.size === selectedSize);
    return match?.stock || 0;
  }, [product?.totalStock, selectedSize, sizeOptions]);

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

  return (
    <section className="detail-shell">
      <article className="detail-card">
        <div className="detail-gallery">
          <div className="detail-main-image">
            <img src={selectedImage || product.image} alt={product.name} />
          </div>
          <div className="detail-thumbs">
            {gallery.map((image) => (
              <button
                key={image}
                type="button"
                className={selectedImage === image ? "active" : ""}
                onClick={() => setSelectedImage(image)}
              >
                <img src={image} alt={`${product.name} preview`} />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-content">
          <p className="section-kicker">{product.brand || "HypeKicks"}</p>
          <h2 className="detail-title">{product.name}</h2>
          <p className="detail-price">{currency(product.price)}</p>
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
                    {option.size}
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

          <button type="button" className="ghost-btn" onClick={() => onNavigate("/")}>
            Back to catalogue
          </button>
        </div>
      </article>

      <section className="related-section">
        <h3>Related pairs</h3>
        <div className="related-grid">
          {related.map((item) => (
            <button
              key={item._id}
              type="button"
              className="related-card"
              onClick={() => onNavigate(`/product/${item._id}`)}
            >
              <img src={item.image} alt={item.name} />
              <div>
                <p>{item.name}</p>
                <span>{currency(item.price)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
