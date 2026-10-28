"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  UserPlus,
  KeyRound,
  Lock,
  Mail,
  User,
  Briefcase,
  X,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: {
    users: number;
    jobPostings: number;
  };
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: "COMPANY_ADMIN" | "HR" | "INTERVIEWER";
  isActive: boolean;
  departmentId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  size: string | null;
  industry: string | null;
  createdAt: string;
  _count?: {
    departments: number;
    users: number;
    jobPostings: number;
    candidates: number;
  };
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "company">("users");

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [resetPassUser, setResetPassUser] = useState<Employee | null>(null);

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: "",
    slug: "",
    size: "",
    industry: "",
  });

  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    email: "",
    password: "123456",
    role: "HR",
    departmentId: "",
  });

  const [newDeptForm, setNewDeptForm] = useState({
    name: "",
    description: "",
  });

  const [newPasswordValue, setNewPasswordValue] = useState("123456");

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg("");
    } else {
      setSuccessMsg(msg);
      setErrorMsg("");
    }
    setTimeout(() => {
      setSuccessMsg("");
      setErrorMsg("");
    }, 4000);
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, deptRes, userRes] = await Promise.all([
        fetch("/api/company/info"),
        fetch("/api/company/departments"),
        fetch("/api/company/users"),
      ]);

      if (compRes.ok) {
        const compData = await compRes.json();
        setCompany(compData.company);
        setCompanyForm({
          name: compData.company.name || "",
          slug: compData.company.slug || "",
          size: compData.company.size || "50 - 100 nhân sự",
          industry: compData.company.industry || "Công nghệ thông tin / Phần mềm",
        });
      }

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setEmployees(userData.users || []);
      }
    } catch (err: any) {
      showNotification("Lỗi nạp dữ liệu: " + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save company info
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/company/info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật thông tin công ty.");
      const newName = (data.company?.name || companyForm.name).trim();
      const newSlug = (data.company?.slug || companyForm.slug).trim();

      showNotification("Cập nhật thông tin công ty thành công!");
      
      // Đồng bộ ngay lập tức tên công ty và slug lên Sidebar, Dashboard và toàn bộ các tab
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("company-name-updated", {
            detail: {
              name: newName,
              slug: newSlug,
            },
          })
        );
        try {
          localStorage.setItem("ats_company_sync", JSON.stringify({ name: newName, slug: newSlug, t: Date.now() }));
          const channel = new BroadcastChannel("ats_company_channel");
          channel.postMessage({ name: newName, slug: newSlug });
          channel.close();
        } catch {}
      }
      fetchData();
      router.refresh();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Create department
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/company/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeptForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể thêm phòng ban.");
      showNotification("Đã thêm phòng ban mới thành công!");
      setShowAddDeptModal(false);
      setNewDeptForm({ name: "", description: "" });
      fetchData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Update department
  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      const res = await fetch("/api/company/departments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDept.id,
          name: editingDept.name,
          description: editingDept.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật phòng ban.");
      showNotification("Đã cập nhật thông tin phòng ban!");
      setEditingDept(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete department
  const handleDeleteDept = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phòng ban "${name}" không?`)) return;
    try {
      const res = await fetch(`/api/company/departments?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa phòng ban.");
      showNotification(`Đã xóa phòng ban "${name}" thành công.`);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/company/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo tài khoản nhân sự.");
      showNotification(`Tạo tài khoản cho ${newUserForm.fullName} thành công!`);
      setShowAddUserModal(false);
      setNewUserForm({
        fullName: "",
        email: "",
        password: "123456",
        role: "HR",
        departmentId: "",
      });
      fetchData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Toggle user active status
  const handleToggleUserActive = async (user: Employee) => {
    try {
      const res = await fetch("/api/company/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể thay đổi trạng thái.");
      showNotification(`Đã ${!user.isActive ? "kích hoạt" : "vô hiệu hóa"} tài khoản ${user.fullName}`);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Reset user password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser) return;
    try {
      const res = await fetch("/api/company/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetPassUser.id,
          newPassword: newPasswordValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể đổi mật khẩu.");
      showNotification(`Đã đổi mật khẩu cho ${resetPassUser.fullName} thành công!`);
      setResetPassUser(null);
      setNewPasswordValue("123456");
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete user
  const handleDeleteUser = async (user: Employee) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản của "${user.fullName}" (${user.email})?`)) return;
    try {
      const res = await fetch(`/api/company/users?id=${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa tài khoản.");
      showNotification(`Đã xóa tài khoản ${user.fullName} thành công.`);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "COMPANY_ADMIN":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "HR":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "INTERVIEWER":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "COMPANY_ADMIN":
        return "Quản Trị Viên";
      case "HR":
        return "HR Tuyển Dụng";
      case "INTERVIEWER":
        return "Người Phỏng Vấn";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] text-[11px] font-semibold text-[#0C0C0C] mb-2">
            <Shield className="w-3.5 h-3.5 text-[#16a34a]" />
            Dành Riêng Cho Quản Trị Viên
          </div>
          <h2 className="text-xl font-bold text-[#0C0C0C] tracking-tight">
            Quản Lý Công Ty & Nhân Sự Nội Bộ
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập phòng ban, cấp tài khoản cho chuyên viên HR và người phỏng vấn trực thuộc doanh nghiệp.
          </p>
        </div>

        {/* Quick metrics */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-center min-w-[90px]">
            <div className="text-lg font-bold text-[#0C0C0C]">{departments.length}</div>
            <div className="text-[10px] text-slate-500 font-medium">Phòng Ban</div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-center min-w-[90px]">
            <div className="text-lg font-bold text-[#0C0C0C]">{employees.length}</div>
            <div className="text-[10px] text-slate-500 font-medium">Nhân Sự</div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] text-center min-w-[90px]">
            <div className="text-lg font-bold text-[#16a34a]">
              {employees.filter((e) => e.isActive).length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Đang Hoạt Động</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E5E0] pb-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "users"
              ? "bg-[#16a34a] text-white"
              : "text-slate-600 hover:text-black hover:bg-white border border-transparent"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nhân Sự & Tài Khoản</span>
        </button>

        <button
          onClick={() => setActiveTab("departments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "departments"
              ? "bg-[#16a34a] text-white"
              : "text-slate-600 hover:text-black hover:bg-white border border-transparent"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Cơ Cấu Phòng Ban</span>
        </button>

        <button
          onClick={() => setActiveTab("company")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "company"
              ? "bg-[#16a34a] text-white"
              : "text-slate-600 hover:text-black hover:bg-white border border-transparent"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Hồ Sơ Doanh Nghiệp</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#16a34a]" />
          <p className="text-xs">Đang tải cấu hình doanh nghiệp...</p>
        </div>
      ) : (
        <>
          {/* ================= TAB 1: USERS ================= */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0C0C0C]">Danh Sách Tài Khoản Nhân Sự</h3>
                  <p className="text-xs text-slate-500">
                    Phân quyền HR tuyển dụng và Người phỏng vấn thuộc công ty
                  </p>
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tạo Tài Khoản Mới</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-[#E5E5E0] bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F2F1ED] text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Nhân sự</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phòng ban</th>
                      <th className="py-3 px-4">Vai trò</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-[#F2F1ED] border border-[#E5E5E0] flex items-center justify-center font-bold text-xs text-[#0C0C0C]">
                              {emp.fullName.charAt(0)}
                            </div>
                            <span className="font-medium text-[#0C0C0C]">{emp.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{emp.email}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {emp.department?.name || (
                            <span className="text-slate-400 italic">Chưa gán</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${getRoleBadgeStyle(
                              emp.role
                            )}`}
                          >
                            {getRoleLabel(emp.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleUserActive(emp)}
                            className="inline-flex items-center gap-1.5 focus:outline-none"
                            title="Bấm để bật/tắt hoạt động"
                          >
                            {emp.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium">
                                Đã khóa
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setResetPassUser(emp);
                                setNewPasswordValue("123456");
                              }}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-black transition-colors"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-[#16a34a]" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(emp)}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 2: DEPARTMENTS ================= */}
          {activeTab === "departments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0C0C0C]">Quản Lý Phòng Ban Doanh Nghiệp</h3>
                  <p className="text-xs text-slate-500">
                    Cấu trúc các khối ban trực thuộc (Phòng Kỹ thuật, Phòng Nhân sự, Ban Kinh doanh...)
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDeptModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Phòng Ban Mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-5 rounded-xl bg-white border border-[#E5E5E0] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-[#16a34a]" />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingDept(dept)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-black"
                            title="Sửa phòng ban"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept.id, dept.name)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            title="Xóa phòng ban"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-[#0C0C0C] text-sm mb-1">{dept.name}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                        {dept.description || "Chưa có mô tả chi tiết nhiệm vụ phòng ban."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E5E5E0] flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dept._count?.users || 0} nhân sự</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dept._count?.jobPostings || 0} đợt tuyển</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 3: COMPANY INFO ================= */}
          {activeTab === "company" && (
            <div className="max-w-2xl bg-white p-6 rounded-xl border border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] mb-1">Cập Nhật Thông Tin Doanh Nghiệp</h3>
              <p className="text-xs text-slate-500 mb-6">
                Thông tin này sẽ hiển thị trên hệ thống và các form thu thập hồ sơ ứng viên
              </p>

              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên Doanh Nghiệp / Công Ty <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã Định Danh Doanh Nghiệp (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.slug}
                    onChange={(e) => {
                      const val = e.target.value
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9-]/g, "-");
                      setCompanyForm({ ...companyForm, slug: val });
                    }}
                    placeholder="ví dụ: hextech, hex-tech"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] font-mono text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Slug tạo link nộp đơn công khai: <code className="text-[#16a34a] font-semibold">/apply/{companyForm.slug || "slug"}</code>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Quy mô nhân sự
                    </label>
                    <select
                      value={companyForm.size}
                      onChange={(e) => setCompanyForm({ ...companyForm, size: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                    >
                      <option value="Dưới 20 nhân sự">Dưới 20 nhân sự</option>
                      <option value="20 - 50 nhân sự">20 - 50 nhân sự</option>
                      <option value="50 - 100 nhân sự">50 - 100 nhân sự</option>
                      <option value="100 - 500 nhân sự">100 - 500 nhân sự</option>
                      <option value="Trên 500 nhân sự">Trên 500 nhân sự</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Lĩnh vực hoạt động
                    </label>
                    <input
                      type="text"
                      value={companyForm.industry}
                      onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Thay Đổi</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* ================= MODAL: ADD USER ================= */}
      {mounted && showAddUserModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#16a34a]" />
                Tạo Tài Khoản Nhân Sự Mới
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Họ và tên nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Thu Trang"
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="trang.hoang@hungha.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Vai trò trong công ty <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="HR">Chuyên viên Tuyển dụng</option>
                    <option value="INTERVIEWER">Người phỏng vấn</option>
                    <option value="COMPANY_ADMIN">Quản trị viên</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phòng ban trực thuộc
                  </label>
                  <select
                    value={newUserForm.departmentId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors"
                >
                  Xác Nhận Tạo
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: ADD DEPARTMENT ================= */}
      {mounted && showAddDeptModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#16a34a]" />
                Thêm Phòng Ban Mới
              </h3>
              <button
                onClick={() => setShowAddDeptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Phòng Ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng Marketing & Truyền thông"
                  value={newDeptForm.name}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô Tả Nhiệm Vụ
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chức năng, nhiệm vụ chính của phòng ban..."
                  value={newDeptForm.description}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors"
                >
                  Thêm Phòng Ban
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: EDIT DEPARTMENT ================= */}
      {mounted && editingDept && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#16a34a]" />
                Chỉnh Sửa Phòng Ban
              </h3>
              <button
                onClick={() => setEditingDept(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Phòng Ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingDept.name}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô Tả Nhiệm Vụ
                </label>
                <textarea
                  rows={3}
                  value={editingDept.description || ""}
                  onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {mounted && resetPassUser && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#16a34a]" />
                Đặt Lại Mật Khẩu
              </h3>
              <button
                onClick={() => setResetPassUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-slate-600">
                Nhập mật khẩu mới cho nhân sự <strong className="text-[#0C0C0C]">{resetPassUser.fullName}</strong> — {resetPassUser.email}:
              </p>

              <div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors"
                >
                  Xác Nhận Đổi
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
