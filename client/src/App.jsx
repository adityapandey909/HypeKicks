import { useEffect, useMemo, useState } from "react";
import CartDrawer from "./components/CartDrawer";
import Navbar from "./components/Navbar";
import ProductGrid from "./components/ProductGrid";
import api from "./lib/api";
import { clearAuth, getAuthState, saveAuth } from "./lib/auth";
import { computeSubtotal, itemKey, loadCart, saveCart } from "./lib/cart";
import { applyTheme, loadThemePreference, saveThemePreference } from "./lib/theme";
import Admin from "../pages/Admin";
import Checkout from "../pages/Checkout";
import CheckoutCancel from "../pages/CheckoutCancel";
import CheckoutSuccess from "../pages/CheckoutSuccess";
import Login from "../pages/login";
import Orders from "../pages/Orders";
import ProductDetail from "../pages/ProductDetail";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";

const heroMetrics = [
  { value: "1.2k+", label: "Verified pairs in stock" },
  { value: "48h", label: "Fast nationwide dispatch" },
  { value: "4.9/5", label: "Average member rating" },
];

function currentRoute() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
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
  const [themeMode, setThemeMode] = useState(() => loadThemePreference());

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
    applyTheme(themeMode);
    saveThemePreference(themeMode);
  }, [themeMode]);

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

  const subtotal = useMemo(() => computeSubtotal(cartItems), [cartItems]);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const navigate = (to) => {
    window.history.pushState({}, "", to);
    setRoute(currentRoute());
    setCartOpen(false);
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

  const addToCart = (product, options = {}) => {
    const selectedSize = options.size || "";
    const quantity = Math.max(1, Number(options.quantity) || 1);
    const cartItem = {
      productId: product._id,
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

    setCartOpen(true);
  };

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

  let content = null;
  if (pathname === "/login") {
    content = <Login onAuthSuccess={onAuthSuccess} onNavigate={navigate} />;
  } else if (pathname === "/verify-email") {
    content = <VerifyEmail onNavigate={navigate} />;
  } else if (pathname === "/reset-password") {
    content = <ResetPassword onNavigate={navigate} />;
  } else if (pathname.startsWith("/product/")) {
    const productId = pathname.split("/product/")[1];
    content = (
      <ProductDetail
        productId={productId}
        onAddToCart={addToCart}
        onNavigate={navigate}
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
        <section className="hero-panel">
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
        </section>

        <ProductGrid
          onAddToCart={addToCart}
          onOpenProduct={(id) => navigate(`/product/${id}`)}
          initialCategory={initialCategory}
        />
      </>
    );
  }

  return (
    <div className="store-shell">
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
      />

      <main className="store-main">{content}</main>

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
      />
    </div>
  );
}
