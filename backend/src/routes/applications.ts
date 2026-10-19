import { Router } from "express";
import { UserRole } from "../generated/prisma/enums.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { allowRoles, authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, allowRoles(UserRole.JOB_SEEKER), async (req, res) => {
  const input = z.object({ jobId: z.string().min(1), coverLetter: z.string().trim().max(3000).optional() }).parse(req.body);
  const job = await prisma.job.findFirst({ where: { id: input.jobId, isActive: true } });
  if (!job) return res.status(404).json({ error: "Lowongan tidak ditemukan atau sudah ditutup." });
  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({ data: { jobId: job.id, candidateId: req.auth!.id, coverLetter: input.coverLetter || null } });
    await tx.applicationHistory.create({ data: { applicationId: created.id, changedById: req.auth!.id, fromStatus: null, toStatus: "APPLIED", note: "Lamaran dikirim." } });
    return created;
  });
  return res.status(201).json({ application });
});

router.get("/mine", authenticate, allowRoles(UserRole.JOB_SEEKER), async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { candidateId: req.auth!.id },
    include: { job: { include: { company: { select: { companyName: true, name: true } } } }, history: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ applications });
});

router.patch("/:id/status", authenticate, allowRoles(UserRole.COMPANY), async (req, res) => {
  const { status, note } = z.object({ status: z.enum(["APPLIED", "REVIEWING", "SHORTLISTED", "REJECTED", "ACCEPTED"]), note: z.string().trim().max(500).optional() }).parse(req.body);
  const application = await prisma.application.findFirst({ where: { id: req.params.id, job: { companyId: req.auth!.id } } });
  if (!application) return res.status(404).json({ error: "Lamaran tidak ditemukan." });
  if (application.status === status) return res.status(400).json({ error: "Status kandidat sudah menggunakan nilai tersebut." });
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.application.updateMany({ where: { id: application.id, status: application.status }, data: { status } });
    if (changed.count !== 1) throw { status: 409, message: "Status lamaran baru saja diperbarui. Muat ulang daftar kandidat." };
    await tx.applicationHistory.create({ data: { applicationId: application.id, changedById: req.auth!.id, fromStatus: application.status, toStatus: status, note: note || null } });
    return tx.application.findUniqueOrThrow({ where: { id: application.id } });
  });
  return res.json({ application: updated });
});

export default router;
