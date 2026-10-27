import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockProcess } from "@/lib/mock-store";

// GET /api/processes - Lấy danh sách quy trình tuyển dụng của công ty
export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";

  if (!isRealDatabaseConfigured()) {
    let list = mockStore.processes.filter((p) => p.companyId === session.companyId && !p.id.startsWith("proc_demo_"));
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          (p.targetPosition && p.targetPosition.toLowerCase().includes(lower))
      );
    }
    return NextResponse.json({ processes: list });
  }

  try {
    const whereClause: any = {
      companyId: session.companyId,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { targetPosition: { contains: search, mode: "insensitive" } },
      ];
    }

    const processes = await prisma.recruitmentProcess.findMany({
      where: whereClause,
      include: {
        stages: {
          orderBy: { orderIndex: "asc" },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: {
            jobPostings: true,
            stages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ processes });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách quy trình:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/processes - Tạo mới quy trình tuyển dụng
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền tạo quy trình tuyển dụng." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, targetPosition, initialStageName, initialDept, initialGoal } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên quy trình tuyển dụng không được để trống." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const newProcessId = `proc_${Date.now()}`;
      const stages: any[] = [];

      if (initialStageName && initialStageName.trim()) {
        stages.push({
          id: `stg_${Date.now()}_1`,
          processId: newProcessId,
          stageName: initialStageName.trim(),
          orderIndex: 1,
          responsibleDept: initialDept?.trim() || "Phòng Nhân sự",
          goalDescription: initialGoal?.trim() || "Tiếp nhận và sơ loại hồ sơ",
          estimatedDays: 2,
        });
      }

      const newProcess: MockProcess = {
        id: newProcessId,
        companyId: session.companyId,
        name: name.trim(),
        title: name.trim(),
        targetPosition: targetPosition?.trim() || null,
        createdAt: new Date().toISOString(),
        stages,
        createdBy: {
          id: session.userId,
          fullName: session.fullName,
          email: session.email,
        },
        _count: {
          jobPostings: 0,
          stages: stages.length,
        },
      };

      mockStore.processes.unshift(newProcess);
      return NextResponse.json({ success: true, process: newProcess });
    }

    const result = await prisma.$transaction(async (tx) => {
      const process = await tx.recruitmentProcess.create({
        data: {
          companyId: session.companyId,
          name: name.trim(),
          targetPosition: targetPosition?.trim() || null,
          createdById: session.userId,
        },
      });

      if (initialStageName && initialStageName.trim()) {
        await tx.processStage.create({
          data: {
            processId: process.id,
            stageName: initialStageName.trim(),
            orderIndex: 1,
            responsibleDept: initialDept?.trim() || "Phòng Nhân sự",
            goalDescription: initialGoal?.trim() || "Tiếp nhận và sơ loại hồ sơ",
            estimatedDays: 2,
          },
        });
      }

      return process;
    });

    const fullProcess = await prisma.recruitmentProcess.findUnique({
      where: { id: result.id },
      include: {
        stages: { orderBy: { orderIndex: "asc" } },
        _count: { select: { jobPostings: true, stages: true } },
      },
    });

    return NextResponse.json({ success: true, process: fullProcess });
  } catch (error: any) {
    console.error("Lỗi tạo quy trình:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
