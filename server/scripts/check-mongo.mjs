import dotenv from "dotenv";
import dns from "node:dns/promises";
import mongoose from "mongoose";

dotenv.config();

function redactUri(uri = "") {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

async function checkDns(uri) {
  const host = new URL(uri).host;
  const srvHost = `_mongodb._tcp.${host}`;

  try {
    const records = await dns.resolveSrv(srvHost);
    console.log(`DNS SRV OK: ${srvHost} (${records.length} records)`);
    return { ok: true, host };
  } catch (error) {
    console.log(`DNS SRV FAILED: ${srvHost}`);
    console.log(`Reason: ${error.code || "UNKNOWN"} ${error.syscall || ""}`.trim());
    return { ok: false, host, error };
  }
}

async function checkConnection(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Mongo connection OK");
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log("Mongo connection FAILED");
    console.log(`Reason: ${error.name} ${error.code || ""} ${error.message.split("\n")[0]}`);
    return false;
  }
}

async function main() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.log("MONGO_URI is missing in server/.env");
    process.exit(1);
  }

  console.log(`Using URI: ${redactUri(uri)}`);

  let parsed;
  try {
    parsed = new URL(uri);
  } catch (error) {
    console.log("MONGO_URI is not a valid URL");
    console.log(error.message);
    process.exit(1);
  }

  console.log(`Cluster host: ${parsed.host}`);
  console.log(`Database: ${parsed.pathname.replace("/", "") || "(none)"}`);

  const dnsResult = await checkDns(uri);
  const connectOk = await checkConnection(uri);

  console.log("\nNext actions:");
  if (!dnsResult.ok) {
    console.log("1) Check DNS resolver/network (try 1.1.1.1 or 8.8.8.8)");
    console.log("2) Verify VPN/firewall is not blocking DNS");
    console.log("3) If corporate network blocks SRV lookups, use Atlas Direct Connection URI");
  } else if (!connectOk) {
    console.log("1) Atlas -> Network Access: add your current public IP");
    console.log("2) Atlas -> Database Access: verify username/password");
    console.log("3) Ensure cluster is running and not paused");
  } else {
    console.log("1) Mongo is healthy from this machine");
    console.log("2) Restart server: npm run dev");
  }
}

main();
