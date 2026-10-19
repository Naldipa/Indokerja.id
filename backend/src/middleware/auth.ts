import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../generated/prisma/enums.js";

type TokenPayload = { sub: string; role: UserRole };
const sessionCookie = "indokerja_session";

function getToken(req: Request) {
  const session = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`));
  return session?.slice(sessionCookie.length + 1);
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) return next({ status: 401, message: "Silakan login untuk melanjutkan." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (!payload.sub || !Object.values(UserRole).includes(payload.role)) throw new Error("Invalid token");
    req.auth = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next({ status: 401, message: "Sesi login tidak valid atau sudah berakhir." });
  }
}

export function allowRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next({ status: 401, message: "Silakan login untuk melanjutkan." });
    if (!roles.includes(req.auth.role)) return next({ status: 403, message: "Anda tidak memiliki akses ke fitur ini." });
    next();
  };
}
