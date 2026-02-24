import mongoose from "mongoose";

const productSizeSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true, trim: true },
    images: [{ type: String, trim: true }],
    brand: { type: String, default: "", trim: true },
    category: { type: String, default: "Lifestyle", trim: true },
    tags: [{ type: String, trim: true }],
    sizeOptions: [productSizeSchema],
    totalStock: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.pre("save", function normalizeProduct() {
  const gallery = Array.isArray(this.images)
    ? this.images.filter((value) => typeof value === "string" && value.trim())
    : [];

  if (gallery.length === 0 && this.image) {
    gallery.push(this.image);
  }

  this.images = [...new Set(gallery.map((value) => value.trim()))];
  this.image = this.images[0];

  if (Array.isArray(this.sizeOptions) && this.sizeOptions.length > 0) {
    this.totalStock = this.sizeOptions.reduce(
      (sum, sizeOption) => sum + (Number(sizeOption.stock) || 0),
      0
    );
  }

});

export default mongoose.model("Product", productSchema);
