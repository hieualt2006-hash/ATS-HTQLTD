"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  UserCheck,
  Users,
  Search,
  Plus,
  ExternalLink,
  Star,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  Briefcase,
  Eye,
  Copy,
  AlertCircle,
} from "lucide-react";
import type { AuthSessionPayload } from "@/types/auth";

interface InterviewItem {
  id: string;
  companyId: string;
  candidateId: string;
  stageId: string | null;
  interviewerId: string | null;
  startTime: string;
  endTime: string;
  meetLink: string | null;
  rating: number | null;
  interviewerNotes: string | null;
  evaluationResult: "PENDING" | "PASS" | "FAIL";
  createdAt: string;
  candidate?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    cvFileUrl: string | null;
    jobPosting?: { id: string; title: string } | null;
  } | null;
  stage?: { id: string; stageName: string; orderIndex: number } | null;
  interviewer?: { id: string; fullName: string; email: string } | null;
}

interface CandidateOption {
  id: string;
  fullName: string;
  email: string;
  jobPosting?: { id: string; title: string } | null;
  currentStage?: { id: string; stageName: string } | null;
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface InterviewsClientProps {
  session: AuthSessionPayload;
}

export default function InterviewsClient({ session }: InterviewsClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [interviewers, setInterviewers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "PASS" | "FAIL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [evaluatingInterview, setEvaluatingInterview] = useState<InterviewItem | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    candidateId: "",
    stageName: "Vòng 1: Phỏng vấn chuyên môn",
    interviewerId: session.userId,
    startTime: "",
    durationMinutes: "45",
    meetLink: "",
    interviewerNotes: "",
  });

  // Evaluate Form State
  const [evalForm, setEvalForm] = useState({
    rating: 5,
    evaluationResult: "PASS" as "PASS" | "FAIL" | "PENDING",
    interviewerNotes: "",
  });

  const showToast = (message: string, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchInterviews = async () => {
    try {
      const res = await fetch("/api/interviews");
      if (res.ok) {
        const data = await res.json();
        setInterviews(data.interviews || []);
      }
    } catch (e: any) {
      console.error("Lỗi tải lịch phỏng vấn:", e);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [candRes, userRes] = await Promise.all([
        fetch("/api/candidates"),
        fetch("/api/company/users"),
      ]);

      if (candRes.ok) {
        const data = await candRes.json();
        setCandidates(data.candidates || []);
      }
      if (userRes.ok) {
        const data = await userRes.json();
        setInterviewers(data.users || []);
      }
    } catch (e: any) {
      console.error("Lỗi nạp danh sách phụ:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
    fetchAuxData();
  }, []);

  // Set default datetime to tomorrow at 09:00 AM
  useEffect(() => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    tmr.setHours(9, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}T${pad(tmr.getHours())}:${pad(tmr.getMinutes())}`;
    
    // Auto-generate sample Google Meet code
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const part = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const defaultMeet = `https://meet.google.com/${part(3)}-${part(4)}-${part(3)}`;

    setCreateForm((prev) => ({
      ...prev,
      startTime: localIso,
      meetLink: defaultMeet,
    }));
  }, []);

  // Handle Create Interview
  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.candidateId) {
      showToast("Vui lòng chọn ứng viên cần phỏng vấn.", true);
      return;
    }
    if (!createForm.startTime) {
      showToast("Vui lòng chọn thời gian bắt đầu.", true);
      return;
    }

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo lịch phỏng vấn.");

      showToast("Tạo lịch hẹn phỏng vấn thành công!");
      setShowCreateModal(false);
      fetchInterviews();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Handle Submit Evaluation
  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingInterview) return;

    try {
      const res = await fetch("/api/interviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: evaluatingInterview.id,
          rating: evalForm.rating,
          evaluationResult: evalForm.evaluationResult,
          interviewerNotes: evalForm.interviewerNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu kết quả đánh giá.");

      showToast("Đã lưu kết quả chấm điểm và đánh giá ứng viên!");
      setEvaluatingInterview(null);
      fetchInterviews();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Handle Delete Interview
  const handleDeleteInterview = async (id: string, candidateName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy lịch phỏng vấn với ứng viên "${candidateName}" không?`)) return;

    try {
      const res = await fetch(`/api/interviews?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể hủy lịch phỏng vấn.");

      showToast("Đã hủy lịch phỏng vấn thành công.");
      fetchInterviews();
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const copyMeetLink = (link: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(link);
      showToast("Đã sao chép link phòng họp Google Meet!");
    }
  };

  const openEvaluationModal = (item: InterviewItem) => {
    setEvaluatingInterview(item);
    setEvalForm({
      rating: item.rating || 5,
      evaluationResult: item.evaluationResult || "PASS",
      interviewerNotes: item.interviewerNotes || "",
    });
  };

  // Filtered Interviews
  const filteredInterviews = interviews.filter((item) => {
    if (activeTab !== "ALL" && item.evaluationResult !== activeTab) return false;
    if (!searchTerm.trim()) return true;

    const lower = searchTerm.toLowerCase();
    const candName = item.candidate?.fullName?.toLowerCase() || "";
    const jobTitle = item.candidate?.jobPosting?.title?.toLowerCase() || "";
    const interviewerName = item.interviewer?.fullName?.toLowerCase() || "";
    const stageName = item.stage?.stageName?.toLowerCase() || "";

    return (
      candName.includes(lower) ||
      jobTitle.includes(lower) ||
      interviewerName.includes(lower) ||
      stageName.includes(lower)
    );
  });

  // Metric counts
  const totalCount = interviews.length;
  const pendingCount = interviews.filter((i) => i.evaluationResult === "PENDING").length;
  const passCount = interviews.filter((i) => i.evaluationResult === "PASS").length;
  const failCount = interviews.filter((i) => i.evaluationResult === "FAIL").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 transition-all ${
            notification.isError
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          {notification.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
        <div>
          <h2 className="text-2xl font-bold text-[#0C0C0C] tracking-tight">
            Lịch Phỏng Vấn & Đánh Giá
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Lên lịch hẹn phỏng vấn, phòng họp Google Meet và chấm điểm trực tiếp ứng viên
          </p>
        </div>

        {session.role !== "INTERVIEWER" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Lịch Phỏng Vấn Mới</span>
          </button>
        )}
      </div>

      {/* Role notice for INTERVIEWER */}
      {session.role === "INTERVIEWER" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800">
          <UserCheck className="w-5 h-5 text-[#16a34a] flex-shrink-0" />
          <span>
            Bạn đang đăng nhập với vai trò <strong>Người Phỏng Vấn</strong>. Bạn có quyền truy cập vào phòng họp Google Meet của các ứng viên được phân công và thực hiện chấm điểm đánh giá.
          </span>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Buổi Hẹn</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0C0C0C]">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Lịch phỏng vấn đã tạo</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ Phỏng Vấn</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0C0C0C]">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 mt-1">Chưa hoàn thành chấm điểm</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã Đạt (PASS)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0C0C0C]">{passCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Đủ điều kiện nhận việc</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Không Đạt</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0C0C0C]">{failCount}</div>
          <div className="text-[11px] text-rose-700 mt-1">Chưa phù hợp với yêu cầu</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E5E5E0] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "ALL"
                ? "bg-[#16a34a] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-[#16a34a] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Chờ phỏng vấn ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("PASS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "PASS"
                ? "bg-[#16a34a] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Đạt ({passCount})
          </button>
          <button
            onClick={() => setActiveTab("FAIL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "FAIL"
                ? "bg-[#16a34a] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Không đạt ({failCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo ứng viên, vị trí..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F2F1ED] border border-[#E5E5E0] rounded-xl text-xs text-[#0C0C0C] placeholder:text-slate-400 focus:outline-none focus:border-[#16a34a] transition-colors"
          />
        </div>
      </div>

      {/* Main Interviews List View */}
      {filteredInterviews.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E5E5E0] rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-[#16a34a]">
            <Video className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#0C0C0C] mb-1">
            {searchTerm || activeTab !== "ALL"
              ? "Không tìm thấy lịch phỏng vấn phù hợp"
              : "Chưa có buổi phỏng vấn nào được lên lịch"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
            {searchTerm || activeTab !== "ALL"
              ? "Thử thay đổi từ khóa tìm kiếm hoặc bấm tab Tất cả để xem toàn bộ danh sách."
              : candidates.length === 0
              ? "Hệ thống hiện chưa có ứng viên. Bạn hãy vào trang Danh Sách Ứng Viên để tải CV lên trước khi lên lịch phỏng vấn."
              : "Hãy bấm nút bên dưới để tạo lịch hẹn phỏng vấn kèm phòng họp Google Meet cho ứng viên đầu tiên."}
          </p>

          {candidates.length > 0 && session.role !== "INTERVIEWER" ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Lên Lịch Phỏng Vấn Đầu Tiên</span>
            </button>
          ) : candidates.length === 0 ? (
            <Link
              href="/candidates"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Users className="w-4 h-4" />
              <span>Đến Danh Sách Ứng Viên Thêm CV</span>
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInterviews.map((item) => {
            const startDate = new Date(item.startTime);
            const endDate = new Date(item.endTime);
            const timeStr = `${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
            const dateStr = startDate.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-[#E5E5E0] hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header row: Candidate name + Status badge */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-[#0C0C0C] tracking-tight">
                        {item.candidate?.fullName || "Ứng viên"}
                      </h4>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {item.candidate?.jobPosting?.title || "Vị trí tuyển dụng"}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {item.evaluationResult === "PASS" ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#16a34a] border border-emerald-200 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã Đạt</span>
                      </span>
                    ) : item.evaluationResult === "FAIL" ? (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Không Đạt</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Chờ Phỏng Vấn</span>
                      </span>
                    )}
                  </div>

                  {/* Stage badge */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#F2F1ED] text-slate-700 border border-[#E5E5E0] text-[11px] font-semibold">
                      {item.stage?.stageName || "Vòng phỏng vấn"}
                    </span>
                    {item.candidate?.email && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.candidate.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details box */}
                <div className="p-3 rounded-xl bg-[#F2F1ED] border border-[#E5E5E0] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Thời gian:</span>
                    </span>
                    <span className="font-bold text-[#0C0C0C]">
                      {timeStr}, {dateStr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Người phỏng vấn:</span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.interviewer?.fullName || "Chưa phân công"}
                    </span>
                  </div>

                  {/* Meet Link */}
                  {item.meetLink && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Video className="w-3.5 h-3.5 text-[#16a34a]" />
                        <span>Phòng họp:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#16a34a] max-w-[150px] truncate">
                          {item.meetLink.replace("https://", "")}
                        </span>
                        <button
                          onClick={() => copyMeetLink(item.meetLink!)}
                          title="Sao chép link"
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Evaluation notes snippet if available */}
                  {item.rating && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2">
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: 5 }, (_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3.5 h-3.5 ${
                              idx < (item.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      {item.interviewerNotes && (
                        <p className="text-[11px] text-slate-600 italic line-clamp-1">
                          "{item.interviewerNotes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {/* Vào phòng họp Meet */}
                    {item.meetLink && (
                      <a
                        href={item.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Vào Phòng Họp</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    )}

                    {/* Nút Chấm Điểm & Đánh Giá */}
                    <button
                      onClick={() => openEvaluationModal(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>{item.rating ? "Sửa Đánh Giá" : "Chấm Điểm"}</span>
                    </button>
                  </div>

                  {/* Delete button (Quản trị viên & HR) */}
                  {session.role !== "INTERVIEWER" && (
                    <button
                      onClick={() => handleDeleteInterview(item.id, item.candidate?.fullName || "ứng viên")}
                      title="Hủy buổi phỏng vấn này"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: TẠO LỊCH PHỎNG VẤN MỚI ================= */}
      {mounted && showCreateModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E5E0] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#0C0C0C]">Tạo Lịch Hẹn Phỏng Vấn Mới</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInterview} className="space-y-4 text-xs">
              {/* Chọn ứng viên */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Ứng Viên <span className="text-rose-500">*</span>
                </label>
                {candidates.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    Chưa có ứng viên nào trong hệ thống. Bạn vui lòng vào mục <strong>Danh sách ứng viên</strong> để thêm ứng viên trước.
                  </div>
                ) : (
                  <select
                    value={createForm.candidateId}
                    onChange={(e) => {
                      const candId = e.target.value;
                      const found = candidates.find((c) => c.id === candId);
                      setCreateForm((prev) => ({
                        ...prev,
                        candidateId: candId,
                        stageName: found?.currentStage?.stageName || "Vòng 1: Phỏng vấn chuyên môn",
                      }));
                    }}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="">-- Chọn ứng viên cần phỏng vấn --</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {c.jobPosting?.title || "Vị trí"} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tên vòng phỏng vấn */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vòng Phỏng Vấn
                </label>
                <input
                  type="text"
                  value={createForm.stageName}
                  onChange={(e) => setCreateForm({ ...createForm, stageName: e.target.value })}
                  placeholder="Ví dụ: Vòng 1: Phỏng vấn HR, Vòng 2: Chuyên môn kỹ thuật"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              {/* Người phụ trách phỏng vấn */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Người Phụ Trách Phỏng Vấn
                </label>
                <select
                  value={createForm.interviewerId}
                  onChange={(e) => setCreateForm({ ...createForm, interviewerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#16a34a]"
                >
                  {interviewers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role === "COMPANY_ADMIN" ? "Sếp / Admin" : u.role === "HR" ? "HR" : "Interviewer"}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thời gian bắt đầu & Thời lượng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày & Giờ Bắt Đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Thời Lượng
                  </label>
                  <select
                    value={createForm.durationMinutes}
                    onChange={(e) => setCreateForm({ ...createForm, durationMinutes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="30">30 phút</option>
                    <option value="45">45 phút (chuẩn)</option>
                    <option value="60">60 phút (1 tiếng)</option>
                    <option value="90">90 phút (1.5 tiếng)</option>
                  </select>
                </div>
              </div>

              {/* Link Google Meet */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Đường Dẫn Phòng Họp Trực Tuyến (Google Meet / Zoom)
                </label>
                <input
                  type="text"
                  value={createForm.meetLink}
                  onChange={(e) => setCreateForm({ ...createForm, meetLink: e.target.value })}
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-[11px] focus:outline-none focus:border-[#16a34a]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Hệ thống đã tự động điền đường dẫn Google Meet mẫu, bạn có thể giữ nguyên hoặc đổi thành link của bạn.
                </span>
              </div>

              {/* Ghi chú chuẩn bị */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi Chú Chuẩn Bị (Câu hỏi trọng tâm, lưu ý)
                </label>
                <textarea
                  rows={2}
                  value={createForm.interviewerNotes}
                  onChange={(e) => setCreateForm({ ...createForm, interviewerNotes: e.target.value })}
                  placeholder="Ví dụ: Đánh giá kỹ năng lập trình React/Next.js, hỏi về dự án gần nhất..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={candidates.length === 0}
                  className="px-5 py-2 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Xác Nhận Lên Lịch
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL 2: CHẤM ĐIỂM & ĐÁNH GIÁ ================= */}
      {mounted && evaluatingInterview && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E5E0] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0C0C0C]">
                    Chấm Điểm & Đánh Giá Ứng Viên
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Ứng viên: <strong>{evaluatingInterview.candidate?.fullName}</strong> · Vị trí: <strong>{evaluatingInterview.candidate?.jobPosting?.title}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEvaluatingInterview(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-4 text-xs">
              {/* Thang điểm sao */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Mức Độ Đánh Giá (Điểm số 1 - 5 sao):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEvalForm({ ...evalForm, rating: star })}
                      className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= evalForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm text-[#0C0C0C]">
                    {evalForm.rating}/5 sao
                  </span>
                </div>
              </div>

              {/* Kết quả phỏng vấn */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Kết Luận Vòng Phỏng Vấn:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEvalForm({ ...evalForm, evaluationResult: "PASS" })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      evalForm.evaluationResult === "PASS"
                        ? "bg-emerald-50 border-[#16a34a] text-[#16a34a] font-bold ring-2 ring-emerald-200"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-[#16a34a]" />
                    <span className="block text-xs">Đạt (PASS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvalForm({ ...evalForm, evaluationResult: "FAIL" })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      evalForm.evaluationResult === "FAIL"
                        ? "bg-rose-50 border-rose-500 text-rose-700 font-bold ring-2 ring-rose-200"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <XCircle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                    <span className="block text-xs">Không Đạt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvalForm({ ...evalForm, evaluationResult: "PENDING" })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      evalForm.evaluationResult === "PENDING"
                        ? "bg-amber-50 border-amber-500 text-amber-800 font-bold ring-2 ring-amber-200"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <HelpCircle className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <span className="block text-xs">Xem Xét Thêm</span>
                  </button>
                </div>
              </div>

              {/* Nhận xét chuyên môn */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhận Xét & Đánh Giá Chi Tiết
                </label>
                <textarea
                  rows={4}
                  value={evalForm.interviewerNotes}
                  onChange={(e) => setEvalForm({ ...evalForm, interviewerNotes: e.target.value })}
                  placeholder="Ghi lại nhận xét về kỹ năng chuyên môn, thái độ, khả năng giao tiếp và điểm mạnh/yếu của ứng viên..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#16a34a] leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEvaluatingInterview(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Lưu Kết Quả Đánh Giá
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
