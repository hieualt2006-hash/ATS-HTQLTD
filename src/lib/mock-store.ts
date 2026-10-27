import fs from "fs";
import path from "path";

export interface MockCompany {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  size: string | null;
  createdAt: string;
}

export interface MockDepartment {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { users: number; jobPostings: number };
}

export interface MockUser {
  id: string;
  companyId: string;
  departmentId: string | null;
  fullName: string;
  email: string;
  password?: string;
  passwordHash?: string;
  role: "COMPANY_ADMIN" | "HR" | "INTERVIEWER";
  isActive: boolean;
  createdAt: string;
  department?: { id?: string; name: string } | null;
}

export interface MockStage {
  id: string;
  processId: string;
  stageName: string;
  orderIndex: number;
  responsibleDept?: string | null;
  goalDescription?: string | null;
  estimatedDays?: number | null;
  workDescription?: string | null;
}

export interface MockProcess {
  id: string;
  companyId: string;
  name: string;
  title?: string;
  targetPosition: string | null;
  createdAt: string;
  stages: MockStage[];
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: { stages: number; jobPostings: number };
}

export interface MockJob {
  id: string;
  companyId: string;
  departmentId: string | null;
  processId: string | null;
  title: string;
  quantity: number;
  status: "OPEN" | "CLOSED" | "DRAFT";
  salaryRange: string | null;
  deadline: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  createdAt: string;
  department?: { id: string; name: string } | null;
  process?: {
    id: string;
    name: string;
    stages: Array<{ id: string; stageName: string; orderIndex: number }>;
  } | null;
  createdBy?: {
    id?: string;
    fullName: string;
    email?: string;
  };
  _count?: { candidates: number };
}

export interface MockCandidate {
  id: string;
  companyId: string;
  jobPostingId: string;
  currentStageId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  cvFileUrl: string | null;
  source: "EXTERNAL_FORM" | "HR_UPLOAD";
  status: "IN_PROGRESS" | "HIRED" | "REJECTED";
  rawCvText: string | null;
  extractedSkills: string | null;
  aiMatchScore: number | null;
  aiEvaluationSummary: string | null;
  appliedAt: string;
  jobPosting: {
    id: string;
    title: string;
    status: string;
    processId: string | null;
  };
  currentStage: {
    id: string;
    stageName: string;
    orderIndex: number;
  } | null;
}

export interface MockInterview {
  id: string;
  companyId: string;
  candidateId: string;
  stageId: string | null;
  interviewerId: string | null;
  createdById?: string | null;
  startTime: string;
  endTime: string;
  meetLink: string | null;
  rating: number | null;
  interviewerNotes: string | null;
  evaluationResult: "PENDING" | "PASS" | "FAIL";
  createdAt: string;
  candidate?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    cvFileUrl: string | null;
    jobPosting?: { id: string; title: string } | null;
  } | null;
  stage?: { id: string; stageName: string; orderIndex: number } | null;
  interviewer?: { id: string; fullName: string; email: string } | null;
}

export interface MockNotification {
  id: string;
  companyId: string;
  type: "EXTERNAL_CV" | "AI_EVALUATION" | "INTERVIEW" | "SYSTEM";
  title: string;
  message: string;
  candidateId?: string | null;
  jobTitle?: string | null;
  matchScore?: number | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MockCalendarEvent {
  id: string;
  companyId: string;
  title: string;
  type: "ADMIN" | "INTERVIEW" | "ACTIVITY";
  candidateId?: string | null;
  candidateName?: string | null;
  startTime: string; // ISO
  endTime: string; // ISO
  meetLink?: string | null;
  description?: string | null;
  location?: string | null;
  createdById?: string | null;
  googleEventId?: string | null;
  color?: string | null; // e.g. emerald, blue, amber, rose, purple, orange, sky, slate
  recurrence?: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | null;
  excludedDates?: string[]; // Danh sách các ngày yyyy-mm-dd bị xóa riêng lẻ khỏi chuỗi lặp lại
  createdAt: string;
}

const DATA_FILE_PATH = path.join(process.cwd(), ".mock-store.json");

const defaultCompany: MockCompany = {
  id: "comp_demo_hungha_001",
  name: "Công ty TNHH Hextech",
  slug: "hextech",
  industry: "Công nghệ thông tin",
  size: "Dưới 20 nhân sự",
  createdAt: new Date().toISOString(),
};

const defaultAdminUser: MockUser = {
  id: "usr_demo_admin_001",
  companyId: "comp_demo_hungha_001",
  departmentId: null,
  fullName: "Nguyễn Văn Hưng",
  email: "admin@hungha.com",
  password: "123456",
  role: "COMPANY_ADMIN",
  isActive: true,
  createdAt: new Date().toISOString(),
  department: null,
};

export class MockDataStore {
  companies: MockCompany[] = [];
  departments: MockDepartment[] = [];
  users: MockUser[] = [];
  processes: MockProcess[] = [];
  jobs: MockJob[] = [];
  candidates: MockCandidate[] = [];
  interviews: MockInterview[] = [];
  notifications: MockNotification[] = [];
  calendarEvents: MockCalendarEvent[] = [];
  calendarInitialized: boolean = false;

  constructor() {
    this.load();
  }

  get company(): MockCompany {
    if (!Array.isArray(this.companies) || this.companies.length === 0) {
      this.companies = [{ ...defaultCompany }];
      this.save();
    }
    return this.companies[0];
  }

  load(): void {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.companies) && data.companies.length > 0) {
          this.companies = data.companies;
        } else {
          this.companies = [{ ...defaultCompany }];
        }
        this.departments = Array.isArray(data.departments) ? data.departments : [];
        this.users = Array.isArray(data.users) && data.users.length > 0 ? data.users : [{ ...defaultAdminUser }];
        this.processes = Array.isArray(data.processes) ? data.processes : [];
        this.jobs = Array.isArray(data.jobs) ? data.jobs : [];
        this.candidates = Array.isArray(data.candidates) ? data.candidates : [];
        this.interviews = Array.isArray(data.interviews) ? data.interviews : [];
        this.notifications = Array.isArray(data.notifications) ? data.notifications : [];
        this.calendarEvents = Array.isArray(data.calendarEvents) ? data.calendarEvents : [];
        this.calendarInitialized = !!data.calendarInitialized;
        return;
      }
    } catch (err) {
      console.warn("Lỗi đọc file .mock-store.json:", err);
    }

    // Khởi tạo mặc định nếu chưa có file
    this.companies = [{ ...defaultCompany }];
    this.departments = [];
    this.users = [{ ...defaultAdminUser }];
    this.processes = [];
    this.jobs = [];
    this.candidates = [];
    this.interviews = [];
    this.notifications = [];
    this.calendarEvents = [];
    this.calendarInitialized = false;
    this.save();
  }

  save(): void {
    try {
      const data = {
        companies: this.companies,
        departments: this.departments,
        users: this.users,
        processes: this.processes,
        jobs: this.jobs,
        candidates: this.candidates,
        interviews: this.interviews,
        notifications: this.notifications,
        calendarEvents: this.calendarEvents,
        calendarInitialized: this.calendarInitialized,
      };
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.warn("Lỗi ghi file .mock-store.json:", err);
    }
  }

  updateCompany(id: string, updates: Partial<MockCompany>): MockCompany {
    let comp = this.companies.find((c) => c && c.id === id);
    if (!comp) {
      comp = this.companies[0];
    }
    if (!comp) {
      comp = { ...defaultCompany, ...updates, id };
      this.companies.push(comp);
    } else {
      Object.assign(comp, updates);
    }
    this.save();
    return comp;
  }
}

const globalForMock = globalThis as unknown as {
  mockStore: MockDataStore | undefined;
};

if (!globalForMock.mockStore || typeof (globalForMock.mockStore as any).load !== "function") {
  globalForMock.mockStore = new MockDataStore();
} else {
  // Đồng bộ prototype và field mới khi hot reload
  Object.setPrototypeOf(globalForMock.mockStore, MockDataStore.prototype);
  if (!Array.isArray(globalForMock.mockStore.calendarEvents)) {
    globalForMock.mockStore.calendarEvents = [];
  }
  if (globalForMock.mockStore.calendarInitialized === undefined) {
    globalForMock.mockStore.calendarInitialized = false;
  }
}

export const mockStore = globalForMock.mockStore;
mockStore.load();

if (process.env.NODE_ENV !== "production") {
  globalForMock.mockStore = mockStore;
}
