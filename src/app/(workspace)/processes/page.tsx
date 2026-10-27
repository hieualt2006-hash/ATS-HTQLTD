"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch,
  Plus,
  Search,
  Layers,
  ArrowRight,
  Clock,
  Building2,
  Trash2,
  Edit3,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Briefcase,
  ChevronRight,
} from "lucide-react";

interface ProcessStage {
  id: string;
  stageName: string;
  orderIndex: number;
  responsibleDept: string | null;
  goalDescription: string | null;
  estimatedDays: number | null;
  workDescription: string | null;
}

interface RecruitmentProcess {
  id: string;
  name: string;
  targetPosition: string | null;
  createdAt: string;
  stages: ProcessStage[];
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: {
    jobPostings: number;
    stages: number;
  };
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<RecruitmentProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState<RecruitmentProcess | null>(null);

  // Alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    targetPosition: "",
    initialStageName: "Tiếp nhận & Sơ loại hồ sơ",
    initialDept: "Phòng Nhân sự",
    initialGoal: "Thu nhận hồ sơ, đối soát tiêu chuẩn ứng viên và kiểm tra tính hợp lệ của CV.",
  });

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

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const url = searchTerm
        ? `/api/processes?search=${encodeURIComponent(searchTerm)}`
        : "/api/processes";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải danh sách quy trình.");
      setProcesses(data.processes || []);
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProcesses();
  };

  // Create process
  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo quy trình tuyển dụng.");

      showNotification(`Tạo thành công quy trình "${createForm.name}"!`);
      setShowAddModal(false);
      setCreateForm({
        name: "",
        targetPosition: "",
        initialStageName: "Tiếp nhận & Sơ loại hồ sơ",
        initialDept: "Phòng Nhân sự",
        initialGoal: "Thu nhận hồ sơ, đối soát tiêu chuẩn ứng viên và kiểm tra tính hợp lệ của CV.",
      });
      fetchProcesses();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Update process
  const handleUpdateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProcess) return;
    try {
      const res = await fetch(`/api/processes/${editingProcess.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProcess.name,
          targetPosition: editingProcess.targetPosition,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật quy trình.");

      showNotification("Cập nhật thông tin quy trình thành công!");
      setEditingProcess(null);
      fetchProcesses();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete process
  const handleDeleteProcess = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quy trình "${name}" cùng toàn bộ các giai đoạn trực thuộc không?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/processes/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa quy trình.");
      showNotification(`Đã xóa quy trình "${name}" thành công.`);
      fetchProcesses();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] text-[11px] font-semibold text-[#0C0C0C] mb-2">
            <GitBranch className="w-3.5 h-3.5 text-[#16a34a]" />
            Nghiệp Vụ Chuẩn Hóa
          </div>
          <h2 className="text-xl font-bold text-[#0C0C0C] tracking-tight">
            Quản Lý Quy Trình Tuyển Dụng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập danh mục các quy trình tuyển dụng và chuỗi các giai đoạn tuyển dụng (ProcessStage) nối tiếp nhau.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Quy Trình Tuyển Dụng</span>
        </button>
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

      {/* Search & Statistics Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E5E0] flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên quy trình hoặc chức danh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E5E0] rounded-lg text-xs text-[#0C0C0C] placeholder-slate-400 focus:outline-none focus:border-[#16a34a]"
          />
        </form>

        <div className="text-xs text-slate-500 font-medium">
          Tổng số: <strong className="text-[#0C0C0C]">{processes.length}</strong> quy trình tuyển dụng
        </div>
      </div>

      {/* Process List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#16a34a]" />
          <p className="text-xs">Đang tải danh sách quy trình tuyển dụng...</p>
        </div>
      ) : processes.length === 0 ? (
        <div className="p-16 text-center bg-white border border-[#E5E5E0] rounded-xl text-slate-500">
          <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0C0C0C] mb-1">Chưa tìm thấy quy trình tuyển dụng nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Hãy tạo quy trình tuyển dụng đầu tiên của công ty để áp dụng cho các đợt tuyển dụng.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Quy Trình Ngay</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {processes.map((proc) => (
            <div
              key={proc.id}
              className="p-6 rounded-xl bg-white border border-[#E5E5E0] hover:border-slate-300 transition-colors"
            >
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0] gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] flex items-center justify-center shrink-0">
                    <GitBranch className="w-5 h-5 text-[#16a34a]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0C0C0C]">
                      {proc.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đối tượng chức danh:{" "}
                      <span className="text-[#0C0C0C] font-semibold">
                        {proc.targetPosition || "Toàn công ty"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#F2F1ED] text-slate-700 text-xs font-mono border border-[#E5E5E0]">
                    {proc.stages.length} giai đoạn
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-mono border border-emerald-200">
                    {proc._count?.jobPostings || 0} đợt tuyển áp dụng
                  </span>

                  <div className="flex items-center gap-1 pl-2 border-l border-[#E5E5E0]">
                    <button
                      onClick={() => setEditingProcess(proc)}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-black transition-colors"
                      title="Sửa tên quy trình"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProcess(proc.id, proc.name)}
                      className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Xóa quy trình"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stages Mini-pipeline display */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span>Các giai đoạn tuyển dụng</span>
                  <Link
                    href={`/processes/${proc.id}`}
                    className="text-[#16a34a] hover:underline flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <span>Quản lý & Thiết lập chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {proc.stages.map((stage) => (
                    <div
                      key={stage.id}
                      className="p-3.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-[#E5E5E0] font-mono">
                            Vòng {stage.orderIndex}
                          </span>
                          {stage.estimatedDays && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {stage.estimatedDays} ngày
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-[#0C0C0C] mb-1 truncate" title={stage.stageName}>
                          {stage.stageName}
                        </h4>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {stage.goalDescription || stage.workDescription || "Chưa có mô tả mục tiêu."}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#E5E5E0] text-[10px] text-[#16a34a] font-medium truncate">
                        Phụ trách: {stage.responsibleDept || "Phòng Nhân sự"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-[#E5E5E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Khởi tạo bởi:</span>
                  <span className="text-[#0C0C0C] font-semibold">
                    {proc.createdBy?.fullName || "Quản trị viên"}
                  </span>
                </div>
                <Link
                  href={`/processes/${proc.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-[#F2F1ED] hover:bg-slate-200 text-[#0C0C0C] border border-[#E5E5E0] font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
                >
                  <span>Chỉnh Sửa & Thêm Giai Đoạn Vòng Tuyển</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL: ADD PROCESS ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#16a34a]" />
                Thêm Quy Trình Tuyển Dụng Mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProcess} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Quy Trình Tuyển Dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy trình tuyển Nhân viên Kinh doanh B2B"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đối Tượng / Chức Danh Áp Dụng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyên viên Kinh doanh, Telesales, Account Executive"
                  value={createForm.targetPosition}
                  onChange={(e) => setCreateForm({ ...createForm, targetPosition: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              {/* Initial Stage */}
              <div className="p-4 rounded-xl bg-[#F2F1ED] border border-[#E5E5E0] space-y-3">
                <span className="text-[11px] font-bold text-[#16a34a] uppercase tracking-wider block">
                  Thiết Lập Giai Đoạn Đầu Tiên
                </span>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Tên giai đoạn vòng 1</label>
                  <input
                    type="text"
                    value={createForm.initialStageName}
                    onChange={(e) => setCreateForm({ ...createForm, initialStageName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Bộ phận đảm nhận</label>
                    <input
                      type="text"
                      value={createForm.initialDept}
                      onChange={(e) => setCreateForm({ ...createForm, initialDept: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Mục tiêu giai đoạn</label>
                    <input
                      type="text"
                      value={createForm.initialGoal}
                      onChange={(e) => setCreateForm({ ...createForm, initialGoal: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors"
                >
                  Tạo Quy Trình Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PROCESS ================= */}
      {editingProcess && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#16a34a]" />
                Chỉnh Sửa Tên Quy Trình
              </h3>
              <button
                onClick={() => setEditingProcess(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProcess} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Quy Trình Tuyển Dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingProcess.name}
                  onChange={(e) => setEditingProcess({ ...editingProcess, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đối Tượng / Chức Danh Áp Dụng
                </label>
                <input
                  type="text"
                  value={editingProcess.targetPosition || ""}
                  onChange={(e) => setEditingProcess({ ...editingProcess, targetPosition: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setEditingProcess(null)}
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
        </div>
      )}
    </div>
  );
}
