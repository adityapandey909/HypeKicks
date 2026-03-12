import { useEffect, useMemo, useRef, useState } from "react";
import { getResponsiveImageProps } from "../lib/media";
import { getInstantMatches } from "../lib/search";
import { THEME_MODES } from "../lib/theme";

const shopCategories = ["Running", "Basketball", "Lifestyle", "Training"];

function resolveProductId(product) {
  return String(product?._id || product?.productId || "").trim();
}

function NavIcon({ kind }) {
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
  if (kind === "user") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    );
  }
  if (kind === "list") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7h12" />
        <path d="M8 12h12" />
        <path d="M8 17h12" />
        <circle cx="4.5" cy="7" r="1" />
        <circle cx="4.5" cy="12" r="1" />
        <circle cx="4.5" cy="17" r="1" />
      </svg>
    );
  }
  if (kind === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l7 3v6c0 4.6-2.8 7.5-7 9-4.2-1.5-7-4.4-7-9V6l7-3z" />
      </svg>
    );
  }
  return null;
}

export default function Navbar({
  cartCount,
  onCartClick,
  user,
  onLogout,
  onNavigate,
  themeMode,
  onThemeChange,
  cartPulse = false,
  wishlistCount = 0,
  searchProducts = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  const brandMarkSrc = `${import.meta.env.BASE_URL}hypekicks-mark.svg`;

  const featuredBrands = useMemo(() => {
    const all = [...new Set(searchProducts.map((item) => String(item.brand || "").trim()).filter(Boolean))];
    return all.slice(0, 8);
  }, [searchProducts]);

  const instantMatches = useMemo(() => getInstantMatches(searchProducts, query, 7), [searchProducts, query]);

  useEffect(() => {
    const onShortcut = (event) => {
      if (event.key !== "/") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const active = document.activeElement;
      const tagName = active?.tagName;
      const isEditing =
        active?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";
      if (isEditing) return;

      event.preventDefault();
      searchInputRef.current?.focus();
      setSearchOpen(true);
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const onPointerDown = (event) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen]);

  const submitSearch = () => {
    const clean = String(query || "").trim();
    if (!clean) {
      onNavigate("/#drops");
      setSearchOpen(false);
      return;
    }

    onNavigate(`/?search=${encodeURIComponent(clean)}#drops`);
    setSearchOpen(false);
  };

  const openProductFromSearch = (product) => {
    const productId = resolveProductId(product);
    if (!productId) return;
    onNavigate(`/product/${productId}`);
    setQuery("");
    setSearchOpen(false);
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          type="button"
          className="brand-mark brand-button"
          aria-label="HypeKicks home"
          onClick={() => onNavigate("/")}
        >
          <img src={brandMarkSrc} alt="" className="brand-badge" aria-hidden="true" />
          <h1>
            Hype<span>Kicks</span>
          </h1>
        </button>

        <nav className="top-links" aria-label="Store navigation">
          <div
            className="mega-wrap"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((prev) => !prev)}
              onFocus={() => setMenuOpen(true)}
            >
              Shop
            </button>

            {menuOpen && (
              <div className="mega-menu" role="menu">
                <div>
                  <p className="section-kicker">Categories</p>
                  <div className="mega-chip-grid">
                    {shopCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          onNavigate(`/?category=${encodeURIComponent(category)}#drops`);
                          setMenuOpen(false);
                        }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="section-kicker">Brands</p>
                  <div className="mega-chip-grid">
                    {featuredBrands.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => {
                          onNavigate(`/?search=${encodeURIComponent(brand)}#drops`);
                          setMenuOpen(false);
                        }}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="button" onClick={() => onNavigate("/#featured")}>Featured</button>
          <button type="button" onClick={() => onNavigate("/#drops")}>Latest</button>
        </nav>

        <div className="top-actions">
          <div className="theme-toggle" role="group" aria-label="Theme">
            <button
              type="button"
              className={themeMode === THEME_MODES.DEFAULT ? "active" : ""}
              onClick={() => onThemeChange(THEME_MODES.DEFAULT)}
            >
              Default
            </button>
            <button
              type="button"
              className={themeMode === THEME_MODES.DARK ? "active" : ""}
              onClick={() => onThemeChange(THEME_MODES.DARK)}
            >
              Dark
            </button>
          </div>

          <div className="nav-search" role="search" ref={searchWrapRef}>
            <span className="input-icon" aria-hidden="true">
              <NavIcon kind="search" />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch();
                } else if (event.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              placeholder="Search sneakers"
              aria-label="Search sneakers"
            />
            <kbd className="search-shortcut" aria-hidden="true">/</kbd>
            {searchOpen && query.trim() && (
              <div className="search-dropdown" role="listbox" aria-label="Search suggestions">
                {instantMatches.length === 0 ? (
                  <p className="search-empty">No exact match. Press Enter to search by keyword.</p>
                ) : (
                  instantMatches.map((item) => {
                    const imageProps = getResponsiveImageProps(item.image, {
                      sizes: "36px",
                      widths: [72, 120, 240],
                    });

                    return (
                      <button
                        key={resolveProductId(item) || item.name}
                        type="button"
                        className="search-item"
                        onClick={() => openProductFromSearch(item)}
                      >
                        <img
                          src={imageProps.src}
                          srcSet={imageProps.srcSet}
                          sizes={imageProps.sizes}
                          alt=""
                          aria-hidden="true"
                          decoding="async"
                        />
                        <span>{item.name}</span>
                        <small>{item.brand || item.category || "Sneaker"}</small>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button type="button" className="search-button" onClick={() => onNavigate("/wishlist")}>
            <span className="action-icon" aria-hidden="true">
              <NavIcon kind="heart" />
            </span>
            Wishlist
            {wishlistCount > 0 && <span className="inline-count">{wishlistCount}</span>}
          </button>

          {user ? (
            <>
              <button type="button" className="search-button" onClick={() => onNavigate("/orders")}>
                <span className="action-icon" aria-hidden="true">
                  <NavIcon kind="list" />
                </span>
                Orders
              </button>
              {user.role === "admin" && (
                <button type="button" className="search-button" onClick={() => onNavigate("/admin")}>
                  <span className="action-icon" aria-hidden="true">
                    <NavIcon kind="shield" />
                  </span>
                  Admin
                </button>
              )}
              <button type="button" className="search-button" onClick={onLogout}>
                <span className="action-icon" aria-hidden="true">
                  <NavIcon kind="user" />
                </span>
                Logout
              </button>
            </>
          ) : (
            <button type="button" className="search-button" onClick={() => onNavigate("/login")}>
              <span className="action-icon" aria-hidden="true">
                <NavIcon kind="user" />
              </span>
              Login
            </button>
          )}

          <button
            type="button"
            className={`cart-button ${cartPulse ? "pulse" : ""}`}
            aria-label="Open cart"
            onClick={onCartClick}
          >
            <span className="action-icon" aria-hidden="true">
              <NavIcon kind="bag" />
            </span>
            Cart
            <span>{cartCount || 0}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export { Navbar };
