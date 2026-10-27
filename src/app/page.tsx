import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import LandingHeroView from "@/components/landing/LandingHeroView";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    if (session.role === "INTERVIEWER") {
      redirect("/interviews");
    } else {
      redirect("/dashboard");
    }
  }

  return <LandingHeroView initialModal="none" />;
}
