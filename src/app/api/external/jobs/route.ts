import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/external/jobs - Cung cấp dữ liệu đợt tuyển dụng thời gian thực cho Portal ứng viên
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim().toLowerCase();
    const jobId = searchParams.get("jobId")?.trim();

    const now = Date.now();

    // 1. Trường hợp tìm theo jobId đơn lẻ
    if (jobId) {
      if (!isRealDatabaseConfigured()) {
        const found = mockStore.jobs.find((j) => j.id === jobId);
        if (!found) {
          return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 });
        }
        const comp = mockStore.companies.find((c) => c.id === found.companyId) || mockStore.company;
        const dept = mockStore.departments.find((d) => d.id === found.departmentId) || null;
        const isExpired = found.deadline ? new Date(found.deadline).getTime() <= now : false;

        return NextResponse.json({
          job: {
            id: found.id,
            title: found.title,
            quantity: found.quantity || 1,
            salaryRange: found.salaryRange || null,
            deadline: found.deadline,
            status: found.status,
            isClosed: found.status === "CLOSED" || isExpired,
            department: dept ? { id: dept.id, name: dept.name } : null,
            company: {
              id: comp.id,
              name: comp.name,
              slug: comp.slug,
            },
          },
        });
      }

      const job = await prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: {
          department: { select: { id: true, name: true } },
          company: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!job) {
        return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 });
      }

      const isExpired = job.deadline ? new Date(job.deadline).getTime() <= now : false;

      return NextResponse.json({
        job: {
          id: job.id,
          title: job.title,
          quantity: job.quantity || 1,
          salaryRange: job.salaryRange || null,
          deadline: job.deadline ? job.deadline.toISOString() : null,
          status: job.status,
          isClosed: job.status === "CLOSED" || isExpired,
          department: job.department,
          company: job.company,
        },
      });
    }

    // 2. Trường hợp tìm danh sách job của công ty theo slug
    if (slug) {
      if (!isRealDatabaseConfigured()) {
        const list = Array.isArray(mockStore.companies) ? mockStore.companies : [];
        const comp = list.find((c) => c.slug === slug || c.name.toLowerCase() === slug) || mockStore.company;
        if (!comp) {
          return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });
        }

        const depts = Array.isArray(mockStore.departments) ? mockStore.departments : [];
        const allJobs = Array.isArray(mockStore.jobs) ? mockStore.jobs : [];
        const openJobs = allJobs
          .filter((j) => {
            if (j.companyId !== comp.id && comp.id) return false;
            if (j.status !== "OPEN") return false;
            if (j.deadline && new Date(j.deadline).getTime() <= now) return false;
            return true;
          })
          .map((j) => {
            const dept = depts.find((d) => d.id === j.departmentId) || null;
            return {
              id: j.id,
              title: j.title,
              quantity: j.quantity || 1,
              salaryRange: j.salaryRange || null,
              deadline: j.deadline,
              department: dept ? { id: dept.id, name: dept.name } : null,
            };
          });

        return NextResponse.json({
          company: {
            id: comp.id,
            name: comp.name,
            slug: comp.slug,
          },
          jobs: openJobs,
        });
      }

      const comp = await prisma.company.findFirst({
        where: {
          OR: [
            { slug: slug },
            { slug: { equals: slug, mode: "insensitive" } },
          ],
        },
        include: {
          jobPostings: {
            where: {
              status: "OPEN",
              OR: [
                { deadline: null },
                { deadline: { gt: new Date() } },
              ],
            },
            include: {
              department: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!comp) {
        return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });
      }

      const jobs = comp.jobPostings.map((j) => ({
        id: j.id,
        title: j.title,
        quantity: j.quantity || 1,
        salaryRange: j.salaryRange || null,
        deadline: j.deadline ? j.deadline.toISOString() : null,
        department: j.department,
      }));

      return NextResponse.json({
        company: {
          id: comp.id,
          name: comp.name,
          slug: comp.slug,
        },
        jobs,
      });
    }

    return NextResponse.json({ error: "Thiếu tham số slug hoặc jobId" }, { status: 400 });
  } catch (error: any) {
    console.error("Lỗi API lấy danh sách việc làm external:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
