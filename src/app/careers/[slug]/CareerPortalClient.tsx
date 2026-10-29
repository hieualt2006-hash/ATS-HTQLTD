"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Upload,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface JobItem {
  id: string;
  title: string;
  quantity: number;
  salaryRange?: string | null;
  deadline?: string | null;
  department?: Department | null;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  size?: string | null;
}

interface CareerPortalClientProps {
  company: CompanyInfo;
  departments: Department[];
  initialJobs: JobItem[];
}

export default function CareerPortalClient({
  company,
  initialJobs,
}: CareerPortalClientProps) {
  const [jobs, setJobs] = useState<JobItem[]>(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Đồng bộ thời gian thực danh sách job từ tài khoản doanh nghiệp
  const fetchLatestJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/external/jobs?slug=${encodeURIComponent(company.slug)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          // Nếu job đang chọn bị xoá hoặc đóng thì tự bỏ chọn
          setSelectedJobId((prev) => {
            if (prev && !data.jobs.some((j: JobItem) => j.id === prev)) {
              return "";
            }
            return prev;
          });
        }
      }
    } catch {
      // Bỏ qua lỗi kết nối ngầm
    }
  }, [company.slug]);

  useEffect(() => {
    // Tự động đồng bộ mỗi 3 giây, khi focus tab hoặc khi tab hiển thị lại
    const interval = setInterval(fetchLatestJobs, 3000);
    const handleSync = () => fetchLatestJobs();
    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
    };
  }, [fetchLatestJobs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") {
        setErrorMessage("Chỉ chấp nhận tệp định dạng PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.");
        e.target.value = "";
        setFile(null);
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMessage("Dung lượng file không được vượt quá 10MB.");
        e.target.value = "";
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedJobId) {
      setErrorMessage("Vui lòng chọn một vị trí công việc bạn muốn ứng tuyển.");
      return;
    }

    if (!file) {
      setErrorMessage("Vui lòng đính kèm tệp CV PDF của bạn.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("jobPostingId", selectedJobId);
      data.append("fullName", formData.fullName.trim());
      data.append("email", formData.email.trim());
      data.append("phone", formData.phone.trim());
      data.append("file", file);

      const res = await fetch("/api/external/apply", {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gửi hồ sơ thất bại. Vui lòng thử lại.");
      }

      setIsSuccess(true);
      setSuccessMsg(result.message || "Đã gửi hồ sơ tới phòng Nhân sự thành công!");
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi không mong muốn.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setFormData({ fullName: "", email: "", phone: "" });
    setFile(null);
    setSelectedJobId("");
    setErrorMessage("");
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const isValidJobSelected = Boolean(selectedJobId && selectedJob);

  return (
    <div className="min-h-screen bg-[#F2F1ED] text-[#0C0C0C] flex items-center justify-center p-3 sm:p-4 font-sans selection:bg-[#16a34a] selection:text-white">
      {/* Khung ô Form to ở chính giữa màn hình, chiều cao tối ưu không cần cuộn */}
      <div className="w-full max-w-[580px] bg-white rounded-2xl sm:rounded-3xl border border-[#E5E5E0] shadow-sm p-4 sm:p-6 transition-all">
        {isSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#16a34a]">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0C0C0C] mb-1">Ứng Tuyển Thành Công!</h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {successMsg}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F2F1ED] border border-[#E5E5E0] text-xs text-slate-700 max-w-sm mx-auto text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Doanh nghiệp:</span>
                <span className="font-bold text-[#0C0C0C]">{company.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vị trí ứng tuyển:</span>
                <span className="font-bold text-[#16a34a]">{selectedJob?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ứng viên:</span>
                <span className="font-semibold text-slate-800">{formData.fullName}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Nộp đơn cho vị trí khác
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Lỗi cảnh báo nếu có */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. VỊ TRÍ TUYỂN DỤNG * */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C0C0C] tracking-wide">
                  <Briefcase className="w-3.5 h-3.5 text-[#0C0C0C]" />
                  <span>VỊ TRÍ TUYỂN DỤNG</span>
                  <span className="text-rose-500">*</span>
                </div>
                {/* Con số hiển thị số lượng công việc đồng bộ thời gian thực với tài khoản */}
                <span className="text-[11px] text-slate-500 font-medium">
                  {jobs.length} vị trí đang mở
                </span>
              </div>

              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-xs sm:text-[13px] text-[#0C0C0C] focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all cursor-pointer"
              >
                <option value="">-- Chọn vị trí công việc bạn muốn ứng tuyển --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} {j.department?.name ? `(${j.department.name})` : ""} - Tuyển {j.quantity} người
                  </option>
                ))}
              </select>
            </div>

            {/* 2. HỌ VÀ TÊN ỨNG VIÊN * */}
            <div>
              <label className="block text-xs font-bold text-[#0C0C0C] tracking-wide mb-1">
                HỌ VÀ TÊN ỨNG VIÊN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn A"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-xs sm:text-[13px] text-[#0C0C0C] placeholder:text-slate-400 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
            </div>

            {/* 3. ĐỊA CHỈ EMAIL * & SỐ ĐIỆN THOẠI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0C0C0C] tracking-wide mb-1">
                  ĐỊA CHỈ EMAIL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="VD: nguyenvana@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 sm:py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-xs sm:text-[13px] text-[#0C0C0C] placeholder:text-slate-400 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0C0C0C] tracking-wide mb-1">
                  SỐ ĐIỆN THOẠI
                </label>
                <input
                  type="tel"
                  placeholder="VD: 0912 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 sm:py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-xs sm:text-[13px] text-[#0C0C0C] placeholder:text-slate-400 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
                />
              </div>
            </div>

            {/* 4. HỒ SƠ CV (ĐỊNH DẠNG PDF, TỐI ĐA 10MB) * - Thiết kế gọn gàng */}
            <div>
              <label className="block text-xs font-bold text-[#0C0C0C] tracking-wide mb-1">
                HỒ SƠ CV (ĐỊNH DẠNG PDF, TỐI ĐA 10MB) <span className="text-rose-500">*</span>
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
                      setErrorMessage("Chỉ chấp nhận tệp định dạng PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.");
                      return;
                    }
                    if (dropped.size > 10 * 1024 * 1024) {
                      setErrorMessage("Dung lượng file không được vượt quá 10MB.");
                      return;
                    }
                    setFile(dropped);
                    setErrorMessage("");
                  }
                }}
                className="relative border-2 border-dashed border-[#E5E5E0] hover:border-[#16a34a] rounded-xl p-3.5 sm:p-4 text-center transition-all bg-[#FAFAF8] cursor-pointer"
              >
                <input
                  type="file"
                  required={!file}
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {file ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E5E5E0] relative z-10 max-w-sm mx-auto shadow-xs">
                    <div className="flex items-center gap-2 text-[#0C0C0C] text-xs font-semibold truncate">
                      <FileText className="w-4 h-4 text-[#16a34a] shrink-0" />
                      <span className="truncate max-w-[180px]">{file.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal shrink-0">
                        ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title="Chọn file khác"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 select-none">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-1">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-[#0C0C0C]">
                      Kéo thả file CV vào đây hoặc{" "}
                      <span className="text-amber-500 hover:underline">chọn từ thiết bị</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Hệ thống chỉ hỗ trợ định dạng PDF (.pdf), dung lượng tối đa 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5. NÚT SUBMIT */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={!isValidJobSelected || loading}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  !isValidJobSelected
                    ? "bg-[#8E95A5] text-white cursor-not-allowed opacity-90"
                    : "bg-[#16a34a] hover:bg-[#15803d] text-white cursor-pointer shadow-xs active:scale-[0.99]"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi hồ sơ ứng tuyển...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi Hồ Sơ Ứng Tuyển</span>
                  </>
                )}
              </button>

              {!isValidJobSelected && (
                <p className="text-center text-[10px] sm:text-[11px] text-amber-600/90 font-medium mt-1.5 select-none">
                  * Vui lòng chọn một vị trí tuyển dụng hợp lệ để mở nút gửi hồ sơ
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
