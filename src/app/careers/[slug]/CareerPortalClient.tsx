"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Search,
  Filter,
  Calendar,
  Users,
  MapPin,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Share2,
  Check,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

interface JobItem {
  id: string;
  title: string;
  quantity: number;
  salaryRange: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  deadline: string | null;
  createdAt: string;
  department: Department | null;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  size: string | null;
}

interface CareerPortalClientProps {
  company: CompanyInfo;
  departments: Department[];
  initialJobs: JobItem[];
}

export default function CareerPortalClient({
  company,
  departments,
  initialJobs,
}: CareerPortalClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  // Filter jobs dynamically in real-time
  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      // Keyword filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = job.title.toLowerCase().includes(query);
        const matchDesc = job.description.toLowerCase().includes(query);
        const matchDept = job.department?.name.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchDept) return false;
      }

      // Department filter
      if (selectedDeptId !== "ALL") {
        if (job.department?.id !== selectedDeptId) return false;
      }

      return true;
    });
  }, [initialJobs, searchTerm, selectedDeptId]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F1ED] text-[#0C0C0C] flex flex-col justify-between font-sans selection:bg-[#16a34a] selection:text-white">
      {/* ================= HEADER ================= */}
      <header className="border-b border-[#E5E5E0] bg-white sticky top-0 z-30 select-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16a34a] flex items-center justify-center font-bold text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-[#0C0C0C] tracking-tight">{company.name}</h1>
              <p className="text-[11px] text-slate-500">Cổng Tuyển Dụng Doanh Nghiệp</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sao chép đường dẫn Cổng tuyển dụng"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                  <span className="text-[#16a34a]">Đã sao chép link</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chia sẻ trang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="bg-white border-b border-[#E5E5E0] py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#16a34a] text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cơ hội nghề nghiệp & Phát triển sự nghiệp</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C0C0C] tracking-tight mb-3">
              Gia nhập đội ngũ {company.name}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Chúng tôi luôn tìm kiếm những nhân tài nhiệt huyết, đam mê cống hiến để cùng kiến tạo
              những giá trị bền vững. Khám phá các vị trí tuyển dụng phù hợp và nộp hồ sơ trực tuyến ngay hôm nay.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {company.industry && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Lĩnh vực:</span>
                  <span>{company.industry}</span>
                </div>
              )}
              {company.size && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Quy mô:</span>
                  <span>{company.size}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Đang mở tuyển:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#16a34a] font-bold">
                  {initialJobs.length} vị trí
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT: SEARCH, FILTERS & JOB LIST ================= */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E0] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm vị trí tuyển dụng theo chức danh hoặc từ khóa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#F2F1ED] border border-[#E5E5E0] rounded-xl text-xs text-[#0C0C0C] placeholder:text-slate-400 focus:outline-none focus:border-[#16a34a] focus:bg-white transition-colors"
              />
            </div>

            {/* Department Quick Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedDeptId("ALL")}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedDeptId === "ALL"
                    ? "bg-[#16a34a] text-white border-[#16a34a]"
                    : "bg-[#F2F1ED] hover:bg-slate-200 text-slate-700 border-[#E5E5E0]"
                }`}
              >
                Tất cả phòng ban ({initialJobs.length})
              </button>
              {departments.map((d) => {
                const count = initialJobs.filter((j) => j.department?.id === d.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDeptId(d.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                      selectedDeptId === d.id
                        ? "bg-[#16a34a] text-white border-[#16a34a]"
                        : "bg-[#F2F1ED] hover:bg-slate-200 text-slate-700 border-[#E5E5E0]"
                    }`}
                  >
                    {d.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span>
            Hiển thị <strong>{filteredJobs.length}</strong> vị trí phù hợp
          </span>
          {initialJobs.length > 0 && (
            <span className="text-[11px] text-slate-400">
              Dữ liệu được cập nhật tự động theo thời gian thực
            </span>
          )}
        </div>

        {/* Job Grid */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E0] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#0C0C0C]">
              {searchTerm || selectedDeptId !== "ALL"
                ? "Không tìm thấy vị trí tuyển dụng phù hợp"
                : "Hiện tại doanh nghiệp chưa có đợt tuyển dụng đang mở"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || selectedDeptId !== "ALL"
                ? "Vui lòng thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc phòng ban."
                : "Các cơ hội việc làm mới sẽ được cập nhật liên tục. Hãy quay lại sau nhé!"}
            </p>
            {(searchTerm || selectedDeptId !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDeptId("ALL");
                }}
                className="px-4 py-2 rounded-xl bg-[#16a34a] text-white text-xs font-semibold hover:bg-[#15803d] transition-colors"
              >
                Xem tất cả vị trí
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-[#E5E5E0] p-5 shadow-xs hover:border-[#16a34a]/50 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F2F1ED] text-slate-700 text-[11px] font-semibold border border-[#E5E5E0]">
                      {job.department?.name || "Chưa phân phòng ban"}
                    </span>
                    {job.salaryRange ? (
                      <span className="text-xs font-bold text-[#16a34a] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md font-mono">
                        {job.salaryRange}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        Thỏa thuận
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#0C0C0C] group-hover:text-[#16a34a] transition-colors line-clamp-1 mb-2">
                    {job.title}
                  </h3>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cần tuyển: <strong className="text-slate-800">{job.quantity}</strong></span>
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hạn nộp: <strong className="text-slate-800">{formatDateTime(job.deadline)}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                    {job.description}
                  </p>
                </div>

                {/* Bottom Action */}
                <div className="pt-3 border-t border-[#E5E5E0] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Đơn ứng tuyển trực tuyến</span>
                  <Link
                    href={`/apply/${job.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-all group-hover:gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Ứng tuyển ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-[#E5E5E0] bg-white py-6 mt-12 text-center text-xs text-slate-500 select-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#16a34a]" />
            <span className="font-semibold text-slate-700">{company.name}</span>
            <span>· Cổng Tuyển Dụng Doanh Nghiệp</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Hệ thống Quản lý Tuyển dụng Doanh nghiệp ATS
          </div>
        </div>
      </footer>
    </div>
  );
}
