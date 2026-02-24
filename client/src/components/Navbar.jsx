const navLinks = [
  { label: "Latest", path: "/#drops" },
  { label: "Running", path: "/?category=Running#drops" },
  { label: "Basketball", path: "/?category=Basketball#drops" },
  { label: "Lifestyle", path: "/?category=Lifestyle#drops" },
];

export default function Navbar({ cartCount, onCartClick, user, onLogout, onNavigate }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          type="button"
          className="brand-mark brand-button"
          aria-label="HypeKicks home"
          onClick={() => onNavigate("/")}
        >
          <span className="brand-badge" />
          <h1>
            Hype<span>Kicks</span>
          </h1>
        </button>

        <nav className="top-links" aria-label="Product categories">
          {navLinks.map((link) => (
            <button type="button" key={link.label} onClick={() => onNavigate(link.path)}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          {user ? (
            <>
              <button type="button" className="search-button" onClick={() => onNavigate("/orders")}>
                Orders
              </button>
              {user.role === "admin" && (
                <button type="button" className="search-button" onClick={() => onNavigate("/admin")}>
                  Admin
                </button>
              )}
              <button type="button" className="search-button" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <button type="button" className="search-button" onClick={() => onNavigate("/login")}>
              Login
            </button>
          )}

          <button
            type="button"
            className="cart-button"
            aria-label="Open cart"
            onClick={onCartClick}
          >
            Cart
            <span>{cartCount || 0}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
export { Navbar };
