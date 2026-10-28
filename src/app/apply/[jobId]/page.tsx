import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ApplyFormClient from "./ApplyFormClient";
import { Building2, Calendar, Users, MapPin, Briefcase } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

export default async function ExternalApplyPage({
  params,
}: {
  params: { jobId: string };
}) {
  let job: any = null;

  if (!isRealDatabaseConfigured()) {
    const found = mockStore.jobs.find((j) => j.id === params.jobId);
    if (found) {
      const comp = mockStore.companies.find((c) => c.id === found.companyId) || mockStore.company;
      job = { ...found, company: comp };
    }
  } else {
    try {
      job = await prisma.jobPosting.findUnique({
        where: { id: params.jobId },
        include: {
          company: true,
          department: true,
        },
      });
    } catch {
      const found = mockStore.jobs.find((j) => j.id === params.jobId);
      if (found) {
        const comp = mockStore.companies.find((c) => c.id === found.companyId) || mockStore.company;
        job = { ...found, company: comp };
      }
    }
  }

  if (!job) {
    notFound();
  }

  const isExpired = job.deadline ? new Date(job.deadline).getTime() <= Date.now() : false;
  const isClosed = job.status === "CLOSED" || isExpired;

  return (
    <div className="min-h-screen bg-[#F2F1ED] text-[#0C0C0C] flex flex-col justify-between selection:bg-[#16a34a] selection:text-white">
      {/* Clean Independent Header */}
      <header className="border-b border-[#E5E5E0] bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] flex items-center justify-center font-bold text-[#16a34a]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-[#0C0C0C] tracking-tight">{job.company.name}</h1>
              <p className="text-[10px] text-slate-500">Cổng Tiếp Nhận Hồ Sơ Tuyển Dụng</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {job.company.slug && (
              <Link
                href={`/careers/${job.company.slug}`}
                className="text-xs font-semibold text-slate-600 hover:text-[#16a34a] flex items-center gap-1 transition-colors mr-1"
                title={`Xem tất cả vị trí tuyển dụng tại ${job.company.name}`}
              >
                <span>← Tất cả việc làm</span>
              </Link>
            )}
            {isClosed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                ● Đã Hết Hạn Nộp Hồ Sơ
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Đang Nhận Hồ Sơ
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Job Details & JD (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] block mb-1">
                  Vị trí ứng tuyển
                </span>
                <h2 className="text-2xl font-bold text-[#0C0C0C] tracking-tight leading-snug">
                  {job.title}
                </h2>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                {job.department && (
                  <span className="px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] text-slate-700">
                    {job.department.name}
                  </span>
                )}
                {job.salaryRange && (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold font-mono">
                    Mức lương: {job.salaryRange}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] text-slate-700">
                  Số lượng: {job.quantity} người
                </span>
                {job.deadline && (
                  <span className={`px-2.5 py-1 rounded-md border text-xs ${isExpired ? "bg-rose-50 border-rose-200 text-rose-700 font-semibold" : "bg-[#F2F1ED] border-[#E5E5E0] text-amber-700"}`}>
                    Hạn nộp: {formatDateTime(job.deadline)}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="pt-3 border-t border-[#E5E5E0] space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#16a34a]">
                  Mô Tả Công Việc
                </h3>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div className="pt-3 border-t border-[#E5E5E0] space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600">
                    Yêu Cầu Ứng Viên
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {job.requirements}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div className="pt-3 border-t border-[#E5E5E0] space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-600">
                    Quyền Lợi & Đãi Ngộ
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {job.benefits}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Apply Form (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              {isClosed ? (
                <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-[#0C0C0C]">
                    Đã Hết Hạn Nhận Hồ Sơ
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Đợt tuyển dụng vị trí <strong>{job.title}</strong> hiện đã kết thúc thời gian tiếp nhận hồ sơ ứng tuyển. Cảm ơn bạn đã quan tâm đến cơ hội nghề nghiệp tại {job.company.name}.
                  </p>
                </div>
              ) : (
                <ApplyFormClient jobId={job.id} jobTitle={job.title} companyName={job.company.name} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E0] bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-6">
          <p>© {new Date().getFullYear()} {job.company.name}. Nền tảng tuyển dụng thông minh ATS Enterprise.</p>
        </div>
      </footer>
    </div>
  );
}
