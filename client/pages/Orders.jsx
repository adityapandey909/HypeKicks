import { useEffect, useState } from "react";
import api from "../src/lib/api";

function currency(value = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function Orders({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/orders/me");
      setOrders(res.data?.orders || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const cancelOrder = async (id) => {
    try {
      await api.post(`/orders/${id}/cancel`);
      loadOrders();
    } catch (cancelError) {
      setError(cancelError.response?.data?.message || "Failed to cancel order");
    }
  };

  return (
    <section className="orders-shell">
      <div className="drops-header">
        <div>
          <p className="section-kicker">Account</p>
          <h2 className="section-title">Your Orders</h2>
        </div>
        <button type="button" className="ghost-btn" onClick={() => onNavigate("/")}>
          Back to store
        </button>
      </div>

      {error && <p className="drops-error">{error}</p>}
      {loading && <div className="skeleton-card"><div className="skeleton-image" /></div>}

      {!loading && orders.length === 0 && (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>When you place your first order, it will appear here.</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order._id} className="order-card">
              <div className="order-head">
                <p>Order #{order._id.slice(-8)}</p>
                <span className={`order-status ${order.status}`}>{order.status}</span>
              </div>
              <ul>
                {order.items.map((item) => (
                  <li key={`${item.product}-${item.size || "none"}`}>
                    <span>
                      {item.name} {item.size ? `• ${item.size}` : ""} x {item.quantity}
                    </span>
                    <strong>{currency(item.lineTotal)}</strong>
                  </li>
                ))}
              </ul>
              <div className="order-foot">
                <p>Total: {currency(order.total)}</p>
                {order.status === "pending" && (
                  <button type="button" className="ghost-btn" onClick={() => cancelOrder(order._id)}>
                    Cancel order
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
