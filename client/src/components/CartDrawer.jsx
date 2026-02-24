function currency(value = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
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
}) {
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
            <p>Your cart is empty.</p>
            <p>Add a pair and start your checkout.</p>
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
