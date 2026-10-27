"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Briefcase } from "lucide-react";
import type { AuthSessionPayload } from "@/types/auth";

interface DashboardWelcomeBannerProps {
  session: AuthSessionPayload;
}

export default function DashboardWelcomeBanner({ session }: DashboardWelcomeBannerProps) {
  const [companyName, setCompanyName] = useState(session.companyName);
  const [companySlug, setCompanySlug] = useState(session.companySlug);

  useEffect(() => {
    setCompanyName(session.companyName);
    setCompanySlug(session.companySlug);
  }, [session.companyName, session.companySlug]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.name) {
        setCompanyName(e.detail.name);
      }
      if (e.detail?.slug) {
        setCompanySlug(e.detail.slug);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ats_company_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.name) setCompanyName(parsed.name);
          if (parsed.slug) setCompanySlug(parsed.slug);
        } catch {}
      }
    };

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("ats_company_channel");
        channel.onmessage = (msg) => {
          if (msg.data?.name) setCompanyName(msg.data.name);
          if (msg.data?.slug) setCompanySlug(msg.data.slug);
        };
      }
    } catch {}

    window.addEventListener("company-name-updated", handleUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("company-name-updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, []);

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E5E5E0]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C0C0C] tracking-tight">
            Chào mừng, {session.fullName}!
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Hệ thống đang hoạt động cho công ty <strong className="text-[#0C0C0C]">{companyName}</strong> · Mã định danh <code className="text-[#16a34a] font-mono font-semibold">{companySlug}</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {session.role === "COMPANY_ADMIN" && (
            <Link
              href="/settings"
              className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-2 transition-colors"
            >
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>Quản Lý Nhân Sự</span>
            </Link>
          )}
          <Link
            href="/jobs"
            className="px-4 py-2.5 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>Xem Đợt Tuyển Dụng</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
