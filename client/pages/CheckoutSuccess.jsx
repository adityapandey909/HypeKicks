import { useEffect, useMemo, useState } from "react";
import api from "../src/lib/api";

export default function CheckoutSuccess({ onNavigate, onCartCleared }) {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Finalizing your order...");
  const [orderStatus, setOrderStatus] = useState("");

  const { orderId, isMock } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      orderId: params.get("orderId") || "",
      isMock: params.get("mock") === "1",
    };
  }, []);

  useEffect(() => {
    let active = true;
    const confirmOrder = async () => {
      if (!orderId) {
        if (!active) return;
        setStatus("error");
        setMessage("Order ID is missing from success URL");
        return;
      }

      try {
        if (isMock) {
          await api.post(`/orders/${orderId}/mock-confirm`);
        }

        const loadOrderStatus = async () => {
          const orderResponse = await api.get(`/orders/${orderId}`);
          return orderResponse.data?.order?.status || "";
        };

        let latestStatus = await loadOrderStatus();
        if (!isMock && latestStatus !== "paid") {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            latestStatus = await loadOrderStatus();
            if (latestStatus === "paid") break;
          }
        }

        onCartCleared();
        if (!active) return;
        setOrderStatus(latestStatus);

        if (latestStatus === "paid") {
          setStatus("success");
          setMessage("Your order payment has been confirmed.");
        } else if (latestStatus === "pending") {
          setStatus("loading");
          setMessage("Payment is processing. It may take a moment to confirm.");
        } else if (latestStatus === "failed") {
          setStatus("error");
          setMessage("Payment session expired or failed. Please try checkout again.");
        } else {
          setStatus("success");
          setMessage("Order created successfully.");
        }
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error.response?.data?.message || "Unable to confirm order");
      }
    };

    confirmOrder();
    return () => {
      active = false;
    };
  }, [isMock, onCartCleared, orderId]);

  return (
    <section className="checkout-shell">
      <div className="auth-card">
        <p className="auth-kicker">Checkout</p>
        <h2>{status === "success" ? "Order placed" : "Order status"}</h2>
        <p className={status === "error" ? "auth-error" : "auth-success"}>{message}</p>
        {orderStatus && (
          <p className="auth-link-preview">Current order state: {orderStatus}</p>
        )}
        <div className="hero-actions">
          <button type="button" className="auth-submit" onClick={() => onNavigate("/orders")}>
            View orders
          </button>
          <button type="button" className="ghost-btn" onClick={() => onNavigate("/")}>
            Back to store
          </button>
        </div>
      </div>
    </section>
  );
}
