import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import useAppToast from "../../hooks/useAppToast";
import {
  getTrainingLogs,
  reviewTrainingLog,
  itemsFromPagedResponse,
} from "../../services/api";
import useFieldStaffRole from "../../hooks/useFieldStaffRole";

const LOG_STATUS = {
  draft: { label: "مسودة", cls: "badge-secondary" },
  submitted: { label: "مُقدَّم", cls: "badge-info" },
  reviewed: { label: "تمت المراجعة", cls: "badge-success" },
  approved: { label: "معتمد", cls: "badge-success" },
  returned: { label: "مُعاد للطالب", cls: "badge-warning" },
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
  teachingAids: "الوسائل التي أعدها",
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

// Form meta: gradient header per form type
const FORM_META = {
  weekly_full_report:        { title: "التقرير الأسبوعي",               gradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
  weekly_brief_report:       { title: "التقرير المختصر الأسبوعي",        gradient: "linear-gradient(135deg, #fa709a, #fee140)" },
  weekly_reflection:         { title: "نموذج التأمل الأسبوعي",           gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
  learning_experience_review:{ title: "نقد خبرات التعلم",               gradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
  field_visit_summary:       { title: "ملخص الزيارة الميدانية",           gradient: "linear-gradient(135deg, #0891b2, #06b6d4)" },
  classes_count:             { title: "عدد الحصص التي درسها الطالب",     gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
  daily_tasks_report:        { title: "تقرير المهام والأعمال اليومية",   gradient: "linear-gradient(135deg, #0e7490, #06b6d4)" },
};

// Sections for weekly_brief_report
const BRIEF_SECTIONS = [
  { label: "القسم الأول: التخطيط والتحضير", color: "#fa709a", keys: ["lessonsTaught","worksheetsCount","teachingMaterials","otherWorks"] },
  { label: "القسم الثاني: العمل والإنجاز الصفي", color: "#fee140", keys: ["observedStrengths","coTeachingReflection","selfTeachingReflection"] },
  { label: "القسم الثالث: الجوانب السلوكية والمهنية", color: "#11998e", keys: ["studentAttendance","studentDiscipline","studentInteraction","schoolSupport","professionalRelations"] },
  { label: "القسم الرابع: التقييم والتأمل الذاتي", color: "#667eea", keys: ["strengthsThisWeek","areasForImprovement","supervisorSupportNeeds"] },
];

function FieldBox({ label, value }) {
  return (
    <div className="flex flex-col">
      <label className="text-[0.85rem] font-semibold text-[#495057] mb-2">{label}</label>
      <div className="w-full p-3 border-[1.5px] border-[#e0e0e0] rounded-[10px] text-[0.9rem] bg-white text-[#212529] whitespace-pre-wrap min-h-[72px]">
        {value || "—"}
      </div>
    </div>
  );
}

/** Render structured form content from parsed JSON */
function StructuredFormContent({ data, formKey }) {
  if (!data || typeof data !== "object") return null;

  const meta = FORM_META[formKey] || { title: "محتوى النموذج", gradient: "linear-gradient(135deg, #64748b, #94a3b8)" };

  // Array-based: classes_count
  if (Array.isArray(data) && formKey === "classes_count") {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-[#e8e8e8] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="py-4 px-6 text-white text-[1.05rem] font-semibold" style={{ background: meta.gradient }}>
          {meta.title}
        </div>
        <div className="bg-white p-4 overflow-x-auto">
          <table className="w-full border-collapse text-[0.88rem]">
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
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
      </div>
    );
  }

  // Array-based: daily_tasks_report
  if (Array.isArray(data)) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-[#e8e8e8] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="py-4 px-6 text-white text-[1.05rem] font-semibold" style={{ background: meta.gradient }}>
          {meta.title}
        </div>
        <div className="bg-white p-4 overflow-x-auto">
          <table className="w-full border-collapse text-[0.88rem]">
            <thead>
              <tr style={{ background: "#0e7490" }}>
                {DAILY_TASK_COLUMNS.map((col) => (
                  <th key={col} className="py-3 px-3 border border-[#0891b2] font-semibold text-white min-w-[110px]">{FIELD_LABELS[col] || col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-[#f0f9ff]" : "bg-white"}>
                  {DAILY_TASK_COLUMNS.map((col) => (
                    <td key={col} className="py-2 px-3 border border-[#bae6fd]">{row[col] || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // weekly_brief_report: sectioned layout
  if (formKey === "weekly_brief_report") {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-[#e8e8e8] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="py-4 px-6 text-white text-[1.05rem] font-semibold" style={{ background: meta.gradient }}>
          {meta.title}
        </div>
        <div className="bg-white p-6">
          {BRIEF_SECTIONS.map((sec) => {
            const sectionEntries = sec.keys.filter((k) => data[k] !== undefined && data[k] !== "");
            if (sectionEntries.length === 0) return null;
            return (
              <div key={sec.label} className="mb-6">
                <h5 className="text-[1rem] font-bold text-[#495057] mb-4 py-3 px-4 bg-[#e9ecef] rounded-lg"
                  style={{ borderRight: `4px solid ${sec.color}` }}>
                  {sec.label}
                </h5>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                  {sectionEntries.map((key) => (
                    <FieldBox key={key} label={FIELD_LABELS[key] || key} value={data[key]} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Object-based forms (generic grid)
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-[#e8e8e8] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="py-4 px-6 text-white text-[1.05rem] font-semibold" style={{ background: meta.gradient }}>
        {meta.title}
      </div>
      <div className="bg-white p-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {entries.map(([key, value]) => (
            <FieldBox key={key} label={FIELD_LABELS[key] || key} value={typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FieldStaffDailyReports() {
  const toast = useAppToast();
  const { isFieldSupervisor, terms, label } = useFieldStaffRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);

  // Review modal
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
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
    setReviewStatus("approved");
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
      const res = await reviewTrainingLog(selectedLog.id, {
        status: reviewStatus,
        supervisor_notes: supervisorNotes || null,
      });
      const updatedLog = res?.data || res;
      if (updatedLog?.id) {
        setLogs(prev => prev.map(l => l.id === updatedLog.id ? { ...l, ...updatedLog } : l));
      }
      const successMsg = reviewStatus === "approved"
        ? "تمت مراجعة السجل اليومي بنجاح"
        : "تم إرجاع السجل اليومي للطالب";
      closeModal();
      toast.success(successMsg);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || "فشل مراجعة السجل اليومي";
      setFormError(msg);
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
                      التاريخ: {log.log_date ? new Date(log.log_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {statusBadge(log.status)}
                    <button className="btn-primary-custom btn-sm-custom" onClick={() => openReview(log)}>
                      مراجعة
                    </button>
                  </div>
                </div>

                {log.activities_performed && (
                  <div className="mt-2">
                    <strong>نوع النموذج:</strong>{" "}
                    <span className="text-soft">{log.activities_performed}</span>
                  </div>
                )}

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
                  <p><strong>التاريخ:</strong> {selectedLog.log_date ? new Date(selectedLog.log_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}</p>
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
                    <option value="approved">قبول (اعتماد السجل)</option>
                    <option value="returned">إرجاع (إعادة للطالب)</option>
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
                  {saving ? "جاري الحفظ..." : reviewStatus === "approved" ? "اعتماد السجل" : "إرجاع السجل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
