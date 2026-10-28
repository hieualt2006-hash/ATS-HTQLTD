"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Link2,
  Copy,
  Check,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  Users,
  GitBranch,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  Globe,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

interface ProcessSummary {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    stageName: string;
    orderIndex: number;
  }>;
}

interface JobPostingItem {
  id: string;
  title: string;
  quantity: number;
  salaryRange: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  deadline: string | null;
  createdAt: string;
  departmentId: string | null;
  department: Department | null;
  processId: string | null;
  process: ProcessSummary | null;
  createdBy?: {
    fullName: string;
  };
  _count?: {
    candidates: number;
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPostingItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Notifications & Copy State
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [companySlug, setCompanySlug] = useState("");
  const [copiedPortal, setCopiedPortal] = useState(false);

  // Modals & Submitting state
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPostingItem | null>(null);
  const [viewingJob, setViewingJob] = useState<JobPostingItem | null>(null);

  // Form state
  const [jobForm, setJobForm] = useState({
    title: "",
    departmentId: "",
    processId: "",
    quantity: 1,
    salaryRange: "",
    deadline: "",
    description: "",
    requirements: "",
    benefits: "",
  });

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

  // Fetch Departments, Processes & Company Info once on mount
  const fetchOptions = async () => {
    try {
      const [deptRes, procRes, compRes] = await Promise.all([
        fetch("/api/company/departments"),
        fetch("/api/processes"),
        fetch("/api/company/info"),
      ]);
      if (deptRes.ok) {
        const dData = await deptRes.json();
        setDepartments(dData.departments || []);
      }
      if (procRes.ok) {
        const pData = await procRes.json();
        setProcesses(pData.processes || []);
      }
      if (compRes.ok) {
        const cData = await compRes.json();
        if (cData.company?.slug) {
          setCompanySlug(cData.company.slug);
        }
      }
    } catch {}
  };

  // Fetch Jobs & Filters
  const fetchJobs = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedDept !== "ALL") params.append("departmentId", selectedDept);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const jobsRes = await fetch(`/api/jobs?${params.toString()}`);
      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        setJobs(jData.jobs || []);
      }
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchOptions();
    fetchJobs(true);
  }, []);

  useEffect(() => {
    fetchJobs(false);
  }, [selectedDept, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  // Mốc thời gian tối thiểu (lớn hơn thời điểm hiện tại ít nhất 1 phút theo giờ local)
  const getMinDateTimeString = () => {
    const now = new Date(Date.now() + 60000);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Create Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!jobForm.deadline) {
      showNotification("Vui lòng chọn hạn chót nộp hồ sơ.", true);
      return;
    }

    const deadlineTime = new Date(jobForm.deadline).getTime();
    if (isNaN(deadlineTime) || deadlineTime <= Date.now()) {
      showNotification("Hạn chót nộp hồ sơ phải sau thời điểm hiện tại.", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...jobForm,
          departmentId: jobForm.departmentId || null,
          processId: jobForm.processId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo đợt tuyển dụng.");

      showNotification(`Tạo đợt tuyển dụng "${jobForm.title}" thành công!`);
      setShowAddModal(false);
      setJobForm({
        title: "",
        departmentId: "",
        processId: "",
        quantity: 1,
        salaryRange: "",
        deadline: "",
        description: "",
        requirements: "",
        benefits: "",
      });
      fetchJobs(false);
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Job
  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob || isSubmitting) return;

    if (editingJob.deadline) {
      const deadlineTime = new Date(editingJob.deadline).getTime();
      if (isNaN(deadlineTime) || deadlineTime <= Date.now()) {
        showNotification("Hạn chót nộp hồ sơ phải sau thời điểm hiện tại.", true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingJob),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật đợt tuyển dụng.");

      showNotification("Cập nhật thông tin đợt tuyển dụng thành công!");
      setEditingJob(null);
      fetchJobs(false);
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status (Cập nhật tức thì không reload trang)
  const handleToggleStatus = async (job: JobPostingItem, newStatus: "OPEN" | "CLOSED") => {
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
    );
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        fetchJobs(false);
        throw new Error(data.error || "Không thể đổi trạng thái.");
      }

      showNotification(`Đã ${newStatus === "OPEN" ? "mở" : "đóng"} tuyển cho vị trí "${job.title}"`);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete Job (Xóa tức thì trên UI 0ms, không xoay loader toàn trang)
  const handleDeleteJob = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đợt tuyển dụng "${title}" không?`)) return;
    // Cập nhật tức thì trên giao diện
    setJobs((prev) => prev.filter((j) => j.id !== id));
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        fetchJobs(false);
        throw new Error(data.error || "Không thể xóa đợt tuyển dụng.");
      }

      showNotification(`Đã xóa đợt tuyển dụng "${title}" thành công.`);
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Copy Link Form Rời
  const handleCopyLink = (jobId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/apply/${jobId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedId(jobId);
    showNotification("Đã sao chép đường link Cổng nộp đơn ứng tuyển độc lập!");
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Copy Link Cổng Tuyển Dụng Tổng (Web Portal)
  const handleCopyPortalLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const slug = companySlug || "rumble";
    const publicUrl = `${origin}/careers/${slug}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedPortal(true);
    showNotification("Đã sao chép đường link Cổng tuyển dụng tổng của doanh nghiệp!");
    setTimeout(() => setCopiedPortal(false), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return {
          label: "Đang Mở Tuyển",
          style: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-[#16a34a]",
        };
      case "CLOSED":
        return {
          label: "Đã Đóng Tuyển",
          style: "bg-slate-100 text-slate-600 border-slate-200",
          dot: "bg-slate-400",
        };
      case "DRAFT":
        return {
          label: "Bản Nháp",
          style: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
        };
      default:
        return {
          label: status,
          style: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] text-[11px] font-semibold text-[#0C0C0C] mb-2">
            <Briefcase className="w-3.5 h-3.5 text-[#16a34a]" />
            Chiến Dịch Tuyển Dụng Doanh Nghiệp
          </div>
          <h2 className="text-xl font-bold text-[#0C0C0C] tracking-tight">
            Thực Hiện Tuyển Dụng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các đợt tuyển dụng đang mở, gán quy trình chuẩn và lấy đường link form nhận đơn gửi ứng viên.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Đợt Tuyển Dụng Mới</span>
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E5E0] flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search & Career Portal Link (Vị trí ô đỏ đánh dấu) */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-1">
          <form onSubmit={handleSearch} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo chức danh hoặc mô tả công việc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E5E0] rounded-lg text-xs text-[#0C0C0C] placeholder-slate-400 focus:outline-none focus:border-[#16a34a]"
            />
          </form>

          {/* Nút Cổng Tuyển Dụng Doanh Nghiệp (Career Portal hiển thị danh sách nhiều job) */}
          <div className="flex items-center gap-1 bg-[#16a34a]/10 border border-[#16a34a]/30 rounded-lg p-1 pr-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyPortalLink}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-[#16a34a] hover:bg-[#16a34a] hover:text-white transition-all cursor-pointer"
              title={`Sao chép link Cổng tuyển dụng tổng: /careers/${companySlug || "rumble"}`}
            >
              {copiedPortal ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  <span>Link Cổng Tuyển Dụng Doanh Nghiệp</span>
                  <Copy className="w-3 h-3 opacity-70" />
                </>
              )}
            </button>
            <Link
              href={`/careers/${companySlug || "rumble"}`}
              target="_blank"
              className="p-1 rounded-md hover:bg-emerald-100 text-[#16a34a] transition-colors"
              title="Mở Cổng tuyển dụng tổng trong tab mới"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-xs text-[#0C0C0C]">
            <Building2 className="w-3.5 h-3.5 text-[#16a34a]" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-xs text-[#0C0C0C] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-xs text-[#0C0C0C]">
            <Filter className="w-3.5 h-3.5 text-[#16a34a]" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs text-[#0C0C0C] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="OPEN">Đang mở tuyển</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="CLOSED">Đã đóng</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 pl-2 hidden sm:block">
            Hiển thị: <strong className="text-[#0C0C0C]">{jobs.length}</strong> đợt tuyển
          </div>
        </div>
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#16a34a]" />
          <p className="text-xs">Đang tải danh sách các đợt tuyển dụng...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-16 text-center bg-white border border-[#E5E5E0] rounded-xl text-slate-500">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0C0C0C] mb-1">Chưa có đợt tuyển dụng nào phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Hãy tạo mới đợt tuyển dụng đầu tiên hoặc điều chỉnh lại bộ lọc tìm kiếm.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đợt Tuyển Dụng Mới</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const statusInfo = getStatusBadge(job.status);
            return (
              <div
                key={job.id}
                className="p-5 rounded-xl bg-white border border-[#E5E5E0] hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Status, Salary, Actions */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5E0] gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.style}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                        {statusInfo.label}
                      </span>

                      {job.salaryRange && (
                        <span className="text-xs font-semibold text-[#16a34a]">
                          {job.salaryRange}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingJob(job)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-black"
                        title="Xem toàn bộ JD"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingJob(job)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-black"
                        title="Chỉnh sửa đợt tuyển dụng"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id, job.title)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Xóa đợt tuyển"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Dept */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-[#0C0C0C] hover:text-[#16a34a] transition-colors leading-snug">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.department?.name || "Chưa gán phòng ban"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Cần tuyển: <strong className="text-[#0C0C0C]">{job.quantity}</strong></span>
                      </div>
                      {job.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Hạn: {formatDateTime(job.deadline)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Short Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {job.description}
                  </p>

                  {/* Process Stage Track */}
                  {job.process && (
                    <div className="p-3 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] mb-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#0C0C0C] mb-2">
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-[#16a34a]" />
                          <span>{job.process.name}</span>
                        </div>
                        <span className="text-slate-500">
                          {job.process.stages?.length || 0} giai đoạn
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                        {job.process.stages?.map((stage, idx) => (
                          <div
                            key={stage.id}
                            className="flex items-center gap-1 flex-shrink-0"
                          >
                            <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-[#E5E5E0]">
                              V{stage.orderIndex}: {stage.stageName}
                            </span>
                            {idx < (job.process?.stages?.length || 0) - 1 && (
                              <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom line: Link form & Candidates count */}
                <div className="pt-3 border-t border-[#E5E5E0] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(job.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] border border-[#E5E5E0] text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                      title="Sao chép link nộp hồ sơ trực tuyến"
                    >
                      {copiedId === job.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                          <span className="text-[#16a34a]">Đã Copy Link!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5 text-slate-600" />
                          <span>Link Form Ứng Tuyển</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/apply/${job.id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-black"
                      title="Mở Cổng nộp đơn ngoài"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <Link
                    href={`/candidates?jobPostingId=${job.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-[#16a34a] hover:underline"
                  >
                    <span>{job._count?.candidates || 0} hồ sơ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: ADD JOB ================= */}
      {mounted && showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0] sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#16a34a]" />
                Tạo Đợt Tuyển Dụng Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tiêu Đề Đợt Tuyển Dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chuyên viên Kinh doanh B2B"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phòng Ban Đảm Nhận
                  </label>
                  <select
                    value={jobForm.departmentId}
                    onChange={(e) => setJobForm({ ...jobForm, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quy Trình Tuyển Dụng Áp Dụng
                  </label>
                  <select
                    value={jobForm.processId}
                    onChange={(e) => setJobForm({ ...jobForm, processId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="">
                      {processes.length === 0
                        ? "-- Chưa có quy trình (Tạo tại mục 'Quy trình tuyển dụng') --"
                        : "-- Chọn quy trình chuẩn --"}
                    </option>
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.stages?.length || 0} vòng
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số Lượng Tuyển
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={jobForm.quantity}
                    onChange={(e) => setJobForm({ ...jobForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mức Lương
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 15 - 25 Triệu hoặc Thỏa thuận"
                    value={jobForm.salaryRange}
                    onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hạn Chót Nộp Hồ Sơ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    min={getMinDateTimeString()}
                    value={jobForm.deadline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setJobForm({ ...jobForm, deadline: val });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô Tả Công Việc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Mô tả chi tiết nhiệm vụ và trách nhiệm chính của vị trí tuyển dụng..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Yêu Cầu Ứng Viên
                </label>
                <textarea
                  rows={3}
                  placeholder="Kinh nghiệm, kỹ năng chuyên môn, trình độ học vấn..."
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Quyền Lợi & Phúc Lợi
                </label>
                <textarea
                  rows={3}
                  placeholder="Lương thưởng, bảo hiểm, chế độ đào tạo và môi trường làm việc..."
                  value={jobForm.benefits}
                  onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a] leading-relaxed"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0] sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? "Đang tạo..." : "Tạo Đợt Tuyển Dụng"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: EDIT JOB ================= */}
      {mounted && editingJob && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0] sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#16a34a]" />
                Chỉnh Sửa Đợt Tuyển Dụng
              </h3>
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tiêu Đề Đợt Tuyển Dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingJob.title}
                  onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phòng Ban Đảm Nhận
                  </label>
                  <select
                    value={editingJob.departmentId || ""}
                    onChange={(e) => setEditingJob({ ...editingJob, departmentId: e.target.value || null })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="">-- Chưa gán phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quy Trình Tuyển Dụng Áp Dụng
                  </label>
                  <select
                    value={editingJob.processId || ""}
                    onChange={(e) => setEditingJob({ ...editingJob, processId: e.target.value || null })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="">
                      {processes.length === 0
                        ? "-- Chưa có quy trình (Tạo tại mục 'Quy trình tuyển dụng') --"
                        : "-- Chưa gán quy trình --"}
                    </option>
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.stages?.length || 0} vòng
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số Lượng Tuyển
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingJob.quantity}
                    onChange={(e) => setEditingJob({ ...editingJob, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mức Lương
                  </label>
                  <input
                    type="text"
                    value={editingJob.salaryRange || ""}
                    onChange={(e) => setEditingJob({ ...editingJob, salaryRange: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng Thái
                  </label>
                  <select
                    value={editingJob.status}
                    onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="OPEN">Đang Mở Tuyển</option>
                    <option value="DRAFT">Bản Nháp</option>
                    <option value="CLOSED">Đã Đóng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hạn Chót Nộp Hồ Sơ
                  </label>
                  <input
                    type="datetime-local"
                    min={getMinDateTimeString()}
                    value={
                      editingJob.deadline
                        ? new Date(new Date(editingJob.deadline).getTime() - new Date().getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && new Date(val).getTime() <= Date.now()) {
                        showNotification("Hạn chót nộp hồ sơ phải sau thời điểm hiện tại.", true);
                        return;
                      }
                      setEditingJob({ ...editingJob, deadline: val || null });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô Tả Công Việc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Yêu Cầu Ứng Viên
                </label>
                <textarea
                  rows={3}
                  value={editingJob.requirements || ""}
                  onChange={(e) => setEditingJob({ ...editingJob, requirements: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Quyền Lợi & Phúc Lợi
                </label>
                <textarea
                  rows={3}
                  value={editingJob.benefits || ""}
                  onChange={(e) => setEditingJob({ ...editingJob, benefits: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a] leading-relaxed"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0] sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: VIEW FULL JD ================= */}
      {mounted && viewingJob && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0] sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a]">
                  Chi Tiết Mô Tả Tuyển Dụng
                </span>
                <h3 className="text-lg font-bold text-[#0C0C0C]">{viewingJob.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F2F1ED] border border-[#E5E5E0] grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">Phòng ban</span>
                  <span className="font-semibold text-[#0C0C0C]">{viewingJob.department?.name || "Chưa gán"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Số lượng</span>
                  <span className="font-semibold text-[#0C0C0C]">{viewingJob.quantity} ứng viên</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Mức lương</span>
                  <span className="font-semibold text-[#16a34a]">{viewingJob.salaryRange || "Thỏa thuận"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Hạn nộp</span>
                  <span className="font-semibold text-[#0C0C0C]">{formatDate(viewingJob.deadline)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#0C0C0C] uppercase tracking-wider text-[11px] mb-1.5 text-[#16a34a]">
                  Mô Tả Công Việc
                </h4>
                <div className="p-4 rounded-xl bg-white border border-[#E5E5E0] whitespace-pre-wrap leading-relaxed text-slate-700">
                  {viewingJob.description}
                </div>
              </div>

              {viewingJob.requirements && (
                <div>
                  <h4 className="font-bold text-[#0C0C0C] uppercase tracking-wider text-[11px] mb-1.5 text-blue-600">
                    Yêu Cầu Ứng Viên
                  </h4>
                  <div className="p-4 rounded-xl bg-white border border-[#E5E5E0] whitespace-pre-wrap leading-relaxed text-slate-700">
                    {viewingJob.requirements}
                  </div>
                </div>
              )}

              {viewingJob.benefits && (
                <div>
                  <h4 className="font-bold text-[#0C0C0C] uppercase tracking-wider text-[11px] mb-1.5 text-amber-600">
                    Quyền Lợi & Phúc Lợi
                  </h4>
                  <div className="p-4 rounded-xl bg-white border border-[#E5E5E0] whitespace-pre-wrap leading-relaxed text-slate-700">
                    {viewingJob.benefits}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-[#E5E5E0] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyLink(viewingJob.id)}
                className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4" />
                <span>Copy Link Form Rời</span>
              </button>
              <button
                onClick={() => setViewingJob(null)}
                className="px-4 py-2 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] text-xs font-semibold border border-[#E5E5E0]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
