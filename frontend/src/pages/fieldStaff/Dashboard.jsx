import useFieldStaffRole from "../../hooks/useFieldStaffRole";
import {
  getTrainingAssignments,
  getEvaluations,
  getAttendances,
  getNotes,
  getTasks,
  itemsFromPagedResponse,
} from "../../services/api";
import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";

export default function FieldStaffDashboard() {
  const { label, isMentor, isAdviser, isPsychologist, isSupervisor, isPrincipal, isFieldSupervisor, supervisorSubtype, terms } = useFieldStaffRole();
  const [stats, setStats] = useState({ students: 0, evals: 0, attendance: 0, notes: 0, tasks: 0 });
  const [loading, setLoading] = useState(true);

  // المعلم المرشد (teacher) يُوازى مسار mentor_teacher — بدون بطاقة المهام في الرئيسية
  const showTasksOnDashboard =
    (isAdviser || isSupervisor) && !isFieldSupervisor && !isPsychologist;

  useEffect(() => {
    async function load() {
      try {
        const reqs = [
          getTrainingAssignments({ per_page: 1 }),
          getEvaluations({ per_page: 1 }),
          getAttendances({ per_page: 1 }),
          getNotes({ per_page: 1 }),
        ];
        if (showTasksOnDashboard) {
          reqs.push(getTasks({ per_page: 1 }));
        }
        const results = await Promise.all(reqs);
        const assignRes = results[0];
        const evalRes = results[1];
        const attRes = results[2];
        const noteRes = results[3];
        const taskRes = showTasksOnDashboard ? results[4] : null;
        setStats({
          students: assignRes?.total || itemsFromPagedResponse(assignRes).length,
          evals: evalRes?.total || itemsFromPagedResponse(evalRes).length,
          attendance: attRes?.total || itemsFromPagedResponse(attRes).length,
          notes: noteRes?.total || itemsFromPagedResponse(noteRes).length,
          tasks: taskRes ? taskRes?.total || itemsFromPagedResponse(taskRes).length : 0,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showTasksOnDashboard]);

  const cards = [
    { title: "الطلبة المتدربون", value: stats.students, color: "#0d6efd" },
    { title: "التقييمات", value: stats.evals, color: "#198754" },
    { title: "سجلات الحضور", value: stats.attendance, color: "#6f42c1" },
    { title: "الملاحظات", value: stats.notes, color: "#fd7e14" },
  ];

  if (showTasksOnDashboard) {
    cards.push({ title: "المهام", value: stats.tasks, color: "#dc3545" });
  }

  return (
    <>
      <PageHeader
        title={`لوحة تحكم ${label}`}
        subtitle="نظرة عامة على بيانات التدريب الميداني الخاصة بك."
      />

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {cards.map((c) => (
            <div key={c.title} className="section-card p-5 text-center" style={{ borderTop: `4px solid ${c.color}` }}>
              <h3 className="m-0" style={{ color: c.color }}>{c.value}</h3>
              <p className="mt-2 mb-0 text-[#6c757d]">{c.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* Role-specific tips */}
      <div className="section-card mt-6 p-5">
        <h5>إرشادات حسب دورك</h5>
        {isAdviser && (
          <ul className="pr-5">
            <li>راجع السجلات الإرشادية المقدمة من الطلبة وقم بقبولها أو إعادتها.</li>
            <li>استخدم نماذج تقييم المرشد التربوي لمتابعة أداء الطلبة في النشاط الإرشادي.</li>
            <li>أضف ملاحظات تربوية مرتبطة بالحالات والتوصيات.</li>
          </ul>
        )}
        {isPsychologist && !isFieldSupervisor && (
          <ul className="pr-5">
            <li>راجع {terms.dailyReport || "التقارير المهنية"} المقدمة من الطلبة.</li>
            <li>استخدم {terms.evaluation || "تقييم المؤسسة"} (٢٠ معيارًا) من صفحة التقييمات بعد اختيار الطالب.</li>
            <li>أضف ملاحظات على {terms.topic || "الحالات"} وسجّل الحضور والمهام كباقي مسار المشرف الميداني.</li>
          </ul>
        )}
        {isSupervisor && (
          <ul className="pr-5">
            <li>تابع الزيارات الميدانية وسجّل ملاحظاتك.</li>
            <li>استخدم نماذج التقييم الأكاديمي لتقييم أداء الطلبة.</li>
            <li>راجع تقارير الحضور والمهام المسلّمة.</li>
          </ul>
        )}
        {isPrincipal && (
          <ul className="pr-5">
            <li>عيّن المعلم المرشد للطلبة المتدربين في جهتك.</li>
            <li>استخدم نماذج تقييم مدير المدرسة لتقييم الأداء العام.</li>
            <li>تابع دفعات طلبات التدريب والطلبة المتدربين.</li>
          </ul>
        )}
        {(isMentor || (isFieldSupervisor && supervisorSubtype === "mentor_teacher")) && (
          <ul className="pr-5">
            <li>راجع {terms.dailyReport || "التقارير اليومية"} المقدمة من الطلبة وقم بتأكيدها أو إعادتها.</li>
            <li>استخدم نماذج {terms.evaluation || "التقييم"} لتقييم أداء الطلبة في {terms.lesson || "الحصة"}.</li>
            <li>سجّل ملاحظاتك على {terms.classroom || "إدارة الصف"} وأضف ملاحظات سريعة.</li>
          </ul>
        )}
        {isFieldSupervisor && supervisorSubtype === "school_counselor" && (
          <ul className="pr-5">
            <li>راجع {terms.dailyReport || "التقارير الإرشادية"} المقدمة من الطلبة.</li>
            <li>استخدم نماذج {terms.evaluation || "التقييم الإرشادي"} لتقييم أداء الطلبة في {terms.lesson || "النشاط الإرشادي"}.</li>
            <li>أضف ملاحظات على {terms.topic || "الحالات"} ومتابعة التوصيات.</li>
          </ul>
        )}
        {isFieldSupervisor && supervisorSubtype === "psychologist" && (
          <ul className="pr-5">
            <li>راجع {terms.dailyReport || "التقارير المهنية"} المقدمة من الطلبة.</li>
            <li>استخدم نماذج {terms.evaluation || "التقييم المهني"} لتقييم أداء الطلبة في {terms.lesson || "الجلسات"}.</li>
            <li>أضف ملاحظات على {terms.topic || "الحالات"} والالتزام بالأخلاقيات المهنية.</li>
          </ul>
        )}
      </div>
    </>
  );
}
