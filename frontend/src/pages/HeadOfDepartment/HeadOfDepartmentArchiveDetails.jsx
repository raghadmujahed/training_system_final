import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Calendar, Users, BookOpen, Database, FileText } from "lucide-react";
import { getArchivedPeriodDetails } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

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

const STATUS_LABELS = {
  active: "نشط",
  dropped: "منسحب",
  completed: "مكتمل",
};

export default function HeadOfDepartmentArchiveDetails() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const academic_year = params.get("academic_year");
  const semester = params.get("semester");
  const archived_period = params.get("archived_period");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getArchivedPeriodDetails({ academic_year, semester, archived_period });
        if (mounted) setData(res);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "فشل في تحميل تفاصيل الفترة");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [academic_year, semester, archived_period]);

  // Group enrollments by course -> section
  const grouped = useMemo(() => {
    if (!data?.enrollments) return {};
    const result = {};
    data.enrollments.forEach((e) => {
      const courseKey = `${e.course_code || "?"} - ${e.course_name || "غير معروف"}`;
      if (!result[courseKey]) result[courseKey] = {};
      const sectionKey = e.section_name || "غير معروف";
      if (!result[courseKey][sectionKey]) result[courseKey][sectionKey] = [];
      result[courseKey][sectionKey].push(e);
    });
    return result;
  }, [data]);

  if (loading) {
    return (
      <LoadingSpinner size="section" text="جاري تحميل التفاصيل..." />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-[#fee] text-[#c00] p-4 rounded-lg">{error}</div>
        <button onClick={() => navigate("/head-department/archive")} className="btn-secondary mt-4">
          العودة للأرشفة
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2">
            <Calendar size={28} /> تفاصيل الفترة المؤرشفة
          </h1>
          <p className="text-[#666] m-0 mt-1 text-base">
            {data.period.academic_year} - {data.period.semester_label}
          </p>
        </div>
        <button onClick={() => navigate("/head-department/archive")} className="btn-secondary flex items-center gap-2">
          <ArrowRight size={16} /> العودة للأرشفة
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b-2 border-[#e5e7eb]">
        {[
          { id: "overview", label: "نظرة عامة", icon: Database },
          { id: "sections", label: `الشعب (${data.sections?.length || 0})`, icon: BookOpen },
          { id: "students", label: `الطلاب المسجلون (${data.enrollments?.length || 0})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="py-[10px] px-4 border-none rounded-t-lg cursor-pointer font-semibold flex items-center gap-[6px]"
              style={{
                background: active ? "#3b82f6" : "transparent",
                color: active ? "#fff" : "#374151",
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <h3 className="mt-0">إحصائيات البيانات المؤرشفة</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {Object.entries(data.stats || {}).map(([key, count]) => (
              <div key={key} className="p-4 rounded-lg border border-[#e5e7eb]" style={{ background: count > 0 ? "#f0f9ff" : "#f9fafb" }}>
                <div className="text-[13px] text-[#6b7280] mb-1">{TABLE_LABELS[key] || key}</div>
                <div className="text-2xl font-bold" style={{ color: count > 0 ? "#1e40af" : "#9ca3af" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections tab */}
      {activeTab === "sections" && (
        <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          {(!data.sections || data.sections.length === 0) ? (
            <p className="text-center text-[#666] p-6">لا توجد شعب مؤرشفة لهذه الفترة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f9fafb]">
                    <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">المساق</th>
                    <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">اسم الشعبة</th>
                    <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">المشرف الأكاديمي</th>
                    <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">السعة</th>
                    <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">عدد المسجلين</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sections.map((s) => (
                    <tr key={s.id} className="border-b border-[#e5e7eb]">
                      <td className="p-[10px] text-right">
                        <div className="font-semibold">{s.course?.name || "-"}</div>
                        <div className="text-xs text-[#666]">{s.course?.code || ""}</div>
                      </td>
                      <td className="p-[10px] text-right">{s.name}</td>
                      <td className="p-[10px] text-right">{s.academic_supervisor?.name || "غير محدد"}</td>
                      <td className="p-[10px] text-right">{s.capacity}</td>
                      <td className="p-[10px] text-right">
                        <span className="bg-[#dbeafe] text-[#1e40af] py-[2px] px-[10px] rounded-full text-[13px] font-semibold">{s.enrollments_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Students tab */}
      {activeTab === "students" && (
        <div>
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-[#666] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              لا توجد تسجيلات مؤرشفة لهذه الفترة.
            </div>
          ) : (
            Object.entries(grouped).map(([courseKey, sections]) => (
              <div key={courseKey} className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] mb-4">
                <h3 className="mt-0 text-[#1e40af] border-b-2 border-[#e5e7eb] pb-2">
                  <BookOpen size={18} className="align-middle ml-[6px]" />
                  {courseKey}
                </h3>
                {Object.entries(sections).map(([sectionName, students]) => (
                  <div key={sectionName} className="mt-4">
                    <h4 className="m-0 mb-2 text-[#374151] flex items-center gap-[6px]">
                      شعبة: {sectionName}
                      <span className="bg-[#e5e7eb] text-[#374151] py-[1px] px-2 rounded-full text-xs">
                        {students.length} طالب
                      </span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#f9fafb]">
                            <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">#</th>
                            <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">الرقم الجامعي</th>
                            <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">اسم الطالب</th>
                            <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">البريد</th>
                            <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">الحالة</th>
                            <th className="p-3 text-right border-b-2 border-[#e5e7eb] font-semibold text-[13px]">التقدير النهائي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((e, i) => (
                            <tr key={e.id} className="border-b border-[#f3f4f6]">
                              <td className="p-[10px] text-right">{i + 1}</td>
                              <td className="p-[10px] text-right">{e.university_id || "-"}</td>
                              <td className="p-[10px] text-right">{e.user_name || "-"}</td>
                              <td className="p-[10px] text-right text-[13px] text-[#666]">{e.email || "-"}</td>
                              <td className="p-[10px] text-right">
                                <span className="py-[2px] px-2 rounded-full text-xs font-semibold" style={{ background: e.status === "active" ? "#dcfce7" : e.status === "completed" ? "#dbeafe" : "#fee2e2", color: e.status === "active" ? "#166534" : e.status === "completed" ? "#1e40af" : "#991b1b" }}>
                                  {STATUS_LABELS[e.status] || e.status}
                                </span>
                              </td>
                              <td className="p-[10px] text-right">{e.final_grade ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

