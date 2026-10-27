import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore, MockDepartment } from "@/lib/mock-store";

// GET: Lấy danh sách phòng ban của công ty
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const getMockDepartments = () => {
    return mockStore.departments.filter(
      (d) => d.companyId === session.companyId || !d.companyId || d.companyId === "comp_demo_hungha_001"
    );
  };

  if (!isRealDatabaseConfigured()) {
    return NextResponse.json({ departments: getMockDepartments() });
  }

  try {
    const departments = await prisma.department.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: {
          select: {
            users: true,
            jobPostings: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ departments });
  } catch (error: any) {
    console.warn("Lỗi kết nối cơ sở dữ liệu khi đọc danh sách phòng ban, chuyển sang mockStore:", error?.message);
    return NextResponse.json({ departments: getMockDepartments() });
  }
}

// POST: Tạo mới phòng ban
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Chỉ Quản trị viên mới có quyền thêm phòng ban." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên phòng ban không được để trống." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const newDept: MockDepartment = {
        id: `dept_${Date.now()}`,
        companyId: session.companyId,
        name: name.trim(),
        description: description?.trim() || null,
        createdAt: new Date().toISOString(),
        _count: { users: 0, jobPostings: 0 },
      };
      mockStore.departments.push(newDept);
      return NextResponse.json({ success: true, department: newDept });
    }

    const dept = await prisma.department.create({
      data: {
        companyId: session.companyId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, department: dept });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật phòng ban
export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Chỉ Quản trị viên mới có quyền sửa phòng ban." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, description } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: "Thông tin phòng ban không hợp lệ." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const target = mockStore.departments.find((d) => d.id === id);
      if (!target) {
        return NextResponse.json({ error: "Không tìm thấy phòng ban thuộc công ty này." }, { status: 404 });
      }
      target.name = name.trim();
      target.description = description?.trim() || null;
      return NextResponse.json({ success: true, department: target });
    }

    const existing = await prisma.department.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy phòng ban thuộc công ty này." }, { status: 404 });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, department: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa phòng ban
export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Chỉ Quản trị viên mới có quyền xóa phòng ban." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID phòng ban cần xóa." }, { status: 400 });
    }

    if (!isRealDatabaseConfigured()) {
      const idx = mockStore.departments.findIndex((d) => d.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: "Không tìm thấy phòng ban." }, { status: 404 });
      }
      mockStore.departments.splice(idx, 1);
      return NextResponse.json({ success: true, message: "Đã xóa phòng ban thành công." });
    }

    const existing = await prisma.department.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        _count: {
          select: { users: true, jobPostings: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy phòng ban." }, { status: 404 });
    }

    await prisma.user.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa phòng ban thành công." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
