import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

export default function DailyLogsTab({ studentId }) {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [commentingLogId, setCommentingLogId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [viewingEform, setViewingEform] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/daily-logs`, { params: { per_page: 200 } });
      const payload = res.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.logs)
            ? payload.data.logs
            : [];
      setLogs(rows);
    } catch {
      setError("فشل تحميل السجلات اليومية");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleAddComment = async (logId) => {
    if (!commentText.trim()) return;
    try {
      await apiClient.post(`/supervisor/students/${studentId}/daily-logs/${logId}/academic-review`, {
        academic_note: commentText.trim(),
        needs_discussion: false,
      });
      setCommentingLogId(null);
      setCommentText("");
      addToast("تم إضافة الملاحظة بنجاح", "success");
      loadLogs();
    } catch {
      addToast("فشل إضافة الملاحظة", "error");
    }
  };

  const handleSendNote = async (logId) => {
    if (!commentText.trim()) return;
    try {
      await apiClient.post(`/supervisor/students/${studentId}/daily-logs/${logId}/academic-review`, {
        academic_note: commentText.trim(),
        needs_discussion: true,
      });
      setCommentingLogId(null);
      setCommentText("");
      addToast("تم إرسال الملاحظة بنجاح", "success");
      loadLogs();
    } catch {
      addToast("فشل إرسال الملاحظة", "error");
    }
  };

  const statusConfig = {
    new: { label: "جديد", color: "#17a2b8", bg: "#e3f2fd" },
    pending_review: { label: "قيد المراجعة", color: "#ffc107", bg: "#fff8e1" },
    reviewed: { label: "معتمد", color: "#28a745", bg: "#e8f5e9" },
    approved: { label: "معتمد", color: "#28a745", bg: "#e8f5e9" },
    under_review: { label: "قيد المراجعة", color: "#ffc107", bg: "#fff8e1" },
    needs_edit: { label: "يحتاج تعديل", color: "#dc3545", bg: "#ffebee" },
    draft: { label: "مسودة", color: "#6c757d", bg: "#f8f9fa" },
    submitted: { label: "مُقدّم", color: "#0d6efd", bg: "#e8f0fe" },
  };

  const sourceLabels = {
    eform: { label: "نموذج إلكتروني", icon: "📋", color: "#6f42c1" },
    training_log: { label: "سجل يومي", icon: "📝", color: "#4361ee" },
    daily_report: { label: "تقرير ميداني", icon: "🏫", color: "#28a745" },
  };

  const formKeyLabels = {
    weekly_full_report: "التقرير الأسبوعي الكامل",
    weekly_brief_report: "التقرير الأسبوعي المختصر",
    weekly_reflection: "التأمل الأسبوعي",
    learning_experience_review: "مراجعة خبرة تعلمية",
    field_visit_summary: "ملخص زيارة ميدانية",
    classes_count: "عدد الحصص",
  };

  const payloadFieldLabels = {
    course: "المادة",
    morningAssembly: "الطابور الصباحي",
    duty: "الواجب",
    implementedLessons: "الحصص المنفذة",
    teachingAids: "الوسائل التعليمية",
    activities: "الأنشطة",
    meetings: "الاجتماعات",
    reflection: "التأمل",
    notes: "ملاحظات",
    summary: "الملخص",
    visitDate: "تاريخ الزيارة",
    visitPurpose: "هدف الزيارة",
    observations: "الملاحظات",
    recommendations: "التوصيات",
    classCount: "عدد الحصص",
  };

  // Form field definitions for full form display
  const formFieldDefinitions = {
    weekly_full_report: [
      { key: "course", label: "المادة" },
      { key: "morningAssembly", label: "الطابور الصباحي" },
      { key: "duty", label: "المناوبة" },
      { key: "implementedLessons", label: "الحصص التي نفذها (كلي – جزئي – أوراق العمل)" },
      { key: "teachingAids", label: "الوسائل التي أعدها" },
      { key: "activities", label: "الأنشطة التي قام بها" },
      { key: "meetings", label: "حضور الاجتماعات" },
    ],
    weekly_brief_report: [
      { key: "lessonsTaught", label: "أسماء المباحث والدروس التي نفذتها خلال هذا الأسبوع" },
      { key: "worksheetsCount", label: "عدد أوراق العمل التي عملتها هذا الأسبوع وعناوينها" },
      { key: "teachingMaterials", label: "أسماء أبرز الوسائل التعليمية قمت بإعدادها وتوظيفها" },
      { key: "otherWorks", label: "أسماء أعمال أخرى أعددتها (مقاطع فيديو، نشرات، اختبارات، خطط علاجية...)" },
      { key: "observedStrengths", label: "ما أعجبك من مشاهدتك للمعلم المرشد" },
      { key: "coTeachingReflection", label: "انعكاس على مشاركتك في إعطاء مواقف تعليمية مع المعلم المرشد" },
      { key: "selfTeachingReflection", label: "تقييمك الذاتي لحصة صفية كاملة نفذتها" },
      { key: "studentAttendance", label: "التزام الطلبة بالدوام والزي المدرسي" },
      { key: "studentDiscipline", label: "احترام الطلبة للقوانين والأنظمة ولوائح السلوك والانضباط" },
      { key: "studentInteraction", label: "تعاون وتفاعل الطلبة معك في الحصص الصفية" },
      { key: "schoolSupport", label: "أتاحة المدرسة الفرصة للتدريب بفاعلية والحصول على أقصى فائدة" },
      { key: "professionalRelations", label: "علاقتك المهنية مع ذوي العلاقة في المدرسة وتقبلهم لك" },
      { key: "strengthsThisWeek", label: "أهم جوانب القوة والنجاح التي تميزت بها هذا الأسبوع" },
      { key: "areasForImprovement", label: "الجوانب التي تحتاج لتحسين وتطوير مستقبلاً" },
      { key: "supervisorSupportNeeds", label: "ما الذي تريد من مشرفك أن يساعدك فيه ليتطور أداؤك" },
    ],
    learning_experience_review: [
      { key: "plansAndObjectives", label: "الخطط والأهداف" },
      { key: "lessonImplementation", label: "تنفيذ الدرس" },
      { key: "introduction", label: "التمهيد" },
      { key: "presentation", label: "العرض" },
      { key: "closure", label: "الخاتمة والغلق" },
      { key: "classroomManagement", label: "إدارة الصف" },
      { key: "studentMotivation", label: "إثارة الدافعية عند الطلبة" },
      { key: "methodsAndApproaches", label: "الطرائق والأساليب المتبعة" },
      { key: "teachingAids", label: "إعداد الوسائل التعليمية وتفعيلها" },
      { key: "evaluationAndTesting", label: "التقييم والاختبارات ومراعاة مبادئ القياس والتقويم" },
      { key: "teacherRoles", label: "الأدوار التي يقوم بها المعلم إضافة إلى عملية التدريس" },
    ],
    weekly_reflection: [
      { key: "reflection", label: "التأمل" },
      { key: "notes", label: "ملاحظات" },
      { key: "summary", label: "الملخص" },
    ],
    field_visit_summary: [
      { key: "visitDate", label: "تاريخ الزيارة" },
      { key: "visitPurpose", label: "هدف الزيارة" },
      { key: "observations", label: "الملاحظات" },
      { key: "recommendations", label: "التوصيات" },
    ],
    daily_tasks_report: [
      { key: "task", label: "المهمة" },
      { key: "description", label: "الوصف" },
      { key: "notes", label: "ملاحظات" },
    ],
  };

  const renderFullFormView = (log) => {
    const fields = formFieldDefinitions[log.form_key] || Object.entries(log.payload || {}).map(([key]) => ({ key, label: payloadFieldLabels[key] || key }));
    const payload = log.payload || {};

    return (
      <div className="max-w-[800px] mx-auto">
        <div className="text-white rounded-t-2xl py-6 px-8 bg-gradient-to-br from-[#f093fb] to-[#f5576c]">
          <h4 className="m-0 text-[1.25rem] font-semibold">{formKeyLabels[log.form_key] || log.title}</h4>
          <p className="m-0 mt-2 opacity-90 text-[0.95rem]">
            تقرير الطالب الأسبوعي عن الأنشطة والمهام المنفذة
          </p>
        </div>

        <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] border-t-0">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5">
            {fields.map((field) => {
              const value = payload[field.key];
              if (!value || !String(value).trim()) return null;
              return (
                <div key={field.key} className="flex flex-col">
                  <label className="text-[0.9rem] font-semibold text-[#495057] mb-2">
                    {field.label}
                  </label>
                  <div className="w-full p-3 border-[1.5px] border-[#e0e0e0] rounded-[10px] text-[0.9rem] bg-[#f8f9fa] min-h-[80px] whitespace-pre-wrap leading-[1.6] text-[#333]">
                    {value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-[#e9ecef] flex justify-between items-center">
            <span className="text-[0.85rem] text-[#666]">
              تاريخ التقديم: {log.submitted_at || log.date}
            </span>
            <button
              onClick={() => setViewingEform(null)}
              className="py-3 px-6 bg-[#6b7280] text-white border-none rounded-lg cursor-pointer text-[0.9rem]"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filtered = filterStatus ? logs.filter((l) => l.status === filterStatus) : logs;

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;
  if (error) return <div className="text-[#dc3545] p-5">⚠️ {error}</div>;

  return (
    <div>
      {/* Quick Review Mode */}
      {logs.filter((l) => l.status === "pending_review" || l.status === "new").length > 0 && (
        <div className="bg-[#fff8e1] border border-[#ffc107] rounded-lg py-3 px-4 mb-4 flex justify-between items-center">
          <span className="text-[0.85rem] text-[#856404] font-semibold">
            📝 {logs.filter((l) => l.status === "pending_review" || l.status === "new").length} سجل بانتظار المراجعة
          </span>
        </div>
      )}

      {/* E-Form Detail Modal */}
      {viewingEform && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-5 overflow-auto">
          <div className="w-full max-w-[900px] max-h-[90vh] overflow-auto">
            {renderFullFormView(viewingEform)}
          </div>
        </div>
      )}

      {!filtered.length ? (
        <div className="text-center p-10 text-[#999]">
          <div className="text-[2rem] mb-3">📭</div>
          لا توجد سجلات يومية
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((log) => {
            const sc = statusConfig[log.status] || statusConfig.draft;
            const src = sourceLabels[log.source] || sourceLabels.training_log;
            const isEform = log.source === "eform";

            // Parse content: e-forms use payload directly, others use student_reflection
            let contentParts = [];
            if (isEform && log.payload && typeof log.payload === "object") {
              contentParts = Object.entries(log.payload)
                .filter(([, v]) => v !== null && v !== undefined && String(v).trim())
                .map(([k, v]) => ({ key: k, value: String(v) }));
            } else if (log.student_reflection) {
              try {
                const parsed = JSON.parse(log.student_reflection);
                if (typeof parsed === "object" && parsed !== null) {
                  contentParts = Object.entries(parsed)
                    .filter(([, v]) => v && String(v).trim())
                    .map(([k, v]) => ({ key: k, value: String(v) }));
                }
              } catch {
                contentParts = [{ key: null, value: log.student_reflection }];
              }
            }

            return (
              <div
                key={log.id}
                className="bg-white border border-[#e9ecef] rounded-[10px] p-4"
                style={{ borderRight: `4px solid ${isEform ? src.color : sc.color}` }}
              >
                {/* Card header - hidden for e-forms */}
                {!isEform && (
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div>
                      <h5 className="m-0 mb-1 text-[1rem]">
                        {log.description || log.title || `سجل يوم ${log.date}`}
                      </h5>
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="text-[0.82rem] text-[#666]">{log.date || "—"}</span>
                      </div>
                    </div>
                    <div className="flex gap-[6px] items-center">
                      <span className="py-[3px] px-2 rounded-xl text-[0.72rem] font-semibold" style={{ color: src.color, backgroundColor: src.color + "18" }}>
                        {src.icon} {src.label}
                      </span>
                      <span className="py-1 px-3 rounded-2xl text-[0.78rem] font-semibold" style={{ color: sc.color, backgroundColor: sc.bg }}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Show status badge for e-forms in corner */}
                {isEform && (
                  <div className="flex justify-end mb-2">
                    <span className="py-1 px-3 rounded-2xl text-[0.78rem] font-semibold" style={{ color: sc.color, backgroundColor: sc.bg }}>
                      {sc.label}
                    </span>
                  </div>
                )}

                {contentParts.length > 0 && !isEform && (
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg py-3 px-4 mb-3">
                    <div className="text-[0.78rem] font-bold text-[#475569] mb-2">📄 محتوى التقرير:</div>
                    {contentParts.map(({ key, value }) => (
                      <div key={key} className="mb-[6px] text-[0.85rem] leading-[1.6]">
                        {key && <span className="font-semibold text-[#334155]">{payloadFieldLabels[key] || key}: </span>}
                        <span className="text-[#444]">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {log.mentor_comment && (
                  <div className="bg-[#f0f7ff] rounded-md p-[10px] mb-3 text-[0.85rem]">
                    <span className="font-semibold text-[#0d6efd]">👨‍🏫 ملاحظة المشرف الميداني:</span>
                    <span className="text-[#444] mr-2">{log.mentor_comment}</span>
                  </div>
                )}

                {log.attachment_path && (
                  <div className="text-[0.82rem] text-[#666] mb-3">
                    📎 مرفق: {log.attachment_path}
                  </div>
                )}

                {/* E-Form Summary Card with View Button */}
                {isEform ? (
                  <div className="bg-[#fff5f7] border border-[#ffcdd2] rounded-xl p-4 mt-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[1.5rem] bg-gradient-to-br from-[#f093fb] to-[#f5576c]">
                      📋
                    </div>
                    <div className="flex-1">
                      <h4 className="m-0 text-[1rem] font-semibold text-[#333]">
                        {formKeyLabels[log.form_key] || log.title}
                      </h4>
                      <p className="m-0 mt-1 text-[0.8rem] text-[#666]">
                        📅 {log.date} • 📝 نموذج إلكتروني مُقدم
                      </p>
                    </div>
                    <button
                      onClick={() => setViewingEform(log)}
                      className="py-[10px] px-5 text-white border-none rounded-lg cursor-pointer text-[0.9rem] font-semibold flex items-center gap-[6px] bg-gradient-to-br from-[#f093fb] to-[#f5576c]"
                    >
                      👁️ عرض النموذج
                    </button>
                  </div>
                ) : log.source === "daily_report" ? (
                  <div className="bg-[#e8f5e9] rounded-md py-2 px-3 text-[0.82rem] text-[#2e7d32]">
                    هذا تقرير يومي راجعه المشرف الميداني ويظهر هنا للاطلاع الأكاديمي.
                  </div>
                ) : commentingLogId === log.id ? (
                  <div className="bg-[#f8f9fa] rounded-lg p-3">
                    <textarea
                      id="daily-log-comment"
                      name="supervisor_comment"
                      className="form-textarea-custom"
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="أضف ملاحظتك الأكاديمية..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="btn-primary-custom text-[0.82rem] py-[6px] px-[14px]" onClick={() => handleAddComment(log.id)}>
                        ✅ اعتماد مع ملاحظة
                      </button>
                      <button className="text-[0.82rem] py-[6px] px-[14px] rounded-md border border-[#fd7e14] bg-[#fd7e14] text-white cursor-pointer hover:bg-[#e76f00]" onClick={() => handleSendNote(log.id)}>
                        📤 إرسال للطالب (يحتاج تعديل)
                      </button>
                      <button className="text-[0.82rem] py-[6px] px-[14px] rounded-md border border-[#999] bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => { setCommentingLogId(null); setCommentText(""); }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {log.supervisor_comment ? (
                      <div className="bg-[#e8f5e9] rounded-md py-2 px-3 text-[0.85rem] flex-1">
                        <span className="font-semibold text-[#28a745]">🎓 ملاحظتك:</span>
                        <span className="text-[#444] mr-2">{log.supervisor_comment}</span>
                      </div>
                    ) : null}
                    <button
                      className="text-[0.82rem] py-[6px] px-[14px] rounded-md border border-[#4361ee] bg-[#4361ee] text-white cursor-pointer hover:bg-[#3651de]"
                      onClick={() => setCommentingLogId(log.id)}
                    >
                      💬 إضافة ملاحظة
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
