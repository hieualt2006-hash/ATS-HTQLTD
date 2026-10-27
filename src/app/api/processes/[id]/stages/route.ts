import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockStage } from "@/lib/mock-store";

// POST /api/processes/[id]/stages - Thêm giai đoạn mới vào quy trình tuyển dụng
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền thêm giai đoạn." }, { status: 403 });
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

      const maxOrder = process.stages.reduce((max, s) => Math.max(max, s.orderIndex), 0);
      const finalOrder = orderIndex ? parseInt(orderIndex, 10) : maxOrder + 1;

      const newStage: MockStage = {
        id: `stg_${Date.now()}`,
        processId: params.id,
        stageName: stageName.trim(),
        orderIndex: finalOrder,
        responsibleDept: responsibleDept?.trim() || null,
        goalDescription: goalDescription?.trim() || null,
        estimatedDays: estimatedDays ? parseInt(estimatedDays, 10) : null,
        workDescription: workDescription?.trim() || null,
      };

      process.stages.push(newStage);
      process.stages.sort((a, b) => a.orderIndex - b.orderIndex);
      if (process._count) process._count.stages = process.stages.length;

      return NextResponse.json({ success: true, stage: newStage });
    }

    const process = await prisma.recruitmentProcess.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: { stages: { orderBy: { orderIndex: "desc" }, take: 1 } },
    });

    if (!process) {
      return NextResponse.json({ error: "Không tìm thấy quy trình tuyển dụng." }, { status: 404 });
    }

    const maxOrder = process.stages[0]?.orderIndex || 0;
    const finalOrder = orderIndex ? parseInt(orderIndex, 10) : maxOrder + 1;

    const newStage = await prisma.processStage.create({
      data: {
        processId: params.id,
        stageName: stageName.trim(),
        orderIndex: finalOrder,
        responsibleDept: responsibleDept?.trim() || null,
        goalDescription: goalDescription?.trim() || null,
        estimatedDays: estimatedDays ? parseInt(estimatedDays, 10) : null,
        workDescription: workDescription?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, stage: newStage });
  } catch (error: any) {
    console.error("Lỗi thêm giai đoạn tuyển dụng:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
