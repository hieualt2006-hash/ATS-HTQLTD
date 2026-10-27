import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockUser } from "@/lib/mock-store";

// GET: Lấy danh sách nhân viên thuộc công ty
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const getMockUsers = () => {
    // Đảm bảo sếp Nguyễn Văn Hưng (COMPANY_ADMIN) luôn luôn hiện diện
    const hasAdmin = mockStore.users.some(
      (u) => u.role === "COMPANY_ADMIN" || u.email === "admin@hungha.com" || u.fullName.includes("Nguyễn Văn Hưng")
    );
    if (!hasAdmin) {
      mockStore.users.unshift({
        id: "usr_demo_admin_001",
        companyId: session.companyId || "comp_demo_hungha_001",
        departmentId: null,
        fullName: "Nguyễn Văn Hưng",
        email: "admin@hungha.com",
        password: "123456",
        role: "COMPANY_ADMIN",
        isActive: true,
        createdAt: new Date().toISOString(),
        department: null,
      });
    }
    return mockStore.users.filter(
      (u) => u.companyId === session.companyId || !u.companyId || u.companyId === "comp_demo_hungha_001"
    );
  };

  if (!isRealDatabaseConfigured()) {
    return NextResponse.json({ users: getMockUsers() });
  }

  try {
    const users = await prisma.user.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assignedInterviews: true,
            createdJobPostings: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!users || users.length === 0) {
      return NextResponse.json({ users: getMockUsers() });
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.warn("Lỗi kết nối cơ sở dữ liệu khi đọc danh sách nhân sự, chuyển sang mockStore:", error?.message);
    return NextResponse.json({ users: getMockUsers() });
  }
}

// POST: Tạo tài khoản nhân viên mới trong công ty
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Chỉ Quản trị viên mới có quyền tạo thêm tài khoản nhân viên." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fullName, email, password, role, departmentId } = body;

    if (!fullName || !email || !password || !role) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ: Họ tên, Email, Mật khẩu và Vai trò." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu nhân viên phải tối thiểu 6 ký tự." }, { status: 400 });
    }

    const validRoles = [Role.HR, Role.INTERVIEWER, Role.COMPANY_ADMIN];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isRealDatabaseConfigured()) {
      const exists = mockStore.users.some((u) => u.email === normalizedEmail);
      if (exists) {
        return NextResponse.json({ error: "Email này đã được sử dụng trong hệ thống." }, { status: 409 });
      }
      const dept = mockStore.departments.find((d) => d.id === departmentId);
      const newUser: MockUser = {
        id: `usr_${Date.now()}`,
        companyId: session.companyId,
        departmentId: departmentId || null,
        fullName: fullName.trim(),
        email: normalizedEmail,
        role: role as any,
        isActive: true,
        createdAt: new Date().toISOString(),
        department: dept ? { id: dept.id, name: dept.name } : null,
      };
      mockStore.users.push(newUser);
      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          departmentName: newUser.department?.name,
        },
      });
    }

    // Kiểm tra email đã có người dùng chưa
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "Email này đã được sử dụng trong hệ thống." }, { status: 409 });
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId: session.companyId },
      });
      if (!dept) {
        return NextResponse.json({ error: "Phòng ban đã chọn không tồn tại trong công ty này." }, { status: 400 });
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = await prisma.user.create({
      data: {
        companyId: session.companyId,
        departmentId: departmentId || null,
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: role as Role,
        isActive: true,
      },
      include: {
        department: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        departmentName: newUser.department?.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin nhân viên hoặc đổi mật khẩu
export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Chỉ Quản trị viên mới có quyền cập nhật nhân viên." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, fullName, role, departmentId, isActive, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhân viên." }, { status: 400 });
    }

    if (id === session.userId && isActive === false) {
      return NextResponse.json({ error: "Bạn không thể tự vô hiệu hóa tài khoản quản trị của chính mình." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const targetUser = mockStore.users.find((u) => u.id === id);
      if (!targetUser) {
        return NextResponse.json({ error: "Không tìm thấy nhân viên thuộc công ty này." }, { status: 404 });
      }
      if (fullName) targetUser.fullName = fullName.trim();
      if (role) targetUser.role = role as any;
      if (departmentId !== undefined) {
        targetUser.departmentId = departmentId || null;
        const dept = mockStore.departments.find((d) => d.id === departmentId);
        targetUser.department = dept ? { id: dept.id, name: dept.name } : null;
      }
      if (isActive !== undefined) targetUser.isActive = Boolean(isActive);

      return NextResponse.json({ success: true, user: targetUser });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên thuộc công ty này." }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (role) updateData.role = role as Role;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (newPassword && newPassword.trim().length >= 6) {
      const salt = bcrypt.genSaltSync(10);
      updateData.passwordHash = bcrypt.hashSync(newPassword.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa nhân viên khỏi công ty
export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Chỉ Quản trị viên mới có quyền xóa tài khoản nhân sự." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhân viên." }, { status: 400 });
    }

    if (id === session.userId) {
      return NextResponse.json({ error: "Bạn không thể xóa chính tài khoản của mình." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const idx = mockStore.users.findIndex((u) => u.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: "Không tìm thấy tài khoản trong công ty." }, { status: 404 });
      }
      mockStore.users.splice(idx, 1);
      return NextResponse.json({ success: true, message: "Đã xóa tài khoản nhân viên." });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản trong công ty." }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa tài khoản nhân viên." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
