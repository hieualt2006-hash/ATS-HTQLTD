import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockInterview } from "@/lib/mock-store";

function generateMeetCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(3)}-${part(4)}-${part(3)}`;
}

// GET: Lấy danh sách lịch phỏng vấn
export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const getMockInterviews = () => {
    let list = Array.isArray(mockStore.interviews) ? mockStore.interviews : [];
    let filtered = list.filter((i) => i && i.companyId === session.companyId);

    if (session.role === "INTERVIEWER") {
      filtered = filtered.filter((i) => i.interviewerId === session.userId);
    }

    // Nạp đầy đủ thông tin candidate, stage, interviewer
    return filtered.map((item) => {
      const cand = mockStore.candidates.find((c) => c.id === item.candidateId);
      const stage = item.stageId
        ? mockStore.processes.flatMap((p) => p.stages || []).find((s) => s.id === item.stageId)
        : cand?.currentStage;
      const interviewer = mockStore.users.find((u) => u.id === item.interviewerId);

      return {
        ...item,
        candidate: item.candidate || (cand ? {
          id: cand.id,
          fullName: cand.fullName,
          email: cand.email,
          phone: cand.phone,
          cvFileUrl: cand.cvFileUrl,
          jobPosting: cand.jobPosting,
        } : null),
        stage: item.stage || (stage ? {
          id: stage.id,
          stageName: stage.stageName,
          orderIndex: stage.orderIndex,
        } : null),
        interviewer: item.interviewer || (interviewer ? {
          id: interviewer.id,
          fullName: interviewer.fullName,
          email: interviewer.email,
        } : null),
      };
    });
  };

  if (!isRealDatabaseConfigured()) {
    return NextResponse.json({ interviews: getMockInterviews() });
  }

  try {
    const whereClause: any = { companyId: session.companyId };
    if (session.role === "INTERVIEWER") {
      whereClause.interviewerId = session.userId;
    }

    const interviews = await prisma.interview.findMany({
      where: whereClause,
      include: {
        candidate: {
          include: { jobPosting: { select: { id: true, title: true } } },
        },
        stage: true,
        interviewer: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ interviews });
  } catch (err: any) {
    console.warn("Lỗi truy vấn Prisma interviews, chuyển sang mockStore:", err?.message);
    return NextResponse.json({ interviews: getMockInterviews() });
  }
}

// POST: Tạo lịch phỏng vấn mới
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền lên lịch phỏng vấn." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      candidateId,
      stageId,
      interviewerId,
      startTime,
      durationMinutes = 45,
      meetLink,
      interviewerNotes,
    } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "Vui lòng chọn ứng viên cần phỏng vấn." }, { status: 400 });
    }
    if (!startTime) {
      return NextResponse.json({ error: "Vui lòng chọn thời gian bắt đầu phỏng vấn." }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + Number(durationMinutes) * 60000);
    const finalMeetLink = meetLink?.trim() || `https://meet.google.com/${generateMeetCode()}`;

    if (!isRealDatabaseConfigured()) {
      const cand = mockStore.candidates.find((c) => c.id === candidateId);
      const stage = stageId
        ? mockStore.processes.flatMap((p) => p.stages || []).find((s) => s.id === stageId)
        : cand?.currentStage;
      const interviewer = interviewerId
        ? mockStore.users.find((u) => u.id === interviewerId)
        : mockStore.users.find((u) => u.role === "COMPANY_ADMIN") || mockStore.users[0];

      const newInterview: MockInterview = {
        id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        companyId: session.companyId,
        candidateId,
        stageId: stage?.id || null,
        interviewerId: interviewer?.id || session.userId,
        createdById: session.userId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        meetLink: finalMeetLink,
        rating: null,
        interviewerNotes: interviewerNotes?.trim() || null,
        evaluationResult: "PENDING",
        createdAt: new Date().toISOString(),
        candidate: cand ? {
          id: cand.id,
          fullName: cand.fullName,
          email: cand.email,
          phone: cand.phone,
          cvFileUrl: cand.cvFileUrl,
          jobPosting: cand.jobPosting,
        } : null,
        stage: stage ? {
          id: stage.id,
          stageName: stage.stageName,
          orderIndex: stage.orderIndex,
        } : null,
        interviewer: interviewer ? {
          id: interviewer.id,
          fullName: interviewer.fullName,
          email: interviewer.email,
        } : null,
      };

      if (!Array.isArray(mockStore.interviews)) mockStore.interviews = [];
      mockStore.interviews.unshift(newInterview);

      if (!Array.isArray(mockStore.notifications)) mockStore.notifications = [];
      mockStore.notifications.unshift({
        id: `notif_${Date.now()}_int`,
        companyId: session.companyId,
        type: "INTERVIEW",
        title: "Lịch phỏng vấn mới được tạo",
        message: `Đã lên lịch phỏng vấn ứng viên ${cand?.fullName || "mới"} cho vị trí "${cand?.jobPosting?.title || "Tuyển dụng"}".`,
        candidateId: cand?.id,
        link: "/interviews",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      mockStore.save();

      return NextResponse.json({ success: true, interview: newInterview });
    }

    try {
      const interview = await prisma.interview.create({
        data: {
          companyId: session.companyId,
          candidateId,
          stageId: stageId || null,
          interviewerId: interviewerId || session.userId,
          createdById: session.userId,
          startTime: start,
          endTime: end,
          meetLink: finalMeetLink,
          interviewerNotes: interviewerNotes?.trim() || null,
          evaluationResult: "PENDING",
        },
        include: {
          candidate: {
            include: { jobPosting: { select: { id: true, title: true } } },
          },
          stage: true,
          interviewer: { select: { id: true, fullName: true, email: true } },
        },
      });

      return NextResponse.json({ success: true, interview });
    } catch (dbErr: any) {
      console.warn("Lỗi lưu Prisma interview, lưu vào mockStore:", dbErr?.message);
      const cand = mockStore.candidates.find((c) => c.id === candidateId);
      const stage = stageId
        ? mockStore.processes.flatMap((p) => p.stages || []).find((s) => s.id === stageId)
        : cand?.currentStage;
      const interviewer = interviewerId
        ? mockStore.users.find((u) => u.id === interviewerId)
        : mockStore.users[0];

      const newInterview: MockInterview = {
        id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        companyId: session.companyId,
        candidateId,
        stageId: stage?.id || null,
        interviewerId: interviewer?.id || session.userId,
        createdById: session.userId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        meetLink: finalMeetLink,
        rating: null,
        interviewerNotes: interviewerNotes?.trim() || null,
        evaluationResult: "PENDING",
        createdAt: new Date().toISOString(),
        candidate: cand ? {
          id: cand.id,
          fullName: cand.fullName,
          email: cand.email,
          phone: cand.phone,
          cvFileUrl: cand.cvFileUrl,
          jobPosting: cand.jobPosting,
        } : null,
        stage: stage ? {
          id: stage.id,
          stageName: stage.stageName,
          orderIndex: stage.orderIndex,
        } : null,
        interviewer: interviewer ? {
          id: interviewer.id,
          fullName: interviewer.fullName,
          email: interviewer.email,
        } : null,
      };

      if (!Array.isArray(mockStore.interviews)) mockStore.interviews = [];
      mockStore.interviews.unshift(newInterview);
      mockStore.save();

      return NextResponse.json({ success: true, interview: newInterview });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Chấm điểm và đánh giá ứng viên sau buổi phỏng vấn
export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, rating, evaluationResult, interviewerNotes } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID lịch phỏng vấn." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const interview = mockStore.interviews.find((i) => i.id === id);
      if (!interview) {
        return NextResponse.json({ error: "Không tìm thấy lịch phỏng vấn." }, { status: 404 });
      }

      if (rating !== undefined) interview.rating = Number(rating);
      if (evaluationResult !== undefined) interview.evaluationResult = evaluationResult;
      if (interviewerNotes !== undefined) interview.interviewerNotes = interviewerNotes;
      mockStore.save();

      return NextResponse.json({ success: true, interview });
    }

    try {
      const updated = await prisma.interview.update({
        where: { id },
        data: {
          rating: rating !== undefined ? Number(rating) : undefined,
          evaluationResult: evaluationResult || undefined,
          interviewerNotes: interviewerNotes !== undefined ? interviewerNotes : undefined,
        },
        include: {
          candidate: {
            include: { jobPosting: { select: { id: true, title: true } } },
          },
          stage: true,
          interviewer: { select: { id: true, fullName: true, email: true } },
        },
      });

      return NextResponse.json({ success: true, interview: updated });
    } catch (dbErr: any) {
      const interview = mockStore.interviews.find((i) => i.id === id);
      if (!interview) {
        return NextResponse.json({ error: "Không tìm thấy lịch phỏng vấn." }, { status: 404 });
      }

      if (rating !== undefined) interview.rating = Number(rating);
      if (evaluationResult !== undefined) interview.evaluationResult = evaluationResult;
      if (interviewerNotes !== undefined) interview.interviewerNotes = interviewerNotes;
      mockStore.save();

      return NextResponse.json({ success: true, interview });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Hủy lịch phỏng vấn
export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role === "INTERVIEWER") {
    return NextResponse.json({ error: "Chỉ Quản trị viên và HR mới có quyền hủy lịch phỏng vấn." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID lịch phỏng vấn." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const idx = mockStore.interviews.findIndex((i) => i.id === id);
      if (idx !== -1) {
        mockStore.interviews.splice(idx, 1);
        mockStore.save();
      }
      return NextResponse.json({ success: true, message: "Đã xóa lịch phỏng vấn thành công." });
    }

    try {
      await prisma.interview.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Đã xóa lịch phỏng vấn thành công." });
    } catch (dbErr: any) {
      const idx = mockStore.interviews.findIndex((i) => i.id === id);
      if (idx !== -1) {
        mockStore.interviews.splice(idx, 1);
        mockStore.save();
      }
      return NextResponse.json({ success: true, message: "Đã xóa lịch phỏng vấn thành công." });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
