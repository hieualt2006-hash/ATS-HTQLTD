import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

// GET /api/jobs/[id] - Lấy chi tiết đợt tuyển dụng
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!isRealDatabaseConfigured()) {
    const job = mockStore.jobs.find((j) => j.id === params.id);
    if (!job) {
      return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng." }, { status: 404 });
    }
    return NextResponse.json({ job });
  }

  try {
    const job = await prisma.jobPosting.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        department: true,
        process: {
          include: {
            stages: { orderBy: { orderIndex: "asc" } },
          },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { candidates: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng." }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("Lỗi lấy chi tiết đợt tuyển dụng:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/jobs/[id] - Cập nhật đợt tuyển dụng
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền cập nhật đợt tuyển dụng." }, { status: 403 });
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

    let parsedDeadline: Date | null | undefined = undefined;
    if (deadline !== undefined) {
      if (deadline) {
        parsedDeadline = new Date(deadline);
        if (isNaN(parsedDeadline.getTime())) {
          return NextResponse.json({ error: "Hạn chót nộp hồ sơ không đúng định dạng." }, { status: 400 });
        }
        if (parsedDeadline.getTime() <= Date.now()) {
          return NextResponse.json({
            error: "Hạn chót nộp hồ sơ phải sau thời điểm hiện tại (không được đặt trước hoặc trùng thời gian hiện tại).",
          }, { status: 400 });
        }
      } else {
        parsedDeadline = null;
      }
    }

    if (!isRealDatabaseConfigured()) {
      const job = mockStore.jobs.find((j) => j.id === params.id);
      if (!job) {
        return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng thuộc công ty bạn." }, { status: 404 });
      }

      if (title) job.title = title.trim();
      if (description) job.description = description.trim();
      if (requirements !== undefined) job.requirements = requirements?.trim() || null;
      if (benefits !== undefined) job.benefits = benefits?.trim() || null;
      if (salaryRange !== undefined) job.salaryRange = salaryRange?.trim() || null;
      if (quantity !== undefined) job.quantity = parseInt(quantity, 10);
      if (deadline !== undefined) job.deadline = parsedDeadline ? parsedDeadline.toISOString() : null;
      if (status) job.status = status;

      if (departmentId !== undefined) {
        job.departmentId = departmentId || null;
        const dept = mockStore.departments.find((d) => d.id === departmentId);
        job.department = dept ? { id: dept.id, name: dept.name } : null;
      }

      if (processId !== undefined) {
        job.processId = processId || null;
        const proc = mockStore.processes.find((p) => p.id === processId);
        job.process = proc
          ? {
              id: proc.id,
              name: proc.name,
              stages: proc.stages.map((s) => ({
                id: s.id,
                stageName: s.stageName,
                orderIndex: s.orderIndex,
              })),
            }
          : null;
      }

      return NextResponse.json({ success: true, job });
    }

    const existing = await prisma.jobPosting.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng thuộc công ty bạn." }, { status: 404 });
    }

    const updateData: any = {};
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (requirements !== undefined) updateData.requirements = requirements?.trim() || null;
    if (benefits !== undefined) updateData.benefits = benefits?.trim() || null;
    if (salaryRange !== undefined) updateData.salaryRange = salaryRange?.trim() || null;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity, 10);
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (processId !== undefined) updateData.processId = processId || null;
    if (deadline !== undefined) updateData.deadline = parsedDeadline;
    if (status) updateData.status = status as JobStatus;

    const updated = await prisma.jobPosting.update({
      where: { id: params.id },
      data: updateData,
      include: {
        department: true,
        process: true,
      },
    });

    return NextResponse.json({ success: true, job: updated });
  } catch (error: any) {
    console.error("Lỗi cập nhật đợt tuyển dụng:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/jobs/[id] - Xóa đợt tuyển dụng
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền xóa đợt tuyển dụng." }, { status: 403 });
  }

  try {
    if (!isRealDatabaseConfigured()) {
      const idx = mockStore.jobs.findIndex((j) => j.id === params.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng." }, { status: 404 });
      }
      mockStore.jobs.splice(idx, 1);
      return NextResponse.json({ success: true, message: "Đã xóa đợt tuyển dụng thành công." });
    }

    const existing = await prisma.jobPosting.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        _count: { select: { candidates: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng." }, { status: 404 });
    }

    await prisma.jobPosting.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa đợt tuyển dụng thành công." });
  } catch (error: any) {
    console.error("Lỗi xóa đợt tuyển dụng:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
