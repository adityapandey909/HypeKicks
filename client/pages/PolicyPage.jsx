const pageContent = {
  "/returns": {
    title: "Returns & Exchanges",
    kicker: "Support",
    sections: [
      {
        heading: "Return Window",
        body: "You can request a return or exchange within 14 calendar days of delivery for unworn items in original condition.",
      },
      {
        heading: "Condition Requirements",
        body: "Pairs must include the original box, tags, and packaging. Used pairs with visible wear are not eligible for refunds.",
      },
      {
        heading: "How To Start",
        body: "Open your Orders page, select the order, and choose Return or Exchange. Our support team confirms the request in under 24 hours.",
      },
    ],
  },
  "/shipping": {
    title: "Shipping Policy",
    kicker: "Logistics",
    sections: [
      {
        heading: "Dispatch Time",
        body: "In-stock orders are dispatched within 24-48 hours on business days.",
      },
      {
        heading: "Delivery Timeline",
        body: "Domestic standard delivery usually arrives in 3-5 business days. Express delivery options are shown at checkout.",
      },
      {
        heading: "Tracking",
        body: "Every order includes a tracking link sent by email. If tracking has no updates for 48 hours, contact support.",
      },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    kicker: "Legal",
    sections: [
      {
        heading: "What We Collect",
        body: "We collect account details, order information, and device/session metadata needed to process purchases and secure accounts.",
      },
      {
        heading: "How We Use Data",
        body: "Data is used for authentication, order fulfillment, customer support, and fraud prevention. We do not sell personal data.",
      },
      {
        heading: "Retention",
        body: "Order history is retained for accounting and support purposes. You can request account deletion via support.",
      },
    ],
  },
  "/terms": {
    title: "Terms of Service",
    kicker: "Legal",
    sections: [
      {
        heading: "Purchases",
        body: "By placing an order, you agree that payment authorization, stock confirmation, and shipping verification are required before fulfillment.",
      },
      {
        heading: "Pricing & Availability",
        body: "Prices and inventory may change without notice. If a pricing or stock error occurs, we will notify you before finalizing the order.",
      },
      {
        heading: "Liability",
        body: "HypeKicks is not liable for delays caused by carriers, extreme weather, or events outside our operational control.",
      },
    ],
  },
  "/faq": {
    title: "Frequently Asked Questions",
    kicker: "Support",
    sections: [
      {
        heading: "Are pairs authentic?",
        body: "Yes. Every pair is authenticity-checked before dispatch.",
      },
      {
        heading: "Can I change size after ordering?",
        body: "If the order has not shipped, contact support and we will attempt to update the size.",
      },
      {
        heading: "Do you ship internationally?",
        body: "Currently shipping is focused on US destinations. International expansion is planned.",
      },
    ],
  },
  "/contact": {
    title: "Contact Support",
    kicker: "Support",
    sections: [
      {
        heading: "Email",
        body: "support@hypekicks.com",
      },
      {
        heading: "Response Time",
        body: "Most requests are answered within 24 hours on business days.",
      },
      {
        heading: "Order Help",
        body: "Include your order ID and registered email to speed up support requests.",
      },
    ],
  },
};

export default function PolicyPage({ pathname = "/", onNavigate }) {
  const content = pageContent[pathname] || pageContent["/terms"];

  return (
    <section className="policy-shell section-reveal">
      <div className="policy-header">
        <p className="section-kicker">{content.kicker}</p>
        <h2 className="section-title">{content.title}</h2>
      </div>

      <div className="policy-grid">
        {content.sections.map((section) => (
          <article key={`${content.title}-${section.heading}`} className="policy-card">
            <h3>{section.heading}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>

      <button type="button" className="cta-secondary" onClick={() => onNavigate("/")}>
        Back to store
      </button>
    </section>
  );
}
