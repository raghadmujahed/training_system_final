import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import {
  getTrainingLogs,
  reviewTrainingLog,
  itemsFromPagedResponse,
} from "../../services/api";
import useFieldStaffRole from "../../hooks/useFieldStaffRole";

const LOG_STATUS = {
  draft: { label: "مسودة", cls: "badge-secondary" },
  submitted: { label: "مُقدَّم", cls: "badge-info" },
  reviewed: { label: "تمت المراجعة", cls: "badge-success" },
  rejected: { label: "مرفوض", cls: "badge-danger" },
};

// ─── Field label mappings for structured form display ────────────────────
const FIELD_LABELS = {
  // التقرير المختصر الأسبوعي
  lessonsTaught: "أسماء المباحث والدروس التي نفذتها خلال هذا الأسبوع",
  worksheetsCount: "عدد أوراق العمل التي عملتها هذا الأسبوع وعناوينها",
  teachingMaterials: "أسماء أبرز الوسائل التعليمية قمت بإعدادها وتوظيفها",
  otherWorks: "أسماء أعمال أخرى أعددتها (مقاطع فيديو، نشرات، اختبارات، خطط علاجية...)",
  observedStrengths: "ما أعجبك من مشاهدتك للمعلم المرشد",
  coTeachingReflection: "انعكاس على مشاركتك في إعطاء مواقف تعليمية مع المعلم المرشد",
  selfTeachingReflection: "تقييمك الذاتي لحصة صفية كاملة نفذتها",
  studentAttendance: "التزام الطلبة بالدوام والزي المدرسي",
  studentDiscipline: "احترام الطلبة للقوانين والأنظمة ولوائح السلوك والانضباط",
  studentInteraction: "تعاون وتفاعل الطلبة معك في الحصص الصفية",
  schoolSupport: "أتاحة المدرسة الفرصة للتدريب بفاعلية والحصول على أقصى فائدة",
  professionalRelations: "علاقتك المهنية مع ذوي العلاقة في المدرسة وتقبلهم لك",
  strengthsThisWeek: "أهم جوانب القوة والنجاح التي تميزت بها هذا الأسبوع",
  areasForImprovement: "الجوانب التي تحتاج لتحسين وتطوير مستقبلاً",
  supervisorSupportNeeds: "ما الذي تريد من مشرفك أن يساعدك فيه ليتطور أداؤك",
  // التقرير الأسبوعي
  course: "المساق",
  morningAssembly: "الطابور الصباحي",
  duty: "المناوبة",
  implementedLessons: "الحصص التي نفذها (كلي – جزئي – أوراق العمل)",
  activities: "الأنشطة التي قام بها",
  meetings: "حضور الاجتماعات",
  // نقد خبرات التعلم
  plansAndObjectives: "الخطط والأهداف",
  lessonImplementation: "تنفيذ الدرس",
  introduction: "التمهيد",
  presentation: "العرض",
  closure: "الخاتمة والغلق",
  classroomManagement: "إدارة الصف",
  studentMotivation: "إثارة الدافعية عند الطلبة",
  methodsAndApproaches: "الطرائق والأساليب المتبعة",
  evaluationAndTesting: "التقييم والاختبارات ومراعاة مبادئ القياس والتقويم",
  teacherRoles: "الأدوار التي يقوم بها المعلم إضافة إلى عملية التدريس",
  // التأمل الأسبوعي
  reflection: "التأمل",
  notes: "ملاحظات",
  summary: "الملخص",
  // ملخص الزيارة الميدانية
  visitDate: "تاريخ الزيارة",
  visitPurpose: "الهدف من الزيارة",
  observations: "الملاحظات",
  recommendations: "التوصيات",
  // تقرير المهام اليومية (صفوف)
  tasksCompleted: "المهام والأعمال التي تم تنفيذها",
  goals: "الأهداف",
  skills: "المهارات المكتسبة",
  challenges: "الصعوبات والتحديات",
  effortOnChallenges: "المجهود المبذول للتغلب على الصعوبات",
  supervisorNotes: "ملاحظات المرشد التربوي",
};

// Column labels for daily_tasks_report table
const DAILY_TASK_COLUMNS = ["tasksCompleted", "goals", "skills", "challenges", "effortOnChallenges", "supervisorNotes"];

// Column labels for classes_count table
const CLASS_COUNT_COLUMNS = ["grade", "subject", "topic", "sessionsCount"];
const CLASS_COUNT_LABELS = { grade: "الصف", subject: "المقرر", topic: "الموضوع", sessionsCount: "عدد الحصص" };

/** Try to parse student_reflection as JSON; return null if not valid JSON */
function parseReflection(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Detect form type from activities_performed title */
function detectFormKey(title) {
  if (!title) return null;
  if (title.includes("المختصر")) return "weekly_brief_report";
  if (title.includes("الأسبوعي") && !title.includes("المختصر")) return "weekly_full_report";
  if (title.includes("التأمل")) return "weekly_reflection";
  if (title.includes("خبرات التعلم") || title.includes("نقد")) return "learning_experience_review";
  if (title.includes("الزيارة الميدانية")) return "field_visit_summary";
  if (title.includes("الحصص")) return "classes_count";
  if (title.includes("المهام") || title.includes("اليومية")) return "daily_tasks_report";
  return null;
}

/** Render structured form content from parsed JSON */
function StructuredFormContent({ data, formKey }) {
  if (!data || typeof data !== "object") return null;

  // Array-based forms (table layout)
  if (Array.isArray(data)) {
    if (formKey === "classes_count") {
      return (
        <div className="overflow-x-auto mt-2">
          <table className="w-full border-collapse text-[0.88rem]">
            <thead>
              <tr className="bg-[#f8f9fa]">
                {CLASS_COUNT_COLUMNS.map((col) => (
                  <th key={col} className="py-2 px-3 border border-[#dee2e6] font-semibold text-[#495057]">{CLASS_COUNT_LABELS[col]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}>
                  {CLASS_COUNT_COLUMNS.map((col) => (
                    <td key={col} className="py-2 px-3 border border-[#e9ecef] text-center">{row[col] || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    // daily_tasks_report
    return (
      <div className="overflow-x-auto mt-2">
        <table className="w-full border-collapse text-[0.88rem]">
          <thead>
            <tr className="bg-[#f8f9fa]">
              {DAILY_TASK_COLUMNS.map((col) => (
                <th key={col} className="py-2 px-3 border border-[#dee2e6] font-semibold text-[#495057] min-w-[100px]">{FIELD_LABELS[col] || col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}>
                {DAILY_TASK_COLUMNS.map((col) => (
                  <td key={col} className="py-2 px-3 border border-[#e9ecef]">{row[col] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Object-based forms (key-value layout)
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3 mt-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <span className="text-[0.8rem] font-semibold text-[#475569] mb-1">
            {FIELD_LABELS[key] || key}
          </span>
          <span className="text-[0.85rem] text-[#334155] bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0] whitespace-pre-wrap">
            {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FieldStaffDailyReports() {
  const { isFieldSupervisor, terms, label } = useFieldStaffRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);

  // Review modal
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("reviewed");
  const [supervisorNotes, setSupervisorNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getTrainingLogs({ per_page: 200 });
      setLogs(itemsFromPagedResponse(res));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل السجلات اليومية");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openReview(log) {
    setSelectedLog(log);
    setReviewStatus("reviewed");
    setSupervisorNotes(log.supervisor_notes || "");
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedLog(null);
    setSupervisorNotes("");
    setFormError("");
  }

  async function handleReview(e) {
    e.preventDefault();
    if (!selectedLog) return;
    setSaving(true);
    setFormError("");
    try {
      await reviewTrainingLog(selectedLog.id, {
        status: reviewStatus,
        supervisor_notes: supervisorNotes || null,
      });
      closeModal();
      await load();
    } catch (e) {
      setFormError(e?.response?.data?.message || "فشل مراجعة السجل");
    } finally {
      setSaving(false);
    }
  }

  function statusBadge(status) {
    const s = LOG_STATUS[status] || { label: status, cls: "badge-secondary" };
    return <span className={`badge-custom ${s.cls}`}>{s.label}</span>;
  }

  return (
    <>
      <PageHeader
        title={isFieldSupervisor ? (terms.dailyReport || "السجلات اليومية") : "السجلات اليومية"}
        subtitle={`مراجعة ${isFieldSupervisor ? (terms.dailyReport || "سجلات التدريب اليومي") : "سجلات التدريب اليومي"} المقدمة من الطلبة — يمكنك قبولها أو رفضها مع ملاحظات.`}
      />

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !logs.length ? (
        <EmptyState title="لا توجد سجلات" description="لم يقدّم الطلبة سجلات يومية بعد." />
      ) : (
        <div className="list-clean">
          {logs.map((log) => {
            const stu = log.training_assignment?.enrollment?.user;
            return (
              <div className="list-item-card" key={log.id}>
                <div className="panel-header items-center">
                  <div>
                    <h4 className="panel-title">{stu?.name || "طالب"}</h4>
                    <p className="panel-subtitle">
                      التاريخ: {log.log_date} | من {log.start_time || "—"} إلى {log.end_time || "—"}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {statusBadge(log.status)}
                    {log.status === "submitted" && (
                      <button className="btn-primary-custom btn-sm-custom" onClick={() => openReview(log)}>
                        مراجعة
                      </button>
                    )}
                  </div>
                </div>

                {log.activities_performed && (
                  <div className="mt-2">
                    <strong>نوع النموذج:</strong>{" "}
                    <span className="text-soft">{log.activities_performed}</span>
                  </div>
                )}

                {(() => {
                  const parsed = parseReflection(log.student_reflection);
                  const formKey = detectFormKey(log.activities_performed);
                  if (parsed && formKey) {
                    return (
                      <div className="mt-3">
                        <StructuredFormContent data={parsed} formKey={formKey} />
                      </div>
                    );
                  }
                  if (parsed) {
                    return (
                      <div className="mt-3">
                        <StructuredFormContent data={parsed} formKey={null} />
                      </div>
                    );
                  }
                  if (log.student_reflection) {
                    return (
                      <div className="mt-[6px]">
                        <strong>تأمل الطالب:</strong>
                        <p className="text-soft mt-1">{log.student_reflection}</p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {log.supervisor_notes && (
                  <div className="mt-[6px]">
                    <strong>ملاحظات المشرف:</strong>
                    <p className="mt-1">{log.supervisor_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {showModal && selectedLog && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-[520px]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>مراجعة السجل اليومي</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleReview}>
              <div className="modal-body">
                {formError && <p className="text-danger">{formError}</p>}

                <div className="mb-3">
                  <p><strong>الطالب:</strong> {selectedLog.training_assignment?.enrollment?.user?.name || "—"}</p>
                  <p><strong>التاريخ:</strong> {selectedLog.log_date}</p>
                  {selectedLog.activities_performed && (
                    <p><strong>نوع النموذج:</strong> {selectedLog.activities_performed}</p>
                  )}
                </div>

                {(() => {
                  const parsed = parseReflection(selectedLog.student_reflection);
                  const formKey = detectFormKey(selectedLog.activities_performed);
                  if (parsed && formKey) {
                    return <StructuredFormContent data={parsed} formKey={formKey} />;
                  }
                  if (parsed) {
                    return <StructuredFormContent data={parsed} formKey={null} />;
                  }
                  if (selectedLog.student_reflection) {
                    return (
                      <div className="mt-2">
                        <strong>تأمل الطالب:</strong>
                        <p className="text-soft mt-1">{selectedLog.student_reflection}</p>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="form-group">
                  <label className="form-label">قرار المراجعة *</label>
                  <select className="form-control-custom" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} required>
                    <option value="reviewed">قبول</option>
                    <option value="rejected">رفض</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات المشرف</label>
                  <textarea
                    className="form-control-custom"
                    rows={3}
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    placeholder="أضف ملاحظاتك على السجل..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-custom" onClick={closeModal} disabled={saving}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ المراجعة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
