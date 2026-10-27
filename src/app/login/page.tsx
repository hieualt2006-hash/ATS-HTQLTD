"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Vui lòng nhập đầy đủ Email và Mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Tài khoản hoặc mật khẩu không chính xác.");
        setLoading(false);
        return;
      }

      // Đăng nhập thành công -> Điều hướng theo vai trò (Role)
      router.push(data.redirectUrl || "/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Lỗi đăng nhập:", err);
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] flex flex-col lg:flex-row text-[#0C0C0C] font-sans">
      {/* ================= CỘT TRÁI: FORM ĐĂNG NHẬP THUẦN TUÝ ================= */}
      <div className="w-full lg:w-[46%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-white border-r border-slate-200/80">
        
        {/* Top bar: Nút quay về trang chủ */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100/80"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
        </div>

        {/* Center Content: Form Đăng nhập */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          
          {/* Logo Brand Icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#16a34a] flex items-center justify-center text-white shadow-lg shadow-green-900/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-[#0C0C0C] tracking-tight flex items-center gap-1">
                <span>Nhóm</span>
                <span className="text-[#16a34a]">20</span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Hệ thống quản lý tuyển dụng
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C0C0C] tracking-tight">
              Đăng nhập
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Chào mừng trở lại. Đăng nhập để bắt đầu làm việc.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Forgot Password Modal / Notice */}
          {showForgotNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">Bạn quên mật khẩu?</p>
                <p className="text-amber-800 mt-0.5">
                  Vui lòng liên hệ Quản trị viên của công ty bạn để được cấp lại mật khẩu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-amber-700 hover:text-amber-900 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="Email của bạn"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-all"
                />
              </div>
            </div>

            {/* Input Mật khẩu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(true)}
                  className="text-xs text-[#16a34a] hover:underline font-medium cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Mật khẩu của bạn"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox Giữ tôi luôn đăng nhập */}
            <div className="flex items-center gap-2 pt-1">
              <label className="relative flex items-center cursor-pointer select-none text-xs text-slate-600 gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#16a34a] focus:ring-[#16a34a] cursor-pointer"
                />
                <span>Giữ tôi luôn đăng nhập</span>
              </label>
            </div>

            {/* Nút Đăng nhập chính */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#2ea043] hover:bg-[#278637] text-white font-bold text-sm shadow-lg shadow-green-950/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Link sang Đăng ký công ty */}
          <div className="mt-8 text-center text-xs text-slate-500">
            <span>Chưa có tài khoản công ty? </span>
            <Link
              href="/register"
              className="text-[#16a34a] font-bold hover:underline"
            >
              Bắt đầu tạo công ty
            </Link>
          </div>

        </div>

        {/* Footer Cột Trái */}
        <div className="pt-6 border-t border-slate-100 text-center text-[11px] text-slate-400">
          © 2026 Nhóm 20 - Hệ thống Quản lý Tuyển dụng Doanh nghiệp B2B SaaS
        </div>

      </div>

      {/* ================= CỘT PHẢI: HÌNH ẢNH atspic1.png PHÓNG TO LẤP ĐẦY ================= */}
      <div className="w-full lg:w-[54%] xl:w-[58%] min-h-screen bg-white flex items-center justify-center relative overflow-hidden border-l border-slate-200/80">
        <img
          src="/atspic1.png"
          alt="Hệ thống Quản lý Tuyển dụng Nhóm 20"
          className="w-full h-full max-h-[95vh] object-contain p-2 sm:p-4 lg:p-6 select-none transition-all duration-300"
        />
      </div>
    </div>
  );
}
