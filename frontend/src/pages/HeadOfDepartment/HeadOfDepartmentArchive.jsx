import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, RefreshCw, AlertTriangle, CheckCircle2, Calendar, Database, Eye } from "lucide-react";
import { getArchivePreview, archiveCurrentPeriod, getArchivedPeriods } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";

const SEMESTER_LABELS = {
  first: "الفصل الأول",
  second: "الفصل الثاني",
  summer: "الفصل الصيفي",
};

const TABLE_LABELS = {
  sections: "الشعب",
  enrollments: "التسجيلات",
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

export default function HeadOfDepartmentArchive() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [previewData, periodsData] = await Promise.all([
        getArchivePreview(),
        getArchivedPeriods(),
      ]);
      setPreview(previewData);
      setPeriods(periodsData?.periods || []);
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
    if (!preview?.period) {
      toast.warning("لا توجد فترة تدريبية حالية للأرشفة");
      return;
    }
    const confirmMsg = `سيتم أرشفة بيانات الفترة (${preview.period.academic_year} - ${SEMESTER_LABELS[preview.period.semester] || preview.period.semester}) لقسمك فقط.\n\nهل تريد المتابعة؟`;
    if (!window.confirm(confirmMsg)) return;
    try {
      setArchiving(true);
      const result = await archiveCurrentPeriod();
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
    return (
      <LoadingSpinner size="section" text="جاري تحميل البيانات..." />
    );
  }

  const totalToArchive = preview?.counts
    ? Object.values(preview.counts).reduce((sum, n) => sum + (n || 0), 0)
    : 0;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2">
            <Archive size={28} /> أرشفة البيانات
          </h1>
          <p className="text-[#666] m-0 mt-1">
            أرشفة بيانات الفترة التدريبية الحالية لقسمك. لا تتم أرشفة المستخدمين أو المساقات أو الأقسام.
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

      {/* Current period card */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h2 className="mt-0 flex items-center gap-2">
          <Calendar size={20} /> الفترة الحالية المرشحة للأرشفة
        </h2>

        {preview?.period ? (
          <>
            <div className="flex gap-4 items-center mb-4 flex-wrap">
              <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
                <div className="text-xs text-[#666]">العام الدراسي</div>
                <div className="text-lg font-bold text-[#1e40af]">{preview.period.academic_year}</div>
              </div>
              <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
                <div className="text-xs text-[#666]">الفصل</div>
                <div className="text-lg font-bold text-[#1e40af]">
                  {SEMESTER_LABELS[preview.period.semester] || preview.period.semester}
                </div>
              </div>
              <div className="bg-[#fef3c7] py-3 px-5 rounded-lg border border-[#fde68a]">
                <div className="text-xs text-[#666]">إجمالي العناصر</div>
                <div className="text-lg font-bold text-[#92400e]">{totalToArchive}</div>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 mb-4">
              {Object.entries(preview.counts || {}).map(([key, count]) => (
                <div key={key} className="p-3 rounded-lg border border-[#e5e7eb] flex justify-between items-center" style={{ background: count > 0 ? "#fff" : "#f9fafb", opacity: count > 0 ? 1 : 0.6 }}>
                  <span className="text-sm">{TABLE_LABELS[key] || key}</span>
                  <span className="text-white py-[2px] px-[10px] rounded-full text-[13px] font-semibold" style={{ background: count > 0 ? "#3b82f6" : "#9ca3af" }}>{count}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleArchive}
              disabled={archiving || totalToArchive === 0}
              className="btn-primary flex items-center gap-2 py-3 px-6 text-base text-white"
              style={{ background: totalToArchive === 0 ? "#9ca3af" : "#f59e0b", cursor: archiving || totalToArchive === 0 ? "not-allowed" : "pointer" }}
            >
              <Archive size={18} />
              {archiving ? "جاري الأرشفة..." : "أرشفة الفترة الحالية"}
            </button>
          </>
        ) : (
          <p className="text-[#666]">{preview?.message || "لا توجد فترة تدريبية حالية للأرشفة في قسمك."}</p>
        )}
      </div>

      {/* Archived periods list */}
      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h2 className="mt-0 flex items-center gap-2">
          <Database size={20} /> الفترات المؤرشفة ({periods.length})
        </h2>

        {periods.length === 0 ? (
          <p className="text-[#666] text-center p-6">
            لا توجد فترات مؤرشفة بعد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">#</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">العام الدراسي</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الفصل</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الشعب</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">التسجيلات</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">تاريخ الأرشفة</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الحالة</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {[...periods]
                  .sort((a, b) => {
                    if (b.academic_year !== a.academic_year) return b.academic_year - a.academic_year;
                    const semOrder = { first: 1, second: 2, summer: 3 };
                    return (semOrder[b.semester] || 0) - (semOrder[a.semester] || 0);
                  })
                  .map((p, i) => (
                  <tr key={`${p.academic_year}-${p.semester}-${p.archived_period || ''}-${i}`} className="border-b border-[#e5e7eb]">
                    <td className="p-3 text-[#6b7280]">{i + 1}</td>
                    <td className="p-3 font-semibold">{p.academic_year}</td>
                    <td className="p-3">{p.semester_label}</td>
                    <td className="p-3">
                      <span className="bg-[#dbeafe] text-[#1e40af] py-[2px] px-[10px] rounded-full text-[13px] font-semibold">
                        {p.sections_count}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="bg-[#fef3c7] text-[#92400e] py-[2px] px-[10px] rounded-full text-[13px] font-semibold">
                        {p.enrollments_count}
                      </span>
                    </td>
                    <td className="p-3 text-[13px] text-[#666]">
                      {p.archived_at ? new Date(p.archived_at).toLocaleString("ar") : "-"}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 bg-[#dcfce7] text-[#166534] py-1 px-[10px] rounded-full text-xs font-semibold">
                        <CheckCircle2 size={14} /> مؤرشف
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            academic_year: p.academic_year,
                            semester: p.semester,
                          });
                          if (p.archived_period) params.set("archived_period", p.archived_period);
                          navigate(`/head-department/archive/details?${params.toString()}`);
                        }}
                        className="inline-flex items-center gap-[6px] bg-[#3b82f6] text-white border-none py-[6px] px-3 rounded-md cursor-pointer text-[13px] font-semibold"
                      >
                        <Eye size={14} /> عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
