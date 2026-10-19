import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

// Keep TLS mandatory while matching PostgreSQL/libpq semantics for
// `sslmode=require` (encryption without validating the server certificate).
const adapterUrl = new URL(connectionString);
adapterUrl.searchParams.set("sslmode", "require");
adapterUrl.searchParams.set("uselibpqcompat", "true");

const adapter = new PrismaPg({ connectionString: adapterUrl.toString() });

export const prisma = new PrismaClient({ adapter });
