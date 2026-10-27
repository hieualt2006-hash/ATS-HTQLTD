import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { mockStore, MockNotification } from "@/lib/mock-store";

// GET /api/notifications: Lấy danh sách thông báo thực tế
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Lọc thông báo thực tế của công ty hiện tại (loại bỏ bất kỳ thông báo mẫu ảo trước đây)
  const list = (mockStore.notifications || [])
    .filter(
      (n) =>
        n &&
        (n.companyId === session.companyId || !n.companyId) &&
        !n.id.includes("_seed") &&
        !n.id.includes("_intro") &&
        !n.id.includes("_sys_welcome")
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = list.filter((n) => !n.isRead).length;

  return NextResponse.json({
    notifications: list,
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

    if (!Array.isArray(mockStore.notifications)) {
      mockStore.notifications = [];
    }

    if (markAll) {
      // Đánh dấu tất cả thông báo của công ty này là đã đọc
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

    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
