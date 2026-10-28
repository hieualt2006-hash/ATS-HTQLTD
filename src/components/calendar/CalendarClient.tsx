"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Clock,
  MapPin,
  RefreshCw,
  X,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Edit3,
  Repeat,
  Palette,
} from "lucide-react";
import type { AuthSessionPayload } from "@/types/auth";
import type { MockCalendarEvent } from "@/lib/mock-store";
import { generateGoogleMeetLink } from "@/lib/google-calendar";

interface CalendarClientProps {
  session: AuthSessionPayload;
}

interface CandidateOption {
  id: string;
  fullName: string;
  jobTitle?: string;
}

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const HOUR_HEIGHT = 60; // px per hour

// 8 Màu sắc chuẩn Google Calendar
export const COLOR_PALETTE = [
  { id: "green", name: "Húng quế (Xanh lá)", hex: "#16a34a", dot: "bg-[#16a34a]", card: "bg-emerald-50 border-emerald-300 text-emerald-950", badge: "bg-emerald-600" },
  { id: "blue", name: "Việt quất (Xanh dương)", hex: "#2563eb", dot: "bg-[#2563eb]", card: "bg-blue-50 border-blue-300 text-blue-950", badge: "bg-blue-600" },
  { id: "sky", name: "Khổng tước (Xanh ngọc)", hex: "#0284c7", dot: "bg-[#0284c7]", card: "bg-sky-50 border-sky-300 text-sky-950", badge: "bg-sky-600" },
  { id: "orange", name: "Quýt (Cam)", hex: "#ea580c", dot: "bg-[#ea580c]", card: "bg-orange-50 border-orange-300 text-orange-950", badge: "bg-orange-600" },
  { id: "amber", name: "Chuối (Vàng)", hex: "#ca8a04", dot: "bg-[#ca8a04]", card: "bg-amber-50 border-amber-300 text-amber-950", badge: "bg-amber-600" },
  { id: "rose", name: "Cà chua (Đỏ)", hex: "#dc2626", dot: "bg-[#dc2626]", card: "bg-rose-50 border-rose-300 text-rose-950", badge: "bg-rose-600" },
  { id: "purple", name: "Nho (Tím)", hex: "#7c3aed", dot: "bg-[#7c3aed]", card: "bg-purple-50 border-purple-300 text-purple-950", badge: "bg-purple-600" },
  { id: "slate", name: "Than chì (Xám)", hex: "#475569", dot: "bg-[#475569]", card: "bg-slate-50 border-slate-300 text-slate-950", badge: "bg-slate-600" },
];

export const RECURRENCE_LIST = [
  { id: "NONE", label: "Không lặp lại" },
  { id: "DAILY", label: "Hàng ngày" },
  { id: "WEEKLY", label: "Hàng tuần" },
  { id: "MONTHLY", label: "Hàng tháng" },
];

function getColorConfig(colorId?: string | null, type?: string) {
  if (colorId) {
    const found = COLOR_PALETTE.find((c) => c.id === colorId);
    if (found) return found;
  }
  if (type === "INTERVIEW") return COLOR_PALETTE[0]; // green
  if (type === "ADMIN") return COLOR_PALETTE[1]; // blue
  return COLOR_PALETTE[4]; // amber
}

// Helper: Lấy 7 ngày trong tuần từ Thứ 2 đến Chủ Nhật
function getWeekDays(targetDate: Date): Date[] {
  const d = new Date(targetDate);
  const day = d.getDay(); // 0: CN, 1: T2, ...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    days.push(next);
  }
  return days;
}

// Helper: Chuyển đổi Date sang yyyy-mm-dd theo giờ địa phương (tránh lệch timezone UTC)
function toLocalDateKey(d: Date | string): string {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  const y = dateObj.getFullYear();
  const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const day = dateObj.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Helper: Lấy chuỗi giờ:phút theo giờ địa phương
function toLocalTimeStr(d: Date | string): string {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return `${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
}

// Helper: Kiểm tra sự kiện có diễn ra vào ngày targetDate không (tính cả lặp lại DAILY, WEEKLY, MONTHLY)
function isEventOnDate(ev: MockCalendarEvent, targetDate: Date): boolean {
  const evStart = new Date(ev.startTime);
  const evDateKey = toLocalDateKey(evStart);
  const targetDateKey = toLocalDateKey(targetDate);

  // Nếu ngày này đã bị loại trừ (người dùng chọn chỉ xóa buổi này)
  if (Array.isArray(ev.excludedDates) && ev.excludedDates.includes(targetDateKey)) {
    return false;
  }

  // Trùng đúng ngày gốc của sự kiện
  if (evDateKey === targetDateKey) return true;

  // Nếu không có tần suất lặp lại thì chỉ hiển thị ở ngày gốc
  if (!ev.recurrence || ev.recurrence === "NONE") return false;

  const evBase = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
  const targetBase = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  // Lặp lại tính từ ngày bắt đầu sự kiện trở đi
  if (targetBase < evBase) return false;

  if (ev.recurrence === "DAILY") {
    // Hàng ngày: lặp lại mỗi ngày
    return true;
  }

  if (ev.recurrence === "WEEKLY") {
    // Hàng tuần: lặp lại cùng thứ trong tuần (ví dụ: thứ 3 hàng tuần)
    return targetBase.getDay() === evBase.getDay();
  }

  if (ev.recurrence === "MONTHLY") {
    // Hàng tháng: lặp lại cùng ngày trong tháng (ví dụ: ngày 27 hàng tháng)
    return targetBase.getDate() === evBase.getDate();
  }

  return false;
}

// Helper: Tạo bản sao sự kiện với mốc thời gian của ngày targetDate
function getEventInstanceForDate(ev: MockCalendarEvent, targetDate: Date): MockCalendarEvent {
  const evStart = new Date(ev.startTime);
  const evEnd = new Date(ev.endTime);

  const durationMs = evEnd.getTime() - evStart.getTime();

  const instanceStart = new Date(targetDate);
  instanceStart.setHours(evStart.getHours(), evStart.getMinutes(), evStart.getSeconds(), 0);

  const instanceEnd = new Date(instanceStart.getTime() + durationMs);

  return {
    ...ev,
    startTime: instanceStart.toISOString(),
    endTime: instanceEnd.toISOString(),
  };
}

const VIETNAMESE_DAYS = ["THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6", "THỨ 7", "CN"];
const DAY_FULL_NAMES = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export default function CalendarClient({ session }: CalendarClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<MockCalendarEvent[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<"WEEK" | "DAY" | "MONTH">("WEEK");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState("18:42");
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    ADMIN: true,
    INTERVIEW: true,
    ACTIVITY: true,
  });

  // Modals & Context Menu State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editEventModal, setEditEventModal] = useState<MockCalendarEvent | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    event: MockCalendarEvent;
    occurrenceDate: string;
    showDeletePrompt?: boolean;
    deleteMode?: "THIS_ONLY" | "ALL";
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    event: MockCalendarEvent;
    occurrenceDate: string;
    mode: "THIS_ONLY" | "ALL";
  } | null>(null);

  // Form State (dùng chung cho cả Create và Edit)
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    type: "INTERVIEW" as "ADMIN" | "INTERVIEW" | "ACTIVITY",
    candidateId: "",
    candidateName: "",
    date: toLocalDateKey(new Date()),
    startTime: "09:00",
    endTime: "10:30",
    meetLink: generateGoogleMeetLink(),
    color: "green",
    recurrence: "NONE" as "NONE" | "DAILY" | "WEEKLY" | "MONTHLY",
    description: "",
    location: "Google Meet",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cố định hoàn toàn khung trang web (loại bỏ thanh cuộn ở vị trí đỏ X), chỉ cuộn timeline lịch ở vị trí kẻ xanh
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.style.overflow = "hidden";
      mainEl.style.padding = "14px";
    }
    return () => {
      if (mainEl) {
        mainEl.style.overflow = "";
        mainEl.style.padding = "";
      }
    };
  }, []);

  // Đóng context menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.sync?.lastSyncedAt) {
          const d = new Date(data.sync.lastSyncedAt);
          setLastSyncedTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
        }
      }
    } catch (e) {
      console.error("Lỗi tải lịch làm việc:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch candidates for dropdown
  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch("/api/candidates");
      if (res.ok) {
        const data = await res.json();
        const list = (data.candidates || []).map((c: any) => ({
          id: c.id,
          fullName: c.fullName,
          jobTitle: c.jobPosting?.title,
        }));
        setCandidates(list);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchCandidates();
  }, [fetchEvents, fetchCandidates]);

  // Google Calendar Realtime Sync action
  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (res.ok) {
        const now = new Date();
        setLastSyncedTime(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`);
        await fetchEvents();
        showToast("Đã đồng bộ realtime với Google Calendar!");
      }
    } catch (e) {
      console.error("Lỗi đồng bộ Google Calendar:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Tuần hiện tại
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // TIÊU ĐỀ NGÀY THÁNG CHÍNH XÁC THEO CHẾ ĐỘ XEM (SỬA LỖI HIỂN THỊ SAI)
  const headerDateTitle = useMemo(() => {
    const d = currentDate.getDate();
    const m = currentDate.getMonth() + 1;
    const y = currentDate.getFullYear();

    if (viewType === "DAY") {
      const dayOfWeekName = DAY_FULL_NAMES[currentDate.getDay()];
      return `${dayOfWeekName}, ${d} tháng ${m}, ${y}`;
    }

    if (viewType === "MONTH") {
      return `Tháng ${m} năm ${y}`;
    }

    // viewType === "WEEK"
    const first = weekDays[0];
    const last = weekDays[6];
    const m1 = first.getMonth() + 1;
    const m2 = last.getMonth() + 1;
    const y1 = first.getFullYear();
    const y2 = last.getFullYear();

    if (m1 === m2) {
      return `Tháng ${m1} năm ${y1}`;
    }
    return `Tháng ${m1} – ${m2} năm ${y2}`;
  }, [currentDate, viewType, weekDays]);

  // Điều hướng Ngày / Tuần / Tháng
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewType === "DAY") {
      next.setDate(next.getDate() - 1);
    } else if (viewType === "MONTH") {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewType === "DAY") {
      next.setDate(next.getDate() + 1);
    } else if (viewType === "MONTH") {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => filters[ev.type]);
  }, [events, filters]);

  // Map events to days of current week (bao gồm cả các sự kiện lặp lại Hàng ngày, Hàng tuần, Hàng tháng)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, MockCalendarEvent[]>();
    weekDays.forEach((d) => {
      const key = toLocalDateKey(d);
      const dayList: MockCalendarEvent[] = [];

      filteredEvents.forEach((ev) => {
        if (isEventOnDate(ev, d)) {
          dayList.push(getEventInstanceForDate(ev, d));
        }
      });

      map.set(key, dayList);
    });

    return map;
  }, [filteredEvents, weekDays]);

  // Handle open create modal on slot click
  const handleSlotClick = (dayDate: Date, hour: number) => {
    const dateStr = toLocalDateKey(dayDate);
    const startStr = `${hour.toString().padStart(2, "0")}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, "0")}:00`;

    setFormData({
      id: "",
      title: "",
      type: "INTERVIEW",
      candidateId: candidates[0]?.id || "",
      candidateName: candidates[0]?.fullName || "",
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      meetLink: generateGoogleMeetLink(),
      color: "green",
      recurrence: "NONE",
      description: "",
      location: "Google Meet",
    });
    setShowCreateModal(true);
  };

  // Mở modal chỉnh sửa chi tiết (khi click chuột trái hoặc chọn "Chỉnh sửa" từ menu chuột phải)
  const openEditModal = (ev: MockCalendarEvent) => {
    const s = new Date(ev.startTime);
    const e = new Date(ev.endTime);

    setFormData({
      id: ev.id,
      title: ev.title,
      type: ev.type,
      candidateId: ev.candidateId || "",
      candidateName: ev.candidateName || "",
      date: toLocalDateKey(s),
      startTime: toLocalTimeStr(s),
      endTime: toLocalTimeStr(e),
      meetLink: ev.meetLink || generateGoogleMeetLink(),
      color: ev.color || (ev.type === "INTERVIEW" ? "green" : ev.type === "ADMIN" ? "blue" : "amber"),
      recurrence: ev.recurrence || "NONE",
      description: ev.description || "",
      location: ev.location || "Google Meet",
    });
    setEditEventModal(ev);
    setContextMenu(null);
  };

  // Bắt sự kiện CLICK CHUỘT PHẢI trên ô sự kiện (Hiển thị bảng tùy chỉnh lớn ở GIỮA MÀN HÌNH)
  const handleEventContextMenu = (e: React.MouseEvent, ev: MockCalendarEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const occDate = toLocalDateKey(ev.startTime);
    setContextMenu({
      event: ev,
      occurrenceDate: occDate,
      showDeletePrompt: false,
      deleteMode: "THIS_ONLY",
    });
  };

  // Cập nhật nhanh màu sắc sự kiện từ Context Menu
  const handleUpdateEventColor = async (eventId: string, newColor: string) => {
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, color: newColor } : e))
    );
    setContextMenu(null);
    showToast("Đã cập nhật màu sự kiện!");

    try {
      await fetch("/api/calendar/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, color: newColor }),
      });
      await fetchEvents();
    } catch (e) {
      console.error("Lỗi cập nhật màu sự kiện:", e);
    }
  };

  // Cập nhật nhanh tần suất lặp lại sự kiện từ Context Menu
  const handleUpdateEventRecurrence = async (
    eventId: string,
    newRecurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY"
  ) => {
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, recurrence: newRecurrence } : e))
    );
    setContextMenu(null);
    showToast("Đã cập nhật tần suất lặp lại!");

    try {
      await fetch("/api/calendar/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, recurrence: newRecurrence }),
      });
      await fetchEvents();
    } catch (e) {
      console.error("Lỗi cập nhật tần suất:", e);
    }
  };

  // Lưu sự kiện (Tạo mới hoặc Cập nhật)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      let candName = formData.candidateName;
      if (formData.candidateId) {
        const found = candidates.find((c) => c.id === formData.candidateId);
        if (found) candName = found.fullName;
      }

      if (formData.id) {
        // CẬP NHẬT SỰ KIỆN CÓ SẴN (PUT)
        const res = await fetch("/api/calendar/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: formData.id,
            title: formData.title,
            type: formData.type,
            candidateId: formData.type === "INTERVIEW" ? formData.candidateId : null,
            candidateName: formData.type === "INTERVIEW" ? candName : null,
            startTime: startDateTime,
            endTime: endDateTime,
            meetLink: formData.meetLink,
            color: formData.color,
            recurrence: formData.recurrence,
            description: formData.description,
            location: formData.location,
          }),
        });

        if (res.ok) {
          setEditEventModal(null);
          showToast("Đã lưu chỉnh sửa sự kiện!");
          await fetchEvents();
        }
      } else {
        // TẠO MỚI SỰ KIỆN (POST)
        const res = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            type: formData.type,
            candidateId: formData.type === "INTERVIEW" ? formData.candidateId : null,
            candidateName: formData.type === "INTERVIEW" ? candName : null,
            startTime: startDateTime,
            endTime: endDateTime,
            meetLink: formData.meetLink,
            color: formData.color,
            recurrence: formData.recurrence,
            description: formData.description,
            location: formData.location,
          }),
        });

        if (res.ok) {
          setShowCreateModal(false);
          showToast("Đã tạo sự kiện và đồng bộ Google Calendar!");
          await fetchEvents();
        }
      }
    } catch (err) {
      console.error("Lỗi lưu sự kiện:", err);
    }
  };

  // Kích hoạt xóa sự kiện (Kiểm tra nếu là sự kiện lặp lại thì hỏi xóa chỉ buổi này hay tất cả)
  const triggerDeleteEvent = (ev: MockCalendarEvent, occurrenceDate?: string) => {
    const targetDate = occurrenceDate || toLocalDateKey(ev.startTime);
    const isRecurring = Boolean(ev.recurrence && ev.recurrence !== "NONE");

    // Đóng các modal khác để tránh xung đột giao diện
    setContextMenu(null);
    setEditEventModal(null);
    setShowCreateModal(false);

    if (isRecurring) {
      // Mở modal hỏi xóa buổi này hay tất cả các buổi lặp lại khác
      setDeleteConfirm({
        event: ev,
        occurrenceDate: targetDate,
        mode: "THIS_ONLY",
      });
    } else {
      // Sự kiện đơn lẻ: Xác nhận xóa tiêu chuẩn
      if (!confirm(`Bạn có chắc chắn muốn xóa sự kiện "${ev.title}"?`)) return;
      executeDelete(ev.id);
    }
  };

  // Thực hiện gọi API xóa sự kiện
  const executeDelete = async (id: string, excludeDate?: string) => {
    try {
      const url = excludeDate
        ? `/api/calendar/events?id=${id}&excludeDate=${excludeDate}`
        : `/api/calendar/events?id=${id}`;

      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        if (excludeDate) {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === id
                ? {
                    ...e,
                    excludedDates: Array.from(new Set([...(e.excludedDates || []), excludeDate])),
                  }
                : e
            )
          );
          showToast(`Đã xóa sự kiện vào ngày ${excludeDate.split("-").reverse().join("/")}!`);
        } else {
          setEvents((prev) => prev.filter((e) => e.id !== id));
          showToast("Đã xóa toàn bộ sự kiện và các buổi lặp lại thành công!");
        }
        setDeleteConfirm(null);
        setEditEventModal(null);
        setContextMenu(null);
        await fetchEvents();
      }
    } catch (e) {
      console.error("Lỗi xóa sự kiện:", e);
    }
  };

  // Copy meet link
  const handleCopyMeet = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast("Đã sao chép link phòng họp Google Meet!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Mini Calendar dates calculation
  const miniCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    for (let i = startDayOfWeek; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#F2F1ED] gap-2.5 text-[#0C0C0C]">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#0C0C0C] text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="w-4 h-4 text-[#16a34a]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Compact Unified Toolbar */}
      <div className="bg-white rounded-xl border border-[#E5E5E0] px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs select-none">
        {/* Left: Button "+ Mới", Nav Controls, View Mode, Hôm nay, Month Title */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setFormData({
                id: "",
                title: "",
                type: "INTERVIEW",
                candidateId: candidates[0]?.id || "",
                candidateName: candidates[0]?.fullName || "",
                date: toLocalDateKey(new Date()),
                startTime: "09:00",
                endTime: "10:30",
                meetLink: generateGoogleMeetLink(),
                color: "green",
                recurrence: "NONE",
                description: "",
                location: "Google Meet",
              });
              setShowCreateModal(true);
            }}
            className="px-3.5 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Mới</span>
          </button>

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-200 transition-colors text-slate-600 cursor-pointer"
              title="Trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-200 transition-colors text-slate-600 border-l border-slate-200 cursor-pointer"
              title="Tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View mode select (Tuần / Ngày / Tháng) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewType("WEEK")}
              className={`px-2.5 py-1 font-medium rounded-md transition-all cursor-pointer ${
                viewType === "WEEK"
                  ? "bg-white text-[#0C0C0C] shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setViewType("DAY")}
              className={`px-2.5 py-1 font-medium rounded-md transition-all cursor-pointer ${
                viewType === "DAY"
                  ? "bg-white text-[#0C0C0C] shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => setViewType("MONTH")}
              className={`px-2.5 py-1 font-medium rounded-md transition-all cursor-pointer ${
                viewType === "MONTH"
                  ? "bg-white text-[#0C0C0C] shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tháng
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-2.5 py-1 font-medium border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-700 transition-colors cursor-pointer"
          >
            Hôm nay
          </button>

          {/* Tiêu đề Ngày Tháng hiển thị chính xác theo viewType */}
          <span className="font-bold text-[#0C0C0C] text-sm tracking-tight ml-1">
            {headerDateTitle}
          </span>
        </div>

        {/* Right: Google Calendar Realtime Sync status */}
        <div className="flex items-center gap-2.5 text-slate-500">
          <span>Đồng bộ lúc: {lastSyncedTime}</span>
          <button
            onClick={handleSyncGoogle}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer disabled:opacity-60"
            title="Nhấn để đồng bộ lại với Google Calendar API"
          >
            {/* Google 'G' icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-[#16a34a] font-semibold">Google</span>
            <span className="text-slate-600">(Đã đồng bộ realtime)</span>
            <RefreshCw className={`w-3 h-3 text-slate-500 ml-0.5 ${isSyncing ? "animate-spin text-[#16a34a]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Main Body: Timeline Grid (Left) + Sidebar (Right) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-3 overflow-hidden">
        {/* MAIN TIMELINE (col-span-3) - Thanh cuộn nằm chính xác tại vị trí kẻ xanh (mép phải timeline) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#E5E5E0] shadow-xs flex flex-col h-full overflow-hidden">
          {viewType === "WEEK" ? (
            /* 2A. CHẾ ĐỘ XEM TUẦN (7 CỘT) */
            <div className="flex-1 overflow-y-scroll min-h-0 relative select-none">
              {/* Header row: 7 Days - GHIM CỐ ĐỊNH Ở ĐẦU LỊCH KHI CUỘN */}
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center sticky top-0 z-20 shadow-xs">
                <div className="p-2 border-r border-slate-200 text-[11px] font-bold text-slate-400 flex items-center justify-center">
                  Giờ
                </div>

                {weekDays.map((day, idx) => {
                  const todayActive = isToday(day);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewType("DAY");
                      }}
                      className={`p-2 border-r border-slate-200 last:border-r-0 transition-colors cursor-pointer hover:bg-slate-100/70 ${
                        todayActive ? "bg-emerald-50/60" : ""
                      }`}
                      title="Nhấn để xem chi tiết ngày này"
                    >
                      <div className="text-[10px] font-semibold text-slate-500 tracking-wider">
                        {VIETNAMESE_DAYS[idx]}
                      </div>
                      <div className="mt-0.5 flex justify-center">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            todayActive
                              ? "bg-[#16a34a] text-white shadow-xs ring-2 ring-emerald-200"
                              : "text-[#0C0C0C]"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timeline Grid Body: Giờ từ 06:00 đến 22:00 */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-8 border-b border-slate-100 last:border-b-0"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  {/* Left time marker */}
                  <div className="border-r border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-400 text-right select-none bg-slate-50/30">
                    {hour.toString().padStart(2, "0")}:00
                  </div>

                  {/* 7 Day Slot Cells */}
                  {weekDays.map((day, dayIdx) => {
                    const dayKey = toLocalDateKey(day);
                    const dayEvents = eventsByDay.get(dayKey) || [];

                    // Find events starting in this hour slot
                    const slotEvents = dayEvents.filter((ev) => {
                      const evStart = new Date(ev.startTime);
                      return evStart.getHours() === hour;
                    });

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => handleSlotClick(day, hour)}
                        className="border-r border-slate-100 last:border-r-0 p-1 relative hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        title={`Click để thêm lịch vào ${VIETNAMESE_DAYS[dayIdx]} ${day.getDate()}, ${hour}:00`}
                      >
                        <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 font-bold transition-opacity">
                          +
                        </span>

                        {/* Render Event Cards */}
                        {slotEvents.map((ev) => {
                          const startDate = new Date(ev.startTime);
                          const endDate = new Date(ev.endTime);
                          const durationMinutes = Math.max(
                            30,
                            (endDate.getTime() - startDate.getTime()) / 60000
                          );
                          const heightPx = Math.max(38, (durationMinutes / 60) * HOUR_HEIGHT - 6);
                          const colorCfg = getColorConfig(ev.color, ev.type);

                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(ev);
                              }}
                              onContextMenu={(e) => handleEventContextMenu(e, ev)}
                              style={{ minHeight: `${heightPx}px` }}
                              className={`rounded-lg p-2 border shadow-xs transition-all cursor-pointer relative z-10 flex flex-col justify-between ${colorCfg.card}`}
                              title="Click chuột trái để sửa / Click chuột phải để đổi màu & tần suất"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${colorCfg.badge}`} />
                                    <span className="font-bold text-[11px] truncate leading-tight">
                                      {ev.title}
                                    </span>
                                  </div>
                                  {ev.recurrence && ev.recurrence !== "NONE" && (
                                    <span title="Sự kiện lặp lại">
                                      <Repeat className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                    </span>
                                  )}
                                </div>

                                {ev.candidateName && (
                                  <p className="text-[10px] font-semibold text-slate-700 truncate mt-0.5">
                                    Ứng viên: {ev.candidateName}
                                  </p>
                                )}

                                <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5 font-medium">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>
                                    {startDate.getHours().toString().padStart(2, "0")}:
                                    {startDate.getMinutes().toString().padStart(2, "0")} -{" "}
                                    {endDate.getHours().toString().padStart(2, "0")}:
                                    {endDate.getMinutes().toString().padStart(2, "0")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : viewType === "DAY" ? (
            /* 2B. CHẾ ĐỘ XEM NGÀY (1 CỘT RỘNG RÃI) */
            <div className="flex-1 overflow-y-scroll min-h-0 relative select-none">
              {/* Header row 1 Ngày */}
              <div className="grid grid-cols-[64px_1fr] border-b border-slate-200 bg-slate-50 text-center sticky top-0 z-20 shadow-xs">
                <div className="p-2.5 border-r border-slate-200 text-[11px] font-bold text-slate-400 flex items-center justify-center">
                  Giờ
                </div>
                <div className="p-2.5 flex items-center gap-2 justify-center bg-emerald-50/40">
                  <span className="text-xs font-semibold text-slate-600">
                    {DAY_FULL_NAMES[currentDate.getDay()]}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isToday(currentDate)
                        ? "bg-[#16a34a] text-white ring-2 ring-emerald-200"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {currentDate.getDate()}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()})
                  </span>
                </div>
              </div>

              {/* Day Timeline body */}
              {HOURS.map((hour) => {
                const dayEvents = filteredEvents
                  .filter((ev) => isEventOnDate(ev, currentDate))
                  .map((ev) => getEventInstanceForDate(ev, currentDate))
                  .filter((ev) => {
                    const evStart = new Date(ev.startTime);
                    return evStart.getHours() === hour;
                  });

                return (
                  <div
                    key={hour}
                    className="grid grid-cols-[64px_1fr] border-b border-slate-100 last:border-b-0"
                    style={{ height: `${HOUR_HEIGHT + 10}px` }}
                  >
                    <div className="border-r border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-400 text-right bg-slate-50/30">
                      {hour.toString().padStart(2, "0")}:00
                    </div>

                    <div
                      onClick={() => handleSlotClick(currentDate, hour)}
                      className="p-1.5 relative hover:bg-slate-50/70 transition-colors cursor-pointer group flex gap-2"
                    >
                      <span className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 text-[11px] text-slate-400 font-bold transition-opacity">
                        + Nhấp để thêm sự kiện lúc {hour}:00
                      </span>

                      {dayEvents.map((ev) => {
                        const s = new Date(ev.startTime);
                        const e = new Date(ev.endTime);
                        const colorCfg = getColorConfig(ev.color, ev.type);

                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(ev);
                            }}
                            onContextMenu={(e) => handleEventContextMenu(e, ev)}
                            className={`flex-1 rounded-xl p-2.5 border shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${colorCfg.card}`}
                            title="Click chuột trái để sửa / Click chuột phải để đổi màu & tần suất"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-3 h-3 rounded-full shrink-0 ${colorCfg.badge}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs">{ev.title}</span>
                                  {ev.recurrence && ev.recurrence !== "NONE" && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/70 border border-current font-medium">
                                      🔄 Lặp lại
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                                  <span>
                                    {s.getHours().toString().padStart(2, "0")}:{s.getMinutes().toString().padStart(2, "0")} -{" "}
                                    {e.getHours().toString().padStart(2, "0")}:{e.getMinutes().toString().padStart(2, "0")}
                                  </span>
                                  {ev.candidateName && <span>• Ứng viên: <strong>{ev.candidateName}</strong></span>}
                                  {ev.description && <span className="text-slate-500 truncate max-w-xs">• {ev.description}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 2C. CHẾ ĐỘ XEM THÁNG (MONTH GRID) */
            <div className="flex-1 overflow-y-auto p-3 select-none flex flex-col h-full">
              <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 pb-2 border-b border-slate-200">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 flex-1 pt-2">
                {miniCalendarDays.map((item, idx) => {
                  const dayEvs = filteredEvents
                    .filter((e) => isEventOnDate(e, item.date))
                    .map((e) => getEventInstanceForDate(e, item.date));
                  const todayActive = isToday(item.date);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentDate(item.date);
                        setViewType("DAY");
                      }}
                      className={`min-h-[75px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        todayActive
                          ? "bg-emerald-50/70 border-[#16a34a]"
                          : item.isCurrentMonth
                          ? "bg-white border-slate-200 hover:border-slate-300"
                          : "bg-slate-50/50 border-slate-100 opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            todayActive ? "bg-[#16a34a] text-white" : "text-slate-700"
                          }`}
                        >
                          {item.date.getDate()}
                        </span>
                        {dayEvs.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {dayEvs.length} lịch
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1">
                        {dayEvs.slice(0, 2).map((ev) => {
                          const cfg = getColorConfig(ev.color, ev.type);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(ev);
                              }}
                              onContextMenu={(e) => handleEventContextMenu(e, ev)}
                              className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded border ${cfg.card}`}
                            >
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvs.length > 2 && (
                          <span className="text-[9px] text-slate-400 font-medium">
                            +{dayEvs.length - 2} sự kiện nữa
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (col-span-1) */}
        <div className="h-full overflow-y-auto space-y-2.5 pr-0.5">
          {/* Mini Calendar Widget */}
          <div className="bg-white rounded-2xl border border-[#E5E5E0] p-3 shadow-xs select-none">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#0C0C0C]">
                Tháng {currentDate.getMonth() + 1} {currentDate.getFullYear()}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    const prev = new Date(currentDate);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentDate(prev);
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const next = new Date(currentDate);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentDate(next);
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
              <span>T2</span>
              <span>T3</span>
              <span>T4</span>
              <span>T5</span>
              <span>T6</span>
              <span>T7</span>
              <span>CN</span>
            </div>

            <div className="grid grid-cols-7 text-center gap-y-1">
              {miniCalendarDays.map((item, idx) => {
                const todayActive = isToday(item.date);
                const isSelected =
                  item.date.getDate() === currentDate.getDate() &&
                  item.date.getMonth() === currentDate.getMonth() &&
                  item.date.getFullYear() === currentDate.getFullYear();

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentDate(new Date(item.date));
                      setViewType("DAY");
                    }}
                    className={`w-6 h-6 mx-auto rounded-full text-[10px] font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                      todayActive
                        ? "bg-[#16a34a] text-white shadow-xs font-bold"
                        : isSelected
                        ? "bg-slate-200 text-[#0C0C0C] font-bold"
                        : item.isCurrentMonth
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-300 hover:text-slate-500"
                    }`}
                  >
                    {item.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendars Checklist Filter */}
          <div className="bg-white rounded-2xl border border-[#E5E5E0] p-3 shadow-xs">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-[#0C0C0C]">Calendars</span>
              <button
                onClick={() => {
                  setFormData({
                    id: "",
                    title: "",
                    type: "INTERVIEW",
                    candidateId: candidates[0]?.id || "",
                    candidateName: candidates[0]?.fullName || "",
                    date: toLocalDateKey(new Date()),
                    startTime: "09:00",
                    endTime: "10:30",
                    meetLink: generateGoogleMeetLink(),
                    color: "green",
                    recurrence: "NONE",
                    description: "",
                    location: "Google Meet",
                  });
                  setShowCreateModal(true);
                }}
                className="text-[11px] font-semibold text-[#16a34a] hover:underline cursor-pointer"
              >
                + Thêm Lịch
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.ADMIN}
                  onChange={(e) => setFilters({ ...filters, ADMIN: e.target.checked })}
                  className="rounded text-[#16a34a] focus:ring-[#16a34a] w-3.5 h-3.5"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-700 font-medium group-hover:text-slate-900">
                  Quản Trị Viên (Admin)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.INTERVIEW}
                  onChange={(e) => setFilters({ ...filters, INTERVIEW: e.target.checked })}
                  className="rounded text-[#16a34a] focus:ring-[#16a34a] w-3.5 h-3.5"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] shrink-0" />
                <span className="text-slate-700 font-medium group-hover:text-slate-900">
                  Lịch phỏng vấn tuyển dụng
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.ACTIVITY}
                  onChange={(e) => setFilters({ ...filters, ACTIVITY: e.target.checked })}
                  className="rounded text-[#16a34a] focus:ring-[#16a34a] w-3.5 h-3.5"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-700 font-medium group-hover:text-slate-900">
                  My Activities
                </span>
              </label>
            </div>
          </div>

          {/* Google Calendar Sync Card */}
          <div className="bg-white rounded-2xl border border-[#E5E5E0] p-3 shadow-xs space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="font-bold text-[#0C0C0C]">Đồng bộ Google Calendar</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tài khoản Google Calendar đã kết nối. Lịch phỏng vấn và các sự kiện sẽ tự động đồng bộ hai chiều.
            </p>

            <button
              onClick={handleSyncGoogle}
              disabled={isSyncing}
              className="w-full py-1.5 text-xs font-semibold text-[#16a34a] bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. GOOGLE CALENDAR CENTERED EVENT SETTINGS MODAL (CLICK PHẢI CHUỘT - HIỂN THỊ GIỮA MÀN HÌNH & LỚN RỘNG) */}
      {mounted && contextMenu && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-100"
          onClick={() => setContextMenu(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150 select-none"
          >
            {contextMenu.showDeletePrompt ? (
              <>
                {/* Header Xóa Sự Kiện */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>
                        {contextMenu.event.recurrence && contextMenu.event.recurrence !== "NONE"
                          ? "Xóa sự kiện lặp lại?"
                          : "Xác nhận xóa sự kiện?"}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-1">
                      "{contextMenu.event.title}"
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setContextMenu((prev) => (prev ? { ...prev, showDeletePrompt: false } : null))
                    }
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {contextMenu.event.recurrence && contextMenu.event.recurrence !== "NONE" ? (
                  <>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      Sự kiện này có tần suất lặp lại. Bạn muốn xóa buổi diễn ra vào ngày{" "}
                      <strong className="text-[#0C0C0C]">
                        {contextMenu.occurrenceDate.split("-").reverse().join("/")}
                      </strong>{" "}
                      hay xóa toàn bộ các buổi lặp lại khác?
                    </p>

                    {/* Radio Options */}
                    <div className="space-y-2.5">
                      {/* Option 1: Chỉ sự kiện này */}
                      <div
                        onClick={() =>
                          setContextMenu((prev) =>
                            prev ? { ...prev, deleteMode: "THIS_ONLY" } : null
                          )
                        }
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          contextMenu.deleteMode === "THIS_ONLY"
                            ? "border-[#16a34a] bg-emerald-50/50 shadow-2xs"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="pt-0.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              contextMenu.deleteMode === "THIS_ONLY"
                                ? "border-[#16a34a] bg-[#16a34a]"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {contextMenu.deleteMode === "THIS_ONLY" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Chỉ sự kiện này</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Chỉ xóa buổi diễn ra vào ngày {contextMenu.occurrenceDate.split("-").reverse().join("/")}. Các buổi lặp lại khác trong chuỗi vẫn được giữ nguyên.
                          </p>
                        </div>
                      </div>

                      {/* Option 2: Tất cả các buổi lặp lại */}
                      <div
                        onClick={() =>
                          setContextMenu((prev) => (prev ? { ...prev, deleteMode: "ALL" } : null))
                        }
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          contextMenu.deleteMode === "ALL"
                            ? "border-[#16a34a] bg-emerald-50/50 shadow-2xs"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="pt-0.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              contextMenu.deleteMode === "ALL"
                                ? "border-[#16a34a] bg-[#16a34a]"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {contextMenu.deleteMode === "ALL" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Tất cả các sự kiện (Cả các buổi lặp lại khác)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Xóa vĩnh viễn sự kiện này và toàn bộ các buổi cũng là nó nhưng bị lặp lại vào những buổi khác.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    Bạn có chắc chắn muốn xóa vĩnh viễn sự kiện này khỏi lịch làm việc và Google Calendar không?
                  </p>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setContextMenu((prev) => (prev ? { ...prev, showDeletePrompt: false } : null))
                    }
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const isRecurring =
                        contextMenu.event.recurrence && contextMenu.event.recurrence !== "NONE";
                      const excludeDate =
                        isRecurring && contextMenu.deleteMode === "THIS_ONLY"
                          ? contextMenu.occurrenceDate
                          : undefined;
                      executeDelete(contextMenu.event.id, excludeDate);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Header: Tiêu đề to rõ + Giờ + Nút đóng */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          getColorConfig(contextMenu.event.color, contextMenu.event.type).badge
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {contextMenu.event.type === "INTERVIEW"
                          ? "Lịch phỏng vấn"
                          : contextMenu.event.type === "ADMIN"
                          ? "Quản trị viên"
                          : "Hoạt động công ty"}
                      </span>
                      {contextMenu.event.recurrence && contextMenu.event.recurrence !== "NONE" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-[#16a34a] border border-emerald-200 font-bold">
                          🔄 Lặp lại
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {contextMenu.event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {toLocalTimeStr(contextMenu.event.startTime)} - {toLocalTimeStr(contextMenu.event.endTime)}
                      </span>
                      {contextMenu.event.candidateName && (
                        <>
                          <span>•</span>
                          <span>Ứng viên: <strong className="text-slate-800">{contextMenu.event.candidateName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setContextMenu(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Nút Chỉnh sửa toàn bộ sự kiện */}
                <button
                  onClick={() => openEditModal(contextMenu.event)}
                  className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100/90 text-[#16a34a] border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Chỉnh sửa thông tin chi tiết sự kiện</span>
                </button>

                {/* Mục 1: ĐỔI MÀU SẮC (8 Màu sắc chuẩn Google Calendar - Chỉ hiện màu tròn) */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    <Palette className="w-4 h-4 text-slate-500" />
                    <span>Màu sắc sự kiện</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {COLOR_PALETTE.map((col) => {
                      const isActive = (contextMenu.event.color || "green") === col.id;
                      return (
                        <button
                          key={col.id}
                          onClick={() => handleUpdateEventColor(contextMenu.event.id, col.id)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? "ring-2 ring-offset-2 ring-slate-800 shadow-md scale-110"
                              : "hover:scale-110 hover:shadow-xs opacity-90 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.name}
                        >
                          {isActive && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mục 2: TẦN SUẤT LẶP LẠI (Recurrence) */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    <Repeat className="w-4 h-4 text-slate-500" />
                    <span>Tần suất lặp lại</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {RECURRENCE_LIST.map((rec) => {
                      const isSelected = (contextMenu.event.recurrence || "NONE") === rec.id;
                      return (
                        <button
                          key={rec.id}
                          onClick={() =>
                            handleUpdateEventRecurrence(
                              contextMenu.event.id,
                              rec.id as "NONE" | "DAILY" | "WEEKLY" | "MONTHLY"
                            )
                          }
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer border ${
                            isSelected
                              ? "bg-[#16a34a] text-white border-[#16a34a] shadow-xs"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>{rec.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mục 3: Xóa sự kiện */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu((prev) =>
                        prev
                          ? {
                              ...prev,
                              showDeletePrompt: true,
                              deleteMode: "THIS_ONLY",
                            }
                          : null
                      );
                    }}
                    className="w-full py-2.5 px-4 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa sự kiện này</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 4. MODAL: TẠO MỚI HOẶC CHỈNH SỬA CHI TIẾT SỰ KIỆN */}
      {mounted && (showCreateModal || editEventModal) && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-[#E5E5E0] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#16a34a]" />
                <h3 className="text-sm font-bold text-[#0C0C0C]">
                  {formData.id ? "Chỉnh Sửa Sự Kiện & Lịch Phỏng Vấn" : "Thêm Sự Kiện & Phỏng Vấn Mới"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditEventModal(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề sự kiện *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Phỏng vấn Chuyên môn Vòng 1, Họp Ban Giám Đốc..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại sự kiện</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "ADMIN" | "INTERVIEW" | "ACTIVITY",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:bg-white text-xs"
                  >
                    <option value="INTERVIEW">Lịch phỏng vấn tuyển dụng</option>
                    <option value="ADMIN">Quản Trị Viên (Admin)</option>
                    <option value="ACTIVITY">My Activities (Hoạt động)</option>
                  </select>
                </div>

                {formData.type === "INTERVIEW" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ứng viên liên quan</label>
                    <select
                      value={formData.candidateId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const c = candidates.find((item) => item.id === id);
                        setFormData({
                          ...formData,
                          candidateId: id,
                          candidateName: c ? c.fullName : "",
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:bg-white text-xs"
                    >
                      <option value="">-- Chọn ứng viên (hoặc tự nhập) --</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} {c.jobTitle ? `(${c.jobTitle})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Ngày và Giờ */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày diễn ra</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:bg-white text-xs"
                  />
                </div>
              </div>

              {/* CHỌN MÀU SẮC & TẦN SUẤT (Tính năng Google Calendar) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-slate-500" />
                    <span>Màu sắc sự kiện</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PALETTE.map((col) => {
                      const isSelected = formData.color === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: col.id })}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                            isSelected ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : ""
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.name}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tần suất lặp lại</span>
                  </label>
                  <select
                    value={formData.recurrence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: e.target.value as "NONE" | "DAILY" | "WEEKLY" | "MONTHLY",
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {RECURRENCE_LIST.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nội dung trao đổi, chuẩn bị tài liệu hoặc yêu cầu phỏng vấn..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:bg-white text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      const currentEv = events.find((e) => e.id === formData.id) || editEventModal;
                      if (currentEv) {
                        triggerDeleteEvent(currentEv, formData.date);
                      }
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa sự kiện</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditEventModal(null);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Lưu sự kiện
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 5. MODAL XÁC NHẬN XÓA SỰ KIỆN LẶP LẠI (HỎI XÓA CHỈ BUỔI NÀY HAY TẤT CẢ CÁC BUỔI) */}
      {mounted && deleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-100"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-[#E5E5E0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150 select-none"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Xóa sự kiện lặp lại?</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-1">
                  "{deleteConfirm.event.title}"
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Sự kiện này có tần suất lặp lại. Bạn muốn xóa buổi diễn ra vào ngày{" "}
              <strong className="text-[#0C0C0C]">
                {deleteConfirm.occurrenceDate.split("-").reverse().join("/")}
              </strong>{" "}
              hay xóa toàn bộ các buổi lặp lại khác?
            </p>

            {/* Radio Options */}
            <div className="space-y-2.5">
              {/* Option 1: Chỉ sự kiện này */}
              <div
                onClick={() => setDeleteConfirm({ ...deleteConfirm, mode: "THIS_ONLY" })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  deleteConfirm.mode === "THIS_ONLY"
                    ? "border-[#16a34a] bg-emerald-50/50 shadow-2xs"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      deleteConfirm.mode === "THIS_ONLY"
                        ? "border-[#16a34a] bg-[#16a34a]"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {deleteConfirm.mode === "THIS_ONLY" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Chỉ sự kiện này</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Chỉ xóa buổi diễn ra vào ngày {deleteConfirm.occurrenceDate.split("-").reverse().join("/")}. Các buổi lặp lại khác trong chuỗi vẫn được giữ nguyên.
                  </p>
                </div>
              </div>

              {/* Option 2: Tất cả các buổi lặp lại */}
              <div
                onClick={() => setDeleteConfirm({ ...deleteConfirm, mode: "ALL" })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  deleteConfirm.mode === "ALL"
                    ? "border-[#16a34a] bg-emerald-50/50 shadow-2xs"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      deleteConfirm.mode === "ALL"
                        ? "border-[#16a34a] bg-[#16a34a]"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {deleteConfirm.mode === "ALL" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Tất cả các sự kiện (Cả các buổi lặp lại khác)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Xóa vĩnh viễn sự kiện này và toàn bộ các buổi cũng là nó nhưng bị lặp lại vào những buổi khác.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() =>
                  executeDelete(
                    deleteConfirm.event.id,
                    deleteConfirm.mode === "THIS_ONLY" ? deleteConfirm.occurrenceDate : undefined
                  )
                }
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
