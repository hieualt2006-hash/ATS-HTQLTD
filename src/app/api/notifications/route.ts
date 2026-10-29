import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/notifications: Lấy danh sách thông báo thực tế thời gian thực
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (isRealDatabaseConfigured()) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { companyId: session.companyId },
        orderBy: { createdAt: "desc" },
        take: 40,
      });

      const unreadCount = await prisma.notification.count({
        where: { companyId: session.companyId, isRead: false },
      });

      return NextResponse.json({
        notifications: notifications.map((n) => ({
          id: n.id,
          companyId: n.companyId,
          type: n.type,
          title: n.title,
          message: n.message,
          candidateId: n.candidateId,
          jobTitle: n.jobTitle,
          matchScore: n.matchScore,
          link: n.link,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      });
    } catch (e: any) {
      console.error("Lỗi lấy thông báo từ database:", e);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
  }

  // Chế độ mockStore
  const list = (mockStore.notifications || [])
    .filter((n) => n && (n.companyId === session.companyId || !n.companyId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = list.filter((n) => !n.isRead).length;

  return NextResponse.json({
    notifications: list,
    unreadCount,
  });
}

// PUT /api/notifications: Đánh dấu đã đọc bền vững trong database
export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, markAll } = body;

    if (isRealDatabaseConfigured()) {
      if (markAll) {
        await prisma.notification.updateMany({
          where: { companyId: session.companyId, isRead: false },
          data: { isRead: true },
        });
        return NextResponse.json({ success: true, message: "Đã đánh dấu tất cả là đã đọc." });
      }

      if (id) {
        await prisma.notification.updateMany({
          where: { id, companyId: session.companyId },
          data: { isRead: true },
        });
        return NextResponse.json({ success: true, id });
      }
    } else {
      if (!Array.isArray(mockStore.notifications)) {
        mockStore.notifications = [];
      }

      if (markAll) {
        mockStore.notifications.forEach((n) => {
          if (n && (n.companyId === session.companyId || !n.companyId)) {
            n.isRead = true;
          }
        });
        mockStore.save();
        return NextResponse.json({ success: true, message: "Đã đánh dấu tất cả là đã đọc." });
      }

      if (id) {
        const target = mockStore.notifications.find((n) => n && n.id === id);
        if (target) {
          target.isRead = true;
          mockStore.save();
        }
        return NextResponse.json({ success: true, notification: target });
      }
    }

    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
