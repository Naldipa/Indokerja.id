import "dotenv/config";
import { JobType, UserRole } from "../src/generated/prisma/enums.js";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db.js";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const seeker = await prisma.user.upsert({
    where: { email: "seeker@indokerja.id" },
    update: {},
    create: { name: "Nadia Putri", email: "seeker@indokerja.id", passwordHash, role: UserRole.JOB_SEEKER },
  });
  const company = await prisma.user.upsert({
    where: { email: "company@indokerja.id" },
    update: {},
    create: { name: "Recruitment Team", email: "company@indokerja.id", passwordHash, role: UserRole.COMPANY, companyName: "Nusantara Digital" },
  });
  const existing = await prisma.job.count({ where: { companyId: company.id } });
  if (existing === 0) {
    const jobs = [
      { title: "Senior Product Designer", description: "Rancang pengalaman produk digital yang sederhana dan berdampak. Berkolaborasi dengan product manager dan engineer untuk mengubah insight pengguna menjadi solusi yang elegan.\n\nKualifikasi: pengalaman 3+ tahun di product design, mahir Figma, dan memiliki portfolio yang kuat.", location: "Jakarta (Hybrid)", salaryMin: 14000000, salaryMax: 20000000, type: JobType.FULL_TIME },
      { title: "Frontend Engineer", description: "Bangun antarmuka web yang cepat, accessible, dan mudah dipelihara. Kamu akan bekerja dengan React dan TypeScript bersama tim lintas fungsi.\n\nKualifikasi: pengalaman React, TypeScript, CSS modern, serta perhatian pada detail UX.", location: "Bandung · Remote", salaryMin: 12000000, salaryMax: 18000000, type: JobType.FULL_TIME },
      { title: "Digital Marketing Intern", description: "Bantu tim marketing menjalankan campaign, mengelola konten media sosial, dan menganalisis performa digital.\n\nCocok untuk mahasiswa tingkat akhir yang ingin belajar growth marketing.", location: "Jakarta", salaryMin: 3000000, salaryMax: 4500000, type: JobType.INTERNSHIP },
    ];
    for (const job of jobs) await prisma.job.create({ data: { ...job, companyId: company.id } });
  }
  console.log(`Seeded demo users: ${seeker.email} and company@indokerja.id`);
}

main().finally(() => prisma.$disconnect());
