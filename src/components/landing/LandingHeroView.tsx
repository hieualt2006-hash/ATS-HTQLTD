"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Lock,
  Mail,
  User,
  Hash,
} from "lucide-react";
import LandingHeader from "./LandingHeader";

interface LandingHeroViewProps {
  initialModal?: "none" | "login" | "register";
}

export default function LandingHeroView({
  initialModal = "none",
}: LandingHeroViewProps) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"none" | "register">(
    initialModal === "register" ? "register" : "none"
  );

  // Register Form State
  const [registerForm, setRegisterForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    email: "",
    password: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError("");
    setRegisterSuccess("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: registerForm.name,
          fullName: registerForm.adminName,
          email: registerForm.email,
          password: registerForm.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Khởi tạo công ty thất bại.");
      }

      setRegisterSuccess(`Khởi tạo công ty ${data.company?.name} thành công!`);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } catch (err: any) {
      setRegisterError(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const closeModal = () => {
    setActiveModal("none");
    setRegisterError("");
    setRegisterSuccess("");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
  };

  const openRegister = () => {
    setActiveModal("register");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/register");
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F1ED] text-[#0C0C0C] flex flex-col justify-between selection:bg-[#16a34a] selection:text-white">
      {/* ================= TOP BAR ================= */}
      <LandingHeader />

      {/* ================= MAIN HERO BODY ================= */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-10 flex-1 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">

          {/* ================= LEFT SECTION ================= */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-[#0C0C0C]">
              Connecting Talent,
              <br />
              <span className="text-[#16a34a]">Building Careers</span>
            </h1>

            <p className="text-base sm:text-lg text-[#0C0C0C]/80 max-w-xl font-normal leading-relaxed">
              Nền tảng quản lý tuyển dụng hiện đại toàn diện. Đơn giản hóa quy trình sàng lọc hồ sơ, tối ưu hóa trải nghiệm ứng viên và xây dựng đội ngũ vững mạnh cho doanh nghiệp của bạn.
            </p>
          </div>

          {/* ================= RIGHT SECTION ================= */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-[#131722] text-slate-100 p-8 rounded-[28px] shadow-2xl border border-slate-800 space-y-6">

              {/* Card Header */}
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Bắt Đầu Trải Nghiệm Ngay
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Khởi tạo tổ chức mới hoặc đăng nhập vào hệ thống để bắt đầu quản lý các chiến dịch tuyển dụng.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3.5 pt-1">
                {/* Green button: Bắt đầu tạo công ty -> mở modal */}
                <button
                  type="button"
                  onClick={openRegister}
                  className="w-full p-4 rounded-2xl bg-[#2ea043] hover:bg-[#278637] text-white flex items-center justify-between shadow-lg shadow-green-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white leading-tight">
                        Bắt đầu tạo công ty
                      </div>
                      <div className="text-[11px] text-white/80 mt-0.5">
                        Dành cho doanh nghiệp mới
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                {/* Dark button: Đăng nhập công ty -> Đi đến trang /login */}
                <Link
                  href="/login"
                  className="w-full p-4 rounded-2xl bg-[#1a2233] hover:bg-[#222c42] border border-slate-700/60 text-slate-100 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Building2 className="w-4 h-4 text-slate-300" />
                  <span className="font-bold text-sm text-slate-100">
                    Đăng nhập công ty
                  </span>
                </Link>
              </div>

              {/* Bottom Feature List */}
              <div className="pt-4 border-t border-slate-800/80 text-center">
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center flex-wrap gap-2">
                  <span>✓ Thiết lập nhanh chóng</span>
                  <span>•</span>
                  <span>✓ Bảo mật tối đa</span>
                  <span>•</span>
                  <span>✓ Đầy đủ tính năng</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="w-full bg-[#F2F1ED] border-t border-slate-300/60 py-5 text-center text-xs text-[#0C0C0C]/60">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Nhóm 20 - Hệ thống Quản lý Tuyển dụng Doanh nghiệp B2B SaaS</span>
          <span>Nền tảng hỗ trợ tuyển dụng thông minh</span>
        </div>
      </footer>

      {/* ================= REGISTER MODAL (ĐÃ BỎ DÒNG BÔI TÍM) ================= */}
      {activeModal === "register" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#131722] text-slate-100 p-8 rounded-[28px] shadow-2xl border border-slate-800 relative space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header: Đã bỏ dòng bôi tím theo yêu cầu */}
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Đăng Ký Tài Khoản Doanh Nghiệp
              </h2>
            </div>

            {registerError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span>{registerError}</span>
              </div>
            )}

            {registerSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                <span>{registerSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tên Doanh Nghiệp <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="VD: VinTech Group"
                      value={registerForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const autoSlug = val
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)+/g, "");
                        setRegisterForm({
                          ...registerForm,
                          name: val,
                          slug: autoSlug,
                        });
                        setRegisterError("");
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#16a34a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Mã Định Danh <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="vintech"
                      value={registerForm.slug}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, slug: e.target.value });
                        setRegisterError("");
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#16a34a]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Họ Và Tên Quản Trị Viên <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={registerForm.adminName}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, adminName: e.target.value });
                      setRegisterError("");
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Email Quản Trị Viên <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="admin@vintech.vn"
                    value={registerForm.email}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, email: e.target.value });
                      setRegisterError("");
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Mật Khẩu Quản Trị <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Ít nhất 6 ký tự"
                    value={registerForm.password}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, password: e.target.value });
                      setRegisterError("");
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-3 px-6 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white font-bold text-xs shadow-lg shadow-green-950/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {registerLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang khởi tạo doanh nghiệp...</span>
                    </>
                  ) : (
                    <>
                      <span>Khởi Tạo Doanh Nghiệp & Vào Hệ Thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <span>Đã có tài khoản công ty?</span>
              <Link
                href="/login"
                className="text-[#16a34a] hover:underline font-bold"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
