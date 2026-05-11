import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Database, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import { getArchivePeriodDetails } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";

const TABLE_LABELS = {
  sections: "الشعب",
  enrollments: "التسجيلات",
  students: "الطلاب",
  training_assignments: "تعيينات التدريب",
  student_portfolios: "ملفات الإنجاز",
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
  weekly_schedules: "الجداول الأسبوعية",
};

export default function AdminArchiveDetails() {
  const { periodId } = useParams();
  const navigate = useNavigate();
  const toast = useAppToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDetails();
  }, [periodId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getArchivePeriodDetails(periodId);
      setData(result);
    } catch (err) {
      console.error("Archive details error:", err);
      setError(err?.response?.data?.message || "فشل في تحميل تفاصيل الأرشفة");
      toast.apiError(err, "فشل في تحميل التفاصيل");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="section" text="جاري تحميل التفاصيل..." />;
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="bg-[#fee] text-[#c00] p-4 rounded-lg mb-4 flex items-center gap-2">
          <AlertTriangle size={20} /> {error}
        </div>
        <button
          onClick={() => navigate("/admin/archive")}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowRight size={16} /> العودة لسجل الأرشفة
        </button>
      </div>
    );
  }

  const period = data?.period;
  const archiveBatch = data?.archive_batch;
  const sections = data?.sections || [];
  const stats = archiveBatch?.summary_counts || {};

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold">
            <Database size={28} /> تفاصيل الأرشفة
          </h1>
          <p className="text-[#666] m-0 mt-1">
            {period?.name || "الفترة التدريبية"}
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/archive")}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowRight size={16} /> العودة
        </button>
      </div>

      {/* Period info card */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h2 className="mt-0 flex items-center gap-2 text-lg font-semibold">
          <Calendar size={20} /> معلومات الفترة
        </h2>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
            <div className="text-xs text-[#666]">الاسم</div>
            <div className="text-lg font-bold text-[#1e40af]">{period?.name || "-"}</div>
          </div>
          <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
            <div className="text-xs text-[#666]">من</div>
            <div className="text-lg font-bold text-[#1e40af]">{period?.start_date || "-"}</div>
          </div>
          <div className="bg-[#eff6ff] py-3 px-5 rounded-lg border border-[#bfdbfe]">
            <div className="text-xs text-[#666]">إلى</div>
            <div className="text-lg font-bold text-[#1e40af]">{period?.end_date || "-"}</div>
          </div>
          <div className="bg-[#dcfce7] py-3 px-5 rounded-lg border border-[#86efac]">
            <div className="text-xs text-[#666]">الحالة</div>
            <div className="text-lg font-bold text-[#166534] flex items-center gap-1">
              <CheckCircle2 size={18} /> {period?.is_active ? "نشطة" : "غير نشطة"}
            </div>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      {Object.keys(stats).length > 0 && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <h2 className="mt-0 flex items-center gap-2 text-lg font-semibold">
            <Database size={20} /> إحصائيات الأرشفة
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {Object.entries(stats).map(([key, count]) => (
              <div
                key={key}
                className="p-3 rounded-lg border border-[#e5e7eb] flex justify-between items-center"
              >
                <span className="text-sm">{TABLE_LABELS[key] || key}</span>
                <span className="bg-[#3b82f6] text-white py-[2px] px-[10px] rounded-full text-[13px] font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
            <p className="m-0 font-semibold">
              الإجمالي: {Object.values(stats).reduce((sum, n) => sum + (n || 0), 0)} عنصر
            </p>
          </div>
        </div>
      )}

      {/* Archived sections */}
      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h2 className="mt-0 flex items-center gap-2 text-lg font-semibold">
          <Database size={20} /> الشعب المؤرشفة ({sections.length})
        </h2>

        {sections.length === 0 ? (
          <p className="text-[#666] text-center p-6">لا توجد شعب مؤرشفة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">#</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الشعبة</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">المساق</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">المشرف الأكاديمي</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">تاريخ الأرشفة</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s, i) => (
                  <tr key={s.id} className="border-b border-[#e5e7eb]">
                    <td className="p-3 text-[#6b7280]">{i + 1}</td>
                    <td className="p-3 font-semibold">{s.name}</td>
                    <td className="p-3">{s.course?.name || "-"}</td>
                    <td className="p-3">{s.academic_supervisor?.name || "-"}</td>
                    <td className="p-3 text-[13px] text-[#666]">
                      {s.archived_at ? new Date(s.archived_at).toLocaleString("ar") : "-"}
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
