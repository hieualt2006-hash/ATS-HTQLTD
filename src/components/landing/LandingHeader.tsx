"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, ChevronDown } from "lucide-react";

export default function LandingHeader({
  onOpenLogin,
}: {
  onOpenLogin?: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const teamMembers = [
    { name: "Trần Mạnh Dũng", email: "dungtm@gmail.com" },
    { name: "Bành Trung Hiếu", email: "hieubt@gmail.com" },
    { name: "Nguyễn Văn Trường Giang", email: "giangnvt@gmail.com" },
    { name: "Nguyễn Tuấn Anh", email: "anhnt@gmail.com" },
  ];

  return (
    <div className="w-full pt-[10px] px-[10px] sticky top-0 z-50">
      <header className="w-full max-w-7xl mx-auto bg-[#FFFFFF] rounded-2xl sm:rounded-full border border-[#D1D5DB] px-6 py-3 shadow-sm">
        <div className="grid grid-cols-12 items-center">
          {/* Left Column: Logo & Branding */}
          <div className="col-span-6 sm:col-span-4 flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-[#16a34a] flex items-center justify-center text-white shadow-sm shadow-green-600/30 group-hover:scale-105 transition-transform shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1 leading-none">
                  <span className="font-extrabold text-base text-[#0C0C0C] tracking-tight">
                    Nhóm
                  </span>
                  <span className="font-extrabold text-base text-[#16a34a] tracking-tight">
                    20
                  </span>
                </div>
                <p className="text-[11px] text-[#0C0C0C]/70 font-medium leading-tight mt-1">
                  Hệ thống quản lý tuyển dụng
                </p>
              </div>
            </Link>
          </div>

          {/* Center Column: Strictly Centered Homepage & Contact Us */}
          <div className="col-span-6 sm:col-span-4 flex items-center justify-end sm:justify-center gap-6 sm:gap-8">
            {/* Static Homepage button as requested */}
            <Link
              href="/"
              className="text-sm font-bold text-[#0C0C0C] hover:text-[#16a34a] transition-colors cursor-pointer"
            >
              Homepage
            </Link>

            {/* Contact Us with Hover Dropdown as in Image 3 */}
            <div
              className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-sm font-semibold text-[#0C0C0C] hover:text-[#16a34a] transition-colors flex items-center gap-1.5 py-1 cursor-pointer focus:outline-none"
              >
                <span>Contact Us</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-[#16a34a]" : "text-[#0C0C0C]/60"
                    }`}
                />
              </button>

              {/* Dropdown Card (exact list from Image 3) */}
              {dropdownOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 w-72 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-2xl bg-[#131722] text-slate-100 shadow-2xl border border-slate-800 divide-y divide-slate-800/80">
                    <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Thành viên nhóm phát triển
                    </div>
                    {teamMembers.map((member, index) => (
                      <div
                        key={index}
                        className="p-2.5 hover:bg-slate-800/50 rounded-xl transition-colors"
                      >
                        <div className="font-bold text-xs text-white leading-tight">
                          {member.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Spacer to balance Center Column */}
          <div className="hidden sm:flex col-span-4 items-center justify-end">
            <Link
              href="/login"
              className="text-xs font-bold text-[#0C0C0C]/80 hover:text-[#16a34a] px-3.5 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
