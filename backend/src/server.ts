import "dotenv/config";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) throw new Error("JWT_SECRET must be set and contain at least 24 characters.");

app.listen(port, "0.0.0.0", () => console.log(`IndoKerja server listening on port ${port}`));
