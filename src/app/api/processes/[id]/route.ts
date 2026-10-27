import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

// GET /api/processes/[id] - Lấy chi tiết quy trình và danh sách các giai đoạn
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!isRealDatabaseConfigured()) {
    const process = mockStore.processes.find((p) => p.id === params.id);
    if (!process) {
      return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
    }
    return NextResponse.json({
      process: {
        ...process,
        jobPostings: mockStore.jobs
          .filter((j) => j.processId === params.id)
          .map((j) => ({ id: j.id, title: j.title, status: j.status, quantity: j.quantity })),
      },
    });
  }

  try {
    const process = await prisma.recruitmentProcess.findFirst({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
      include: {
        stages: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: {
              select: { candidates: true, interviews: true },
            },
          },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        jobPostings: {
          select: { id: true, title: true, status: true, quantity: true },
        },
      },
    });

    if (!process) {
      return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng thuộc công ty bạn." }, { status: 404 });
    }

    return NextResponse.json({ process });
  } catch (error: any) {
    console.error("Lỗi lấy chi tiết quy trình:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/processes/[id] - Cập nhật tên hoặc đối tượng áp dụng của quy trình
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền sửa quy trình." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, targetPosition } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên quy trình không được để trống." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const process = mockStore.processes.find((p) => p.id === params.id);
      if (!process) {
        return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
      }

      process.name = name.trim();
      process.title = name.trim();
      process.targetPosition = targetPosition?.trim() || null;

      return NextResponse.json({ success: true, process });
    }

    const existing = await prisma.recruitmentProcess.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
    }

    const updated = await prisma.recruitmentProcess.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        targetPosition: targetPosition?.trim() || null,
      },
      include: {
        stages: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({ success: true, process: updated });
  } catch (error: any) {
    console.error("Lỗi cập nhật quy trình:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/processes/[id] - Xóa quy trình tuyển dụng
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền xóa quy trình." }, { status: 403 });
  }

  try {
    if (!isRealDatabaseConfigured()) {
      const idx = mockStore.processes.findIndex((p) => p.id === params.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
      }
      mockStore.processes.splice(idx, 1);
      return NextResponse.json({ success: true, message: "Đã xóa quy trình tuyển dụng thành công." });
    }

    const existing = await prisma.recruitmentProcess.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        _count: { select: { jobPostings: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
    }

    await prisma.jobPosting.updateMany({
      where: { processId: params.id },
      data: { processId: null },
    });

    await prisma.recruitmentProcess.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa quy trình tuyển dụng thành công." });
  } catch (error: any) {
    console.error("Lỗi xóa quy trình:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
