import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface NotificationItem {
  id: string;
  companyId: string;
  type: "EXTERNAL_CV" | "AI_EVALUATION" | "INTERVIEW" | "SYSTEM";
  title: string;
  message: string;
  candidateId?: string | null;
  jobTitle?: string | null;
  matchScore?: number | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

// GET /api/notifications: Lấy danh sách thông báo thực tế thời gian thực
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Đọc danh sách các thông báo đã đọc từ Cookie
  const cookieStore = cookies();
  const readCookie = cookieStore.get(`ats_read_notifs_${session.companyId}`)?.value || cookieStore.get("ats_read_notifs")?.value;
  let readIds: string[] = [];
  try {
    if (readCookie) {
      readIds = JSON.parse(readCookie);
    }
  } catch {}

  const notifications: NotificationItem[] = [];

  if (isRealDatabaseConfigured()) {
    try {
      // 1. Lấy danh sách ứng viên đã nộp vào công ty này
      const candidates = await prisma.candidate.findMany({
        where: { companyId: session.companyId },
        include: {
          jobPosting: {
            select: { title: true },
          },
        },
        orderBy: { appliedAt: "desc" },
        take: 30,
      });

      for (const c of candidates) {
        const cvNotifId = `notif_${c.id}_cv`;
        notifications.push({
          id: cvNotifId,
          companyId: session.companyId,
          type: "EXTERNAL_CV",
          title: "Ứng viên mới nộp CV trực tuyến",
          message: `${c.fullName} vừa nộp hồ sơ ứng tuyển vị trí "${c.jobPosting?.title || "Tuyển dụng"}".`,
          candidateId: c.id,
          jobTitle: c.jobPosting?.title || null,
          link: "/candidates",
          isRead: readIds.includes(cvNotifId),
          createdAt: c.appliedAt.toISOString(),
        });

        // Thông báo điểm đánh giá AI nếu đã chấm
        if (c.aiMatchScore !== null && c.aiMatchScore !== undefined) {
          const aiNotifId = `notif_${c.id}_ai`;
          notifications.push({
            id: aiNotifId,
            companyId: session.companyId,
            type: "AI_EVALUATION",
            title: `AI đã chấm điểm CV (${c.aiMatchScore}%)`,
            message: `Hồ sơ ${c.fullName} đạt ${c.aiMatchScore}% tiêu chuẩn vị trí "${c.jobPosting?.title || "Tuyển dụng"}". ${
              c.aiMatchScore >= 80 ? "Ứng viên rất tiềm năng!" : c.aiMatchScore >= 50 ? "Đạt tiêu chuẩn." : "Cần xem xét thêm."
            }`,
            candidateId: c.id,
            jobTitle: c.jobPosting?.title || null,
            matchScore: c.aiMatchScore,
            link: "/candidates",
            isRead: readIds.includes(aiNotifId),
            createdAt: new Date(new Date(c.appliedAt).getTime() + 1000).toISOString(),
          });
        }
      }

      // 2. Lấy danh sách lịch phỏng vấn gần đây của công ty
      const interviews = await prisma.interview.findMany({
        where: { companyId: session.companyId },
        include: {
          candidate: { select: { fullName: true } },
          stage: { select: { stageName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      });

      for (const i of interviews) {
        const intNotifId = `notif_int_${i.id}`;
        notifications.push({
          id: intNotifId,
          companyId: session.companyId,
          type: "INTERVIEW",
          title: "Lịch phỏng vấn mới được thiết lập",
          message: `Phỏng vấn ứng viên ${i.candidate.fullName} vòng "${i.stage?.stageName || "Phỏng vấn"}".`,
          candidateId: i.candidateId,
          link: "/interviews",
          isRead: readIds.includes(intNotifId),
          createdAt: i.createdAt.toISOString(),
        });
      }
    } catch (e) {
      console.error("Lỗi truy vấn thông báo từ database:", e);
    }
  } else {
    // Môi trường mockStore
    const candidates = (mockStore.candidates || [])
      .filter((c) => c.companyId === session.companyId || !c.companyId)
      .slice(0, 30);

    for (const c of candidates) {
      const cvNotifId = `notif_${c.id}_cv`;
      notifications.push({
        id: cvNotifId,
        companyId: session.companyId,
        type: "EXTERNAL_CV",
        title: "Ứng viên mới nộp CV trực tuyến",
        message: `${c.fullName} vừa nộp hồ sơ ứng tuyển vị trí "${c.jobPosting?.title || "Tuyển dụng"}".`,
        candidateId: c.id,
        jobTitle: c.jobPosting?.title || null,
        link: "/candidates",
        isRead: readIds.includes(cvNotifId),
        createdAt: c.appliedAt,
      });

      if (c.aiMatchScore !== null && c.aiMatchScore !== undefined) {
        const aiNotifId = `notif_${c.id}_ai`;
        notifications.push({
          id: aiNotifId,
          companyId: session.companyId,
          type: "AI_EVALUATION",
          title: `AI đã chấm điểm CV (${c.aiMatchScore}%)`,
          message: `Hồ sơ ${c.fullName} đạt ${c.aiMatchScore}% tiêu chuẩn vị trí "${c.jobPosting?.title || "Tuyển dụng"}".`,
          candidateId: c.id,
          jobTitle: c.jobPosting?.title || null,
          matchScore: c.aiMatchScore,
          link: "/candidates",
          isRead: readIds.includes(aiNotifId),
          createdAt: new Date(new Date(c.appliedAt).getTime() + 1000).toISOString(),
        });
      }
    }
  }

  // Sắp xếp thông báo mới nhất lên đầu
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

// PUT /api/notifications: Đánh dấu đã đọc
export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, markAll } = body;

    const cookieStore = cookies();
    const cookieKey = `ats_read_notifs_${session.companyId}`;
    const readCookie = cookieStore.get(cookieKey)?.value;
    let readIds: string[] = [];
    try {
      if (readCookie) readIds = JSON.parse(readCookie);
    } catch {}

    if (markAll) {
      // Đánh dấu tất cả thông báo hiện có là đã đọc
      let allIds: string[] = [];
      if (isRealDatabaseConfigured()) {
        const cands = await prisma.candidate.findMany({
          where: { companyId: session.companyId },
          select: { id: true, aiMatchScore: true },
          take: 30,
        });
        cands.forEach((c) => {
          allIds.push(`notif_${c.id}_cv`);
          if (c.aiMatchScore !== null && c.aiMatchScore !== undefined) {
            allIds.push(`notif_${c.id}_ai`);
          }
        });

        const ints = await prisma.interview.findMany({
          where: { companyId: session.companyId },
          select: { id: true },
          take: 15,
        });
        ints.forEach((i) => allIds.push(`notif_int_${i.id}`));
      } else {
        (mockStore.candidates || []).forEach((c) => {
          allIds.push(`notif_${c.id}_cv`);
          if (c.aiMatchScore !== null && c.aiMatchScore !== undefined) {
            allIds.push(`notif_${c.id}_ai`);
          }
        });
      }

      const merged = Array.from(new Set([...readIds, ...allIds]));
      cookieStore.set(cookieKey, JSON.stringify(merged), {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 ngày
        httpOnly: true,
        sameSite: "lax",
      });

      return NextResponse.json({ success: true, message: "Đã đánh dấu tất cả là đã đọc." });
    }

    if (id) {
      if (!readIds.includes(id)) {
        readIds.push(id);
      }
      cookieStore.set(cookieKey, JSON.stringify(readIds), {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: "lax",
      });
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
