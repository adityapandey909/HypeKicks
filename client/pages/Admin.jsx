import { useEffect, useMemo, useState } from "react";
import api from "../src/lib/api";

const initialForm = {
  id: "",
  name: "",
  brand: "",
  category: "Lifestyle",
  price: "",
  description: "",
  imagesText: "",
  sizesText: "8:5,9:5,10:5",
  featured: false,
};

function parseSizeText(value = "") {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [size, stock] = entry.split(":").map((part) => part.trim());
      return {
        size,
        stock: Math.max(0, Number(stock) || 0),
      };
    })
    .filter((row) => row.size);
}

function toSizeText(sizeOptions = []) {
  return sizeOptions.map((option) => `${option.size}:${option.stock}`).join(",");
}

function toImageText(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.join("\n");
}

export default function Admin({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);

  const isEditMode = Boolean(form.id);
  const pageSize = 10;

  const imageListPreview = useMemo(
    () =>
      form.imagesText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    [form.imagesText]
  );

  const loadProducts = async () => {
    try {
      const res = await api.get("/products", { params: { limit: 200, sort: "newest" } });
      setProducts(res.data?.products || []);
      setPage(1);
    } catch {
      setError("Failed to load admin product list");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const resetForm = () => setForm(initialForm);

  const submitProduct = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!form.name.trim()) {
        setError("Product name is required");
        return;
      }

      if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
        setError("Price must be a valid non-negative number");
        return;
      }

      if (imageListPreview.length === 0) {
        setError("At least one image is required");
        return;
      }

      const payload = {
        name: form.name,
        brand: form.brand,
        category: form.category,
        description: form.description,
        price: Number(form.price),
        images: imageListPreview,
        sizeOptions: parseSizeText(form.sizesText),
        featured: form.featured,
      };

      if (isEditMode) {
        await api.put(`/products/${form.id}`, payload);
        setMessage("Product updated");
      } else {
        await api.post("/products", payload);
        setMessage("Product created");
      }

      resetForm();
      loadProducts();
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product) => {
    setForm({
      id: product._id,
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "Lifestyle",
      price: String(product.price ?? ""),
      description: product.description || "",
      imagesText: toImageText(product),
      sizesText: toSizeText(product.sizeOptions || []),
      featured: Boolean(product.featured),
    });
    setMessage("");
    setError("");
  };

  const deleteProduct = async (id) => {
    const product = products.find((item) => item._id === id);
    if (!product) return;

    const confirmText = window.prompt(
      `Type "${product.name}" to confirm delete.`
    );
    if (confirmText !== product.name) {
      setError("Delete cancelled: product name did not match");
      return;
    }

    try {
      await api.delete(`/products/${id}`);
      setMessage("Product deleted");
      if (form.id === id) resetForm();
      loadProducts();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Failed to delete product");
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    setMessage("");

    try {
      const urls = [];
      for (const file of files) {
        const encoded = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await api.post("/uploads/image", {
          imageDataUrl: encoded,
          folder: "hypekicks/products",
        });

        if (response.data?.imageUrl) {
          urls.push(response.data.imageUrl);
        }
      }

      if (urls.length === 0) {
        setError("No image was uploaded");
        return;
      }

      setForm((prev) => ({
        ...prev,
        imagesText: [...prev.imagesText.split("\n"), ...urls].filter(Boolean).join("\n"),
      }));
      setMessage(`Uploaded ${urls.length} image${urls.length > 1 ? "s" : ""}`);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "Failed to upload images");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const visibleProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [page, products]);

  return (
    <section className="admin-shell">
      <div className="drops-header">
        <div>
          <p className="section-kicker">Admin Panel</p>
          <h2 className="section-title">Product Management</h2>
        </div>
        <button type="button" className="ghost-btn" onClick={() => onNavigate("/")}>
          Back to store
        </button>
      </div>

      <div className="admin-grid">
        <form className="admin-form" onSubmit={submitProduct}>
          <h3>{isEditMode ? "Edit product" : "Create product"}</h3>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <label>
            Name
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label>
            Brand
            <input value={form.brand} onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))} />
          </label>
          <label>
            Category
            <input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
          </label>
          <label>
            Price
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label>
            Size inventory (format: 8:5,9:3)
            <input
              value={form.sizesText}
              onChange={(event) => setForm((prev) => ({ ...prev, sizesText: event.target.value }))}
            />
          </label>
          <label>
            Images (one URL per line)
            <textarea
              value={form.imagesText}
              onChange={(event) => setForm((prev) => ({ ...prev, imagesText: event.target.value }))}
            />
          </label>
          <label>
            Upload local images {uploading ? "(uploading...)" : ""}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploading || loading}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
            />
            Featured
          </label>

          <div className="hero-actions">
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Update product" : "Create product"}
            </button>
            <button type="button" className="ghost-btn" onClick={resetForm}>
              Reset
            </button>
          </div>
        </form>

        <div className="admin-list">
          <h3>Inventory ({products.length})</h3>
          {visibleProducts.map((product) => (
            <article key={product._id} className="admin-item">
              <img src={product.image} alt={product.name} />
              <div>
                <p>{product.name}</p>
                <span>${Number(product.price || 0).toFixed(2)} • Stock {product.totalStock || 0}</span>
              </div>
              <div className="admin-actions">
                <button type="button" className="ghost-btn" onClick={() => startEdit(product)}>
                  Edit
                </button>
                <button type="button" className="ghost-btn" onClick={() => deleteProduct(product._id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
          <div className="admin-pagination">
            <button
              type="button"
              className="ghost-btn"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="ghost-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
