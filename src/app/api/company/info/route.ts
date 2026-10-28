import { NextResponse } from "next/server";
import { getCurrentSession, signAuthToken, AUTH_COOKIE_NAME, invalidateCompanyCache } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const getMockCompany = () => {
    const list = Array.isArray(mockStore.companies) ? mockStore.companies : [];
    let comp = list.find((c) => c && c.id === session.companyId);
    if (!comp) {
      comp = list[0] || (mockStore as any).company || {
        id: session.companyId || "comp_demo_hungha_001",
        name: "Công ty Cổ phần Thanh toán Hưng Hà",
        slug: "hung-ha",
        industry: "Công nghệ thông tin & FinTech",
        size: "100-500 nhân sự",
      };
    }
    const depts = Array.isArray(mockStore.departments) ? mockStore.departments : [];
    const users = Array.isArray(mockStore.users) ? mockStore.users : [];
    const jobs = Array.isArray(mockStore.jobs) ? mockStore.jobs : [];
    const candidates = Array.isArray(mockStore.candidates) ? mockStore.candidates : [];

    return {
      ...comp,
      _count: {
        departments: depts.filter((d) => d && d.companyId === session.companyId).length,
        users: users.filter((u) => u && (u.companyId === session.companyId || !u.companyId || u.companyId === "comp_demo_hungha_001")).length,
        jobPostings: jobs.filter((j) => j && j.companyId === session.companyId && !j.id.startsWith("job_demo_")).length,
        candidates: candidates.filter((c) => c && c.companyId === session.companyId && !c.id.startsWith("cand_demo_")).length,
      },
    };
  };

  if (!isRealDatabaseConfigured()) {
    return NextResponse.json({ company: getMockCompany() });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      include: {
        _count: {
          select: {
            departments: true,
            users: true,
            jobPostings: true,
            candidates: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ company: getMockCompany() });
    }

    return NextResponse.json({ company });
  } catch (error: any) {
    console.warn("Lỗi kết nối cơ sở dữ liệu khi đọc thông tin công ty, chuyển sang mockStore:", error?.message);
    return NextResponse.json({ company: getMockCompany() });
  }
}

export async function PUT(req: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "Chỉ Quản trị viên mới có quyền chỉnh sửa thông tin công ty." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, size, industry, slug } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên công ty không được để trống." }, { status: 400 });
    }

    const cleanSlug = slug
      ? slug.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      : undefined;

    const updateMock = () => {
      if (!Array.isArray(mockStore.companies) || mockStore.companies.length === 0) {
        mockStore.companies = [{
          id: session.companyId || "comp_demo_hungha_001",
          name: name.trim(),
          slug: cleanSlug || "hung-ha",
          industry: industry || "Công nghệ thông tin",
          size: size || "Dưới 20 nhân sự",
          createdAt: new Date().toISOString()
        }];
        return mockStore.companies[0];
      }
      let comp = mockStore.companies.find((c) => c && c.id === session.companyId);
      if (!comp) comp = mockStore.companies[0];
      comp.name = name.trim();
      if (cleanSlug) comp.slug = cleanSlug;
      if (size !== undefined) comp.size = size;
      if (industry !== undefined) comp.industry = industry;
      mockStore.save();
      return comp;
    };

    const comp = updateMock();
    invalidateCompanyCache(session.companyId);

    const finalSlug = cleanSlug || comp.slug || session.companySlug;

    if (!isRealDatabaseConfigured()) {
      const newToken = await signAuthToken({
        ...session,
        companyName: name.trim(),
        companySlug: finalSlug,
      });

      const response = NextResponse.json({ success: true, company: comp });
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
      return response;
    }

    try {
      const updateData: any = {
        name: name.trim(),
        size: size || null,
        industry: industry || null,
      };
      if (cleanSlug) updateData.slug = cleanSlug;

      const updated = await prisma.company.update({
        where: { id: session.companyId },
        data: updateData,
      });

      const newToken = await signAuthToken({
        ...session,
        companyName: name.trim(),
        companySlug: finalSlug,
      });

      const response = NextResponse.json({ success: true, company: updated });
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
      return response;
    } catch (dbErr: any) {
      console.warn("Lỗi kết nối cơ sở dữ liệu khi cập nhật công ty, lưu vào mockStore:", dbErr?.message);
      const newToken = await signAuthToken({
        ...session,
        companyName: name.trim(),
        companySlug: finalSlug,
      });

      const response = NextResponse.json({ success: true, company: comp });
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
      return response;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
