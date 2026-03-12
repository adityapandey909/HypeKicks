function replaceWidth(url, width) {
  try {
    const next = new URL(url);
    next.searchParams.set("w", String(width));
    if (!next.searchParams.get("auto")) next.searchParams.set("auto", "format");
    if (!next.searchParams.get("fit")) next.searchParams.set("fit", "crop");
    if (!next.searchParams.get("q")) next.searchParams.set("q", "80");
    return next.toString();
  } catch {
    return url;
  }
}

export function getResponsiveImageProps(
  url = "",
  {
    sizes = "(max-width: 640px) 92vw, (max-width: 980px) 48vw, 33vw",
    widths = [320, 480, 768, 1024, 1400],
  } = {}
) {
  const src = String(url || "").trim();
  if (!src) return { src: "", srcSet: undefined, sizes: undefined };

  if (!src.includes("images.unsplash.com")) {
    return { src, srcSet: undefined, sizes: undefined };
  }

  const srcSet = widths.map((width) => `${replaceWidth(src, width)} ${width}w`).join(", ");
  return {
    src: replaceWidth(src, widths[widths.length - 1]),
    srcSet,
    sizes,
  };
}
