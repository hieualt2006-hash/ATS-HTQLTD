import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { syncGoogleCalendar } from "@/lib/google-calendar";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const result = await syncGoogleCalendar(session.companyId);
  return NextResponse.json(result);
}
