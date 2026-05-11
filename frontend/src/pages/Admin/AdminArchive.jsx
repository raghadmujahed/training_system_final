import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, RefreshCw, AlertTriangle, CheckCircle2, Calendar, Database, Eye, ShieldAlert } from "lucide-react";
import { getArchiveBatches, getArchiveActivePeriod, getArchivePreview, archivePeriod } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";

const TABLE_LABELS = {
  sections: "الشعب",
  enrollments: "التسجيلات",
  section_students: "طلاب الشعب",
  training_assignments: "تعيينات التدريب",
  student_portfolios: "ملفات الإنجاز",
  portfolio_entries: "مدخلات الملف",
  student_eforms: "النماذج الإلكترونية",
  daily_reports: "التقارير اليومية",
  student_evaluations: "تقييمات الطلاب",
  field_evaluations: "التقييمات الميدانية",
  evaluations: "التقييمات",
  student_attendances: "الحضور (الطلاب)",
  attendances: "الحضور",
  supervisor_visits: "زيارات المشرفين",
  training_logs: "سجلات التدريب",
  tasks: "المهام",
  task_submissions: "تسليمات المهام",
  weekly_schedules: "الجداول الأسبوعية",
  notes: "الملاحظات",
  notifications: "الإشعارات",
  announcements: "الإعلانات",
  official_letters: "طلبات التدريب",
};

const STATUS_COLORS = {
  completed: { bg: "#dcfce7", text: "#166534", label: "مكتمل" },
  pending: { bg: "#fef3c7", text: "#92400e", label: "قيد التنفيذ" },
  failed: { bg: "#fee", text: "#c00", label: "فشل" },
  rolled_back: { bg: "#dbeafe", text: "#1e40af", label: "تم التراجع" },
};

export default function AdminArchive() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [batchesData, activeData] = await Promise.all([
        getArchiveBatches(),
        getArchiveActivePeriod(),
      ]);
      setBatches(batchesData?.batches || []);
      setActivePeriod(activeData);
      if (activeData?.period?.id && !activeData?.is_archived) {
        const previewData = await getArchivePreview(activeData.period.id);
        setPreview(previewData);
      }
    } catch (err) {
      console.error("Archive load error:", err);
      setError(err?.response?.data?.message || "فشل في تحميل بيانات الأرشفة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleArchive = async () => {
    if (!activePeriod?.period?.id) {
      toast.warning("لا توجد فترة تدريبية نشطة للأرشفة");
      return;
    }
    if (activePeriod.is_archived) {
      toast.warning("تم أرشفة هذه الفترة مسبقاً");
      return;
    }
    const total = preview?.counts
      ? Object.values(preview.counts).reduce((sum, n) => sum + (n || 0), 0)
      : 0;
    const confirmMsg = `سيتم أرشفة بيانات الفترة "${activePeriod.period.name}".\nإجمالي العناصر المراد أرشفتها: ${total}\n\nهل تريد المتابعة؟`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setArchiving(true);
      const result = await archivePeriod(activePeriod.period.id);
      toast.success(result?.message || "تمت الأرشفة بنجاح");
      await loadData();
    } catch (err) {
      console.error("Archive error:", err);
      toast.apiError(err, "فشل في الأرشفة");
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="section" text="جاري تحميل البيانات..." />;
  }

  const totalToArchive = preview?.counts
    ? Object.values(preview.counts).reduce((sum, n) => sum + (n || 0), 0)
    : 0;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold">
            <Archive size={28} /> إدارة الأرشفة
          </h1>
          <p className="text-[#666] m-0 mt-1">
            نظام الأرشفة المركزي - متاح فقط لمسؤول النظام
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {error && (
        <div className="bg-[#fee] text-[#c00] p-4 rounded-lg mb-4 flex items-center gap-2">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Admin-only warning banner */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-4 mb-6 flex items-center gap-3">
        <ShieldAlert size={24} className="text-[#1e40af]" />
        <div>
          <p className="m-0 font-semibold text-[#1e40af]">صلاحية مسؤول النظام مطلوبة</p>
          <p className="m-0 text-sm text-[#666]">
            أرشفة البيانات عملية حساسة ولا يمكن تنفيذها إلا من قبل مسؤول النظام.
            تأكد من مراجعة البيانات جيداً قبل التنفيذ.
          </p>
        </div>
      </div>

      {/* Active period card */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h2 className="mt-0 flex items-center gap-2 text-xl font-semibold">
          <Calendar size={20} /> الفترة النشطة الحالية
        </h2>

        {activePeriod?.period ? (
          <>
            <div className="flex gap-4 items-center mb-4 flex-wrap">
              <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
                <div className="text-xs text-[#666]">الفترة</div>
                <div className="text-lg font-bold text-[#1e40af]">{activePeriod.period.name}</div>
              </div>
              <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
                <div className="text-xs text-[#666]">من</div>
                <div className="text-lg font-bold text-[#1e40af]">{activePeriod.period.start_date}</div>
              </div>
              <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
                <div className="text-xs text-[#666]">إلى</div>
                <div className="text-lg font-bold text-[#1e40af]">{activePeriod.period.end_date}</div>
              </div>
              <div className="bg-[#fef3c7] py-3 px-5 rounded-lg border border-[#fde68a]">
                <div className="text-xs text-[#666]">إجمالي العناصر</div>
                <div className="text-lg font-bold text-[#92400e]">{totalToArchive}</div>
              </div>
              {activePeriod.is_archived && (
                <div className="bg-[#dcfce7] py-3 px-5 rounded-lg border border-[#86efac]">
                  <div className="text-xs text-[#666]">الحالة</div>
                  <div className="text-lg font-bold text-[#166534] flex items-center gap-1">
                    <CheckCircle2 size={18} /> مؤرشفة
                  </div>
                </div>
              )}
            </div>

            {preview?.counts && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 mb-4">
                {Object.entries(preview.counts).map(([key, count]) => (
                  <div
                    key={key}
                    className="p-3 rounded-lg border border-[#e5e7eb] flex justify-between items-center"
                    style={{ background: count > 0 ? "#fff" : "#f9fafb", opacity: count > 0 ? 1 : 0.6 }}
                  >
                    <span className="text-sm">{TABLE_LABELS[key] || key}</span>
                    <span
                      className="text-white py-[2px] px-[10px] rounded-full text-[13px] font-semibold"
                      style={{ background: count > 0 ? "#3b82f6" : "#9ca3af" }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleArchive}
              disabled={archiving || totalToArchive === 0 || activePeriod.is_archived}
              className="btn-primary flex items-center gap-2 py-3 px-6 text-base text-white"
              style={{
                background: totalToArchive === 0 || activePeriod.is_archived ? "#9ca3af" : "#f59e0b",
                cursor: archiving || totalToArchive === 0 || activePeriod.is_archived ? "not-allowed" : "pointer",
              }}
            >
              <Archive size={18} />
              {archiving
                ? "جاري الأرشفة..."
                : activePeriod.is_archived
                  ? "تمت الأرشفة مسبقاً"
                  : "أرشفة الفترة النشطة"}
            </button>
          </>
        ) : (
          <p className="text-[#666]">{activePeriod?.message || "لا توجد فترة تدريبية نشطة حالياً."}</p>
        )}
      </div>

      {/* Archive batches history */}
      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h2 className="mt-0 flex items-center gap-2 text-xl font-semibold">
          <Database size={20} /> سجل عمليات الأرشفة ({batches.length})
        </h2>

        {batches.length === 0 ? (
          <p className="text-[#666] text-center p-6">لا توجد عمليات أرشفة مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">#</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الفترة التدريبية</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">تاريخ الأرشفة</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الحالة</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">إجمالي العناصر</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">منفذ العملية</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch, i) => {
                  const status = STATUS_COLORS[batch.status] || STATUS_COLORS.pending;
                  return (
                    <tr key={batch.id} className="border-b border-[#e5e7eb]">
                      <td className="p-3 text-[#6b7280]">{i + 1}</td>
                      <td className="p-3 font-semibold">{batch.period?.name || "-"}</td>
                      <td className="p-3 text-[13px] text-[#666]">
                        {batch.archived_at ? new Date(batch.archived_at).toLocaleString("ar") : "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className="inline-flex items-center gap-1 py-1 px-[10px] rounded-full text-xs font-semibold"
                          style={{ background: status.bg, color: status.text }}
                        >
                          {batch.status === "completed" && <CheckCircle2 size={14} />}
                          {status.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-[#dbeafe] text-[#1e40af] py-[2px] px-[10px] rounded-full text-[13px] font-semibold">
                          {batch.total_count || 0}
                        </span>
                      </td>
                      <td className="p-3 text-[13px] text-[#666]">{batch.archived_by?.name || "-"}</td>
                      <td className="p-3">
                        <button
                          onClick={() => navigate(`/admin/archive/details/${batch.period?.id}`)}
                          className="inline-flex items-center gap-[6px] bg-[#3b82f6] text-white border-none py-[6px] px-3 rounded-md cursor-pointer text-[13px] font-semibold hover:bg-[#2563eb] transition-colors"
                        >
                          <Eye size={14} /> عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
