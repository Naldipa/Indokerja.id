import express from "express";
import { app as apiApp } from "./backend/dist/src/app.js";

// Vercel serves files from public/ through its CDN and runs this Express app
// as a Node.js function for API requests.
const app = express();
app.use(apiApp);

export default app;
