import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import InterviewsClient from "@/components/interviews/InterviewsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InterviewsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return <InterviewsClient session={session} />;
}
