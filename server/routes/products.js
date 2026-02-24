/** @format */

import express from "express";
import Product from "../models/Product.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";
import {
	normalizeImageList,
	parseSizeOptions,
	sanitizeText,
	toSafeNumber,
} from "../utils/validators.js";

const router = express.Router();

function toSlug(input = "") {
	return String(input)
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 70);
}

async function buildUniqueSlug(name, productIdToIgnore = null) {
	const base = toSlug(name) || `product-${Date.now()}`;
	let slug = base;
	let i = 1;

	while (true) {
		const existing = await Product.findOne({
			slug,
			...(productIdToIgnore ? { _id: { $ne: productIdToIgnore } } : {}),
		}).select("_id");

		if (!existing) return slug;
		slug = `${base}-${i}`;
		i += 1;
	}
}

function normalizeProductPayload(payload = {}) {
	const name = sanitizeText(payload.name);
	const description = sanitizeText(payload.description);
	const brand = sanitizeText(payload.brand);
	const category = sanitizeText(payload.category || "Lifestyle");
	const tags = Array.isArray(payload.tags)
		? payload.tags.map((value) => sanitizeText(value)).filter(Boolean)
		: [];
	const price = Math.max(0, toSafeNumber(payload.price, 0));
	const sizeOptions = parseSizeOptions(payload.sizeOptions);
	const images = normalizeImageList(payload.images, payload.image);
	const image = images[0] || "";
	const featured = Boolean(payload.featured);

	const totalStock =
		sizeOptions.length > 0
			? sizeOptions.reduce((sum, option) => sum + option.stock, 0)
			: Math.max(0, Math.floor(toSafeNumber(payload.totalStock, 0)));

	return {
		name,
		description,
		brand,
		category,
		tags,
		price,
		images,
		image,
		sizeOptions,
		totalStock,
		featured,
	};
}

function parseOptionalNumber(value) {
	if (value === "" || value === null || value === undefined) {
		return NaN;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : NaN;
}

// GET all products
router.get("/", async (req, res) => {
	try {
		const {
			search = "",
			brand = "",
			category = "",
			minPrice = "",
			maxPrice = "",
			sort = "newest",
			limit = "100",
		} = req.query;

		const query = {};
		const cleanSearch = sanitizeText(search);
		const cleanBrand = sanitizeText(brand);
		const cleanCategory = sanitizeText(category);
		const cleanMinPrice = parseOptionalNumber(minPrice);
		const cleanMaxPrice = parseOptionalNumber(maxPrice);

		if (cleanSearch) {
			query.$or = [
				{ name: { $regex: cleanSearch, $options: "i" } },
				{ brand: { $regex: cleanSearch, $options: "i" } },
				{ description: { $regex: cleanSearch, $options: "i" } },
				{ tags: { $regex: cleanSearch, $options: "i" } },
			];
		}

		if (cleanBrand) {
			query.brand = { $regex: `^${cleanBrand}$`, $options: "i" };
		}

		if (cleanCategory) {
			query.category = { $regex: `^${cleanCategory}$`, $options: "i" };
		}

		if (Number.isFinite(cleanMinPrice) || Number.isFinite(cleanMaxPrice)) {
			query.price = {};
			if (Number.isFinite(cleanMinPrice)) query.price.$gte = cleanMinPrice;
			if (Number.isFinite(cleanMaxPrice)) query.price.$lte = cleanMaxPrice;
		}

		const sortMap = {
			newest: { createdAt: -1 },
			oldest: { createdAt: 1 },
			price_asc: { price: 1 },
			price_desc: { price: -1 },
			featured: { featured: -1, createdAt: -1 },
		};

		const maxLimit = Math.min(Math.max(toSafeNumber(limit, 100), 1), 200);
		const products = await Product.find(query)
			.sort(sortMap[sort] || sortMap.newest)
			.limit(maxLimit);

		const brands = await Product.distinct("brand");
		const categories = await Product.distinct("category");

		res.json({
			products,
			filters: {
				brands: brands.filter(Boolean).sort(),
				categories: categories.filter(Boolean).sort(),
			},
		});
	} catch (err) {
		res.status(500).json({ message: "Failed to fetch products" });
	}
});

router.get("/related/:id", async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) return res.status(404).json({ message: "Product not found" });

		const related = await Product.find({
			_id: { $ne: product._id },
			...(product.brand ? { brand: product.brand } : {}),
		})
			.sort({ createdAt: -1 })
			.limit(4);

		if (related.length > 0) {
			return res.json({ products: related });
		}

		const fallback = await Product.find({ _id: { $ne: product._id } })
			.sort({ createdAt: -1 })
			.limit(4);
		return res.json({ products: fallback });
	} catch {
		return res.status(500).json({ message: "Failed to fetch related products" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) return res.status(404).json({ message: "Product not found" });
		return res.json({ product });
	} catch {
		return res.status(500).json({ message: "Failed to fetch product" });
	}
});

router.post("/", auth, admin, async (req, res) => {
	try {
		const payload = normalizeProductPayload(req.body);
		if (!payload.name || !payload.image) {
			return res.status(400).json({ message: "Name and at least one image are required" });
		}

		if (!Number.isFinite(payload.price) || payload.price < 0) {
			return res.status(400).json({ message: "Price must be a valid number" });
		}

		const slug = await buildUniqueSlug(payload.name);
		const product = await Product.create({ ...payload, slug });
		return res.status(201).json({ message: "Product created", product });
	} catch {
		return res.status(500).json({ message: "Failed to create product" });
	}
});

router.put("/:id", auth, admin, async (req, res) => {
	try {
		const existing = await Product.findById(req.params.id);
		if (!existing) return res.status(404).json({ message: "Product not found" });

		const payload = normalizeProductPayload({
			...existing.toObject(),
			...req.body,
		});

		if (!payload.name || !payload.image) {
			return res.status(400).json({ message: "Name and at least one image are required" });
		}

		payload.slug = await buildUniqueSlug(payload.name, existing._id);

		const product = await Product.findByIdAndUpdate(
			req.params.id,
			payload,
			{ new: true, runValidators: true }
		);

		return res.json({ message: "Product updated", product });
	} catch {
		return res.status(500).json({ message: "Failed to update product" });
	}
});

router.delete("/:id", auth, admin, async (req, res) => {
	try {
		const product = await Product.findByIdAndDelete(req.params.id);
		if (!product) return res.status(404).json({ message: "Product not found" });
		return res.json({ message: "Product deleted" });
	} catch {
		return res.status(500).json({ message: "Failed to delete product" });
	}
});

export default router;
