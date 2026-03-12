const trustItems = [
  {
    label: "Authenticity Guarantee",
    value: "100%",
    detail: "Every pair is verified before dispatch.",
  },
  {
    label: "Free Shipping",
    value: "$0",
    detail: "On all domestic orders above $120.",
  },
  {
    label: "Easy Returns",
    value: "14 Days",
    detail: "Hassle-free size swaps and returns.",
  },
  {
    label: "Member Support",
    value: "24/7",
    detail: "Chat and email support for every order.",
  },
];

export default function TrustStrip() {
  return (
    <section className="trust-strip section-reveal" aria-label="Store guarantees">
      {trustItems.map((item) => (
        <article key={item.label} className="trust-card">
          <p className="trust-value">{item.value}</p>
          <h3>{item.label}</h3>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  );
}
