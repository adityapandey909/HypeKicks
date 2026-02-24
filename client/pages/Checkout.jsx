import { useMemo, useState } from "react";
import api from "../src/lib/api";

function currency(value = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function Checkout({ cartItems, subtotal, user, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || "",
    email: user?.email || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  const estimatedShipping = subtotal >= 150 ? 0 : 9.99;
  const estimatedTax = useMemo(() => Number((subtotal * 0.08).toFixed(2)), [subtotal]);
  const estimatedTotal = subtotal + estimatedShipping + estimatedTax;

  if (!user) {
    return (
      <section className="checkout-shell">
        <div className="auth-card">
          <p className="auth-error">You need to login before checking out.</p>
          <button type="button" className="auth-submit" onClick={() => onNavigate("/login")}>
            Go to login
          </button>
        </div>
      </section>
    );
  }

  const requestVerificationLink = async () => {
    setError("");
    setInfo("");
    try {
      const res = await api.post("/auth/send-verification");
      setInfo(res.data?.dev?.verifyLink || res.data?.message || "Verification link sent");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to send verification link");
    }
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const payload = {
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
        })),
        shippingAddress,
      };

      const res = await api.post("/orders/checkout", payload);
      const redirectUrl = res.data?.checkoutUrl;
      if (!redirectUrl) {
        setError("Checkout URL was not returned by server");
        return;
      }

      window.location.href = redirectUrl;
    } catch (checkoutError) {
      setError(checkoutError.response?.data?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="checkout-shell">
      <form className="checkout-grid" onSubmit={handleCheckout}>
        <article className="checkout-panel">
          <p className="section-kicker">Checkout</p>
          <h2 className="section-title">Shipping details</h2>

          {!user.emailVerified && (
            <div className="checkout-warning">
              <p>Please verify your email before placing an order.</p>
              <button type="button" className="ghost-btn" onClick={requestVerificationLink}>
                Send verification link
              </button>
            </div>
          )}

          <div className="checkout-fields">
            {[
              ["name", "Full name"],
              ["email", "Email"],
              ["line1", "Address line 1"],
              ["line2", "Address line 2"],
              ["city", "City"],
              ["state", "State"],
              ["postalCode", "Postal code"],
              ["country", "Country"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={shippingAddress[key]}
                  onChange={(event) =>
                    setShippingAddress((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-success">{info}</p>}
        </article>

        <article className="checkout-panel">
          <p className="section-kicker">Order summary</p>
          <h2 className="section-title">Review</h2>
          <ul className="summary-list">
            {cartItems.map((item) => (
              <li key={`${item.productId}-${item.size || "none"}`}>
                <span>
                  {item.name} {item.size ? `(Size ${item.size})` : ""} x {item.quantity}
                </span>
                <strong>{currency(item.price * item.quantity)}</strong>
              </li>
            ))}
          </ul>

          <div className="summary-total">
            <p>
              <span>Subtotal</span>
              <strong>{currency(subtotal)}</strong>
            </p>
            <p>
              <span>Shipping</span>
              <strong>{currency(estimatedShipping)}</strong>
            </p>
            <p>
              <span>Tax</span>
              <strong>{currency(estimatedTax)}</strong>
            </p>
            <p className="grand">
              <span>Total</span>
              <strong>{currency(estimatedTotal)}</strong>
            </p>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || cartItems.length === 0 || !user.emailVerified}
          >
            {loading ? "Redirecting..." : "Proceed to payment"}
          </button>
        </article>
      </form>
    </section>
  );
}
