import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";
import {
  Calendar,
  ClipboardList,
  Eye,
  MessageSquare,
  FileText,
  CheckCircle2,
  Send,
} from "lucide-react";

export default function DailyLogsTab({ studentId }) {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentingLogId, setCommentingLogId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [viewingEform, setViewingEform] = useState(null);
  const [submittingNote, setSubmittingNote] = useState(false);

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

  const submitAcademicReview = async (logId, needsDiscussion) => {
    if (!commentText.trim()) return;
    setSubmittingNote(true);
    try {
      await apiClient.post(`/supervisor/students/${studentId}/daily-logs/${logId}/academic-review`, {
        academic_note: commentText.trim(),
        needs_discussion: needsDiscussion,
      });
      setCommentingLogId(null);
      setCommentText("");
      addToast(needsDiscussion ? "تم إرسال الملاحظة للطالب" : "تم حفظ الملاحظة بنجاح", "success");
      loadLogs();
    } catch {
      addToast("فشل حفظ الملاحظة", "error");
    } finally {
      setSubmittingNote(false);
    }
  };

  const openCommentForm = (log) => {
    setCommentingLogId(log.id);
    setCommentText(log.supervisor_comment || log.academic_note || "");
  };

  const statusConfig = {
    new: { label: "جديد", color: "#0ea5e9", bg: "#e0f2fe" },
    pending_review: { label: "قيد المراجعة", color: "#d97706", bg: "#fef3c7" },
    reviewed: { label: "تمت المراجعة", color: "#16a34a", bg: "#dcfce7" },
    approved: { label: "معتمد", color: "#16a34a", bg: "#dcfce7" },
    under_review: { label: "قيد المراجعة", color: "#d97706", bg: "#fef3c7" },
    needs_edit: { label: "يحتاج تعديل", color: "#dc2626", bg: "#fee2e2" },
    draft: { label: "مسودة", color: "#64748b", bg: "#f1f5f9" },
    submitted: { label: "مُقدّم", color: "#2563eb", bg: "#dbeafe" },
  };

  const sourceLabels = {
    eform: { label: "نموذج إلكتروني", color: "#be185d" },
    training_log: { label: "سجل يومي", color: "#4f46e5" },
    daily_report: { label: "تقرير ميداني", color: "#15803d" },
  };

  const formKeyLabels = {
    weekly_full_report: "التقرير الأسبوعي الكامل",
    weekly_brief_report: "التقرير الأسبوعي المختصر",
    weekly_reflection: "التأمل الأسبوعي",
    learning_experience_review: "مراجعة خبرة تعلمية",
    field_visit_summary: "ملخص زيارة ميدانية",
    classes_count: "عدد الحصص",
    daily_tasks_report: "تقرير المهام والأعمال اليومية",
  };

  const formFieldDefinitions = {
    weekly_full_report: [
      { key: "course", label: "المادة" },
      { key: "morningAssembly", label: "الطابور الصباحي" },
      { key: "duty", label: "المناوبة" },
      { key: "implementedLessons", label: "الحصص التي نفذها" },
      { key: "teachingAids", label: "الوسائل التي أعدها" },
      { key: "activities", label: "الأنشطة التي قام بها" },
      { key: "meetings", label: "حضور الاجتماعات" },
    ],
    weekly_brief_report: [
      { key: "lessonsTaught", label: "المباحث والدروس المنفذة" },
      { key: "worksheetsCount", label: "أوراق العمل" },
      { key: "teachingMaterials", label: "الوسائل التعليمية" },
      { key: "otherWorks", label: "أعمال أخرى" },
      { key: "observedStrengths", label: "ما أعجبك من المعلم المرشد" },
      { key: "coTeachingReflection", label: "مشاركتك في المواقف التعليمية" },
      { key: "selfTeachingReflection", label: "تقييمك الذاتي للحصة" },
      { key: "studentAttendance", label: "التزام الطلبة بالدوام" },
      { key: "studentDiscipline", label: "احترام الطلبة للقوانين" },
      { key: "studentInteraction", label: "تفاعل الطلبة" },
      { key: "schoolSupport", label: "دعم المدرسة للتدريب" },
      { key: "professionalRelations", label: "العلاقات المهنية" },
      { key: "strengthsThisWeek", label: "جوانب القوة" },
      { key: "areasForImprovement", label: "جوانب التحسين" },
      { key: "supervisorSupportNeeds", label: "ما تحتاجه من المشرف" },
    ],
    learning_experience_review: [
      { key: "plansAndObjectives", label: "الخطط والأهداف" },
      { key: "lessonImplementation", label: "تنفيذ الدرس" },
      { key: "introduction", label: "التمهيد" },
      { key: "presentation", label: "العرض" },
      { key: "closure", label: "الخاتمة" },
      { key: "classroomManagement", label: "إدارة الصف" },
      { key: "studentMotivation", label: "إثارة الدافعية" },
      { key: "methodsAndApproaches", label: "الطرائق والأساليب" },
      { key: "teachingAids", label: "الوسائل التعليمية" },
      { key: "evaluationAndTesting", label: "التقييم والاختبارات" },
      { key: "teacherRoles", label: "أدوار المعلم" },
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
  };

  const renderFullFormView = (log) => {
    const fields = formFieldDefinitions[log.form_key]
      || Object.entries(log.payload || {}).map(([key]) => ({ key, label: key }));
    const payload = log.payload || {};

    return (
      <div className="max-w-[860px] mx-auto">
        <div className="text-white rounded-t-2xl py-6 px-8 bg-gradient-to-br from-rose-400 to-pink-600">
          <h4 className="m-0 text-[1.2rem] font-bold">{formKeyLabels[log.form_key] || log.title}</h4>
          <p className="m-0 mt-2 opacity-90 text-[0.9rem]">تفاصيل النموذج الإلكتروني المقدم من الطالب</p>
        </div>
        <div className="bg-white rounded-b-2xl shadow-lg p-6 border border-slate-200 border-t-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const value = payload[field.key];
              if (!value || !String(value).trim()) return null;
              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-[0.85rem] font-semibold text-slate-600">{field.label}</label>
                  <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-[0.9rem] leading-relaxed whitespace-pre-wrap text-slate-800 min-h-[72px]">
                    {value}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[0.85rem] text-slate-500 flex items-center gap-1">
              <Calendar size={14} />
              {log.submitted_at || log.date}
            </span>
            <button
              type="button"
              onClick={() => setViewingEform(null)}
              className="py-2.5 px-5 bg-slate-500 hover:bg-slate-600 text-white border-none rounded-lg cursor-pointer text-[0.88rem] transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAcademicNoteSection = (log) => {
    const existingNote = log.supervisor_comment || log.academic_note;
    const isEditing = commentingLogId === log.id;

    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-100 flex items-center gap-2 bg-emerald-50/60">
          <MessageSquare size={18} className="text-emerald-700 shrink-0" />
          <h5 className="m-0 text-[0.95rem] font-bold text-emerald-900">ملاحظة المشرف الأكاديمي</h5>
          {log.academic_reviewed_at && (
            <span className="mr-auto text-[0.72rem] text-emerald-700/80">
              {new Date(log.academic_reviewed_at).toLocaleDateString("ar-SA")}
            </span>
          )}
        </div>

        <div className="p-4">
          {isEditing ? (
            <>
              <textarea
                id="eform-academic-note"
                name="academic_note"
                className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-[0.9rem] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="اكتب ملاحظتك للطالب — ستظهر في ملف الإنجاز ضمن التقرير اليومي/الأسبوعي..."
                disabled={submittingNote}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  disabled={submittingNote || !commentText.trim()}
                  onClick={() => submitAcademicReview(log.id, false)}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg border-none text-white text-[0.85rem] font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingNote ? <LoadingSpinner size="button" /> : <CheckCircle2 size={15} />}
                  حفظ الملاحظة
                </button>
                <button
                  type="button"
                  disabled={submittingNote || !commentText.trim()}
                  onClick={() => submitAcademicReview(log.id, true)}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg border border-amber-400 bg-amber-500 text-white text-[0.85rem] font-semibold cursor-pointer hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={15} />
                  إرسال (يحتاج تعديل)
                </button>
                <button
                  type="button"
                  disabled={submittingNote}
                  onClick={() => { setCommentingLogId(null); setCommentText(""); }}
                  className="py-2 px-4 rounded-lg border border-slate-200 bg-white text-slate-600 text-[0.85rem] font-semibold cursor-pointer hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </>
          ) : existingNote ? (
            <>
              <p className="m-0 text-[0.92rem] text-slate-700 leading-relaxed whitespace-pre-wrap">{existingNote}</p>
              {log.needs_discussion && (
                <span className="inline-block mt-2 text-[0.75rem] font-semibold text-amber-800 bg-amber-100 py-1 px-2 rounded-md">
                  يحتاج تعديل من الطالب
                </span>
              )}
              <button
                type="button"
                onClick={() => openCommentForm(log)}
                className="mt-3 inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 text-[0.82rem] font-semibold cursor-pointer hover:bg-emerald-50"
              >
                <MessageSquare size={14} />
                تعديل الملاحظة
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openCommentForm(log)}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg border-none text-white text-[0.88rem] font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-700"
            >
              <MessageSquare size={16} />
              إضافة ملاحظة
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEformCard = (log) => {
    const sc = statusConfig[log.status] || statusConfig.draft;
    const src = sourceLabels.eform;
    const displayTitle = formKeyLabels[log.form_key] || log.title || "نموذج إلكتروني";

    return (
      <div
        key={log.id}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-l from-rose-400 to-pink-500" />

        <div className="p-5">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
            <div>
              <h4 className="m-0 text-[1.1rem] font-bold text-slate-800">{displayTitle}</h4>
              <p className="m-0 mt-1 text-[0.82rem] text-slate-500 flex items-center gap-1.5">
                <Calendar size={14} />
                {log.date || "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className="py-1 px-2.5 rounded-full text-[0.75rem] font-semibold"
                style={{ color: src.color, backgroundColor: `${src.color}14` }}
              >
                {src.label}
              </span>
              <span
                className="py-1 px-2.5 rounded-full text-[0.75rem] font-semibold"
                style={{ color: sc.color, backgroundColor: sc.bg }}
              >
                {sc.label}
              </span>
            </div>
          </div>

          {/* Full report card */}
          <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/90 to-white p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md">
                <ClipboardList size={22} />
              </div>
              <div className="min-w-0">
                <p className="m-0 font-bold text-slate-800 text-[0.98rem] truncate">{displayTitle}</p>
                <p className="m-0 mt-1 text-[0.8rem] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={13} />
                    {log.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText size={13} />
                    نموذج إلكتروني مُقدّم
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingEform(log)}
              className="shrink-0 inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl border-none text-white text-[0.88rem] font-semibold cursor-pointer bg-gradient-to-l from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-sm transition-all"
            >
              <Eye size={17} />
              عرض النموذج
            </button>
          </div>

          {/* Academic note — directly under full report card */}
          {renderAcademicNoteSection(log)}
        </div>
      </div>
    );
  };

  const renderTrainingLogCard = (log) => {
    const sc = statusConfig[log.status] || statusConfig.draft;
    const src = sourceLabels[log.source] || sourceLabels.training_log;

    let contentParts = [];
    if (log.student_reflection) {
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

    const payloadFieldLabels = {
      course: "المادة",
      morningAssembly: "الطابور الصباحي",
      duty: "الواجب",
      implementedLessons: "الحصص المنفذة",
      teachingAids: "الوسائل التعليمية",
      activities: "الأنشطة",
      meetings: "الاجتماعات",
    };

    return (
      <div
        key={log.id}
        className="bg-white border border-slate-200 rounded-xl p-4"
        style={{ borderRight: `4px solid ${sc.color}` }}
      >
        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
          <div>
            <h5 className="m-0 mb-1 text-[1rem] font-bold text-slate-800">
              {log.description || log.title || `سجل يوم ${log.date}`}
            </h5>
            <span className="text-[0.82rem] text-slate-500">{log.date || "—"}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="py-1 px-2 rounded-full text-[0.72rem] font-semibold" style={{ color: src.color, backgroundColor: `${src.color}18` }}>
              {src.label}
            </span>
            <span className="py-1 px-2.5 rounded-full text-[0.75rem] font-semibold" style={{ color: sc.color, backgroundColor: sc.bg }}>
              {sc.label}
            </span>
          </div>
        </div>

        {contentParts.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
            <div className="text-[0.78rem] font-bold text-slate-600 mb-2">محتوى التقرير</div>
            {contentParts.map(({ key, value }) => (
              <div key={key || "text"} className="mb-1.5 text-[0.85rem] leading-relaxed">
                {key && <span className="font-semibold text-slate-700">{payloadFieldLabels[key] || key}: </span>}
                <span className="text-slate-600">{value}</span>
              </div>
            ))}
          </div>
        )}

        {log.mentor_comment && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3 text-[0.85rem] border border-blue-100">
            <span className="font-semibold text-blue-700">ملاحظة المشرف الميداني: </span>
            <span className="text-slate-700">{log.mentor_comment}</span>
          </div>
        )}

        {commentingLogId === log.id ? (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <textarea
              className="w-full min-h-[80px] p-2.5 border border-slate-200 rounded-lg text-[0.88rem] resize-y"
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="أضف ملاحظتك الأكاديمية..."
              disabled={submittingNote}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <button type="button" disabled={submittingNote} className="btn-primary-custom text-[0.82rem] py-1.5 px-3" onClick={() => submitAcademicReview(log.id, false)}>
                اعتماد مع ملاحظة
              </button>
              <button type="button" disabled={submittingNote} className="text-[0.82rem] py-1.5 px-3 rounded-md border border-amber-500 bg-amber-500 text-white cursor-pointer" onClick={() => submitAcademicReview(log.id, true)}>
                إرسال للطالب
              </button>
              <button type="button" className="text-[0.82rem] py-1.5 px-3 rounded-md border border-slate-300 bg-white text-slate-600 cursor-pointer" onClick={() => { setCommentingLogId(null); setCommentText(""); }}>
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {(log.supervisor_comment || log.academic_note) && (
              <div className="bg-emerald-50 rounded-lg py-2 px-3 text-[0.85rem] flex-1 border border-emerald-100">
                <span className="font-semibold text-emerald-800">ملاحظتك: </span>
                <span className="text-slate-700">{log.supervisor_comment || log.academic_note}</span>
              </div>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[0.82rem] py-2 px-3 rounded-lg border border-indigo-500 bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700"
              onClick={() => openCommentForm(log)}
            >
              <MessageSquare size={14} />
              إضافة ملاحظة
            </button>
          </div>
        )}
      </div>
    );
  };

  const filtered = logs;

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;
  if (error) return <div className="text-red-600 p-5">⚠️ {error}</div>;

  const pendingCount = logs.filter((l) => l.status === "pending_review" || l.status === "new" || l.status === "submitted").length;

  return (
    <div>
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl py-3 px-4 mb-4">
          <span className="text-[0.85rem] text-amber-900 font-semibold">
            {pendingCount} سجل بانتظار المراجعة
          </span>
        </div>
      )}

      {viewingEform && (
        <div className="fixed inset-0 bg-black/55 z-[1000] flex items-center justify-center p-4 overflow-auto">
          <div className="w-full max-w-[920px] max-h-[92vh] overflow-auto">
            {renderFullFormView(viewingEform)}
          </div>
        </div>
      )}

      {!filtered.length ? (
        <div className="text-center py-12 text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-50" />
          <p className="m-0 font-medium">لا توجد سجلات بعد</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((log) => (
            log.source === "eform"
              ? renderEformCard(log)
              : log.source === "daily_report"
                ? (
                  <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <h5 className="m-0 font-bold text-slate-800">{log.title}</h5>
                    <p className="text-[0.82rem] text-slate-500 mt-1">{log.date}</p>
                    <p className="text-[0.85rem] text-emerald-800 mt-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      تقرير ميداني — للاطلاع فقط. الملاحظات الأكاديمية تُضاف على النماذج الإلكترونية.
                    </p>
                    {log.mentor_comment && (
                      <p className="text-[0.85rem] mt-2"><strong>ملاحظة المشرف الميداني:</strong> {log.mentor_comment}</p>
                    )}
                  </div>
                )
                : renderTrainingLogCard(log)
          ))}
        </div>
      )}
    </div>
  );
}
