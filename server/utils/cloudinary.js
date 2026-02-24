import crypto from "crypto";

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function buildSignature(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

export async function uploadImageToCloudinary({ file, folder = "hypekicks" }) {
  if (!hasCloudinaryConfig()) {
    return {
      uploaded: false,
      provider: "dev",
      url: file,
      warning: "Cloudinary is not configured; returning original image payload",
    };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = buildSignature({ folder, timestamp }, apiSecret);
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      uploaded: false,
      provider: "cloudinary",
      error: body || "Cloudinary upload failed",
    };
  }

  const payload = await response.json();
  return {
    uploaded: true,
    provider: "cloudinary",
    url: payload.secure_url,
    publicId: payload.public_id,
  };
}
