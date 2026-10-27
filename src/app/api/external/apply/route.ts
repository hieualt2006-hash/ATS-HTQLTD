import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAndEvaluateCV } from "@/lib/gemini";
import { CandidateSource, CandidateStatus, JobStatus } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockCandidate } from "@/lib/mock-store";

export const maxDuration = 60; // Hỗ trợ Gemini AI serverless timeout

// POST /api/external/apply - Cổng nhận hồ sơ nộp đơn độc lập từ bên ngoài
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const jobPostingId = formData.get("jobPostingId") as string | null;
    let fullName = formData.get("fullName") as string | null;
    let email = formData.get("email") as string | null;
    let phone = formData.get("phone") as string | null;
    const file = formData.get("file") as File | null;

    if (!jobPostingId) {
      return NextResponse.json({ error: "Không tìm thấy mã đợt tuyển dụng." }, { status: 400 });
    }

    // 1. Kiểm tra đợt tuyển dụng thực tế
    let jobPosting: any = null;
    if (!isRealDatabaseConfigured()) {
      jobPosting = mockStore.jobs.find((j) => j.id === jobPostingId);
    } else {
      jobPosting = await prisma.jobPosting.findUnique({
        where: { id: jobPostingId },
        include: {
          company: true,
          process: {
            include: {
              stages: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      });
    }

    if (!jobPosting) {
      return NextResponse.json({ error: "Không tìm thấy thông tin đợt tuyển dụng." }, { status: 404 });
    }

    // 2. Kiểm tra nghiêm ngặt tệp PDF
    if (!file) {
      return NextResponse.json({ error: "Vui lòng đính kèm tệp CV định dạng PDF của bạn." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({
        error: `Tệp "${file.name}" không hợp lệ. Hệ thống chỉ chấp nhận tệp tài liệu PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.`
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 10 || !buffer.subarray(0, 5).toString("utf8").startsWith("%PDF-")) {
      return NextResponse.json({
        error: `Tệp "${file.name}" không phải là tài liệu PDF hợp lệ. Vui lòng kiểm tra lại tệp PDF của bạn.`
      }, { status: 400 });
    }

    const cvFileUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;

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

    if (!fullName || !fullName.trim()) fullName = evalResult.fullName;
    if (!email || !email.trim()) email = evalResult.email;
    if (!phone || !phone.trim()) phone = evalResult.phone;

    const extractedSkills = evalResult.extractedSkills || [];
    const aiMatchScore = evalResult.aiMatchScore;
    const aiEvaluationSummary = evalResult.aiEvaluationSummary;
    const rawCvText = evalResult.rawCvText;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập Họ và Tên của bạn." }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập địa chỉ Email liên hệ." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const job = mockStore.jobs.find((j) => j.id === jobPostingId) || mockStore.jobs[0];
      const stage = job?.process?.stages?.[0] || null;

      const newCand: MockCandidate = {
        id: `cand_${Date.now()}`,
        companyId: mockStore.company.id,
        jobPostingId: job ? job.id : jobPostingId,
        currentStageId: stage?.id || null,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        cvFileUrl,
        source: "EXTERNAL_FORM",
        status: "IN_PROGRESS",
        rawCvText,
        extractedSkills: extractedSkills.length > 0 ? JSON.stringify(extractedSkills) : '["Kỹ năng", "Chuyên môn"]',
        aiMatchScore,
        aiEvaluationSummary,
        appliedAt: new Date().toISOString(),
        jobPosting: {
          id: job ? job.id : jobPostingId,
          title: job ? job.title : "Đợt tuyển dụng",
          status: job ? job.status : "OPEN",
          processId: job ? job.processId : null,
        },
        currentStage: stage
          ? {
              id: stage.id,
              stageName: stage.stageName,
              orderIndex: stage.orderIndex,
            }
          : null,
      };

      mockStore.candidates.unshift(newCand);

      // Tự động tạo thông báo hồ sơ mới và kết quả AI đánh giá
      if (!Array.isArray(mockStore.notifications)) mockStore.notifications = [];
      mockStore.notifications.unshift({
        id: `notif_${Date.now()}_cv`,
        companyId: mockStore.company.id,
        type: "EXTERNAL_CV",
        title: "Ứng viên mới nộp CV trực tuyến",
        message: `${fullName.trim()} vừa nộp hồ sơ ứng tuyển vị trí "${job?.title || "Tuyển dụng"}".`,
        candidateId: newCand.id,
        jobTitle: job?.title,
        link: "/candidates",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      if (aiMatchScore !== null && aiMatchScore !== undefined) {
        mockStore.notifications.unshift({
          id: `notif_${Date.now()}_ai`,
          companyId: mockStore.company.id,
          type: "AI_EVALUATION",
          title: `AI đã chấm điểm CV (${aiMatchScore}%)`,
          message: `Hồ sơ ${fullName.trim()} đạt ${aiMatchScore}% tiêu chuẩn vị trí "${job?.title || "Tuyển dụng"}". ${aiMatchScore >= 80 ? "Ứng viên rất tiềm năng!" : aiMatchScore >= 50 ? "Đạt tiêu chuẩn." : "Cần xem xét kỹ."}`,
          candidateId: newCand.id,
          jobTitle: job?.title,
          matchScore: aiMatchScore,
          link: "/candidates",
          isRead: false,
          createdAt: new Date(Date.now() + 500).toISOString(),
        });
      }
      mockStore.save();

      return NextResponse.json({
        success: true,
        message: `Đã gửi hồ sơ ứng tuyển vị trí "${job?.title || "Tuyển dụng"}" tới phòng Nhân sự ${mockStore.company.name} thành công!`,
        candidateId: newCand.id,
      });
    }

    // 1. Kiểm tra đợt tuyển dụng
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
      include: {
        company: true,
        process: {
          include: {
            stages: { orderBy: { orderIndex: "asc" } },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Đợt tuyển dụng này không tồn tại hoặc đã bị gỡ." }, { status: 404 });
    }

    if (job.status !== JobStatus.OPEN) {
      return NextResponse.json(
        { error: "Rất tiếc, đợt tuyển dụng này hiện đã đóng tiếp nhận hồ sơ mới." },
        { status: 400 }
      );
    }

    const firstStage = job.process?.stages?.[0] || null;

    const candidate = await prisma.candidate.create({
      data: {
        companyId: job.companyId,
        jobPostingId: job.id,
        currentStageId: firstStage?.id || null,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        cvFileUrl,
        source: CandidateSource.EXTERNAL_FORM,
        status: CandidateStatus.IN_PROGRESS,
        rawCvText,
        extractedSkills: JSON.stringify(extractedSkills),
        aiMatchScore,
        aiEvaluationSummary,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã gửi hồ sơ ứng tuyển vị trí "${job.title}" tới phòng Nhân sự ${job.company.name} thành công!`,
      candidateId: candidate.id,
    });
  } catch (error: any) {
    console.error("Lỗi tiếp nhận hồ sơ từ form ngoài:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi gửi hồ sơ: " + (error?.message || "Vui lòng thử lại sau.") },
      { status: 500 }
    );
  }
}
