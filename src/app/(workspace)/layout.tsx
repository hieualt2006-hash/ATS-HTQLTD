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

  return (
    <div className="h-screen bg-[#F2F1ED] text-[#0C0C0C] flex font-sans overflow-hidden">
      {/* Sidebar cố định bên trái */}
      <Sidebar session={session} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header session={session} />
        <main className="flex-1 min-h-0 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
