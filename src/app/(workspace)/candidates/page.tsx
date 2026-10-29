"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users,
  Sparkles,
  Upload,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  GitBranch,
  Building2,
  FileText,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ChevronRight,
  Table,
  Kanban,
  Download,
  ExternalLink,
  Award,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CandidateItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cvFileUrl: string | null;
  source: "EXTERNAL_FORM" | "HR_UPLOAD";
  status: "IN_PROGRESS" | "HIRED" | "REJECTED";
  rawCvText: string | null;
  extractedSkills: string | null;
  aiMatchScore: number | null;
  aiEvaluationSummary: string | null;
  appliedAt: string;
  jobPostingId: string;
  jobPosting: {
    id: string;
    title: string;
    status: string;
    processId: string | null;
  };
  currentStageId: string | null;
  currentStage: {
    id: string;
    stageName: string;
    orderIndex: number;
  } | null;
}

interface JobPostingOption {
  id: string;
  title: string;
  process?: {
    id: string;
    name: string;
    stages: Array<{
      id: string;
      stageName: string;
      orderIndex: number;
    }>;
  };
}

export default function CandidatesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [jobs, setJobs] = useState<JobPostingOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState("ALL");
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Notifications
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Mở modal và tự động tải chi tiết có đầy đủ cvFileUrl
  const handleOpenCandidate = async (cand: CandidateItem) => {
    setSelectedCandidate(cand);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/candidates/${cand.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.candidate) {
          setSelectedCandidate(data.candidate);
        }
      }
    } catch (e) {
      console.error("Lỗi tải chi tiết hồ sơ ứng viên:", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Mở file CV PDF ở tab riêng
  const handleOpenInNewTab = () => {
    if (!selectedCandidate?.cvFileUrl) return;
    try {
      if (selectedCandidate.cvFileUrl.startsWith("data:")) {
        const parts = selectedCandidate.cvFileUrl.split(",");
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, "_blank");
      } else {
        window.open(selectedCandidate.cvFileUrl, "_blank");
      }
    } catch {
      window.open(selectedCandidate.cvFileUrl, "_blank");
    }
  };

  // Tải file CV PDF về máy
  const handleDownloadPdf = () => {
    if (!selectedCandidate?.cvFileUrl) return;
    try {
      const link = document.createElement("a");
      link.href = selectedCandidate.cvFileUrl;
      link.download = `CV_${selectedCandidate.fullName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Lỗi tải CV:", e);
    }
  };

  // Upload Form State
  const [uploadJobId, setUploadJobId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg("");
    } else {
      setSuccessMsg(msg);
      setErrorMsg("");
    }
    setTimeout(() => {
      setSuccessMsg("");
      setErrorMsg("");
    }, 4000);
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {}
  };

  // Fetch Candidates with filters
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedJob !== "ALL") params.append("jobPostingId", selectedJob);
      if (selectedSource !== "ALL") params.append("source", selectedSource);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const res = await fetch(`/api/candidates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [selectedJob, selectedSource, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates();
  };

  // HR Upload CV Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadJobId) {
      showNotification("Vui lòng chọn đợt tuyển dụng cần tiếp nhận hồ sơ.", true);
      return;
    }
    if (!uploadFile) {
      showNotification("Vui lòng đính kèm tệp CV định dạng PDF (.pdf) của ứng viên.", true);
      return;
    }
    if (!uploadFile.name.toLowerCase().endsWith(".pdf")) {
      showNotification("Định dạng tệp không hợp lệ. Hệ thống chỉ chấp nhận tệp tài liệu PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.", true);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("jobPostingId", uploadJobId);
      formData.append("file", uploadFile);

      const res = await fetch("/api/candidates", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải lên hồ sơ.");

      showNotification(`Đã tải lên và phân tích hồ sơ ứng viên thành công!`);
      setShowUploadModal(false);
      setUploadFile(null);
      fetchCandidates();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setUploading(false);
    }
  };

  // Move Stage
  const handleMoveStage = async (candidateId: string, targetStageId: string | null) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStageId: targetStageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể chuyển giai đoạn.");

      showNotification("Đã cập nhật giai đoạn tuyển dụng cho ứng viên!");
      fetchCandidates();
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate(data.candidate);
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Update Status (HIRED / REJECTED / IN_PROGRESS)
  const handleUpdateStatus = async (
    candidateId: string,
    status: "HIRED" | "REJECTED" | "IN_PROGRESS"
  ) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể đổi trạng thái.");

      const label =
        status === "HIRED" ? "Trúng tuyển" : status === "REJECTED" ? "Loại" : "Đang xử lý";
      showNotification(`Đã cập nhật kết quả: ${label}`);
      fetchCandidates();
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate(data.candidate);
      }
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candidateId: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa hồ sơ của ứng viên "${name}"?`)) return;
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa hồ sơ ứng viên.");

      showNotification(`Đã xóa hồ sơ "${name}" thành công.`);
      setSelectedCandidate(null);
      fetchCandidates();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Color helper for AI match score
  const getScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return {
        label: "Chưa chấm",
        style: "bg-slate-100 text-slate-600 border-slate-200",
        color: "text-slate-500",
      };
    }
    if (score >= 80) {
      return {
        label: `${score}% - Tiềm Năng Cao`,
        style: "bg-emerald-50 text-emerald-700 border-emerald-200",
        color: "text-emerald-700",
        bar: "bg-[#16a34a]",
      };
    }
    if (score >= 60) {
      return {
        label: `${score}% - Đạt Yêu Cầu`,
        style: "bg-amber-50 text-amber-700 border-amber-200",
        color: "text-amber-700",
        bar: "bg-amber-500",
      };
    }
    return {
      label: `${score}% - Cần Cân Nhắc`,
      style: "bg-rose-50 text-rose-700 border-rose-200",
      color: "text-rose-700",
      bar: "bg-rose-500",
    };
  };

  const parseSkills = (skillsJson: string | null): string[] => {
    if (!skillsJson) return [];
    try {
      const parsed = JSON.parse(skillsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return skillsJson.split(",").map((s) => s.trim());
    }
  };

  // Helper for Kanban stages
  const activeJobObject = jobs.find((j) => j.id === selectedJob) || jobs[0];
  const kanbanStages = activeJobObject?.process?.stages || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] text-[11px] font-semibold text-[#0C0C0C] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#16a34a]" />
            Bóc Tách & Chấm Điểm Hồ Sơ Tự Động
          </div>
          <h2 className="text-xl font-bold text-[#0C0C0C] tracking-tight">
            Danh Sách Ứng Viên & Sàng Lọc Hồ Sơ
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tiếp nhận hồ sơ từ form nộp đơn bên ngoài hoặc HR tải PDF lên hệ thống để tự động trích xuất kỹ năng và chấm điểm độ khớp JD.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>HR Tải CV Lên</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter, Search & View Switcher Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E5E0] flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, email, kỹ năng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E5E0] rounded-lg text-xs text-[#0C0C0C] placeholder-slate-400 focus:outline-none focus:border-[#16a34a]"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Job Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-xs text-[#0C0C0C]">
            <Briefcase className="w-3.5 h-3.5 text-[#16a34a]" />
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="bg-transparent text-xs text-[#0C0C0C] focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="ALL">Tất cả đợt tuyển</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-xs text-[#0C0C0C]">
            <Filter className="w-3.5 h-3.5 text-[#16a34a]" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-transparent text-xs text-[#0C0C0C] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Mọi nguồn hồ sơ</option>
              <option value="EXTERNAL_FORM">Form ứng tuyển trực tuyến</option>
              <option value="HR_UPLOAD">HR Upload trực tiếp</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-xs text-[#0C0C0C]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs text-[#0C0C0C] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="HIRED">Trúng tuyển</option>
              <option value="REJECTED">Đã loại</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0]">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "table"
                  ? "bg-white text-[#0C0C0C] shadow-sm"
                  : "text-slate-600 hover:text-black"
              }`}
              title="Xem dạng Bảng"
            >
              <Table className="w-4 h-4" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-[#0C0C0C] shadow-sm"
                  : "text-slate-600 hover:text-black"
              }`}
              title="Xem dạng Kanban Pipeline"
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#16a34a]" />
          <p className="text-xs">Đang tải danh sách hồ sơ ứng viên...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-16 text-center bg-white border border-[#E5E5E0] rounded-xl text-slate-500">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0C0C0C] mb-1">Chưa có hồ sơ ứng viên nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Hãy bấm nút "HR Tải CV Lên" để upload file PDF hoặc lấy link form nộp đơn bên ngoài trong mục "Thực hiện tuyển dụng".
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Tải File PDF CV Ngay</span>
          </button>
        </div>
      ) : (
        <>
          {/* ================= VIEW 1: TABLE VIEW ================= */}
          {viewMode === "table" && (
            <div className="overflow-hidden rounded-xl border border-[#E5E5E0] bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E0] bg-[#F2F1ED] text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Ứng viên</th>
                    <th className="py-3 px-4">Vị trí ứng tuyển</th>
                    <th className="py-3 px-4 text-center">Điểm Đánh Giá</th>
                    <th className="py-3 px-4">Giai đoạn hiện tại</th>
                    <th className="py-3 px-4">Nguồn hồ sơ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E0]">
                  {candidates.map((cand) => {
                    const score = getScoreBadge(cand.aiMatchScore);

                    return (
                      <tr key={cand.id} className="hover:bg-slate-50 transition-colors">
                        {/* Candidate Name & Contact */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F2F1ED] border border-[#E5E5E0] flex items-center justify-center font-bold text-xs text-[#0C0C0C] shrink-0">
                              {cand.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-[#0C0C0C]">{cand.fullName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {cand.email && !cand.email.includes("ungvien.local") ? cand.email : "Chưa có email"}
                              </div>
                              {cand.phone && (
                                <div className="text-[10px] text-slate-400 font-mono">{cand.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Job title */}
                        <td className="py-3 px-4">
                          <span className="font-medium text-[#0C0C0C] block">{cand.jobPosting.title}</span>
                          <span className="text-[10px] text-slate-400">
                            Nộp: {formatDate(cand.appliedAt)}
                          </span>
                        </td>

                        {/* AI Match Score Badge */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border font-mono ${score.style}`}
                            >
                              {cand.aiMatchScore || 0}%
                            </span>
                            <span className="text-[9px] text-slate-500 mt-0.5">
                              {cand.aiMatchScore && cand.aiMatchScore >= 80
                                ? "Rất phù hợp"
                                : cand.aiMatchScore && cand.aiMatchScore >= 50
                                ? "Đạt tiêu chuẩn"
                                : "Cần xem xét"}
                            </span>
                          </div>
                        </td>

                        {/* Current Stage */}
                        <td className="py-3 px-4">
                          {cand.currentStage ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#F2F1ED] text-slate-700 border border-[#E5E5E0] text-[10px] font-medium">
                              Vòng {cand.currentStage.orderIndex}: {cand.currentStage.stageName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa vào vòng</span>
                          )}
                        </td>

                        {/* Source */}
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F1ED] text-slate-600 border border-[#E5E5E0]">
                            {cand.source === "EXTERNAL_FORM" ? "Cổng Form Rời" : "HR Upload"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {cand.status === "HIRED" ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              Trúng Tuyển
                            </span>
                          ) : cand.status === "REJECTED" ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                              Đã Loại
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                              Đang Xử Lý
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href="/interviews"
                              className="px-2 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-[#16a34a] border border-emerald-200 text-xs font-medium flex items-center gap-1 transition-colors"
                              title="Lên lịch phỏng vấn cho ứng viên"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Lên Lịch</span>
                            </Link>
                            <button
                              onClick={() => handleOpenCandidate(cand)}
                              className="px-2.5 py-1.5 rounded-md bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] border border-[#E5E5E0] text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem CV</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= VIEW 2: KANBAN PIPELINE VIEW ================= */}
          {viewMode === "kanban" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-white border border-[#E5E5E0] flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#16a34a]" />
                  <span>
                    Quy trình đang xem: <strong className="text-[#0C0C0C]">{activeJobObject?.title}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Bấm thẻ ứng viên để cập nhật vòng tuyển
                </span>
              </div>

              {/* Kanban Column Lanes */}
              <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanStages.map((stage) => {
                  const stageCandidates = candidates.filter(
                    (c) => c.currentStageId === stage.id && c.status === "IN_PROGRESS"
                  );

                  return (
                    <div
                      key={stage.id}
                      className="w-80 flex-shrink-0 bg-white border border-[#E5E5E0] rounded-xl flex flex-col max-h-[75vh]"
                    >
                      {/* Column Header */}
                      <div className="p-3.5 border-b border-[#E5E5E0] bg-[#F2F1ED] flex items-center justify-between rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-white text-slate-700 border border-[#E5E5E0] text-[10px] font-bold flex items-center justify-center font-mono">
                            {stage.orderIndex}
                          </span>
                          <span className="font-bold text-xs text-[#0C0C0C] truncate max-w-[160px]" title={stage.stageName}>
                            {stage.stageName}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-700 border border-[#E5E5E0]">
                          {stageCandidates.length}
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                        {stageCandidates.length === 0 ? (
                          <div className="p-6 text-center text-[11px] text-slate-400 border border-dashed border-[#E5E5E0] rounded-lg">
                            Chưa có ứng viên ở vòng này
                          </div>
                        ) : (
                          stageCandidates.map((cand) => {
                            const score = getScoreBadge(cand.aiMatchScore);
                            const skills = parseSkills(cand.extractedSkills);

                            return (
                              <div
                                key={cand.id}
                                className="p-3 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] hover:border-slate-400 transition-colors space-y-1.5 cursor-pointer"
                                onClick={() => handleOpenCandidate(cand)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-semibold text-xs text-[#0C0C0C]">
                                    {cand.fullName}
                                  </div>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono shrink-0 ${score.style}`}
                                  >
                                    {cand.aiMatchScore || 0}%
                                  </span>
                                </div>

                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                  {cand.email && !cand.email.includes("ungvien.local")
                                    ? cand.email
                                    : "Chưa có email trong CV"}
                                </div>

                                {/* Skills tag snippet */}
                                {skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {skills.slice(0, 3).map((skill, i) => (
                                      <span
                                        key={i}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-[#E5E5E0]"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                    {skills.length > 3 && (
                                      <span className="text-[9px] px-1 py-0.5 text-slate-400">
                                        +{skills.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="pt-2 border-t border-[#E5E5E0] flex items-center justify-between text-[10px] text-slate-500">
                                  <span>{cand.source === "EXTERNAL_FORM" ? "Form Rời" : "Upload"}</span>
                                  <span className="text-[#16a34a] font-medium">Chi tiết →</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Column HIRED */}
                <div className="w-80 flex-shrink-0 bg-white border border-emerald-200 rounded-xl flex flex-col max-h-[75vh]">
                  <div className="p-3.5 border-b border-emerald-200 bg-emerald-50 flex items-center justify-between rounded-t-xl">
                    <span className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#16a34a]" />
                      Trúng Tuyển
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200">
                      {candidates.filter((c) => c.status === "HIRED").length}
                    </span>
                  </div>
                  <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                    {candidates
                      .filter((c) => c.status === "HIRED")
                      .map((cand) => (
                        <div
                          key={cand.id}
                          onClick={() => handleOpenCandidate(cand)}
                          className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 hover:border-emerald-400 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="font-semibold text-xs text-[#0C0C0C]">{cand.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{cand.email}</div>
                          <div className="text-[10px] text-emerald-700 font-medium">
                            Điểm: {cand.aiMatchScore}%
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column REJECTED */}
                <div className="w-80 flex-shrink-0 bg-white border border-rose-200 rounded-xl flex flex-col max-h-[75vh]">
                  <div className="p-3.5 border-b border-rose-200 bg-rose-50 flex items-center justify-between rounded-t-xl">
                    <span className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      Đã Loại
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-rose-800 border border-rose-200">
                      {candidates.filter((c) => c.status === "REJECTED").length}
                    </span>
                  </div>
                  <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                    {candidates
                      .filter((c) => c.status === "REJECTED")
                      .map((cand) => (
                        <div
                          key={cand.id}
                          onClick={() => handleOpenCandidate(cand)}
                          className="p-3 rounded-lg bg-rose-50/50 border border-rose-200 hover:border-rose-400 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="font-semibold text-xs text-[#0C0C0C]">{cand.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{cand.email}</div>
                          <div className="text-[10px] text-rose-700 font-medium">
                            Điểm: {cand.aiMatchScore}%
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= MODAL: HR UPLOAD CV ================= */}
      {mounted && showUploadModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#16a34a]" />
                HR Tải CV Lên
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chọn Đợt Tuyển Dụng Tiếp Nhận Hồ Sơ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={uploadJobId}
                  onChange={(e) => setUploadJobId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                >
                  <option value="">-- Chọn đợt tuyển dụng --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tệp CV Ứng Viên PDF <span className="text-rose-500">*</span>
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const dropped = e.dataTransfer.files[0];
                      if (!dropped.name.toLowerCase().endsWith(".pdf") && dropped.type !== "application/pdf") {
                        showNotification("Chỉ chấp nhận tệp định dạng PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.", true);
                        return;
                      }
                      if (dropped.size > 3 * 1024 * 1024) {
                        showNotification("Dung lượng tệp CV không được vượt quá 3MB (chuẩn 1 trang A4).", true);
                        return;
                      }
                      setUploadFile(dropped);
                    }
                  }}
                  className="relative border-2 border-dashed border-[#E5E5E0] hover:border-[#16a34a] rounded-xl p-6 text-center transition-colors bg-[#F2F1ED] cursor-pointer"
                >
                  <input
                    type="file"
                    required={!uploadFile}
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const selected = e.target.files[0];
                        if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") {
                          showNotification("Chỉ chấp nhận tệp định dạng PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.", true);
                          e.target.value = "";
                          setUploadFile(null);
                          return;
                        }
                        if (selected.size > 3 * 1024 * 1024) {
                          showNotification("Dung lượng tệp CV không được vượt quá 3MB (chuẩn 1 trang A4).", true);
                          e.target.value = "";
                          setUploadFile(null);
                          return;
                        }
                        setUploadFile(selected);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E5E5E0] relative z-10">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0C0C0C] truncate">
                        <FileText className="w-5 h-5 text-[#16a34a] shrink-0" />
                        <span className="truncate">{uploadFile.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal shrink-0">
                          · {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Hủy chọn file này"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-600 text-xs">
                      <Upload className="w-7 h-7 mx-auto text-[#16a34a] mb-1" />
                      <p className="font-semibold text-[#0C0C0C]">Bấm để chọn file PDF hoặc kéo thả vào đây</p>
                      <p className="text-[10px] text-slate-400">Chỉ chấp nhận tệp định dạng .pdf • Dung lượng tối đa 3MB (1 trang A4)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang bóc tách & lưu ứng viên...</span>
                    </>
                  ) : (
                    <span>Lưu Ứng Viên</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: CANDIDATE DETAIL (2 CỘT: XEM CV A4 & ĐÁNH GIÁ AI) ================= */}
      {mounted && selectedCandidate && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-6xl bg-white border border-[#E5E5E0] rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
            {/* Header chung */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E0] bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F2F1ED] border border-[#E5E5E0] flex items-center justify-center font-bold text-sm text-[#0C0C0C]">
                  {selectedCandidate.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0C0C0C]">{selectedCandidate.fullName}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F1ED] text-slate-600 border border-[#E5E5E0]">
                      {selectedCandidate.source === "EXTERNAL_FORM" ? "Cổng Ứng Tuyển" : "HR Upload"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Vị trí ứng tuyển: <strong className="text-[#0C0C0C]">{selectedCandidate.jobPosting.title}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedCandidate.cvFileUrl && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] text-xs font-semibold border border-[#E5E5E0] transition-colors"
                      title="Tải file PDF về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenInNewTab}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] text-xs font-semibold border border-[#E5E5E0] transition-colors"
                      title="Mở tài liệu PDF ở tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở tab mới</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-black hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: 2 Cột */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#FAFAF8]">
              {/* CỘT TRÁI (Lg: 7 CỘT): XEM TRỰC TIẾP TÀI LIỆU CV KHỔ A4 */}
              <div className="lg:col-span-7 flex flex-col bg-white border border-[#E5E5E0] rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5E0]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#16a34a]" />
                    <span className="font-bold text-xs text-[#0C0C0C]">
                      Tài Liệu CV Ứng Viên (Bản Đối Soát A4)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCandidate.cvFileUrl && (
                      <span className="text-[10px] text-slate-500 font-mono bg-[#F2F1ED] px-2 py-0.5 rounded border border-[#E5E5E0]">
                        Khổ A4 • Chuẩn PDF
                      </span>
                    )}
                  </div>
                </div>

                {/* Khung tài liệu A4 */}
                <div className="flex-1 min-h-[520px] lg:min-h-[620px] rounded-lg border border-[#E5E5E0] bg-[#F2F1ED] overflow-hidden flex flex-col relative">
                  {loadingDetail ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#16a34a]" />
                      <p className="text-xs font-medium">Đang tải bản xem trước CV A4...</p>
                    </div>
                  ) : selectedCandidate.cvFileUrl ? (
                    <iframe
                      src={selectedCandidate.cvFileUrl}
                      className="w-full h-full min-h-[520px] lg:min-h-[620px] border-none bg-white"
                      title={`Bản xem CV - ${selectedCandidate.fullName}`}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-2" />
                      <h4 className="text-xs font-bold text-[#0C0C0C]">Không có tệp PDF lưu trữ</h4>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                        Hồ sơ này chưa có file PDF đính kèm hoặc được tạo thủ công. Bạn có thể xem văn bản bóc tách bên dưới.
                      </p>
                      {selectedCandidate.rawCvText && (
                        <div className="mt-4 w-full max-h-72 overflow-y-auto text-left p-3 rounded-lg bg-white border border-[#E5E5E0] text-[11px] font-mono text-slate-700 whitespace-pre-wrap">
                          {selectedCandidate.rawCvText}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Thanh công cụ phụ mobile nếu màn hình nhỏ */}
                {selectedCandidate.cvFileUrl && (
                  <div className="sm:hidden pt-3 mt-3 border-t border-[#E5E5E0] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleOpenInNewTab}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] text-xs font-medium border border-[#E5E5E0] flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở tab mới</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] text-xs font-medium border border-[#E5E5E0] flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* CỘT PHẢI (Lg: 5 CỘT): KẾT QUẢ AI & QUẢN LÝ TIẾN ĐỘ */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                {/* Thông tin liên hệ nhanh */}
                <div className="bg-white border border-[#E5E5E0] rounded-xl p-3.5 space-y-2.5 text-xs shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E0]">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-[#0C0C0C]">Thông Tin Liên Hệ</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[#0C0C0C] truncate">
                        {selectedCandidate.email && !selectedCandidate.email.includes("ungvien.local")
                          ? selectedCandidate.email
                          : "Chưa có email trong CV"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[#0C0C0C]">{selectedCandidate.phone || "Chưa có SĐT"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-600">Nộp hồ sơ: {formatDate(selectedCandidate.appliedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Hộp Đánh Giá AI */}
                <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E0]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#16a34a]" />
                      <span className="font-bold text-xs text-[#0C0C0C]">Đánh Giá Độ Khớp AI</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F2F1ED] text-[#16a34a] border border-[#E5E5E0] font-mono">
                      {selectedCandidate.aiMatchScore || 0}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                      <span>Mức độ đáp ứng tiêu chuẩn</span>
                      <span className="font-bold text-[#0C0C0C] font-mono">{selectedCandidate.aiMatchScore || 0}/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-[#E5E5E0]">
                      <div
                        className="h-full rounded-full bg-[#16a34a] transition-all"
                        style={{ width: `${selectedCandidate.aiMatchScore || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Tóm tắt nhận xét */}
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Nhận xét chi tiết:</div>
                    <div className="p-3 rounded-lg bg-[#FAFAF8] border border-[#E5E5E0] text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {selectedCandidate.aiEvaluationSummary || "Chưa có nhận xét đánh giá."}
                    </div>
                  </div>
                </div>

                {/* Kỹ năng chuyên môn bóc tách */}
                <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E0]">
                    <Award className="w-4 h-4 text-[#16a34a]" />
                    <span className="text-xs font-bold text-[#0C0C0C] uppercase tracking-wider">
                      Kỹ Năng Chuyên Môn Bóc Tách
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parseSkills(selectedCandidate.extractedSkills).length > 0 ? (
                      parseSkills(selectedCandidate.extractedSkills).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] text-[11px] text-[#0C0C0C] font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Chưa bóc tách được kỹ năng từ tài liệu</span>
                    )}
                  </div>
                </div>

                {/* Chuyển Giai Đoạn Tuyển Dụng & Trạng Thái */}
                <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 space-y-3.5 shadow-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Chuyển Giai Đoạn Tuyển Dụng
                    </label>
                    <select
                      value={selectedCandidate.currentStageId || ""}
                      onChange={(e) => handleMoveStage(selectedCandidate.id, e.target.value || null)}
                      className="w-full px-3 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                    >
                      <option value="">-- Chưa gán giai đoạn --</option>
                      {kanbanStages.map((st) => (
                        <option key={st.id} value={st.id}>
                          Vòng {st.orderIndex}: {st.stageName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Cập Nhật Kết Quả Hồ Sơ
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedCandidate.id, "HIRED")}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedCandidate.status === "HIRED"
                            ? "bg-[#16a34a] text-white"
                            : "bg-[#FAFAF8] hover:bg-emerald-50 text-slate-700 border border-[#E5E5E0]"
                        }`}
                      >
                        Trúng Tuyển
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedCandidate.id, "REJECTED")}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedCandidate.status === "REJECTED"
                            ? "bg-rose-600 text-white"
                            : "bg-[#FAFAF8] hover:bg-rose-50 text-slate-700 border border-[#E5E5E0]"
                        }`}
                      >
                        Loại Hồ Sơ
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedCandidate.id, "IN_PROGRESS")}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedCandidate.status === "IN_PROGRESS"
                            ? "bg-[#16a34a] text-white"
                            : "bg-[#FAFAF8] hover:bg-slate-100 text-slate-700 border border-[#E5E5E0]"
                        }`}
                      >
                        Đang Xử Lý
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-3.5 border-t border-[#E5E5E0] bg-white flex items-center justify-between shrink-0">
              <button
                onClick={() => handleDeleteCandidate(selectedCandidate.id, selectedCandidate.fullName)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Hồ Sơ</span>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href="/interviews"
                  className="px-3.5 py-1.5 rounded-lg bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Lên Lịch Phỏng Vấn</span>
                </Link>

                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-1.5 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] text-xs font-semibold border border-[#E5E5E0]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
