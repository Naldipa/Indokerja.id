import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const frontendBuild = resolve("frontend", "dist");
const publicDirectory = resolve("public");

await mkdir(publicDirectory, { recursive: true });
await cp(frontendBuild, publicDirectory, { recursive: true });

console.log("Copied the Vite build into Vercel's public directory.");
