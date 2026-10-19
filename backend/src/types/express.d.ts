import type { UserRole } from "../generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { id: string; role: UserRole };
    }
  }
}

export {};
