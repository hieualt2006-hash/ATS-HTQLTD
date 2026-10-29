import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApplyFormClient from "./ApplyFormClient";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

// Luôn lấy dữ liệu thời gian thực mới nhất, không cache cứng
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExternalApplyPage({
  params,
}: {
  params: { jobId: string };
}) {
  let job: any = null;

  if (!isRealDatabaseConfigured()) {
    const found = mockStore.jobs.find((j) => j.id === params.jobId);
    if (found) {
      const comp = mockStore.companies.find((c) => c.id === found.companyId) || mockStore.company;
      const dept = mockStore.departments.find((d) => d.id === found.departmentId) || null;
      job = { ...found, company: comp, department: dept };
    }
  } else {
    try {
      job = await prisma.jobPosting.findUnique({
        where: { id: params.jobId },
        include: {
          company: { select: { id: true, name: true, slug: true } },
          department: { select: { id: true, name: true } },
        },
      });
    } catch {
      const found = mockStore.jobs.find((j) => j.id === params.jobId);
      if (found) {
        const comp = mockStore.companies.find((c) => c.id === found.companyId) || mockStore.company;
        const dept = mockStore.departments.find((d) => d.id === found.departmentId) || null;
        job = { ...found, company: comp, department: dept };
      }
    }
  }

  if (!job) {
    notFound();
  }

  const isExpired = job.deadline ? new Date(job.deadline).getTime() <= Date.now() : false;
  const isClosed = job.status === "CLOSED" || isExpired;

  const initialJobData = {
    id: job.id,
    title: job.title,
    salaryRange: job.salaryRange || null,
    deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
    isClosed,
    department: job.department ? { id: job.department.id, name: job.department.name } : null,
    company: {
      id: job.company?.id || "company",
      name: job.company?.name || "Doanh nghiệp",
      slug: job.company?.slug || "company",
    },
  };

  return <ApplyFormClient initialJob={initialJobData} />;
}
