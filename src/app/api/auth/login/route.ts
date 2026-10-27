import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { Role } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Email và Mật khẩu." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kiểm tra xem cơ sở dữ liệu thật đã được cấu hình hay chưa
    // Nếu chưa cấu hình (URL mẫu sample-pooler), bỏ qua Prisma để tránh bị treo 15-20s timeout
    const isDbConfigured = isRealDatabaseConfigured();
    let user: any = null;
    let isDbOnline = isDbConfigured;

    if (isDbConfigured) {
      try {
        user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            company: true,
            department: true,
          },
        });
      } catch (dbErr) {
        console.warn("Cơ sở dữ liệu đám mây chưa sẵn sàng, kiểm tra tài khoản mẫu:", dbErr);
        isDbOnline = false;
      }
    }

    // Nếu DB offline hoặc chưa cấu hình Neon, kiểm tra trong mockStore
    if (!isDbOnline || !user) {
      const storeUser = mockStore.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (storeUser) {
        const isMatch =
          storeUser.password === password ||
          (storeUser.passwordHash ? bcrypt.compareSync(password, storeUser.passwordHash) : false);

        if (!isMatch) {
          return NextResponse.json(
            { error: "Tài khoản hoặc mật khẩu không chính xác." },
            { status: 401 }
          );
        }

        const comp = mockStore.companies.find((c) => c.id === storeUser.companyId) || {
          id: storeUser.companyId,
          name: "Công ty",
          slug: "cong-ty",
        };

        const redirectUrl = storeUser.role === Role.INTERVIEWER ? "/interviews" : "/dashboard";
        const token = await signAuthToken({
          userId: storeUser.id,
          companyId: storeUser.companyId,
          companyName: comp.name,
          companySlug: comp.slug,
          email: storeUser.email,
          fullName: storeUser.fullName,
          role: storeUser.role as Role,
          departmentId: storeUser.departmentId,
          departmentName: storeUser.department?.name || null,
        });

        const response = NextResponse.json({
          success: true,
          message: "Đăng nhập thành công!",
          redirectUrl,
          user: {
            id: storeUser.id,
            fullName: storeUser.fullName,
            email: storeUser.email,
            role: storeUser.role,
            companyName: comp.name,
          },
        });

        response.cookies.set({
          name: AUTH_COOKIE_NAME,
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });

        return response;
      }

      if (!isDbOnline) {
        return NextResponse.json(
          { error: "Cơ sở dữ liệu đám mây chưa được kết nối. Bạn có thể sử dụng các tài khoản mẫu bên dưới để trải nghiệm ngay." },
          { status: 503 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ Quản trị viên công ty." },
        { status: 403 }
      );
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Tài khoản hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    // 3. Phân luồng điều hướng theo Role
    // COMPANY_ADMIN & HR -> /dashboard
    // INTERVIEWER -> /interviews
    const redirectUrl = user.role === Role.INTERVIEWER ? "/interviews" : "/dashboard";

    // 4. Ký JWT Token
    const token = await signAuthToken({
      userId: user.id,
      companyId: user.companyId,
      companyName: user.company.name,
      companySlug: user.company.slug,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null,
    });

    // 5. Trả về response kèm Cookie
    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      redirectUrl,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyName: user.company.name,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 ngày
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Lỗi đăng nhập:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi máy chủ trong quá trình đăng nhập: " + (error?.message || "") },
      { status: 500 }
    );
  }
}
