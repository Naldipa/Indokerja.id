import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import jobRoutes from "./routes/jobs.js";
import applicationRoutes from "./routes/applications.js";
import { errorHandler, notFound } from "./middleware/errors.js";

export const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use((req, res, next) => {
  const mutatingRequest = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const hasSessionCookie = req.headers.cookie
    ?.split(";")
    .some((part) => part.trim().startsWith("indokerja_session="));

  if (mutatingRequest && hasSessionCookie) {
    const origin = req.get("origin");
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: "Asal permintaan tidak diizinkan." });
    }
  }
  return next();
});
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

if (process.env.NODE_ENV === "production") {
  const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../../frontend/dist");
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
    app.use((req, res, next) => {
      if (req.path === "/api" || req.path.startsWith("/api/") || req.method !== "GET") return next();
      return res.sendFile(resolve(frontendDist, "index.html"), (error) => { if (error) next(error); });
    });
  }
}

app.use(notFound);
app.use(errorHandler);
