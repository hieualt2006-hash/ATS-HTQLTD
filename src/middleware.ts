import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "ats_b2b_recruitment_jwt_secret_super_secure_key_2026";
const key = new TextEncoder().encode(JWT_SECRET);
const AUTH_COOKIE_NAME = "ats_auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Cho phép tài nguyên tĩnh và Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Lấy cookie token
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  let sessionPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key);
      sessionPayload = payload;
    } catch (e) {
      // Token không hợp lệ hoặc đã hết hạn
      sessionPayload = null;
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedWorkspace =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/processes") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/candidates") ||
    pathname.startsWith("/interviews") ||
    pathname.startsWith("/settings");

  // 3. Nếu đã đăng nhập mà lại vào /login hoặc /register -> chuyển về không gian làm việc
  if (isAuthPage && sessionPayload) {
    const targetUrl = sessionPayload.role === "INTERVIEWER" ? "/interviews" : "/dashboard";
    return NextResponse.redirect(new URL(targetUrl, request.url));
  }

  // 4. Nếu chưa đăng nhập mà cố vào không gian làm việc bảo mật -> chuyển về /login
  if (isProtectedWorkspace && !sessionPayload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Bảo vệ trang /settings: Chỉ dành cho COMPANY_ADMIN
  if (pathname.startsWith("/settings") && sessionPayload && sessionPayload.role !== "COMPANY_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/processes/:path*",
    "/jobs/:path*",
    "/candidates/:path*",
    "/interviews/:path*",
    "/settings/:path*",
  ],
};
