function BottomIcon({ kind }) {
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5L12 5l8 6.5V20H4v-8.5z" />
      </svg>
    );
  }
  if (kind === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
    );
  }
  if (kind === "heart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20s-7-4.4-9-8.8A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9 5.2C19 15.6 12 20 12 20z" />
      </svg>
    );
  }
  if (kind === "bag") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 9h14l-1.2 11H6.2L5 9z" />
        <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

export default function MobileBottomNav({
  currentPath = "/",
  cartCount = 0,
  wishlistCount = 0,
  user,
  onNavigate,
  onCartClick,
}) {
  const accountPath = user ? "/orders" : "/login";

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile quick actions">
      <button
        type="button"
        className={currentPath === "/" ? "active" : ""}
        onClick={() => onNavigate("/")}
      >
        <BottomIcon kind="home" />
        Home
      </button>
      <button type="button" onClick={() => onNavigate("/?focus=search#drops")}>
        <BottomIcon kind="search" />
        Search
      </button>
      <button
        type="button"
        className={currentPath === "/wishlist" ? "active" : ""}
        onClick={() => onNavigate("/wishlist")}
      >
        <BottomIcon kind="heart" />
        Wishlist
        {wishlistCount > 0 && <span>{wishlistCount}</span>}
      </button>
      <button type="button" onClick={onCartClick}>
        <BottomIcon kind="bag" />
        Cart
        {cartCount > 0 && <span>{cartCount}</span>}
      </button>
      <button
        type="button"
        className={currentPath === accountPath ? "active" : ""}
        onClick={() => onNavigate(accountPath)}
      >
        <BottomIcon kind="account" />
        Account
      </button>
    </nav>
  );
}
