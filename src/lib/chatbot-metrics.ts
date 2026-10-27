import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { mockStore } from "@/lib/mock-store";

export interface CompanySafeMetrics {
  company: {
    id: string;
    name: string;
    slug: string;
    industry?: string | null;
    size?: string | null;
  };
  stats: {
    totalJobs: number;
    openJobs: number;
    closedJobs: number;
    totalCandidates: number;
    inProgressCandidates: number;
    hiredCandidates: number;
    rejectedCandidates: number;
    totalInterviews: number;
    upcomingInterviews: number;
    totalProcesses: number;
    totalDepartments: number;
    totalMembers: number;
  };
  openJobDetails: Array<{
    title: string;
    quantity: number;
    department?: string | null;
    salaryRange?: string | null;
    deadline?: string | null;
  }>;
  recentCandidates: Array<{
    fullName: string;
    jobTitle: string;
    status: string;
    aiMatchScore?: number | null;
  }>;
  upcomingInterviewDetails: Array<{
    candidateName: string;
    startTime: string;
    interviewerName?: string | null;
  }>;
  members: Array<{
    fullName: string;
    role: string;
    email: string;
    department?: string | null;
  }>;
}

/**
 * Thu thập số liệu thống kê an toàn của công ty hiện tại.
 * TUYỆT ĐỐI KHÔNG SELECT PASSWORD HOẶC PASSWORDHASH!
 */
export async function getCompanySafeMetrics(companyId: string): Promise<CompanySafeMetrics | null> {
  if (!companyId) return null;

  if (isRealDatabaseConfigured()) {
    try {
      const [
        company,
        jobList,
        candidateList,
        interviewList,
        processCount,
        departmentList,
        userList,
      ] = await Promise.all([
        prisma.company.findUnique({
          where: { id: companyId },
          select: { id: true, name: true, slug: true, industry: true, size: true },
        }),
        prisma.jobPosting.findMany({
          where: { companyId },
          select: {
            id: true,
            title: true,
            status: true,
            quantity: true,
            salaryRange: true,
            deadline: true,
            department: { select: { name: true } },
          },
        }),
        prisma.candidate.findMany({
          where: { companyId },
          select: {
            id: true,
            fullName: true,
            status: true,
            aiMatchScore: true,
            appliedAt: true,
            jobPosting: { select: { title: true } },
          },
          orderBy: { appliedAt: "desc" },
          take: 20,
        }),
        prisma.interview.findMany({
          where: { companyId },
          select: {
            id: true,
            startTime: true,
            evaluationResult: true,
            candidate: { select: { fullName: true } },
            interviewer: { select: { fullName: true } },
          },
          orderBy: { startTime: "asc" },
        }),
        prisma.recruitmentProcess.count({ where: { companyId } }),
        prisma.department.findMany({
          where: { companyId },
          select: { id: true, name: true },
        }),
        // TUYỆT ĐỐI KHÔNG SELECT passwordHash
        prisma.user.findMany({
          where: { companyId },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: { select: { name: true } },
          },
        }),
      ]);

      if (company) {
        const now = new Date();
        const openJobs = jobList.filter((j) => j.status === "OPEN");
        const closedJobs = jobList.filter((j) => j.status === "CLOSED");

        const inProgressCandidates = candidateList.filter((c) => c.status === "IN_PROGRESS");
        const hiredCandidates = candidateList.filter((c) => c.status === "HIRED");
        const rejectedCandidates = candidateList.filter((c) => c.status === "REJECTED");

        const upcomingInterviews = interviewList.filter(
          (i) => new Date(i.startTime) >= now && i.evaluationResult === "PENDING"
        );

        return {
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
            industry: company.industry,
            size: company.size,
          },
          stats: {
            totalJobs: jobList.length,
            openJobs: openJobs.length,
            closedJobs: closedJobs.length,
            totalCandidates: candidateList.length,
            inProgressCandidates: inProgressCandidates.length,
            hiredCandidates: hiredCandidates.length,
            rejectedCandidates: rejectedCandidates.length,
            totalInterviews: interviewList.length,
            upcomingInterviews: upcomingInterviews.length,
            totalProcesses: processCount,
            totalDepartments: departmentList.length,
            totalMembers: userList.length,
          },
          openJobDetails: openJobs.map((j) => ({
            title: j.title,
            quantity: j.quantity,
            department: j.department?.name || "Chưa phân bổ",
            salaryRange: j.salaryRange || "Thỏa thuận",
            deadline: j.deadline ? new Date(j.deadline).toLocaleDateString("vi-VN") : "Đang tuyển liên tục",
          })),
          recentCandidates: candidateList.slice(0, 10).map((c) => ({
            fullName: c.fullName,
            jobTitle: c.jobPosting?.title || "Không rõ",
            status: c.status === "HIRED" ? "Đã tuyển" : c.status === "REJECTED" ? "Từ chối" : "Đang xử lý",
            aiMatchScore: c.aiMatchScore,
          })),
          upcomingInterviewDetails: upcomingInterviews.slice(0, 5).map((i) => ({
            candidateName: i.candidate?.fullName || "Ứng viên",
            startTime: new Date(i.startTime).toLocaleString("vi-VN"),
            interviewerName: i.interviewer?.fullName || "Người phỏng vấn",
          })),
          members: userList.map((u) => ({
            fullName: u.fullName,
            role: u.role === "COMPANY_ADMIN" ? "Quản trị viên" : u.role === "HR" ? "Chuyên viên HR" : "Người phỏng vấn",
            email: u.email,
            department: u.department?.name || "Chưa phân bổ",
          })),
        };
      }
    } catch (err) {
      console.warn("Lỗi truy vấn Prisma metrics, chuyển sang mockStore:", err);
    }
  }

  // Fallback an toàn từ mockStore hoặc dữ liệu mặc định
  const companyList = Array.isArray(mockStore.companies) ? mockStore.companies : [];
  const comp = companyList.find((c) => c.id === companyId) || mockStore.company || {
    id: companyId,
    name: "Doanh nghiệp Hưng Hà",
    slug: "hung-ha",
    industry: "Công nghệ thông tin",
    size: "100-500",
  };

  const allJobs = Array.isArray(mockStore.jobs) ? mockStore.jobs : [];
  const companyJobs = allJobs.filter((j) => j && j.companyId === companyId);
  const openJobs = companyJobs.filter((j) => j && j.status === "OPEN");
  const closedJobs = companyJobs.filter((j) => j && j.status === "CLOSED");

  const allCandidates = Array.isArray(mockStore.candidates) ? mockStore.candidates : [];
  const companyCandidates = allCandidates.filter((c) => c && c.companyId === companyId);
  const inProgressCandidates = companyCandidates.filter((c) => c && c.status === "IN_PROGRESS");
  const hiredCandidates = companyCandidates.filter((c) => c && c.status === "HIRED");
  const rejectedCandidates = companyCandidates.filter((c) => c && c.status === "REJECTED");

  const allProcesses = Array.isArray(mockStore.processes) ? mockStore.processes : [];
  const companyProcesses = allProcesses.filter((p) => p && p.companyId === companyId);

  const allDepts = Array.isArray(mockStore.departments) ? mockStore.departments : [];
  const companyDepts = allDepts.filter((d) => d && d.companyId === companyId);

  const allUsers = Array.isArray(mockStore.users) ? mockStore.users : [];
  // TUYỆT ĐỐI KHÔNG LẤY password/passwordHash từ mockStore
  let companyUsers = allUsers
    .filter((u) => u && (u.companyId === companyId || u.companyId === "comp_demo_hungha_001" || !u.companyId))
    .map((u) => ({
      fullName: u.fullName,
      role: u.role === "COMPANY_ADMIN" ? "Quản trị viên" : u.role === "HR" ? "Chuyên viên HR" : "Người phỏng vấn",
      email: u.email,
      department: u.department?.name || "Chưa phân bổ",
    }));

  if (companyUsers.length === 0) {
    companyUsers = [
      {
        fullName: "Nguyễn Văn Hưng",
        role: "Quản trị viên",
        email: "admin@hungha.com",
        department: "Chưa phân bổ",
      },
    ];
  }

  return {
    company: {
      id: comp.id,
      name: comp.name,
      slug: comp.slug,
      industry: comp.industry,
      size: comp.size,
    },
    stats: {
      totalJobs: companyJobs.length,
      openJobs: openJobs.length,
      closedJobs: closedJobs.length,
      totalCandidates: companyCandidates.length,
      inProgressCandidates: inProgressCandidates.length,
      hiredCandidates: hiredCandidates.length,
      rejectedCandidates: rejectedCandidates.length,
      totalInterviews: 0,
      upcomingInterviews: 0,
      totalProcesses: companyProcesses.length,
      totalDepartments: companyDepts.length,
      totalMembers: companyUsers.length,
    },
    openJobDetails: openJobs.map((j) => ({
      title: j.title,
      quantity: j.quantity,
      department: j.department?.name || "Chưa phân bổ",
      salaryRange: j.salaryRange || "Thỏa thuận",
      deadline: j.deadline || "Đang tuyển liên tục",
    })),
    recentCandidates: companyCandidates.slice(0, 10).map((c) => ({
      fullName: c.fullName,
      jobTitle: c.jobPosting?.title || "Không rõ",
      status: c.status === "HIRED" ? "Đã tuyển" : c.status === "REJECTED" ? "Từ chối" : "Đang xử lý",
      aiMatchScore: c.aiMatchScore,
    })),
    upcomingInterviewDetails: [],
    members: companyUsers,
  };
}
