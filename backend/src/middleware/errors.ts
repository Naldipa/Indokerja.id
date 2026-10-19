import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { ZodError } from "zod";

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next({ status: 404, message: "Endpoint tidak ditemukan." });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Validasi gagal.", details: error.issues.map(({ path, message }) => ({ field: path.join("."), message })) });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return res.status(409).json({ error: "Lamaran untuk lowongan ini sudah pernah dikirim." });
    if (error.code === "P2025") return res.status(404).json({ error: "Data tidak ditemukan." });
  }
  const value = error as { status?: number; message?: string };
  const status = value.status && value.status >= 400 && value.status < 600 ? value.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: status === 500 ? "Terjadi kesalahan pada server." : value.message ?? "Permintaan tidak dapat diproses." });
}
