import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { Role } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockCompany, MockDepartment, MockUser } from "@/lib/mock-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyName, size, industry, fullName, email, password } = body;

    // 1. Kiểm tra đầu vào
    if (!companyName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ tất cả các thông tin bắt buộc." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có độ dài tối thiểu 6 ký tự." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Hash mật khẩu
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // 3. Nếu chưa kết nối cơ sở dữ liệu thật, xử lý trong mockStore
    if (!isRealDatabaseConfigured()) {
      const existingInMock = mockStore.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (existingInMock) {
        return NextResponse.json(
          { error: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác." },
          { status: 409 }
        );
      }

      let baseSlug = slugify(companyName);
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (mockStore.companies.some((c) => c.slug === uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      const compId = `comp_${Date.now()}`;
      const hrDeptId = `dept_${Date.now()}_hr`;
      const itDeptId = `dept_${Date.now()}_it`;
      const adminUserId = `usr_${Date.now()}_admin`;

      const newCompany: MockCompany = {
        id: compId,
        name: companyName.trim(),
        slug: uniqueSlug,
        size: size || "10-50 nhân sự",
        industry: industry || "Công nghệ & Dịch vụ",
        createdAt: new Date().toISOString(),
      };

      const hrDept: MockDepartment = {
        id: hrDeptId,
        companyId: compId,
        name: "Phòng Nhân sự",
        description: "Quản lý tuyển dụng, nhân sự và hành chính doanh nghiệp",
        createdAt: new Date().toISOString(),
        _count: { users: 1, jobPostings: 0 },
      };

      const itDept: MockDepartment = {
        id: itDeptId,
        companyId: compId,
        name: "Phòng Kỹ thuật",
        description: "Phát triển công nghệ, sản phẩm và vận hành kỹ thuật",
        createdAt: new Date().toISOString(),
        _count: { users: 0, jobPostings: 0 },
      };

      const adminUser: MockUser = {
        id: adminUserId,
        companyId: compId,
        departmentId: hrDeptId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: password,
        passwordHash,
        role: "COMPANY_ADMIN",
        isActive: true,
        createdAt: new Date().toISOString(),
        department: { id: hrDeptId, name: hrDept.name },
      };

      // Đưa vào mock store (công ty hoàn toàn trống: 0 jobs, 0 candidates, 0 processes)
      mockStore.companies.push(newCompany);
      mockStore.departments.push(hrDept, itDept);
      mockStore.users.push(adminUser);
      mockStore.save();

      // Ký JWT Token
      const token = await signAuthToken({
        userId: adminUser.id,
        companyId: newCompany.id,
        companyName: newCompany.name,
        companySlug: newCompany.slug,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: Role.COMPANY_ADMIN,
        departmentId: hrDept.id,
        departmentName: hrDept.name,
      });

      const response = NextResponse.json({
        success: true,
        message: "Đăng ký tài khoản công ty thành công!",
        redirectUrl: "/dashboard",
        user: {
          id: adminUser.id,
          fullName: adminUser.fullName,
          email: adminUser.email,
          role: adminUser.role,
          companyName: newCompany.name,
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

    // 4. Nếu có cơ sở dữ liệu thật (PostgreSQL)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác." },
        { status: 409 }
      );
    }

    let baseSlug = slugify(companyName);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.company.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    // Thực thi Transaction tạo Company, 2 Phòng ban mặc định và Quản trị viên (Không tạo jobs hay candidates)
    const result = await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: companyName.trim(),
          slug: uniqueSlug,
          size: size || "10-50 nhân sự",
          industry: industry || "Công nghệ & Dịch vụ",
        },
      });

      const hrDept = await tx.department.create({
        data: {
          companyId: newCompany.id,
          name: "Phòng Nhân sự",
          description: "Quản lý tuyển dụng, nhân sự và hành chính doanh nghiệp",
        },
      });

      await tx.department.create({
        data: {
          companyId: newCompany.id,
          name: "Phòng Kỹ thuật",
          description: "Phát triển công nghệ, sản phẩm và vận hành kỹ thuật",
        },
      });

      const adminUser = await tx.user.create({
        data: {
          companyId: newCompany.id,
          departmentId: hrDept.id,
          fullName: fullName.trim(),
          email: normalizedEmail,
          passwordHash,
          role: Role.COMPANY_ADMIN,
          isActive: true,
        },
      });

      return {
        company: newCompany,
        user: adminUser,
        hrDept,
      };
    });

    // Ký JWT Token
    const token = await signAuthToken({
      userId: result.user.id,
      companyId: result.company.id,
      companyName: result.company.name,
      companySlug: result.company.slug,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      departmentId: result.hrDept.id,
      departmentName: result.hrDept.name,
    });

    // 7. Tạo response kèm HTTP-Only Cookie
    const response = NextResponse.json({
      success: true,
      message: "Đăng ký tài khoản công ty thành công!",
      redirectUrl: "/dashboard",
      user: {
        id: result.user.id,
        fullName: result.user.fullName,
        email: result.user.email,
        role: result.user.role,
        companyName: result.company.name,
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
    console.error("Lỗi đăng ký công ty:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi trong quá trình đăng ký: " + (error?.message || "Vui lòng thử lại sau.") },
      { status: 500 }
    );
  }
}
