import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp } from "./app.js";

dotenv.config();

const { MONGO_URI, JWT_SECRET } = process.env;
if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in environment");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("❌ Missing JWT_SECRET in environment");
  process.exit(1);
}

const app = createApp();
const PORT = Number(process.env.PORT) || 5001;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ Mongo error:", err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
