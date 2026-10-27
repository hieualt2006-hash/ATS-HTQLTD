import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CandidateStatus } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

// GET /api/candidates/[id] - Lấy chi tiết hồ sơ ứng viên
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!isRealDatabaseConfigured()) {
    const candidate = mockStore.candidates.find((c) => c.id === params.id);
    if (!candidate) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ ứng viên." }, { status: 404 });
    }
    return NextResponse.json({
      candidate: {
        ...candidate,
        interviews: [],
      },
    });
  }

  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        jobPosting: {
          include: {
            department: true,
            process: {
              include: {
                stages: { orderBy: { orderIndex: "asc" } },
              },
            },
          },
        },
        currentStage: true,
        interviews: {
          include: {
            interviewer: { select: { fullName: true, email: true } },
          },
          orderBy: { startTime: "desc" },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ ứng viên thuộc công ty bạn." }, { status: 404 });
    }

    return NextResponse.json({ candidate });
  } catch (error: any) {
    console.error("Lỗi lấy chi tiết ứng viên:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/candidates/[id] - Cập nhật vòng tuyển (chuyển giai đoạn) hoặc trạng thái (HIRED/REJECTED)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { currentStageId, status, fullName, email, phone } = body;

    if (!isRealDatabaseConfigured()) {
      const candidate = mockStore.candidates.find((c) => c.id === params.id);
      if (!candidate) {
        return NextResponse.json({ error: "Không tìm thấy hồ sơ ứng viên." }, { status: 404 });
      }

      if (status) candidate.status = status;
      if (fullName) candidate.fullName = fullName.trim();
      if (email) candidate.email = email.trim().toLowerCase();
      if (phone !== undefined) candidate.phone = phone?.trim() || null;

      if (currentStageId !== undefined) {
        candidate.currentStageId = currentStageId || null;
        // Tìm stage trong tất cả processes
        let foundStage: any = null;
        for (const proc of mockStore.processes) {
          const stg = proc.stages.find((s) => s.id === currentStageId);
          if (stg) {
            foundStage = stg;
            break;
          }
        }
        candidate.currentStage = foundStage
          ? {
              id: foundStage.id,
              stageName: foundStage.stageName,
              orderIndex: foundStage.orderIndex,
            }
          : null;
      }

      return NextResponse.json({ success: true, candidate });
    }

    const existing = await prisma.candidate.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ ứng viên." }, { status: 404 });
    }

    const updateData: any = {};
    if (currentStageId !== undefined) updateData.currentStageId = currentStageId || null;
    if (status) updateData.status = status as CandidateStatus;
    if (fullName) updateData.fullName = fullName.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    const updated = await prisma.candidate.update({
      where: { id: params.id },
      data: updateData,
      include: {
        jobPosting: true,
        currentStage: true,
      },
    });

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error: any) {
    console.error("Lỗi cập nhật ứng viên:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/candidates/[id] - Xóa hồ sơ ứng viên
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền xóa hồ sơ ứng viên." }, { status: 403 });
  }

  try {
    if (!isRealDatabaseConfigured()) {
      const idx = mockStore.candidates.findIndex((c) => c.id === params.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Không tìm thấy hồ sơ ứng viên." }, { status: 404 });
      }
      mockStore.candidates.splice(idx, 1);
      return NextResponse.json({ success: true, message: "Đã xóa hồ sơ ứng viên thành công." });
    }

    const existing = await prisma.candidate.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ ứng viên." }, { status: 404 });
    }

    await prisma.candidate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa hồ sơ ứng viên thành công." });
  } catch (error: any) {
    console.error("Lỗi xóa ứng viên:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
