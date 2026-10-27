import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAndEvaluateCV } from "@/lib/gemini";

export const maxDuration = 60; // Hỗ trợ Vercel Serverless timeout cho Gemini AI

// POST /api/ai/parse-cv - Bóc tách và chấm điểm CV trực tiếp trên RAM
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobPostingId = formData.get("jobPostingId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn tệp CV định dạng PDF." }, { status: 400 });
    }

    if (!jobPostingId) {
      return NextResponse.json({ error: "Thiếu thông tin đợt tuyển dụng." }, { status: 400 });
    }

    // Xác thực đợt tuyển dụng thuộc công ty này
    let jobPosting: any = null;
    const { isRealDatabaseConfigured } = require("@/lib/db-status");
    const { mockStore } = require("@/lib/mock-store");

    if (!isRealDatabaseConfigured()) {
      jobPosting = mockStore.jobs.find((j: any) => j.id === jobPostingId) || mockStore.jobs[0];
    } else {
      jobPosting = await prisma.jobPosting.findFirst({
        where: {
          id: jobPostingId,
          companyId: session.companyId,
        },
      });
    }

    if (!jobPosting) {
      return NextResponse.json({ error: "Không tìm thấy đợt tuyển dụng thuộc công ty bạn." }, { status: 404 });
    }

    // Đọc buffer trực tiếp trên bộ nhớ RAM (Không lưu ổ cứng - chuẩn Vercel Serverless)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gọi Gemini AI xử lý
    const evaluation = await parseAndEvaluateCV({
      buffer,
      mimeType: file.type || "application/pdf",
      filename: file.name,
      jobPosting: {
        title: jobPosting.title,
        description: jobPosting.description,
        requirements: jobPosting.requirements,
        benefits: jobPosting.benefits,
      },
    });

    return NextResponse.json({
      success: true,
      evaluation,
      filename: file.name,
    });
  } catch (error: any) {
    console.error("Lỗi parse CV bằng Gemini AI:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
