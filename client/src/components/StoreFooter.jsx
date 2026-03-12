const footerLinks = {
  Shop: [
    { label: "New Arrivals", path: "/#drops" },
    { label: "Featured", path: "/#featured" },
    { label: "Running", path: "/?category=Running#drops" },
    { label: "Lifestyle", path: "/?category=Lifestyle#drops" },
  ],
  Support: [
    { label: "Order Tracking", path: "/orders" },
    { label: "Returns", path: "/returns" },
    { label: "Shipping", path: "/shipping" },
    { label: "FAQ", path: "/faq" },
    { label: "Contact", path: "/contact" },
  ],
  Legal: [
    { label: "Privacy", path: "/privacy" },
    { label: "Terms", path: "/terms" },
  ],
};

export default function StoreFooter({ onNavigate }) {
  return (
    <footer className="store-footer section-reveal" aria-label="HypeKicks footer">
      <div className="footer-brand">
        <p className="hero-kicker">HypeKicks</p>
        <h3>Built for sneakerheads, styled for everyday wear.</h3>
        <p>
          Premium street and performance pairs with verified quality, fast shipping,
          and support that actually responds.
        </p>
      </div>

      <div className="footer-links-grid">
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4>{title}</h4>
            <ul>
              {links.map((link) => (
                <li key={`${title}-${link.label}`}>
                  <button type="button" onClick={() => onNavigate(link.path)}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4>Social</h4>
          <ul>
            <li>
              <a href="https://instagram.com" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href="https://x.com" target="_blank" rel="noreferrer">
                X
              </a>
            </li>
            <li>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">
                YouTube
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-newsletter">
        <p className="section-kicker">Member updates</p>
        <h4>Get weekly drop alerts</h4>
        <form onSubmit={(event) => event.preventDefault()}>
          <input type="email" placeholder="you@example.com" aria-label="Email" />
          <button type="submit" className="cta-primary">Subscribe</button>
        </form>
      </div>
    </footer>
  );
}
