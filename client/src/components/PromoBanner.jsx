import { useEffect, useMemo, useState } from "react";

function getNextDropTimestamp() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(18, 0, 0, 0);

  const day = target.getDay();
  const friday = 5;
  let diff = friday - day;
  if (diff < 0 || (diff === 0 && target.getTime() <= now.getTime())) {
    diff += 7;
  }
  target.setDate(target.getDate() + diff);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }

  return target.getTime();
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function PromoBanner({ lowStockCount = 0 }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [countdown, setCountdown] = useState("");

  const nextDrop = useMemo(() => getNextDropTimestamp(), []);

  useEffect(() => {
    const tick = () => {
      const remaining = nextDrop - Date.now();
      setCountdown(formatCountdown(remaining));
    };

    tick();
    const timer = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [nextDrop]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  if (hidden) return null;

  const banners = [
    {
      badge: "Shipping",
      title: "Free US shipping on orders over $120",
      detail: "Fast dispatch and live tracking from checkout to doorstep.",
    },
    {
      badge: "Drop Clock",
      title: `Next curated drop in ${countdown}`,
      detail: "Friday 6:00 PM local time. Enable alerts in your browser.",
    },
    {
      badge: "Inventory",
      title: `${lowStockCount} pairs are running low right now`,
      detail: "Grab your size before this week’s stock refresh.",
    },
  ];

  const active = banners[activeIndex];

  return (
    <section className="promo-banner section-reveal" aria-live="polite">
      <span className="promo-badge">{active.badge}</span>
      <div className="promo-copy">
        <p>{active.title}</p>
        <small>{active.detail}</small>
      </div>
      <div className="promo-actions">
        {banners.map((item, index) => (
          <button
            key={item.badge}
            type="button"
            className={index === activeIndex ? "active" : ""}
            aria-label={`Show ${item.badge} banner`}
            onClick={() => setActiveIndex(index)}
          />
        ))}
        <button type="button" className="promo-close" onClick={() => setHidden(true)}>
          Dismiss
        </button>
      </div>
    </section>
  );
}
