import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { mockStore, MockCalendarEvent } from "@/lib/mock-store";
import { generateGoogleMeetLink, syncGoogleCalendar } from "@/lib/google-calendar";

function ensureDemoCalendarEvents(companyId: string) {
  if (!Array.isArray(mockStore.calendarEvents)) {
    mockStore.calendarEvents = [];
  }

  // Nếu lịch đã từng được khởi tạo (kể cả khi người dùng chủ động xóa hết sự kiện),
  // tuyệt đối KHÔNG tự ý sinh lại sự kiện khi refresh trang!
  if (mockStore.calendarInitialized) {
    return;
  }

  const existing = mockStore.calendarEvents.filter((e) => e && (e.companyId === companyId || !e.companyId));
  if (existing.length > 0) {
    mockStore.calendarInitialized = true;
    mockStore.save();
    return;
  }

  // Lấy ứng viên thực tế nếu có
  const cands = (mockStore.candidates || []).filter((c) => c && c.companyId === companyId);
  const candName = cands[0]?.fullName || "Nguyễn Thành Long";
  const candId = cands[0]?.id || null;

  // Sử dụng mốc thời gian tuần hiện tại (27/10/2026)
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  // Thứ 3: Hôm nay lúc 09:00 - 10:30
  const t3Start = new Date(baseDate);
  t3Start.setHours(9, 0, 0, 0);
  const t3End = new Date(baseDate);
  t3End.setHours(10, 30, 0, 0);

  // Thứ 4: Ngày mai lúc 14:00 - 15:30
  const t4Start = new Date(baseDate);
  t4Start.setDate(t4Start.getDate() + 1);
  t4Start.setHours(14, 0, 0, 0);
  const t4End = new Date(t4Start);
  t4End.setHours(15, 30, 0, 0);

  // Thứ 5: Ngày kia lúc 10:00 - 11:30
  const t5Start = new Date(baseDate);
  t5Start.setDate(t5Start.getDate() + 2);
  t5Start.setHours(10, 0, 0, 0);
  const t5End = new Date(t5Start);
  t5End.setHours(11, 30, 0, 0);

  const initialEvents: MockCalendarEvent[] = [
    {
      id: "cal_demo_event_interview_001",
      companyId,
      title: `Phỏng vấn chuyên môn Vòng 1 - ${candName}`,
      type: "INTERVIEW",
      candidateId: candId,
      candidateName: candName,
      startTime: t3Start.toISOString(),
      endTime: t3End.toISOString(),
      meetLink: generateGoogleMeetLink(),
      description: "Phỏng vấn kỹ thuật trực tuyến và trao đổi kinh nghiệm dự án.",
      location: "Google Meet",
      color: "green",
      recurrence: "NONE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cal_demo_event_admin_002",
      companyId,
      title: "Họp Ban Tuyển Dụng & Đánh Giá Chỉ Số Q4",
      type: "ADMIN",
      startTime: t4Start.toISOString(),
      endTime: t4End.toISOString(),
      meetLink: generateGoogleMeetLink(),
      description: "Đánh giá tiến độ các đợt tuyển dụng, phân tích tỷ lệ CV đạt từ AI.",
      location: "Phòng họp Ban Giám Đốc / Google Meet",
      color: "blue",
      recurrence: "NONE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cal_demo_event_activity_003",
      companyId,
      title: "Onboarding & Hướng Dẫn Nhân Sự Mới",
      type: "ACTIVITY",
      startTime: t5Start.toISOString(),
      endTime: t5End.toISOString(),
      meetLink: generateGoogleMeetLink(),
      description: "Giới thiệu văn hóa công ty, cấp tài khoản phần mềm và bàn giao trang thiết bị.",
      location: "Văn phòng chính",
      color: "amber",
      recurrence: "NONE",
      createdAt: new Date().toISOString(),
    },
  ];

  mockStore.calendarEvents.push(...initialEvents);
  mockStore.calendarInitialized = true;
  mockStore.save();
}

// GET /api/calendar/events: Lấy danh sách sự kiện theo chuẩn Google Calendar
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  ensureDemoCalendarEvents(session.companyId);

  if (!mockStore.calendarEvents || mockStore.calendarEvents.length === 0) {
    mockStore.load();
  }

  // Kết hợp từ calendarEvents và interviews
  const rawEvents = (mockStore.calendarEvents || []).filter(
    (e) => e && (e.companyId === session.companyId || !e.companyId)
  );

  // Thêm các cuộc phỏng vấn từ mockStore.interviews (nếu chưa có trong rawEvents)
  const interviewEvents = (mockStore.interviews || [])
    .filter((inv) => inv && (inv.companyId === session.companyId || !inv.companyId))
    .map((inv) => ({
      id: inv.id,
      companyId: inv.companyId,
      title: `Phỏng vấn: ${inv.candidate?.fullName || "Ứng viên"}`,
      type: "INTERVIEW" as const,
      candidateId: inv.candidateId,
      candidateName: inv.candidate?.fullName || "Ứng viên",
      startTime: inv.startTime,
      endTime: inv.endTime,
      meetLink: inv.meetLink,
      description: inv.interviewerNotes || "Lịch phỏng vấn tuyển dụng Google Meet",
      location: "Google Meet",
      createdAt: inv.createdAt,
    }));

  // Gộp và loại trùng ID
  const map = new Map<string, MockCalendarEvent>();
  rawEvents.forEach((e) => map.set(e.id, e));
  interviewEvents.forEach((e) => {
    if (!map.has(e.id)) {
      map.set(e.id, e);
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const syncStatus = await syncGoogleCalendar(session.companyId);

  return NextResponse.json({
    events: merged,
    sync: syncStatus,
  });
}

// POST /api/calendar/events: Tạo sự kiện mới
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, type, candidateId, candidateName, startTime, endTime, meetLink, description, location, color, recurrence } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (tiêu đề, thời gian)" }, { status: 400 });
    }

    const finalMeetLink = meetLink?.trim() || generateGoogleMeetLink();
    const eventId = `cal_event_${Date.now()}`;

    const newEvent: MockCalendarEvent = {
      id: eventId,
      companyId: session.companyId,
      title: title.trim(),
      type: type || "INTERVIEW",
      candidateId: candidateId || null,
      candidateName: candidateName || null,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      meetLink: finalMeetLink,
      description: description?.trim() || null,
      location: location?.trim() || "Google Meet",
      color: color || null,
      recurrence: recurrence || "NONE",
      createdById: session.userId,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(mockStore.calendarEvents)) {
      mockStore.calendarEvents = [];
    }
    mockStore.calendarEvents.push(newEvent);

    // Nếu là phỏng vấn và có candidateId, đồng bộ vào danh sách interviews
    if (newEvent.type === "INTERVIEW" && candidateId) {
      const cand = (mockStore.candidates || []).find((c) => c && c.id === candidateId);
      if (!Array.isArray(mockStore.interviews)) {
        mockStore.interviews = [];
      }
      mockStore.interviews.push({
        id: eventId,
        companyId: session.companyId,
        candidateId,
        stageId: cand?.currentStageId || null,
        interviewerId: session.userId,
        createdById: session.userId,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        meetLink: finalMeetLink,
        rating: null,
        interviewerNotes: newEvent.description || null,
        evaluationResult: "PENDING",
        createdAt: newEvent.createdAt,
        candidate: cand ? {
          id: cand.id,
          fullName: cand.fullName,
          email: cand.email,
          phone: cand.phone,
          cvFileUrl: cand.cvFileUrl,
          jobPosting: cand.jobPosting,
        } : undefined,
      });
    }

    mockStore.save();

    return NextResponse.json({
      success: true,
      event: newEvent,
      message: "Đã tạo sự kiện và đồng bộ sang Google Calendar",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Lỗi tạo sự kiện" }, { status: 500 });
  }
}

// PUT /api/calendar/events: Cập nhật sự kiện (thời gian, màu sắc, tần suất, nội dung...)
export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, title, type, candidateId, candidateName, startTime, endTime, meetLink, description, location, color, recurrence } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID sự kiện" }, { status: 400 });
    }

    if (!Array.isArray(mockStore.calendarEvents)) {
      mockStore.calendarEvents = [];
    }

    let target = mockStore.calendarEvents.find((e) => e && e.id === id);
    if (!target) {
      // Tìm trong interviews nếu id là interview
      const inv = (mockStore.interviews || []).find((i) => i && i.id === id);
      if (inv) {
        target = {
          id: inv.id,
          companyId: inv.companyId,
          title: `Phỏng vấn: ${inv.candidate?.fullName || "Ứng viên"}`,
          type: "INTERVIEW",
          candidateId: inv.candidateId,
          candidateName: inv.candidate?.fullName || "Ứng viên",
          startTime: inv.startTime,
          endTime: inv.endTime,
          meetLink: inv.meetLink,
          description: inv.interviewerNotes || null,
          location: "Google Meet",
          createdAt: inv.createdAt,
        };
        mockStore.calendarEvents.push(target);
      }
    }

    if (!target) {
      return NextResponse.json({ error: "Không tìm thấy sự kiện" }, { status: 404 });
    }

    if (title !== undefined) target.title = title.trim();
    if (type !== undefined) target.type = type;
    if (candidateId !== undefined) target.candidateId = candidateId;
    if (candidateName !== undefined) target.candidateName = candidateName;
    if (startTime !== undefined) target.startTime = new Date(startTime).toISOString();
    if (endTime !== undefined) target.endTime = new Date(endTime).toISOString();
    if (meetLink !== undefined) target.meetLink = meetLink;
    if (description !== undefined) target.description = description;
    if (location !== undefined) target.location = location;
    if (color !== undefined) target.color = color;
    if (recurrence !== undefined) target.recurrence = recurrence;
    if (body.excludedDates !== undefined && Array.isArray(body.excludedDates)) {
      target.excludedDates = body.excludedDates;
    }

    // Đồng bộ nếu là phỏng vấn
    const invTarget = (mockStore.interviews || []).find((i) => i && i.id === id);
    if (invTarget) {
      if (startTime !== undefined) invTarget.startTime = target.startTime;
      if (endTime !== undefined) invTarget.endTime = target.endTime;
      if (meetLink !== undefined) invTarget.meetLink = target.meetLink ?? null;
      if (description !== undefined) invTarget.interviewerNotes = target.description ?? null;
    }

    mockStore.calendarInitialized = true;
    mockStore.save();

    return NextResponse.json({
      success: true,
      event: target,
      message: "Đã cập nhật sự kiện thành công",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Lỗi cập nhật sự kiện" }, { status: 500 });
  }
}

// DELETE /api/calendar/events: Xóa sự kiện (Hỗ trợ: Xóa chỉ buổi này [excludeDate] hoặc Xóa tất cả các buổi lặp lại)
export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const excludeDate = searchParams.get("excludeDate"); // yyyy-mm-dd nếu người dùng chỉ xóa buổi này

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID sự kiện" }, { status: 400 });
    }

    // Trường hợp 1: Chỉ xóa sự kiện vào buổi này (giữ lại các buổi lặp lại khác)
    if (excludeDate) {
      let target = (mockStore.calendarEvents || []).find((e) => e && e.id === id);
      if (!target) {
        mockStore.load();
        target = (mockStore.calendarEvents || []).find((e) => e && e.id === id);
      }
      if (!target) {
        return NextResponse.json({ error: "Không tìm thấy sự kiện cần xóa" }, { status: 404 });
      }

      if (!Array.isArray(target.excludedDates)) {
        target.excludedDates = [];
      }
      if (!target.excludedDates.includes(excludeDate)) {
        target.excludedDates.push(excludeDate);
      }
      mockStore.calendarInitialized = true;
      mockStore.save();

      return NextResponse.json({
        success: true,
        mode: "SINGLE_OCCURRENCE",
        message: `Đã xóa sự kiện vào ngày ${excludeDate}`,
        event: target,
      });
    }

    // Trường hợp 2: Xóa toàn bộ sự kiện này và tất cả các buổi lặp lại khác
    mockStore.calendarEvents = (mockStore.calendarEvents || []).filter((e) => e && e.id !== id);
    mockStore.interviews = (mockStore.interviews || []).filter((i) => i && i.id !== id);
    mockStore.calendarInitialized = true;
    mockStore.save();

    return NextResponse.json({
      success: true,
      mode: "ALL_OCCURRENCES",
      message: "Đã xóa toàn bộ sự kiện và tất cả các buổi lặp lại thành công",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Lỗi xóa sự kiện" }, { status: 500 });
  }
}
