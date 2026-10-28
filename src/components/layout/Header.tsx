"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  ExternalLink,
  CheckCheck,
  Sparkles,
  FileText,
  Calendar,
  Info,
  Bell,
} from "lucide-react";
import type { AuthSessionPayload } from "@/types/auth";

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

interface HeaderProps {
  session: AuthSessionPayload;
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    return `${diffDay} ngày trước`;
  } catch {
    return "Mới đây";
  }
}

export default function Header({ session }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const pathname = usePathname();
  const router = useRouter();

  // Search Modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Notification Popover state & data
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // Bỏ qua lỗi kết nối ngầm
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Polling định kỳ mỗi 30 giây khi tab đang hoạt động
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotificationPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    // Cập nhật ngay lập tức trên UI (0ms) để dấu chấm xanh biến mất ngay
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (e) {
      console.error("Lỗi cập nhật đã đọc:", e);
    }
  };

  // Click vào 1 thông báo
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      // Giảm ngay unreadCount
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );

      try {
        fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notif.id }),
        });
      } catch (e) {}
    }

    if (notif.link) {
      setShowNotificationPopover(false);
      router.push(notif.link);
    }
  };

  // Quick navigation shortcuts for search
  const quickLinks = [
    { title: "Tổng quan tuyển dụng", href: "/dashboard", desc: "Xem báo cáo và chỉ số tổng quan" },
    { title: "Đợt tuyển dụng", href: "/jobs", desc: "Đăng tin tuyển dụng và vị trí mở" },
    { title: "Danh sách ứng viên", href: "/candidates", desc: "Quản lý CV và hồ sơ ứng tuyển" },
    { title: "Quy trình tuyển dụng", href: "/processes", desc: "Cấu hình các vòng phỏng vấn" },
    { title: "Lịch làm việc & Phỏng vấn", href: "/calendar", desc: "Timeline Google Calendar & phòng họp Meet" },
    { title: "Lịch phỏng vấn", href: "/interviews", desc: "Lịch hẹn và phòng họp Google Meet" },
    { title: "Quản lý công ty & nhân sự", href: "/settings", desc: "Cài đặt doanh nghiệp và phân quyền" },
  ];

  const filteredLinks = quickLinks.filter(
    (item) =>
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPageTitle = (path: string) => {
    if (path.startsWith("/dashboard")) return "Tổng quan tuyển dụng";
    if (path.startsWith("/processes")) return "Quy trình tuyển dụng";
    if (path.startsWith("/jobs")) return "Thực hiện tuyển dụng";
    if (path.startsWith("/candidates")) return "Danh sách ứng viên";
    if (path.startsWith("/calendar")) return "Lịch làm việc & Phỏng vấn";
    if (path.startsWith("/interviews")) return "Lịch phỏng vấn";
    if (path.startsWith("/settings")) return "Quản lý công ty & nhân sự";
    return "Hệ thống tuyển dụng";
  };

  const title = getPageTitle(pathname);

  // Vai trò hiển thị: Admin hoặc Nhân viên (cho tất cả tài khoản phụ)
  const roleTag = session.role === "COMPANY_ADMIN" ? "Admin" : "Nhân viên";

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E5E5E0] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Left: Page Title only */}
        <div>
          <h1 className="text-lg font-bold text-[#0C0C0C] tracking-tight">
            {title}
          </h1>
        </div>

        {/* Right: Tìm kiếm, Lịch, Thông Báo, Cài Đặt + Avatar & Tag */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. Tìm Kiếm (Icon được cung cấp) */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            title="Tìm kiếm nhanh"
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer group"
          >
            <img
              src="/icons/search.png"
              alt="Tìm kiếm"
              className="w-4 h-4 object-contain opacity-75 group-hover:opacity-100 transition-opacity"
            />
          </button>

          {/* 2. Lịch Làm Việc & Phỏng Vấn (Icon được cung cấp) */}
          <Link
            href="/calendar"
            title="Lịch làm việc & Phỏng vấn (Google Calendar)"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer group ${
              pathname.startsWith("/calendar")
                ? "bg-[#16a34a]/10 border-[#16a34a]"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200"
            }`}
          >
            <img
              src="/icons/calendar.png"
              alt="Lịch làm việc"
              className={`w-4 h-4 object-contain transition-opacity ${
                pathname.startsWith("/calendar") ? "opacity-100" : "opacity-75 group-hover:opacity-100"
              }`}
            />
          </Link>

          {/* 3. Thông Báo (Icon được cung cấp + Chấm xanh biến mất khi đã đọc hết) */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotificationPopover(!showNotificationPopover);
                fetchNotifications();
              }}
              title={unreadCount > 0 ? `Có ${unreadCount} thông báo mới` : "Thông báo hệ thống"}
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer group relative"
            >
              <img
                src="/icons/bell.png"
                alt="Thông báo"
                className="w-4 h-4 object-contain opacity-75 group-hover:opacity-100 transition-opacity"
              />

              {/* DẤU CHẤM XANH: CHỈ XUẤT HIỆN KHI CÓ THÔNG BÁO CHƯA ĐỌC */}
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#16a34a] ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {showNotificationPopover && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#E5E5E0] shadow-xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0C0C0C]">Thông Báo</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-white bg-[#16a34a] px-1.5 py-0.2 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Nút Đã đọc tất cả */}
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                    className="text-[11px] font-semibold text-[#16a34a] hover:text-[#278637] disabled:text-slate-400 disabled:opacity-60 flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đã đọc tất cả</span>
                  </button>
                </div>

                {/* Danh sách thông báo */}
                <div className="max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <span>Không có thông báo mới</span>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 border ${
                          !n.isRead
                            ? "bg-emerald-50/40 hover:bg-emerald-50 border-emerald-100 text-slate-900"
                            : "bg-white hover:bg-[#F2F1ED] border-transparent text-slate-600 opacity-80 hover:opacity-100"
                        }`}
                      >
                        {/* Type Icon */}
                        <div className="mt-0.5 shrink-0">
                          {n.type === "AI_EVALUATION" ? (
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#16a34a] flex items-center justify-center font-bold">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                          ) : n.type === "EXTERNAL_CV" ? (
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          ) : n.type === "INTERVIEW" ? (
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                              <Info className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs truncate ${
                                !n.isRead ? "font-bold text-[#0C0C0C]" : "font-semibold text-slate-700"
                              }`}
                            >
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatTimeAgo(n.createdAt)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
                            {n.message}
                          </p>

                          {/* Điểm AI Match Score (nếu có) */}
                          {n.matchScore !== undefined && n.matchScore !== null && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-[#16a34a]">
                                Điểm phù hợp AI: {n.matchScore}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Chấm tròn xanh nhỏ ở góc nếu chưa đọc */}
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#16a34a] shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Cài Đặt (Icon được cung cấp) */}
          <Link
            href="/settings"
            title="Cài đặt công ty & nhân sự"
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer group"
          >
            <img
              src="/icons/settings.png"
              alt="Cài đặt"
              className="w-4 h-4 object-contain opacity-75 group-hover:opacity-100 transition-opacity"
            />
          </Link>

          {/* Đường viền phân cách mỏng */}
          <div className="h-6 w-px bg-slate-200 mx-0.5" />

          {/* 4. Streamlined User Avatar + Tag (Admin hoặc Nhân viên), hover hiện tên đầy đủ */}
          <div
            className="group relative flex flex-col items-center justify-center cursor-pointer select-none py-1"
            title={session.fullName}
          >
            {/* Avatar chữ cái đầu */}
            <div className="w-8 h-8 rounded-lg bg-[#16a34a] flex items-center justify-center font-bold text-xs text-white shadow-xs group-hover:ring-2 group-hover:ring-[#16a34a]/30 transition-all">
              {session.fullName.charAt(0).toUpperCase()}
            </div>

            {/* Tag vai trò ở dưới avatar: Admin hoặc Nhân viên */}
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight mt-0.5 leading-none px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
              {roleTag}
            </span>

            {/* Tooltip khi di chuột vào sẽ hiện tên người dùng */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2.5 py-1 bg-[#0C0C0C] text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none transition-all">
              <span>{session.fullName}</span>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#0C0C0C]" />
            </div>
          </div>
        </div>
      </header>

      {/* ================= MODAL TÌM KIẾM NHANH ================= */}
      {mounted && showSearchModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-2xl border border-[#E5E5E0] max-w-lg w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#E5E5E0]">
              <img src="/icons/search.png" alt="Search" className="w-4 h-4 opacity-70" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nhanh màn hình, chức năng nghiệp vụ..."
                className="w-full text-xs text-[#0C0C0C] placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Lối tắt chuyển nhanh
              </div>
              {filteredLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    router.push(link.href);
                    setShowSearchModal(false);
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[#F2F1ED] transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0C0C0C] group-hover:text-[#16a34a]">
                      {link.title}
                    </div>
                    <div className="text-[10px] text-slate-500">{link.desc}</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#16a34a] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
