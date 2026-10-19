import { Router } from "express";
import { JobType, UserRole } from "../generated/prisma/enums.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { allowRoles, authenticate } from "../middleware/auth.js";

const router = Router();
const jobInput = z.object({
  title: z.string().trim().min(3).max(120), description: z.string().trim().min(30).max(10000),
  location: z.string().trim().min(2).max(120), salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().positive().nullable().optional(), type: z.nativeEnum(JobType),
}).refine((job) => !job.salaryMin || !job.salaryMax || job.salaryMax >= job.salaryMin, { message: "Batas gaji maksimum harus lebih besar dari minimum.", path: ["salaryMax"] });

const jobInclude = {
  company: { select: { id: true, companyName: true, name: true } },
  _count: { select: { applications: true } },
} as const;

router.get("/", async (req, res) => {
  const query = z.object({ q: z.string().trim().max(100).optional(), location: z.string().trim().max(100).optional(), type: z.nativeEnum(JobType).optional() }).parse(req.query);
  const where = {
    isActive: true,
    ...(query.type ? { type: query.type } : {}),
    ...(query.q ? { OR: [ { title: { contains: query.q, mode: "insensitive" as const } }, { description: { contains: query.q, mode: "insensitive" as const } }, { company: { companyName: { contains: query.q, mode: "insensitive" as const } } } ] } : {}),
    ...(query.location ? { location: { contains: query.location, mode: "insensitive" as const } } : {}),
  };
  const jobs = await prisma.job.findMany({ where, include: jobInclude, orderBy: { createdAt: "desc" } });
  return res.json({ jobs });
});

router.get("/company/mine", authenticate, allowRoles(UserRole.COMPANY), async (req, res) => {
  const jobs = await prisma.job.findMany({ where: { companyId: req.auth!.id }, include: jobInclude, orderBy: { createdAt: "desc" } });
  return res.json({ jobs });
});

router.post("/", authenticate, allowRoles(UserRole.COMPANY), async (req, res) => {
  const data = jobInput.parse(req.body);
  const job = await prisma.job.create({ data: { ...data, companyId: req.auth!.id }, include: jobInclude });
  return res.status(201).json({ job });
});

router.get("/:id", async (req, res) => {
  const job = await prisma.job.findFirst({ where: { id: req.params.id, isActive: true }, include: jobInclude });
  if (!job) return res.status(404).json({ error: "Lowongan tidak ditemukan atau sudah ditutup." });
  return res.json({ job });
});

router.get("/:id/applications", authenticate, allowRoles(UserRole.COMPANY), async (req, res) => {
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.auth!.id } });
  if (!job) return res.status(404).json({ error: "Lowongan tidak ditemukan." });
  const applications = await prisma.application.findMany({
    where: { jobId: job.id },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      history: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true, companyName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ job, applications });
});

export default router;
