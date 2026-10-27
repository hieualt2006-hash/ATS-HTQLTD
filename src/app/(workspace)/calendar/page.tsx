import { Suspense } from "react";
import CalendarClient from "@/components/calendar/CalendarClient";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Lịch Làm Việc & Phỏng Vấn | ATS Enterprise",
  description: "Timeline làm việc Google Calendar, lịch phỏng vấn và phòng họp Google Meet",
};

export default async function CalendarPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Đang tải timeline lịch làm việc...</span>
        </div>
      }
    >
      <CalendarClient session={session} />
    </Suspense>
  );
}
