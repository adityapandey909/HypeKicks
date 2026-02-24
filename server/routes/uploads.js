import express from "express";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";
import { uploadImageToCloudinary } from "../utils/cloudinary.js";
import { sanitizeText } from "../utils/validators.js";

const router = express.Router();

function isHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

router.post("/image", auth, admin, async (req, res) => {
  try {
    const imageDataUrl = sanitizeText(req.body?.imageDataUrl);
    const imageUrl = sanitizeText(req.body?.imageUrl);
    const folder = sanitizeText(req.body?.folder || "hypekicks");

    const source = imageDataUrl || imageUrl;
    if (!source) {
      return res.status(400).json({ message: "imageDataUrl or imageUrl is required" });
    }

    if (!imageDataUrl && imageUrl && !isHttpUrl(imageUrl)) {
      return res.status(400).json({ message: "imageUrl must be a valid http(s) URL" });
    }

    const upload = await uploadImageToCloudinary({
      file: source,
      folder,
    });

    if (!upload.uploaded && upload.provider === "cloudinary") {
      return res.status(500).json({ message: "Image upload failed", error: upload.error });
    }

    return res.status(201).json({
      message: upload.uploaded ? "Image uploaded" : "Using fallback image payload",
      imageUrl: upload.url,
      provider: upload.provider,
      publicId: upload.publicId || null,
      warning: upload.warning || null,
    });
  } catch {
    return res.status(500).json({ message: "Failed to process image upload" });
  }
});

export default router;
