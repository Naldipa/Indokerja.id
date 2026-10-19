import express from "express";
import { statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { app as apiApp } from "./backend/dist/src/app.js";

const app = express();

// Serve the Vite output from the function as well as from Vercel's static CDN.
// This handles the root page when Vercel routes it through the Express function.
const publicDirectory = resolve(process.cwd(), "public");
app.use((req, res, next) => {
  if ((req.method !== "GET" && req.method !== "HEAD") || req.path === "/api" || req.path.startsWith("/api/")) {
    return next();
  }

  let requestedPath;
  try {
    requestedPath = decodeURIComponent(req.path);
  } catch {
    return next();
  }

  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  let filePath = resolve(publicDirectory, relativePath);
  if (filePath !== publicDirectory && !filePath.startsWith(`${publicDirectory}${sep}`)) return next();

  const isFile = (path) => {
    try {
      return statSync(path).isFile();
    } catch {
      return false;
    }
  };

  if (!isFile(filePath)) {
    if (extname(relativePath)) return next();
    filePath = resolve(publicDirectory, "index.html");
    if (!isFile(filePath)) return next();
  }

  return res.sendFile(filePath, (error) => {
    if (error) next(error);
  });
});

app.use(apiApp);

export default app;
