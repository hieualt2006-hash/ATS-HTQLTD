import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAndEvaluateCV } from "@/lib/gemini";
import { CandidateSource, CandidateStatus } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockCandidate } from "@/lib/mock-store";

export const maxDuration = 60;

// GET /api/candidates - Lấy danh sách ứng viên của công ty (sắp xếp theo điểm AI cao xuống thấp)
export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobPostingId = searchParams.get("jobPostingId")?.trim() || "";
  const currentStageId = searchParams.get("currentStageId")?.trim() || "";
  const source = searchParams.get("source")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const search = searchParams.get("search")?.trim() || "";

  if (!isRealDatabaseConfigured()) {
    let list = mockStore.candidates.filter(
      (c) => c.companyId === session.companyId && !c.id.startsWith("cand_demo_")
    );
    if (jobPostingId && jobPostingId !== "ALL") {
      list = list.filter((c) => c.jobPostingId === jobPostingId);
    }
    if (currentStageId && currentStageId !== "ALL") {
      list = list.filter((c) => c.currentStageId === currentStageId);
    }
    if (source && source !== "ALL") {
      list = list.filter((c) => c.source === source);
    }
    if (status && status !== "ALL") {
      list = list.filter((c) => c.status === status);
    }
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower) ||
          (c.phone && c.phone.includes(lower)) ||
          (c.extractedSkills && c.extractedSkills.toLowerCase().includes(lower))
      );
    }
    list.sort((a, b) => (b.aiMatchScore || 0) - (a.aiMatchScore || 0));
    const sanitizedList = list.map(({ cvFileUrl, rawCvText, ...rest }) => ({
      ...rest,
      cvFileUrl: null,
    }));
    return NextResponse.json({ candidates: sanitizedList });
  }

  try {
    const whereClause: any = {
      companyId: session.companyId,
    };

    if (jobPostingId && jobPostingId !== "ALL") {
      whereClause.jobPostingId = jobPostingId;
    }

    if (currentStageId && currentStageId !== "ALL") {
      whereClause.currentStageId = currentStageId;
    }

    if (source && source !== "ALL") {
      whereClause.source = source as CandidateSource;
    }

    if (status && status !== "ALL") {
      whereClause.status = status as CandidateStatus;
    }

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { extractedSkills: { contains: search, mode: "insensitive" } },
      ];
    }

    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      select: {
        id: true,
        companyId: true,
        jobPostingId: true,
        currentStageId: true,
        fullName: true,
        email: true,
        phone: true,
        source: true,
        status: true,
        extractedSkills: true,
        aiMatchScore: true,
        aiEvaluationSummary: true,
        appliedAt: true,
        jobPosting: {
          select: {
            id: true,
            title: true,
            status: true,
            processId: true,
          },
        },
        currentStage: {
          select: {
            id: true,
            stageName: true,
            orderIndex: true,
          },
        },
      },
      orderBy: [
        { aiMatchScore: "desc" },
        { appliedAt: "desc" },
      ],
    });

    return NextResponse.json({ candidates });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách ứng viên:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/candidates - HR trực tiếp tải file PDF CV lên hệ thống
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền tải hồ sơ ứng viên." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobPostingId = formData.get("jobPostingId") as string | null;

    if (!jobPostingId) {
      return NextResponse.json({ error: "Vui lòng chọn đợt tuyển dụng cần tiếp nhận hồ sơ." }, { status: 400 });
    }

    // 1. Kiểm tra nghiêm ngặt định dạng file PDF
    if (!file) {
      return NextResponse.json({ error: "Vui lòng đính kèm tệp CV ứng viên định dạng PDF." }, { status: 400 });
    }

    const lowerFilename = file.name.toLowerCase();
    if (!lowerFilename.endsWith(".pdf")) {
      return NextResponse.json({
        error: `Tệp "${file.name}" không hợp lệ. Hệ thống chỉ chấp nhận tệp tài liệu PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.`
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 3 * 1024 * 1024) {
      return NextResponse.json({
        error: "Dung lượng tệp CV vượt quá giới hạn 3MB (chuẩn 1 trang A4). Vui lòng chọn tệp nhỏ hơn."
      }, { status: 400 });
    }

    if (buffer.length < 10) {
      return NextResponse.json({ error: "Tệp PDF tải lên bị rỗng." }, { status: 400 });
    }

    const magicHeader = buffer.subarray(0, 5).toString("utf8");
    if (!magicHeader.startsWith("%PDF-")) {
      return NextResponse.json({
        error: `Tệp "${file.name}" không phải là tài liệu PDF hợp lệ (chữ ký tệp không đúng chuẩn PDF). Vui lòng kiểm tra lại.`
      }, { status: 400 });
    }

    // 2. Tìm thông tin đợt tuyển dụng thực tế để đối soát
    let jobPosting: any = null;
    if (!isRealDatabaseConfigured()) {
      jobPosting = mockStore.jobs.find((j) => j.id === jobPostingId) || mockStore.jobs[0];
    } else {
      jobPosting = await prisma.jobPosting.findFirst({
        where: { id: jobPostingId, companyId: session.companyId },
        include: {
          process: {
            include: {
              stages: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      });
    }

    if (!jobPosting) {
      return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng được chọn." }, { status: 404 });
    }

    // 3. Phân tích và bóc tách CV thực tế
    const evalResult = await parseAndEvaluateCV({
      buffer,
      mimeType: "application/pdf",
      filename: file.name,
      jobPosting: {
        title: jobPosting.title,
        description: jobPosting.description,
        requirements: jobPosting.requirements,
        benefits: jobPosting.benefits,
      },
    });

    const fullName = evalResult.fullName.trim() || "Ứng viên Chưa rõ tên";
    const email = evalResult.email.trim().toLowerCase();
    const phone = evalResult.phone.trim() || null;
    const extractedSkills = evalResult.extractedSkills || [];
    const aiMatchScore = evalResult.aiMatchScore;
    const aiEvaluationSummary = evalResult.aiEvaluationSummary;
    const rawCvText = evalResult.rawCvText;
    const cvFileUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;

    if (!isRealDatabaseConfigured()) {
      const stage = jobPosting?.process?.stages?.[0] || null;

      const newCandidate: MockCandidate = {
        id: `cand_${Date.now()}`,
        companyId: session.companyId,
        jobPostingId: jobPosting.id,
        currentStageId: stage?.id || null,
        fullName,
        email: email || "chua-co-email@ungvien.local",
        phone,
        cvFileUrl,
        source: "HR_UPLOAD",
        status: "IN_PROGRESS",
        rawCvText,
        extractedSkills: JSON.stringify(extractedSkills),
        aiMatchScore,
        aiEvaluationSummary,
        appliedAt: new Date().toISOString(),
        jobPosting: {
          id: jobPosting.id,
          title: jobPosting.title,
          status: jobPosting.status,
          processId: jobPosting.processId,
        },
        currentStage: stage
          ? {
              id: stage.id,
              stageName: stage.stageName,
              orderIndex: stage.orderIndex,
            }
          : null,
      };

      mockStore.candidates.unshift(newCandidate);

      if (!Array.isArray(mockStore.notifications)) mockStore.notifications = [];
      mockStore.notifications.unshift({
        id: `notif_${Date.now()}_cv`,
        companyId: session.companyId,
        type: "EXTERNAL_CV",
        title: `Hồ sơ mới: ${fullName}`,
        message: `Hồ sơ của ${fullName} đã được tiếp nhận cho vị trí "${jobPosting.title}".`,
        candidateId: newCandidate.id,
        jobTitle: jobPosting.title,
        link: "/candidates",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      if (aiMatchScore !== null && aiMatchScore !== undefined) {
        mockStore.notifications.unshift({
          id: `notif_${Date.now()}_ai`,
          companyId: session.companyId,
          type: "AI_EVALUATION",
          title: `AI đã chấm điểm CV (${aiMatchScore}%)`,
          message: `Hồ sơ ${fullName} đạt ${aiMatchScore}% tiêu chuẩn cho vị trí "${jobPosting.title}".`,
          candidateId: newCandidate.id,
          jobTitle: jobPosting.title,
          matchScore: aiMatchScore,
          link: "/candidates",
          isRead: false,
          createdAt: new Date(Date.now() + 500).toISOString(),
        });
      }
      mockStore.save();

      return NextResponse.json({ success: true, candidate: newCandidate });
    }

    const firstStage = jobPosting.process?.stages?.[0] || null;

    const candidate = await prisma.candidate.create({
      data: {
        companyId: session.companyId,
        jobPostingId: jobPosting.id,
        currentStageId: firstStage?.id || null,
        fullName,
        email: email || "chua-co-email@ungvien.local",
        phone,
        cvFileUrl,
        source: CandidateSource.HR_UPLOAD,
        status: CandidateStatus.IN_PROGRESS,
        rawCvText,
        extractedSkills: JSON.stringify(extractedSkills),
        aiMatchScore,
        aiEvaluationSummary,
      },
      include: {
        jobPosting: true,
        currentStage: true,
      },
    });

    return NextResponse.json({ success: true, candidate });
  } catch (error: any) {
    console.error("Lỗi tạo ứng viên:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
