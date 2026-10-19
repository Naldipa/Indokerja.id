import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { UserRole } from "../generated/prisma/enums.js";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(true),
});
const sessionCookie = "indokerja_session";
const cookieOptions = (rememberMe = true) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.SESSION_COOKIE_SAME_SITE === "none" ? "none" as const : "lax" as const,
  path: "/api",
  ...(rememberMe ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
});
const publicUser = (user: { id: string; name: string; email: string; role: string; companyName: string | null }) => ({
  id: user.id, name: user.name, email: user.email, role: user.role, companyName: user.companyName,
});

router.post("/login", async (req, res) => {
  const { email, password, rememberMe } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Email atau password yang kamu masukkan salah." });
  }
  const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET!, { subject: user.id, expiresIn: "7d" });
  res.cookie(sessionCookie, token, cookieOptions(rememberMe));
  return res.json({ user: publicUser(user) });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.id } });
  if (!user) return res.status(401).json({ error: "Akun tidak ditemukan." });
  return res.json({ user: publicUser(user) });
});

router.patch("/me", authenticate, async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    companyName: z.string().trim().min(2).max(120).optional(),
  }).strict().parse(req.body);
  const currentUser = await prisma.user.findUnique({ where: { id: req.auth!.id }, select: { role: true } });
  if (!currentUser) return res.status(401).json({ error: "Akun tidak ditemukan." });
  if (currentUser.role === UserRole.COMPANY && !input.companyName) {
    return res.status(400).json({ error: "Nama perusahaan wajib diisi." });
  }
  if (currentUser.role === UserRole.JOB_SEEKER && input.companyName !== undefined) {
    return res.status(400).json({ error: "Job seeker tidak dapat mengubah nama perusahaan." });
  }
  const user = await prisma.user.update({
    where: { id: req.auth!.id },
    data: { name: input.name, ...(currentUser.role === UserRole.COMPANY ? { companyName: input.companyName } : {}) },
  });
  return res.json({ user: publicUser(user) });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(sessionCookie, cookieOptions(false));
  return res.status(204).end();
});

export default router;
