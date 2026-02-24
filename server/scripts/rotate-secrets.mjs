import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

function generateSecret() {
  return crypto.randomBytes(48).toString("hex");
}

function upsertLine(lines, key, value) {
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));
  const nextLine = `${key}=${value}`;
  if (index === -1) {
    lines.push(nextLine);
  } else {
    lines[index] = nextLine;
  }
}

function rotateJwtSecret() {
  if (!fs.existsSync(envPath)) {
    console.error("No .env file found in server/. Create one from .env.example first.");
    process.exit(1);
  }

  const contents = fs.readFileSync(envPath, "utf8");
  const lines = contents.split(/\r?\n/).filter((line) => line.length > 0);
  upsertLine(lines, "JWT_SECRET", generateSecret());
  fs.writeFileSync(envPath, `${lines.join("\n")}\n`);

  console.log("JWT_SECRET rotated successfully in server/.env");
  console.log("Next recommended actions:");
  console.log("1) Rotate MongoDB Atlas DB credentials from Atlas dashboard");
  console.log("2) Rotate Stripe test secret if currently shared");
  console.log("3) Re-login in all clients since old tokens are now invalid");
}

rotateJwtSecret();
