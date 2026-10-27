import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

// PUT /api/processes/[id]/stages/[stageId] - Chỉnh sửa giai đoạn tuyển dụng
export async function PUT(
  req: Request,
  { params }: { params: { id: string; stageId: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền sửa giai đoạn." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { stageName, orderIndex, responsibleDept, goalDescription, estimatedDays, workDescription } = body;

    if (!stageName || !stageName.trim()) {
      return NextResponse.json({ error: "Tên giai đoạn không được để trống." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const process = mockStore.processes.find((p) => p.id === params.id);
      if (!process) {
        return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
      }

      const stage = process.stages.find((s) => s.id === params.stageId);
      if (!stage) {
        return NextResponse.json({ error: "Không tìm thấy giai đoạn cần sửa." }, { status: 404 });
      }

      stage.stageName = stageName.trim();
      if (orderIndex !== undefined) stage.orderIndex = parseInt(orderIndex, 10);
      if (responsibleDept !== undefined) stage.responsibleDept = responsibleDept?.trim() || null;
      if (goalDescription !== undefined) stage.goalDescription = goalDescription?.trim() || null;
      if (estimatedDays !== undefined) {
        stage.estimatedDays = estimatedDays !== null && estimatedDays !== "" ? parseInt(estimatedDays, 10) : null;
      }
      if (workDescription !== undefined) stage.workDescription = workDescription?.trim() || null;

      process.stages.sort((a, b) => a.orderIndex - b.orderIndex);

      return NextResponse.json({ success: true, stage });
    }

    // Xác minh quy trình thuộc công ty
    const process = await prisma.recruitmentProcess.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!process) {
      return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
    }

    const stage = await prisma.processStage.findFirst({
      where: { id: params.stageId, processId: params.id },
    });

    if (!stage) {
      return NextResponse.json({ error: "Không tìm thấy giai đoạn cần sửa." }, { status: 404 });
    }

    const updatedStage = await prisma.processStage.update({
      where: { id: params.stageId },
      data: {
        stageName: stageName.trim(),
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : stage.orderIndex,
        responsibleDept: responsibleDept?.trim() || null,
        goalDescription: goalDescription?.trim() || null,
        estimatedDays: estimatedDays !== undefined && estimatedDays !== null && estimatedDays !== "" ? parseInt(estimatedDays, 10) : null,
        workDescription: workDescription?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, stage: updatedStage });
  } catch (error: any) {
    console.error("Lỗi cập nhật giai đoạn:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/processes/[id]/stages/[stageId] - Xóa giai đoạn tuyển dụng
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; stageId: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền xóa giai đoạn." }, { status: 403 });
  }

  try {
    if (!isRealDatabaseConfigured()) {
      const process = mockStore.processes.find((p) => p.id === params.id);
      if (!process) {
        return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
      }

      const idx = process.stages.findIndex((s) => s.id === params.stageId);
      if (idx === -1) {
        return NextResponse.json({ error: "Không tìm thấy giai đoạn cần xóa." }, { status: 404 });
      }

      process.stages.splice(idx, 1);
      if (process._count) process._count.stages = process.stages.length;

      // Unlink candidates that were on this stage
      for (const cand of mockStore.candidates) {
        if (cand.currentStageId === params.stageId) {
          cand.currentStageId = null;
          cand.currentStage = null;
        }
      }

      return NextResponse.json({ success: true, message: "Đã xóa giai đoạn thành công." });
    }

    const process = await prisma.recruitmentProcess.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!process) {
      return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
    }

    const stage = await prisma.processStage.findFirst({
      where: { id: params.stageId, processId: params.id },
    });

    if (!stage) {
      return NextResponse.json({ error: "Không tìm thấy giai đoạn cần xóa." }, { status: 404 });
    }

    await prisma.candidate.updateMany({
      where: { currentStageId: params.stageId },
      data: { currentStageId: null },
    });

    await prisma.interview.updateMany({
      where: { stageId: params.stageId },
      data: { stageId: null },
    });

    await prisma.processStage.delete({
      where: { id: params.stageId },
    });

    return NextResponse.json({ success: true, message: "Đã xóa giai đoạn thành công." });
  } catch (error: any) {
    console.error("Lỗi xóa giai đoạn:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
