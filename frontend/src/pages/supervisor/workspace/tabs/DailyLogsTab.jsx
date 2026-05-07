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
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          borderRadius: "16px 16px 0 0",
          padding: "1.5rem 2rem",
          color: "white"
        }}>
          <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>{formKeyLabels[log.form_key] || log.title}</h4>
          <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
            تقرير الطالب الأسبوعي عن الأنشطة والمهام المنفذة
          </p>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "0 0 16px 16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          padding: "1.5rem",
          border: "1px solid #e8e8e8",
          borderTop: "none"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "1.25rem"
          }}>
            {fields.map((field) => {
              const value = payload[field.key];
              if (!value || !String(value).trim()) return null;
              return (
                <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                  <label style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#495057",
                    marginBottom: "0.5rem"
                  }}>
                    {field.label}
                  </label>
                  <div style={{
                    width: "100%",
                    padding: "12px",
                    border: "1.5px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "0.9rem",
                    backgroundColor: "#f8f9fa",
                    minHeight: "80px",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    color: "#333"
                  }}>
                    {value}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e9ecef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#666" }}>
              تاريخ التقديم: {log.submitted_at || log.date}
            </span>
            <button
              onClick={() => setViewingEform(null)}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
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
  if (error) return <div style={{ color: "#dc3545", padding: "20px" }}>⚠️ {error}</div>;

  return (
    <div>
      {/* Quick Review Mode */}
      {logs.filter((l) => l.status === "pending_review" || l.status === "new").length > 0 && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffc107", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "#856404", fontWeight: "600" }}>
            📝 {logs.filter((l) => l.status === "pending_review" || l.status === "new").length} سجل بانتظار المراجعة
          </span>
        </div>
      )}

      {/* E-Form Detail Modal */}
      {viewingEform && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          overflow: "auto"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "900px",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            {renderFullFormView(viewingEform)}
          </div>
        </div>
      )}

      {!filtered.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          لا توجد سجلات يومية
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                style={{
                  background: "#fff",
                  border: "1px solid #e9ecef",
                  borderRadius: "10px",
                  padding: "16px",
                  borderRight: `4px solid ${isEform ? src.color : sc.color}`,
                }}
              >
                {/* Card header - hidden for e-forms */}
                {!isEform && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h5 style={{ margin: "0 0 4px", fontSize: "1rem" }}>
                        {log.description || log.title || `سجل يوم ${log.date}`}
                      </h5>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.82rem", color: "#666" }}>{log.date || "—"}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "600", color: src.color, backgroundColor: src.color + "18" }}>
                        {src.icon} {src.label}
                      </span>
                      <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "0.78rem", fontWeight: "600", color: sc.color, backgroundColor: sc.bg }}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Show status badge for e-forms in corner */}
                {isEform && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "0.78rem", fontWeight: "600", color: sc.color, backgroundColor: sc.bg }}>
                      {sc.label}
                    </span>
                  </div>
                )}

                {contentParts.length > 0 && !isEform && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>📄 محتوى التقرير:</div>
                    {contentParts.map(({ key, value }) => (
                      <div key={key} style={{ marginBottom: "6px", fontSize: "0.85rem", lineHeight: 1.6 }}>
                        {key && <span style={{ fontWeight: 600, color: "#334155" }}>{payloadFieldLabels[key] || key}: </span>}
                        <span style={{ color: "#444" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {log.mentor_comment && (
                  <div style={{ background: "#f0f7ff", borderRadius: "6px", padding: "10px", marginBottom: "12px", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: "600", color: "#0d6efd" }}>👨‍🏫 ملاحظة المشرف الميداني:</span>
                    <span style={{ color: "#444", marginRight: "8px" }}>{log.mentor_comment}</span>
                  </div>
                )}

                {log.attachment_path && (
                  <div style={{ fontSize: "0.82rem", color: "#666", marginBottom: "12px" }}>
                    📎 مرفق: {log.attachment_path}
                  </div>
                )}

                {/* E-Form Summary Card with View Button */}
                {isEform ? (
                  <div style={{
                    backgroundColor: "#fff5f7",
                    border: "1px solid #ffcdd2",
                    borderRadius: "12px",
                    padding: "16px",
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "1.5rem"
                    }}>
                      📋
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#333" }}>
                        {formKeyLabels[log.form_key] || log.title}
                      </h4>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#666" }}>
                        📅 {log.date} • 📝 نموذج إلكتروني مُقدم
                      </p>
                    </div>
                    <button
                      onClick={() => setViewingEform(log)}
                      style={{
                        padding: "10px 20px",
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      👁️ عرض النموذج
                    </button>
                  </div>
                ) : log.source === "daily_report" ? (
                  <div style={{ background: "#e8f5e9", borderRadius: "6px", padding: "8px 12px", fontSize: "0.82rem", color: "#2e7d32" }}>
                    هذا تقرير يومي راجعه المشرف الميداني ويظهر هنا للاطلاع الأكاديمي.
                  </div>
                ) : commentingLogId === log.id ? (
                  <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "12px" }}>
                    <textarea
                      id="daily-log-comment"
                      name="supervisor_comment"
                      className="form-textarea-custom"
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="أضف ملاحظتك الأكاديمية..."
                    />
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button className="btn-primary-custom" style={{ fontSize: "0.82rem", padding: "6px 14px" }} onClick={() => handleAddComment(log.id)}>
                        ✅ اعتماد مع ملاحظة
                      </button>
                      <button style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #fd7e14", background: "#fff", color: "#fd7e14", cursor: "pointer" }} onClick={() => handleSendNote(log.id)}>
                        📤 إرسال للطالب (يحتاج تعديل)
                      </button>
                      <button style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #999", background: "#fff", color: "#666", cursor: "pointer" }} onClick={() => { setCommentingLogId(null); setCommentText(""); }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {log.supervisor_comment ? (
                      <div style={{ background: "#e8f5e9", borderRadius: "6px", padding: "8px 12px", fontSize: "0.85rem", flex: 1 }}>
                        <span style={{ fontWeight: "600", color: "#28a745" }}>🎓 ملاحظتك:</span>
                        <span style={{ color: "#444", marginRight: "8px" }}>{log.supervisor_comment}</span>
                      </div>
                    ) : null}
                    <button
                      style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #4361ee", background: "#fff", color: "#4361ee", cursor: "pointer" }}
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
