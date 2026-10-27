import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";
import {
  Briefcase,
  Users,
  Calendar,
  ArrowRight,
  GitBranch,
  Building2,
  CheckCircle2,
} from "lucide-react";
import DashboardWelcomeBanner from "@/components/dashboard/DashboardWelcomeBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  // Query live counts for this company
  let jobsCount = 0;
  let candidatesCount = 0;
  let processesCount = 0;
  let departmentsCount = 0;

  if (isRealDatabaseConfigured()) {
    try {
      [jobsCount, candidatesCount, processesCount, departmentsCount] = await Promise.all([
        prisma.jobPosting.count({ where: { companyId: session.companyId, status: "OPEN" } }),
        prisma.candidate.count({ where: { companyId: session.companyId } }),
        prisma.recruitmentProcess.count({ where: { companyId: session.companyId } }),
        prisma.department.count({ where: { companyId: session.companyId } }),
      ]);
    } catch (err) {
      console.log("Database query failed, reading fallback from mockStore");
      mockStore.jobs = mockStore.jobs.filter((j) => !j.id.startsWith("job_demo_"));
      mockStore.candidates = mockStore.candidates.filter((c) => !c.id.startsWith("cand_demo_"));
      mockStore.processes = mockStore.processes.filter((p) => !p.id.startsWith("proc_demo_"));
      jobsCount = mockStore.jobs.filter((j) => j.companyId === session.companyId && j.status === "OPEN").length;
      candidatesCount = mockStore.candidates.filter((c) => c.companyId === session.companyId).length;
      processesCount = mockStore.processes.filter((p) => p.companyId === session.companyId).length;
      departmentsCount = mockStore.departments.filter((d) => d.companyId === session.companyId).length;
    }
  } else {
    // Dọn sạch mọi dữ liệu mẫu demo cũ còn sót trong bộ nhớ
    mockStore.jobs = mockStore.jobs.filter((j) => !j.id.startsWith("job_demo_"));
    mockStore.candidates = mockStore.candidates.filter((c) => !c.id.startsWith("cand_demo_"));
    mockStore.processes = mockStore.processes.filter((p) => !p.id.startsWith("proc_demo_"));

    // Lấy số liệu thực tế từ mockStore theo đúng companyId của phiên làm việc
    jobsCount = mockStore.jobs.filter((j) => j.companyId === session.companyId && j.status === "OPEN").length;
    candidatesCount = mockStore.candidates.filter((c) => c.companyId === session.companyId).length;
    processesCount = mockStore.processes.filter((p) => p.companyId === session.companyId).length;
    departmentsCount = mockStore.departments.filter((d) => d.companyId === session.companyId).length;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Welcome Banner: Tự động đồng bộ thời gian thực tên công ty và slug */}
      <DashboardWelcomeBanner session={session} />

      {/* 4 Metric Cards: Thẻ nền trắng #FFFFFF, chữ đen #0C0C0C, viền mỏng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đợt Đang Mở</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#16a34a]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#0C0C0C]">{jobsCount}</div>
          <div className="text-xs text-emerald-700 mt-2 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đang tiếp nhận hồ sơ</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Ứng Viên</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#0C0C0C]">{candidatesCount}</div>
          <div className="text-xs text-slate-500 mt-2">Hồ sơ trong hệ thống</div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quy Trình Chuẩn</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#0C0C0C]">{processesCount}</div>
          <div className="text-xs text-slate-500 mt-2">Quy trình tuyển dụng vị trí</div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phòng Ban</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#0C0C0C]">{departmentsCount}</div>
          <div className="text-xs text-slate-500 mt-2">Cơ cấu nội bộ công ty</div>
        </div>
      </div>

      {/* Lối tắt nhanh nghiệp vụ tuyển dụng (thay thế khối lộ trình 5 phase thừa thãi) */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E5E0]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-[#0C0C0C]">
            Truy Cập Nhanh Nghiệp Vụ
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Lối tắt chuyển nhanh đến các chức năng quản lý tuyển dụng cốt lõi
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Link
            href="/jobs"
            className="p-4 rounded-xl border border-slate-200 hover:border-[#16a34a] hover:bg-emerald-50/40 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center mb-2.5">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#0C0C0C] group-hover:text-[#16a34a] flex items-center justify-between">
              <span>Đợt tuyển dụng</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Đăng tin và quản lý vị trí</div>
          </Link>

          <Link
            href="/candidates"
            className="p-4 rounded-xl border border-slate-200 hover:border-[#16a34a] hover:bg-emerald-50/40 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
              <Users className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#0C0C0C] group-hover:text-[#16a34a] flex items-center justify-between">
              <span>Hồ sơ ứng viên</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Sàng lọc và phân loại CV</div>
          </Link>

          <Link
            href="/processes"
            className="p-4 rounded-xl border border-slate-200 hover:border-[#16a34a] hover:bg-emerald-50/40 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5">
              <GitBranch className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#0C0C0C] group-hover:text-[#16a34a] flex items-center justify-between">
              <span>Quy trình tuyển</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Cấu hình các vòng phỏng vấn</div>
          </Link>

          <Link
            href="/interviews"
            className="p-4 rounded-xl border border-slate-200 hover:border-[#16a34a] hover:bg-emerald-50/40 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#0C0C0C] group-hover:text-[#16a34a] flex items-center justify-between">
              <span>Lịch phỏng vấn</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Xếp lịch và gửi đánh giá</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
