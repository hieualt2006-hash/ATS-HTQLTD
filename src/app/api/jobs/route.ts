import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockJob } from "@/lib/mock-store";

// GET /api/jobs - Lấy danh sách các đợt tuyển dụng của công ty
export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const departmentId = searchParams.get("departmentId")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";

  if (!isRealDatabaseConfigured()) {
    let list = mockStore.jobs.filter((j) => j.companyId === session.companyId && !j.id.startsWith("job_demo_"));
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(lower) ||
          j.description.toLowerCase().includes(lower)
      );
    }
    if (departmentId && departmentId !== "ALL") {
      list = list.filter((j) => j.departmentId === departmentId);
    }
    if (status && status !== "ALL") {
      list = list.filter((j) => j.status === status);
    }
    return NextResponse.json({ jobs: list });
  }

  try {
    const whereClause: any = {
      companyId: session.companyId,
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (departmentId && departmentId !== "ALL") {
      whereClause.departmentId = departmentId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status as JobStatus;
    }

    const jobs = await prisma.jobPosting.findMany({
      where: whereClause,
      include: {
        department: {
          select: { id: true, name: true },
        },
        process: {
          select: {
            id: true,
            name: true,
            stages: {
              select: { id: true, stageName: true, orderIndex: true },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { candidates: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách đợt tuyển dụng:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/jobs - Tạo mới đợt tuyển dụng của công ty
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền tạo đợt tuyển dụng." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      title,
      departmentId,
      processId,
      quantity,
      salaryRange,
      deadline,
      description,
      requirements,
      benefits,
      status,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tiêu đề đợt tuyển dụng không được để trống." }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Mô tả công việc không được để trống." }, { status: 400 });
    }

    if (!deadline) {
      return NextResponse.json({ error: "Vui lòng chọn hạn chót nộp hồ sơ." }, { status: 400 });
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return NextResponse.json({ error: "Hạn chót nộp hồ sơ không đúng định dạng." }, { status: 400 });
    }
    if (parsedDeadline.getTime() <= Date.now()) {
      return NextResponse.json({
        error: "Hạn chót nộp hồ sơ phải sau thời điểm hiện tại (không được đặt trước hoặc trùng thời gian hiện tại).",
      }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const dept = mockStore.departments.find((d) => d.id === departmentId);
      const proc = mockStore.processes.find((p) => p.id === processId);

      const newJob: MockJob = {
        id: `job_${Date.now()}`,
        companyId: session.companyId,
        departmentId: departmentId || null,
        processId: processId || null,
        title: title.trim(),
        quantity: quantity ? parseInt(quantity, 10) : 1,
        salaryRange: salaryRange?.trim() || null,
        deadline: parsedDeadline ? parsedDeadline.toISOString() : null,
        description: description.trim(),
        requirements: requirements?.trim() || null,
        benefits: benefits?.trim() || null,
        status: (status as any) || "OPEN",
        createdAt: new Date().toISOString(),
        department: dept ? { id: dept.id, name: dept.name } : null,
        process: proc
          ? {
              id: proc.id,
              name: proc.name,
              stages: proc.stages.map((s) => ({
                id: s.id,
                stageName: s.stageName,
                orderIndex: s.orderIndex,
              })),
            }
          : null,
        createdBy: { fullName: session.fullName },
        _count: { candidates: 0 },
      };

      mockStore.jobs.unshift(newJob);
      return NextResponse.json({ success: true, job: newJob });
    }

    // Xác thực departmentId nếu có
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId: session.companyId },
      });
      if (!dept) {
        return NextResponse.json({ error: "Phòng ban đã chọn không tồn tại." }, { status: 400 });
      }
    }

    // Xác thực processId nếu có
    if (processId) {
      const proc = await prisma.recruitmentProcess.findFirst({
        where: { id: processId, companyId: session.companyId },
      });
      if (!proc) {
        return NextResponse.json({ error: "Quy trình tuyển dụng đã chọn không tồn tại." }, { status: 400 });
      }
    }

    const job = await prisma.jobPosting.create({
      data: {
        companyId: session.companyId,
        departmentId: departmentId || null,
        processId: processId || null,
        title: title.trim(),
        quantity: quantity ? parseInt(quantity, 10) : 1,
        salaryRange: salaryRange?.trim() || null,
        deadline: parsedDeadline,
        description: description.trim(),
        requirements: requirements?.trim() || null,
        benefits: benefits?.trim() || null,
        status: (status as JobStatus) || JobStatus.OPEN,
        createdById: session.userId,
      },
      include: {
        department: true,
        process: true,
        createdBy: { select: { fullName: true } },
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("Lỗi tạo đợt tuyển dụng:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
