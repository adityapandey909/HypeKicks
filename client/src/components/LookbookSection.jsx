const lookbookCards = [
  {
    id: "city-run",
    title: "City Run Uniform",
    copy: "Breathable layers and lightweight runners for all-day movement.",
    image: `${import.meta.env.BASE_URL}catalog/lookbook/city-run.svg`,
    category: "Running",
  },
  {
    id: "court-night",
    title: "Court to Night",
    copy: "High-contrast leather pairs that transition from game time to street lights.",
    image: `${import.meta.env.BASE_URL}catalog/lookbook/court-night.svg`,
    category: "Basketball",
  },
  {
    id: "weekend-core",
    title: "Weekend Core",
    copy: "Relaxed silhouettes and neutral tones for effortless casual rotation.",
    image: `${import.meta.env.BASE_URL}catalog/lookbook/weekend-core.svg`,
    category: "Lifestyle",
  },
];

export default function LookbookSection({ onNavigate }) {
  return (
    <section className="lookbook-section section-reveal" aria-label="HypeKicks lookbook">
      <div className="drops-header">
        <div>
          <p className="section-kicker">Editorial lookbook</p>
          <h2 className="section-title">Style Stories</h2>
        </div>
        <p className="section-subtitle">Outfit inspiration around each silhouette.</p>
      </div>

      <div className="lookbook-grid">
        {lookbookCards.map((card) => (
          <article key={card.id} className="lookbook-card">
            <img src={card.image} alt={card.title} loading="lazy" />
            <div>
              <p className="hero-kicker">{card.category}</p>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
              <button
                type="button"
                className="cta-secondary"
                onClick={() => onNavigate(`/?category=${encodeURIComponent(card.category)}#drops`)}
              >
                Shop this edit
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
