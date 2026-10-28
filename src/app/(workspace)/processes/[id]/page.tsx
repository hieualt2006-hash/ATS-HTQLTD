"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  GitBranch,
  Plus,
  ArrowLeft,
  Clock,
  Building2,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
  FileText,
  Layers,
  Calendar,
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

interface ProcessDetail {
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
  jobPostings?: Array<{
    id: string;
    title: string;
    status: string;
    quantity: number;
  }>;
}

export default function ProcessDetailPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const params = useParams();
  const router = useRouter();
  const processId = params.id as string;

  const [process, setProcess] = useState<ProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<ProcessStage | null>(null);
  const [showEditProcessModal, setShowEditProcessModal] = useState(false);

  // Forms
  const [stageForm, setStageForm] = useState({
    stageName: "",
    orderIndex: 1,
    responsibleDept: "",
    goalDescription: "",
    estimatedDays: "",
    workDescription: "",
  });

  const [processForm, setProcessForm] = useState({
    name: "",
    targetPosition: "",
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

  const fetchProcessDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/processes/${processId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải chi tiết quy trình.");
      setProcess(data.process);
      setProcessForm({
        name: data.process.name,
        targetPosition: data.process.targetPosition || "",
      });
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (processId) fetchProcessDetail();
  }, [processId]);

  // Add Stage
  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/processes/${processId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stageForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể thêm giai đoạn.");

      showNotification(`Thêm giai đoạn "${stageForm.stageName}" thành công!`);
      setShowAddStageModal(false);
      setStageForm({
        stageName: "",
        orderIndex: (process?.stages?.length || 0) + 1,
        responsibleDept: "",
        goalDescription: "",
        estimatedDays: "",
        workDescription: "",
      });
      fetchProcessDetail();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Update Stage
  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage) return;
    try {
      const res = await fetch(`/api/processes/${processId}/stages/${editingStage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStage),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật giai đoạn.");

      showNotification("Cập nhật thông tin giai đoạn thành công!");
      setEditingStage(null);
      fetchProcessDetail();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete Stage
  const handleDeleteStage = async (stageId: string, stageName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa giai đoạn "${stageName}" không?`)) return;
    try {
      const res = await fetch(`/api/processes/${processId}/stages/${stageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa giai đoạn.");

      showNotification(`Đã xóa giai đoạn "${stageName}".`);
      fetchProcessDetail();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Update Process info
  const handleUpdateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/processes/${processId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật quy trình.");

      showNotification("Cập nhật thông tin quy trình thành công!");
      setShowEditProcessModal(false);
      fetchProcessDetail();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  // Delete whole process
  const handleDeleteProcess = async () => {
    if (!confirm("Bạn có chắc muốn xóa quy trình này và quay lại danh mục?")) return;
    try {
      const res = await fetch(`/api/processes/${processId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa quy trình.");
      router.push("/processes");
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#16a34a]" />
        <p className="text-xs">Đang tải thiết lập chuỗi giai đoạn tuyển dụng...</p>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="p-16 text-center bg-white border border-[#E5E5E0] rounded-xl text-slate-500 max-w-xl mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-[#0C0C0C]">Không tìm thấy quy trình tuyển dụng</h3>
        <Link
          href="/processes"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về danh mục quy trình</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/processes"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-black transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Quay lại Danh sách Quy trình</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditProcessModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[#0C0C0C] text-xs font-medium flex items-center gap-1.5 border border-[#E5E5E0] transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#16a34a]" />
            <span>Sửa Tên Quy Trình</span>
          </button>
          <button
            onClick={handleDeleteProcess}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-medium flex items-center gap-1.5 border border-[#E5E5E0] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Quy Trình</span>
          </button>
        </div>
      </div>

      {/* Process Header Banner */}
      <div className="p-6 rounded-xl bg-white border border-[#E5E5E0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F2F1ED] border border-[#E5E5E0] flex items-center justify-center shrink-0">
            <GitBranch className="w-6 h-6 text-[#16a34a]" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#16a34a]">
              Chi Tiết Chuỗi Giai Đoạn Tuyển Dụng
            </div>
            <h2 className="text-xl font-bold text-[#0C0C0C] tracking-tight">{process.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Áp dụng cho:{" "}
              <strong className="text-[#0C0C0C]">{process.targetPosition || "Toàn công ty"}</strong> • Tổng cộng{" "}
              <strong className="text-[#16a34a]">{process.stages.length} vòng tuyển</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const nextOrder = (process.stages.reduce((m, s) => Math.max(m, s.orderIndex), 0) || 0) + 1;
            setStageForm((prev) => ({ ...prev, orderIndex: nextOrder }));
            setShowAddStageModal(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Giai Đoạn Vòng Mới</span>
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

      {/* Stages List (Vertical Pipeline Timeline) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E0]">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#16a34a]" />
            Trình Tự Tuyển Dụng Qua Các Vòng
          </h3>
          <span className="text-xs text-slate-500">
            Ứng viên sẽ được HR kéo thả luân chuyển tuần tự qua các vòng này
          </span>
        </div>

        {process.stages.length === 0 ? (
          <div className="p-12 text-center bg-white border border-[#E5E5E0] rounded-xl text-slate-500">
            <p className="text-xs">Chưa có giai đoạn nào trong quy trình này.</p>
            <button
              onClick={() => setShowAddStageModal(true)}
              className="mt-3 px-4 py-2 rounded-lg bg-[#16a34a] text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Vòng Đầu Tiên</span>
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#E5E5E0]">
            {process.stages.map((stage) => (
              <div
                key={stage.id}
                className="relative p-5 rounded-xl bg-white border border-[#E5E5E0] hover:border-slate-300 transition-colors"
              >
                {/* Node icon on timeline */}
                <div className="absolute -left-[30px] top-5 w-6 h-6 rounded-full bg-white border-2 border-[#16a34a] flex items-center justify-center text-[10px] font-bold text-[#16a34a] shadow-sm">
                  {stage.orderIndex}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 mb-3 border-b border-[#E5E5E0] gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#F2F1ED] text-slate-700 border border-[#E5E5E0] font-mono">
                      VÒNG {stage.orderIndex}
                    </span>
                    <h4 className="text-base font-bold text-[#0C0C0C]">{stage.stageName}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {stage.estimatedDays && (
                      <span className="text-xs text-slate-600 px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Thời gian: {stage.estimatedDays} ngày</span>
                      </span>
                    )}

                    <span className="text-xs text-slate-600 px-2.5 py-1 rounded-md bg-[#F2F1ED] border border-[#E5E5E0] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{stage.responsibleDept || "Phòng Nhân sự"}</span>
                    </span>

                    <div className="flex items-center gap-1 pl-2 border-l border-[#E5E5E0]">
                      <button
                        onClick={() => setEditingStage(stage)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-black"
                        title="Sửa giai đoạn"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id, stage.stageName)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Xóa giai đoạn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0]">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-[#16a34a]">
                      <Target className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>Mục Tiêu Giai Đoạn</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {stage.goalDescription || "Chưa có thông tin mục tiêu."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F2F1ED] border border-[#E5E5E0]">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-blue-600">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Mô Tả Công Việc Thực Hiện</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {stage.workDescription || "Chưa có mô tả công việc."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD STAGE ================= */}
      {mounted && showAddStageModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#16a34a]" />
                Thêm Giai Đoạn Tuyển Dụng Mới
              </h3>
              <button
                onClick={() => setShowAddStageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Giai Đoạn Tuyển Dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phỏng vấn chuyên môn kỹ thuật"
                  value={stageForm.stageName}
                  onChange={(e) => setStageForm({ ...stageForm, stageName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thứ tự vòng tuyển
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={stageForm.orderIndex}
                    onChange={(e) => setStageForm({ ...stageForm, orderIndex: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số ngày dự kiến
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ví dụ: 3 ngày"
                    value={stageForm.estimatedDays}
                    onChange={(e) => setStageForm({ ...stageForm, estimatedDays: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bộ Phận Đảm Nhận
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phòng Kỹ thuật IT hoặc Phòng Nhân sự"
                  value={stageForm.responsibleDept}
                  onChange={(e) => setStageForm({ ...stageForm, responsibleDept: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mục Tiêu Giai Đoạn
                </label>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu đánh giá năng lực của ứng viên trong giai đoạn này..."
                  value={stageForm.goalDescription}
                  onChange={(e) => setStageForm({ ...stageForm, goalDescription: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô Tả Chi Tiết Công Việc Cần Thực Hiện
                </label>
                <textarea
                  rows={3}
                  placeholder="Các đầu việc cần làm: Gửi thư mời, phỏng vấn trực tiếp, chấm điểm..."
                  value={stageForm.workDescription}
                  onChange={(e) => setStageForm({ ...stageForm, workDescription: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setShowAddStageModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors"
                >
                  Thêm Giai Đoạn
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: EDIT STAGE ================= */}
      {mounted && editingStage && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#16a34a]" />
                Chỉnh Sửa Giai Đoạn Tuyển Dụng
              </h3>
              <button
                onClick={() => setEditingStage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Giai Đoạn Tuyển Dụng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingStage.stageName}
                  onChange={(e) => setEditingStage({ ...editingStage, stageName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thứ tự vòng tuyển
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingStage.orderIndex}
                    onChange={(e) => setEditingStage({ ...editingStage, orderIndex: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số ngày dự kiến
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingStage.estimatedDays || ""}
                    onChange={(e) =>
                      setEditingStage({
                        ...editingStage,
                        estimatedDays: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bộ Phận Đảm Nhận
                </label>
                <input
                  type="text"
                  value={editingStage.responsibleDept || ""}
                  onChange={(e) => setEditingStage({ ...editingStage, responsibleDept: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mục Tiêu Giai Đoạn
                </label>
                <textarea
                  rows={2}
                  value={editingStage.goalDescription || ""}
                  onChange={(e) => setEditingStage({ ...editingStage, goalDescription: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô Tả Chi Tiết Công Việc Cần Thực Hiện
                </label>
                <textarea
                  rows={3}
                  value={editingStage.workDescription || ""}
                  onChange={(e) => setEditingStage({ ...editingStage, workDescription: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors"
                >
                  Lưu Giai Đoạn
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: EDIT PROCESS ================= */}
      {mounted && showEditProcessModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E5E0] rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E0]">
              <h3 className="text-base font-bold text-[#0C0C0C] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#16a34a]" />
                Sửa Thông Tin Quy Trình
              </h3>
              <button
                onClick={() => setShowEditProcessModal(false)}
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
                  value={processForm.name}
                  onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đối Tượng / Chức Danh Áp Dụng
                </label>
                <input
                  type="text"
                  value={processForm.targetPosition}
                  onChange={(e) => setProcessForm({ ...processForm, targetPosition: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E0] rounded-lg text-[#0C0C0C] text-xs focus:outline-none focus:border-[#16a34a]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E5E0]">
                <button
                  type="button"
                  onClick={() => setShowEditProcessModal(false)}
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
    </div>
  );
}
