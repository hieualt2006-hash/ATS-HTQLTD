import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";
import CareerPortalClient from "./CareerPortalClient";

// Luôn lấy dữ liệu thời gian thực mới nhất, không cache cứng
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function CompanyCareersPage({ params }: PageProps) {
  const targetSlug = params.slug?.trim().toLowerCase();

  let company: any = null;
  let departments: any[] = [];
  let openJobs: any[] = [];

  if (!isRealDatabaseConfigured()) {
    const list = Array.isArray(mockStore.companies) ? mockStore.companies : [];
    company = list.find((c) => c.slug === targetSlug || c.name.toLowerCase() === targetSlug) || mockStore.company;

    if (company) {
      const depts = Array.isArray(mockStore.departments) ? mockStore.departments : [];
      departments = depts.filter((d) => d.companyId === company.id);

      const now = Date.now();
      const allJobs = Array.isArray(mockStore.jobs) ? mockStore.jobs : [];
      openJobs = allJobs
        .filter((j) => {
          if (j.companyId !== company.id && !company.id) return false;
          if (j.status !== "OPEN") return false;
          if (j.deadline && new Date(j.deadline).getTime() <= now) return false;
          return true;
        })
        .map((j) => {
          const dept = departments.find((d) => d.id === j.departmentId) || null;
          return {
            ...j,
            department: dept ? { id: dept.id, name: dept.name } : null,
          };
        });
    }
  } else {
    try {
      // Tìm công ty theo slug
      company = await prisma.company.findFirst({
        where: {
          OR: [
            { slug: targetSlug },
            { slug: { equals: targetSlug, mode: "insensitive" } },
          ],
        },
        include: {
          departments: {
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          },
          jobPostings: {
            where: {
              status: "OPEN",
              OR: [
                { deadline: null },
                { deadline: { gt: new Date() } },
              ],
            },
            include: {
              department: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (company) {
        departments = company.departments || [];
        openJobs = company.jobPostings || [];
      }
    } catch (e) {
      console.error("Lỗi truy vấn cơ sở dữ liệu cho Career Portal:", e);
      // Fallback sang mockStore nếu database tạm thời mất kết nối
      const list = Array.isArray(mockStore.companies) ? mockStore.companies : [];
      company = list.find((c) => c.slug === targetSlug) || mockStore.company;
      if (company) {
        departments = mockStore.departments || [];
        openJobs = (mockStore.jobs || []).filter((j) => j.status === "OPEN");
      }
    }
  }

  if (!company) {
    notFound();
  }

  // Format serializable data
  const companyInfo = {
    id: company.id,
    name: company.name,
    slug: company.slug,
    industry: company.industry || null,
    size: company.size || null,
  };

  const serializedJobs = openJobs.map((j: any) => ({
    id: j.id,
    title: j.title,
    quantity: j.quantity || 1,
    salaryRange: j.salaryRange || null,
    description: j.description || "",
    requirements: j.requirements || null,
    benefits: j.benefits || null,
    deadline: j.deadline ? new Date(j.deadline).toISOString() : null,
    createdAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
    department: j.department ? { id: j.department.id, name: j.department.name } : null,
  }));

  return (
    <CareerPortalClient
      company={companyInfo}
      departments={departments}
      initialJobs={serializedJobs}
    />
  );
}
