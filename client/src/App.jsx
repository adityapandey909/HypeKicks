import { useCallback, useEffect, useMemo, useState } from "react";
import Admin from "../pages/Admin";
import Checkout from "../pages/Checkout";
import CheckoutCancel from "../pages/CheckoutCancel";
import CheckoutSuccess from "../pages/CheckoutSuccess";
import Login from "../pages/login";
import Orders from "../pages/Orders";
import ProductDetail from "../pages/ProductDetail";
import PolicyPage from "../pages/PolicyPage";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";
import Wishlist from "../pages/Wishlist";
import CartDrawer from "./components/CartDrawer";
import FeaturedCarousel from "./components/FeaturedCarousel";
import LookbookSection from "./components/LookbookSection";
import MobileBottomNav from "./components/MobileBottomNav";
import Navbar from "./components/Navbar";
import ProductGrid from "./components/ProductGrid";
import PromoBanner from "./components/PromoBanner";
import RecentlyViewed from "./components/RecentlyViewed";
import StoreFooter from "./components/StoreFooter";
import TrustStrip from "./components/TrustStrip";
import { clearAuth, getAuthState, saveAuth } from "./lib/auth";
import { computeSubtotal, itemKey, loadCart, saveCart } from "./lib/cart";
import { loadDemoCatalog } from "./lib/demoCatalog";
import api from "./lib/api";
import { listenRecentlyViewed, loadRecentlyViewed, pushRecentlyViewed } from "./lib/recentlyViewed";
import { applyTheme, loadThemePreference, saveThemePreference } from "./lib/theme";
import { loadWishlist, saveWishlist, toggleWishlistItem, wishlistHas } from "./lib/wishlist";

const heroMetrics = [
  { value: "1.2k+", label: "Verified pairs in stock" },
  { value: "48h", label: "Fast nationwide dispatch" },
  { value: "4.9/5", label: "Average member rating" },
];

const heroEditorialCards = [
  {
    id: "rotation",
    label: "Rotation 01",
    title: "Street Precision",
    image: "catalog/shoes/shoe-03.svg",
  },
  {
    id: "performance",
    label: "Rotation 02",
    title: "Performance Lift",
    image: "catalog/shoes/shoe-08.svg",
  },
  {
    id: "weekend",
    label: "Rotation 03",
    title: "Weekend Uniform",
    image: "catalog/shoes/shoe-12.svg",
  },
];

function currentRoute() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

function totalStock(product) {
  if (Array.isArray(product?.sizeOptions) && product.sizeOptions.length > 0) {
    return product.sizeOptions.reduce((sum, option) => sum + (Number(option.stock) || 0), 0);
  }
  return Number(product?.totalStock) || 0;
}

function ProtectedBlock({ title, message, actionLabel, onAction }) {
  return (
    <section className="checkout-shell">
      <div className="auth-card">
        <p className="auth-kicker">{title}</p>
        <p className="auth-error">{message}</p>
        <button type="button" className="auth-submit" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const [route, setRoute] = useState(currentRoute());
  const [auth, setAuth] = useState(getAuthState());
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState(loadCart());
  const [wishlistItems, setWishlistItems] = useState(loadWishlist());
  const [recentItems, setRecentItems] = useState(loadRecentlyViewed());
  const [themeMode, setThemeMode] = useState(() => loadThemePreference());
  const [cartPulse, setCartPulse] = useState(false);
  const [cartFeedback, setCartFeedback] = useState("");
  const [searchProducts, setSearchProducts] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute());
    const onUnauthorized = () => {
      clearAuth();
      setAuth({ token: "", user: null });
      setRoute(currentRoute());
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("auth:unauthorized", onUnauthorized);
    };
  }, []);

  useEffect(() => {
    saveCart(cartItems);
  }, [cartItems]);

  useEffect(() => {
    if (auth.token) return;
    saveWishlist(wishlistItems);
  }, [wishlistItems, auth.token]);

  useEffect(() => {
    applyTheme(themeMode);
    saveThemePreference(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (auth.token) return undefined;
    setRecentItems(loadRecentlyViewed());
    const stopListening = listenRecentlyViewed(() => setRecentItems(loadRecentlyViewed()));
    return stopListening;
  }, [auth.token]);

  useEffect(() => {
    let active = true;

    const syncCollections = async () => {
      if (!auth.token) {
        if (!active) return;
        setWishlistItems(loadWishlist());
        setRecentItems(loadRecentlyViewed());
        return;
      }

      try {
        const [wishlistRes, recentRes] = await Promise.all([
          api.get("/auth/wishlist"),
          api.get("/auth/recently-viewed"),
        ]);

        if (!active) return;
        setWishlistItems(Array.isArray(wishlistRes.data?.items) ? wishlistRes.data.items : []);
        setRecentItems(Array.isArray(recentRes.data?.items) ? recentRes.data.items : []);
      } catch {
        if (!active) return;
        setWishlistItems(loadWishlist());
        setRecentItems(loadRecentlyViewed());
      }
    };

    syncCollections();
    return () => {
      active = false;
    };
  }, [auth.token]);

  useEffect(() => {
    let active = true;

    const loadSearchProducts = async () => {
      try {
        const response = await api.get("/products", {
          params: {
            sort: "featured",
            limit: 120,
          },
        });

        if (!active) return;
        const payload = response.data;
        const rows = Array.isArray(payload) ? payload : payload.products || [];
        setSearchProducts(rows);
      } catch {
        if (!active) return;
        try {
          const demoRows = await loadDemoCatalog();
          if (!active) return;
          setSearchProducts(demoRows);
        } catch {
          if (!active) return;
          setSearchProducts([]);
        }
      }
    };

    loadSearchProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const refreshSession = async () => {
      if (!auth.token) return;
      try {
        const res = await api.get("/auth/me");
        if (!active) return;
        setAuth((prev) => {
          const updated = { token: prev.token, user: res.data?.user || prev.user };
          saveAuth(updated);
          return updated;
        });
      } catch {
        if (!active) return;
        clearAuth();
        setAuth({ token: "", user: null });
      }
    };

    refreshSession();
    return () => {
      active = false;
    };
  }, [auth.token, route.pathname, route.search]);

  useEffect(() => {
    const onScroll = () => {
      const root = document.documentElement;
      const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
      const progress = maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0;
      setScrollProgress(progress);
      setShowBackToTop(window.scrollY > 520);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const subtotal = useMemo(() => computeSubtotal(cartItems), [cartItems]);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const lowStockCount = useMemo(
    () => searchProducts.filter((product) => {
      const stock = totalStock(product);
      return stock > 0 && stock <= 3;
    }).length,
    [searchProducts]
  );

  useEffect(() => {
    if (!cartFeedback) return undefined;
    const timer = window.setTimeout(() => setCartFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [cartFeedback]);

  useEffect(() => {
    if (cartCount <= 0) return undefined;
    setCartPulse(true);
    const timer = window.setTimeout(() => setCartPulse(false), 420);
    return () => window.clearTimeout(timer);
  }, [cartCount]);

  const navigate = (to) => {
    window.history.pushState({}, "", to);
    setRoute(currentRoute());
    setCartOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onAuthSuccess = ({ token, user }) => {
    const next = { token, user };
    saveAuth(next);
    setAuth(next);
  };

  const logout = async () => {
    try {
      if (auth.token) {
        await api.post("/auth/logout");
      }
    } catch {
      // no-op
    } finally {
      clearAuth();
      setAuth({ token: "", user: null });
      navigate("/login");
    }
  };

  const addToCart = useCallback((product, options = {}) => {
    const productId = String(product?._id || product?.productId || "").trim();
    if (!productId) return;

    const selectedSize = options.size || "";
    const quantity = Math.max(1, Number(options.quantity) || 1);
    const cartItem = {
      productId,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: Number(product.price) || 0,
      size: selectedSize,
      quantity,
    };

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => itemKey(item) === itemKey(cartItem));
      if (existingIndex === -1) return [...prev, cartItem];

      return prev.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    });

    const sizeLabel = selectedSize ? ` • Size ${selectedSize}` : "";
    setCartFeedback(`Added ${quantity} × ${product.name}${sizeLabel}`);
    setCartOpen(true);
  }, []);

  const toggleWishlist = useCallback(async (product) => {
    const productId = String(product?._id || product?.productId || "").trim();
    if (!productId) return;

    if (auth.token) {
      try {
        const res = await api.put("/auth/wishlist/toggle", { productId });
        setWishlistItems(Array.isArray(res.data?.items) ? res.data.items : []);
        return;
      } catch {
        // fallback to guest-local behavior if API request fails
      }
    }

    setWishlistItems((prev) => toggleWishlistItem(prev, product));
  }, [auth.token]);

  const isWishlisted = (productId) => wishlistHas(wishlistItems, productId);

  const recordRecentlyViewed = useCallback(async (product) => {
    const productId = String(product?._id || product?.productId || "").trim();
    if (!productId) return;

    if (auth.token) {
      try {
        const res = await api.post("/auth/recently-viewed", { productId });
        setRecentItems(Array.isArray(res.data?.items) ? res.data.items : []);
        return;
      } catch {
        // fallback to local history on request failure
      }
    }

    pushRecentlyViewed(product);
  }, [auth.token]);

  const decrementCartItem = (target) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          itemKey(item) === itemKey(target)
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const incrementCartItem = (target) => {
    setCartItems((prev) =>
      prev.map((item) =>
        itemKey(item) === itemKey(target)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const removeCartItem = (target) => {
    setCartItems((prev) => prev.filter((item) => itemKey(item) !== itemKey(target)));
  };

  const pathname = route.pathname;
  const searchParams = new URLSearchParams(route.search);
  const initialCategory = searchParams.get("category") || "";
  const initialSearch = searchParams.get("search") || "";
  const focusSearch = searchParams.get("focus") === "search";

  let content = null;
  if (pathname === "/login") {
    content = <Login onAuthSuccess={onAuthSuccess} onNavigate={navigate} />;
  } else if (pathname === "/verify-email") {
    content = <VerifyEmail onNavigate={navigate} />;
  } else if (pathname === "/reset-password") {
    content = <ResetPassword onNavigate={navigate} />;
  } else if (pathname === "/wishlist") {
    content = (
      <Wishlist
        items={wishlistItems}
        onNavigate={navigate}
        onToggleWishlist={toggleWishlist}
        onAddToCart={addToCart}
      />
    );
  } else if (
    pathname === "/returns" ||
    pathname === "/shipping" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/faq" ||
    pathname === "/contact"
  ) {
    content = <PolicyPage pathname={pathname} onNavigate={navigate} />;
  } else if (pathname.startsWith("/product/")) {
    const productId = pathname.split("/product/")[1];
    content = (
      <ProductDetail
        productId={productId}
        onAddToCart={addToCart}
        onNavigate={navigate}
        onToggleWishlist={toggleWishlist}
        isWishlisted={isWishlisted}
        recentItems={recentItems}
        currentUser={auth.user}
        onRecordRecentlyViewed={recordRecentlyViewed}
      />
    );
  } else if (pathname === "/checkout") {
    content = auth.user ? (
      <Checkout
        cartItems={cartItems}
        subtotal={subtotal}
        user={auth.user}
        onNavigate={navigate}
      />
    ) : (
      <ProtectedBlock
        title="Checkout"
        message="Please login before proceeding to checkout."
        actionLabel="Go to login"
        onAction={() => navigate("/login")}
      />
    );
  } else if (pathname === "/checkout/success") {
    content = <CheckoutSuccess onNavigate={navigate} onCartCleared={() => setCartItems([])} />;
  } else if (pathname === "/checkout/cancel") {
    content = <CheckoutCancel onNavigate={navigate} />;
  } else if (pathname === "/orders") {
    content = auth.user ? (
      <Orders onNavigate={navigate} />
    ) : (
      <ProtectedBlock
        title="Orders"
        message="Please login to view your order history."
        actionLabel="Go to login"
        onAction={() => navigate("/login")}
      />
    );
  } else if (pathname === "/admin") {
    content =
      auth.user?.role === "admin" ? (
        <Admin onNavigate={navigate} />
      ) : (
        <ProtectedBlock
          title="Admin"
          message="Admin access is required to view this page."
          actionLabel="Back to store"
          onAction={() => navigate("/")}
        />
      );
  } else {
    content = (
      <>
        <PromoBanner lowStockCount={lowStockCount} />

        <section className="hero-panel section-reveal">
          <div className="hero-layout">
            <div className="hero-copy-block">
              <p className="hero-kicker">Curated Sneaker Destination</p>
              <h2 className="hero-title">
                Statement kicks for the street and beyond.
              </h2>
              <p className="hero-copy">
                HypeKicks combines limited drops with timeless silhouettes so your
                collection always feels current, wearable, and premium.
              </p>
              <div className="hero-actions">
                <button type="button" className="cta-primary" onClick={() => navigate("/#drops")}>
                  Shop latest arrivals
                </button>
                <button type="button" className="cta-secondary" onClick={() => navigate("/checkout")}>
                  Go to checkout
                </button>
              </div>

              <ul className="hero-metrics">
                {heroMetrics.map((metric) => (
                  <li key={metric.label} className="metric-card">
                    <p className="metric-value">{metric.value}</p>
                    <p className="metric-label">{metric.label}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hero-visual" aria-hidden="true">
              {heroEditorialCards.map((card) => (
                <article key={card.id} className="hero-visual-card">
                  <img src={`${import.meta.env.BASE_URL}${card.image}`} alt="" loading="lazy" decoding="async" />
                  <div>
                    <p>{card.label}</p>
                    <h3>{card.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <FeaturedCarousel
          onAddToCart={addToCart}
          onOpenProduct={(id) => navigate(`/product/${id}`)}
        />

        <TrustStrip />

        <RecentlyViewed
          items={recentItems}
          onOpenProduct={(id) => navigate(`/product/${id}`)}
          onAddToCart={addToCart}
          title="Recently viewed"
          subtitle="Your latest sneaker history"
        />

        <ProductGrid
          onAddToCart={addToCart}
          onOpenProduct={(id) => navigate(`/product/${id}`)}
          onToggleWishlist={toggleWishlist}
          isWishlisted={isWishlisted}
          initialCategory={initialCategory}
          initialSearch={initialSearch}
          focusSearch={focusSearch}
        />

        <LookbookSection onNavigate={navigate} />

        <StoreFooter onNavigate={navigate} />
      </>
    );
  }

  return (
    <div className="store-shell">
      <div className="scroll-progress" aria-hidden="true">
        <span
          className="scroll-progress-bar"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      <a className="skip-link" href="#main-content">Skip to content</a>

      <div className="noise-layer" aria-hidden="true" />
      <div className="blob blob-one" aria-hidden="true" />
      <div className="blob blob-two" aria-hidden="true" />

      <Navbar
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        user={auth.user}
        onLogout={logout}
        onNavigate={navigate}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        cartPulse={cartPulse}
        wishlistCount={wishlistItems.length}
        searchProducts={searchProducts}
      />

      <main className="store-main" id="main-content">{content}</main>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        subtotal={subtotal}
        onIncrement={incrementCartItem}
        onDecrement={decrementCartItem}
        onRemove={removeCartItem}
        onClear={() => setCartItems([])}
        onCheckout={() => navigate("/checkout")}
        onAddRecommendation={addToCart}
        onOpenProduct={(id) => navigate(`/product/${id}`)}
      />

      <MobileBottomNav
        currentPath={pathname}
        cartCount={cartCount}
        wishlistCount={wishlistItems.length}
        user={auth.user}
        onNavigate={navigate}
        onCartClick={() => setCartOpen(true)}
      />

      {cartFeedback && (
        <div className="cart-toast" role="status" aria-live="polite">
          {cartFeedback}
        </div>
      )}

      <button
        type="button"
        className={`back-to-top ${showBackToTop ? "visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        Top
      </button>
    </div>
  );
}
