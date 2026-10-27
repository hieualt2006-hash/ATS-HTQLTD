"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Briefcase,
  Users,
  Calendar,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import type { AuthSessionPayload } from "@/types/auth";

interface SidebarProps {
  session: AuthSessionPayload;
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      router.push("/login");
    }
  };

  const navigation = [
    {
      name: "Trang chủ",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["COMPANY_ADMIN", "HR"],
    },
    {
      name: "Quy trình tuyển dụng",
      href: "/processes",
      icon: GitBranch,
      roles: ["COMPANY_ADMIN", "HR"],
    },
    {
      name: "Thực hiện tuyển dụng",
      href: "/jobs",
      icon: Briefcase,
      roles: ["COMPANY_ADMIN", "HR"],
    },
    {
      name: "Danh sách ứng viên",
      href: "/candidates",
      icon: Users,
      roles: ["COMPANY_ADMIN", "HR"],
    },
    {
      name: "Lịch phỏng vấn",
      href: "/interviews",
      icon: Calendar,
      roles: ["COMPANY_ADMIN", "HR", "INTERVIEWER"],
    },
    {
      name: "Quản lý Công ty & Nhân sự",
      href: "/settings",
      icon: Settings,
      roles: ["COMPANY_ADMIN"],
    },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(session.role)
  );

  return (
    <aside className="w-64 bg-white border-r border-[#E5E5E0] flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
      {/* Top Part: Company Header & Navigation */}
      <div>
        {/* Company Header */}
        <div className="p-4 border-b border-[#E5E5E0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16a34a] flex items-center justify-center text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-sm text-[#0C0C0C] truncate" title={companyName}>
                {companyName}
              </h2>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                slug: {companySlug}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hệ thống nghiệp vụ
          </div>

          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[#16a34a] text-white"
                    : "text-slate-700 hover:text-[#0C0C0C] hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span className="truncate">{item.name}</span>
                {item.href === "/settings" && (
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Part: Clean Logout Button (đã bỏ khối version slop thừa thãi) */}
      <div className="p-3 border-t border-[#E5E5E0]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
