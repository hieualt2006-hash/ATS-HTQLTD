import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Luôn lấy tên công ty và mã định danh (slug) mới nhất từ Database hoặc mockStore để đồng bộ 100% với Sidebar và Header
  let currentCompanyName = session.companyName;
  let currentCompanySlug = session.companySlug;
  if (!isRealDatabaseConfigured()) {
    const list = Array.isArray(mockStore.companies) ? mockStore.companies : [];
    const comp = list.find((c) => c && c.id === session.companyId) || list[0];
    if (comp?.name) currentCompanyName = comp.name;
    if (comp?.slug) currentCompanySlug = comp.slug;
  } else {
    try {
      const comp = await prisma.company.findUnique({
        where: { id: session.companyId },
        select: { name: true, slug: true },
      });
      if (comp?.name) currentCompanyName = comp.name;
      if (comp?.slug) currentCompanySlug = comp.slug;
    } catch (e) {
      const list = Array.isArray(mockStore.companies) ? mockStore.companies : [];
      const comp = list.find((c) => c && c.id === session.companyId) || list[0];
      if (comp?.name) currentCompanyName = comp.name;
      if (comp?.slug) currentCompanySlug = comp.slug;
    }
  }

  const updatedSession = {
    ...session,
    companyName: currentCompanyName,
    companySlug: currentCompanySlug,
  };

  return (
    <div className="h-screen bg-[#F2F1ED] text-[#0C0C0C] flex font-sans overflow-hidden">
      {/* Sidebar cố định bên trái */}
      <Sidebar session={updatedSession} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header session={updatedSession} />
        <main className="flex-1 min-h-0 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
