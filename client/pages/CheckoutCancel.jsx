export default function CheckoutCancel({ onNavigate }) {
  return (
    <section className="checkout-shell">
      <div className="auth-card">
        <p className="auth-kicker">Checkout</p>
        <h2>Payment cancelled</h2>
        <p className="auth-error">
          Your payment flow was cancelled. Your cart is still saved so you can try again.
        </p>
        <div className="hero-actions">
          <button type="button" className="auth-submit" onClick={() => onNavigate("/checkout")}>
            Retry checkout
          </button>
          <button type="button" className="ghost-btn" onClick={() => onNavigate("/")}>
            Continue shopping
          </button>
        </div>
      </div>
    </section>
  );
}
