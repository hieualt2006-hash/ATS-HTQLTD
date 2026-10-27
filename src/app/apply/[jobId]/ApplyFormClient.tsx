"use client";

import { useState } from "react";
import {
  Upload,
  User,
  Mail,
  Phone,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

interface ApplyFormClientProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export default function ApplyFormClient({
  jobId,
  jobTitle,
  companyName,
}: ApplyFormClientProps) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") {
        setErrorMessage("Chỉ chấp nhận tệp định dạng PDF (.pdf). Vui lòng không chọn file ảnh hoặc định dạng khác.");
        e.target.value = "";
        setFile(null);
        return;
      }
      if (selected.size > 15 * 1024 * 1024) {
        setErrorMessage("Dung lượng file không được vượt quá 15MB.");
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

    if (!file) {
      setErrorMessage("Vui lòng đính kèm tệp CV PDF của bạn.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("jobPostingId", jobId);
      data.append("fullName", formData.fullName);
      data.append("email", formData.email);
      data.append("phone", formData.phone);
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

  if (isSuccess) {
    return (
      <div className="p-8 rounded-xl bg-white border border-[#E5E5E0] text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#16a34a]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#0C0C0C] mb-2">Ứng Tuyển Thành Công!</h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            {successMsg}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-xs text-slate-600 space-y-1">
          <p>
            Vị trí: <strong className="text-[#0C0C0C]">{jobTitle}</strong>
          </p>
          <p>
            Đơn vị tuyển dụng: <strong className="text-[#16a34a]">{companyName}</strong>
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          Bộ phận Nhân sự sẽ thẩm định hồ sơ và liên hệ với bạn trong thời gian sớm nhất qua Email / Số điện thoại đã đăng ký.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] space-y-5">
      <div>
        <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
          <span>Nộp Đơn Ứng Tuyển</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Nhanh Gọn
          </span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Điền thông tin và đính kèm CV để gửi trực tiếp tới Ban Nhân Sự
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Họ và Tên của bạn <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Ví dụ: Nguyễn Văn An"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email liên hệ <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="an.nguyen@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Số điện thoại
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              placeholder="0912 345 678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
            />
          </div>
        </div>

        {/* File Upload Box */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Đính Kèm File CV PDF <span className="text-rose-500">*</span>
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
                if (dropped.size > 15 * 1024 * 1024) {
                  setErrorMessage("Dung lượng file không được vượt quá 15MB.");
                  return;
                }
                setFile(dropped);
                setErrorMessage("");
              }
            }}
            className="relative border-2 border-dashed border-[#E5E5E0] hover:border-[#16a34a] rounded-xl p-5 text-center transition-colors bg-[#F2F1ED] cursor-pointer"
          >
            <input
              type="file"
              required={!file}
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E5E5E0] relative z-10">
                <div className="flex items-center gap-2 text-[#0C0C0C] text-xs font-semibold truncate">
                  <FileText className="w-5 h-5 text-[#16a34a] shrink-0" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-[10px] text-slate-500 font-normal shrink-0">
                    · {(file.size / (1024 * 1024)).toFixed(1)} MB
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
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1 text-slate-600 text-xs">
                <Upload className="w-6 h-6 mx-auto text-[#16a34a] mb-1" />
                <p className="font-semibold text-[#0C0C0C]">Bấm để chọn tệp hoặc kéo thả file PDF vào đây</p>
                <p className="text-[10px] text-slate-400">Chỉ chấp nhận tệp định dạng .pdf • Tối đa 15MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tiếp nhận hồ sơ...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi Hồ Sơ Ứng Tuyển Ngay</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="pt-3 border-t border-[#E5E5E0] text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a]" />
        <span>Thông tin cá nhân của bạn được bảo mật tuyệt đối</span>
      </div>
    </div>
  );
}
