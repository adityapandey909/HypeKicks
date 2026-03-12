function normalize(value = "") {
  return String(value || "").trim().toLowerCase();
}

function levenshtein(a = "", b = "") {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, index) => [index]);
  for (let column = 0; column <= a.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= b.length; row += 1) {
    for (let column = 1; column <= a.length; column += 1) {
      if (b[row - 1] === a[column - 1]) {
        matrix[row][column] = matrix[row - 1][column - 1];
      } else {
        matrix[row][column] = Math.min(
          matrix[row - 1][column - 1] + 1,
          matrix[row][column - 1] + 1,
          matrix[row - 1][column] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function scoreProduct(product, query) {
  const q = normalize(query);
  if (!q) return Number.POSITIVE_INFINITY;

  const name = normalize(product?.name);
  const brand = normalize(product?.brand);
  const category = normalize(product?.category);
  const tags = Array.isArray(product?.tags)
    ? product.tags.map((tag) => normalize(tag)).join(" ")
    : "";

  const joined = `${name} ${brand} ${category} ${tags}`.trim();
  if (!joined) return Number.POSITIVE_INFINITY;

  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (brand.includes(q) || category.includes(q)) return 2;
  if (tags.includes(q)) return 3;

  const tokens = joined.split(/\s+/).filter(Boolean);
  const closestTokenDistance = tokens.reduce((best, token) => {
    const dist = levenshtein(token, q);
    return Math.min(best, dist);
  }, Number.POSITIVE_INFINITY);

  if (closestTokenDistance <= 2) return 4 + closestTokenDistance;
  if (joined.includes(q[0])) return 7;
  return Number.POSITIVE_INFINITY;
}

export function getInstantMatches(products = [], query = "", limit = 6) {
  const q = normalize(query);
  if (!q) return [];

  return products
    .map((product) => ({
      product,
      score: scoreProduct(product, q),
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return String(a.product?.name || "").localeCompare(String(b.product?.name || ""));
    })
    .slice(0, limit)
    .map((entry) => entry.product);
}
