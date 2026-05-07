import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addPortfolioEntry,
  apiOrigin,
  deletePortfolioEntry,
  getStudentPortfolio,
  updatePortfolioEntry,
} from "../../services/api";
import { useToast } from "../../components/Toast";
import { Loader2, Upload, FileText, Trash2, ExternalLink, Plus, FolderOpen, Calendar, FileCheck, BookOpen, ClipboardCheck, FileBarChart, FileSpreadsheet, GraduationCap, Edit3, Save as SaveIcon } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// CSS Animation
const fadeInStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin { animation: spin 1s linear infinite; }
`;

function parseCounselorPortfolioPayload(entry) {
  if (!entry?.content || typeof entry.content !== "string") return null;
  try {
    const o = JSON.parse(entry.content);
    if (o?.type === "counselor_field_evaluation" || entry.category === "counselor_field_evaluation") {
      return o;
    }
  } catch {
    return null;
  }
  return null;
}

function parseMentorClassroomVisitPayload(entry) {
  if (!entry?.content || typeof entry.content !== "string") return null;
  try {
    const o = JSON.parse(entry.content);
    if (o?.type === "mentor_classroom_visit" || entry.category === "mentor_classroom_visit") {
      return o;
    }
  } catch {
    return null;
  }
  return null;
}

function parsePsychologistInstitutionPayload(entry) {
  if (!entry?.content || typeof entry.content !== "string") return null;
  try {
    const o = JSON.parse(entry.content);
    if (o?.type === "psychologist_institution_evaluation" || entry.category === "psychologist_institution_evaluation") {
      return o;
    }
  } catch {
    return null;
  }
  return null;
}

function CounselorPortfolioReadOnly({ data }) {
  const criteria = Array.isArray(data.criteria) ? data.criteria : [];
  const scores = data.scores && typeof data.scores === "object" ? data.scores : {};
  const total = data.total_score ?? "—";
  const school = data.school_name || "—";

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "1rem",
        background: "linear-gradient(180deg, #f8fafc 0%, #fff 100%)",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
        <div>
          <span style={{ color: "#64748b" }}>المدرسة: </span>
          <strong style={{ color: "#1e293b" }}>{school}</strong>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "baseline" }}>
          <div>
            <span style={{ color: "#64748b" }}>الدرجة المرجّحة: </span>
            <strong style={{ fontSize: "1.25rem", color: "#0f172a" }}>{total}</strong>
            <span style={{ color: "#94a3b8" }}> / 100</span>
          </div>
          {data.grade_label ? (
            <div>
              <span style={{ color: "#64748b" }}>التقدير: </span>
              <strong>{data.grade_label}</strong>
            </div>
          ) : null}
          {data.supervisor_name ? (
            <div>
              <span style={{ color: "#64748b" }}>المرشد/المدرب: </span>
              <strong>{data.supervisor_name}</strong>
            </div>
          ) : null}
          {data.evaluation_date ? (
            <div>
              <span style={{ color: "#64748b" }}>التاريخ: </span>
              <strong>{data.evaluation_date}</strong>
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ padding: "8px", textAlign: "center", width: 44 }}>#</th>
              <th style={{ padding: "8px", textAlign: "right" }}>المؤشر</th>
              <th style={{ padding: "8px", textAlign: "center", width: 72 }}>1–5</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, idx) => (
              <tr key={c.id || idx} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "#334155" }}>{c.label}</td>
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 700 }}>{scores[c.id] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.general_notes ? (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#334155" }}>ملاحظات ومقترحات</div>
          <div style={{ color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{data.general_notes}</div>
        </div>
      ) : null}
    </div>
  );
}

function MentorClassroomVisitPortfolioReadOnly({ data }) {
  const criteria = Array.isArray(data.criteria) ? data.criteria : [];
  const scores = data.scores && typeof data.scores === "object" ? data.scores : {};
  const fc = data.form_context && typeof data.form_context === "object" ? data.form_context : {};
  const school = data.school_name || "—";

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "1rem",
        background: "linear-gradient(180deg, #f0f9ff 0%, #fff 100%)",
        borderRadius: "12px",
        border: "1px solid #bae6fd",
      }}
    >
      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0369a1", marginBottom: "0.35rem" }}>
        نموذج رقم (6) — تقرير زيارة صفية
      </div>
      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.88rem" }}>
        <div>
          <span style={{ color: "#64748b" }}>المدرسة: </span>
          <strong style={{ color: "#0c4a6e" }}>{school}</strong>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {data.student_name ? (
            <div>
              <span style={{ color: "#64748b" }}>الطالب: </span>
              <strong>{data.student_name}</strong>
            </div>
          ) : null}
          {fc.university_name ? (
            <div>
              <span style={{ color: "#64748b" }}>الجامعة: </span>
              <strong>{fc.university_name}</strong>
            </div>
          ) : null}
          {fc.academic_year ? (
            <div>
              <span style={{ color: "#64748b" }}>العام الدراسي: </span>
              <strong>{fc.academic_year}</strong>
            </div>
          ) : null}
          {fc.semester ? (
            <div>
              <span style={{ color: "#64748b" }}>الفصل: </span>
              <strong>{fc.semester}</strong>
            </div>
          ) : null}
          {data.supervisor_name ? (
            <div>
              <span style={{ color: "#64748b" }}>المعلم المقيم: </span>
              <strong>{data.supervisor_name}</strong>
            </div>
          ) : null}
          {data.evaluation_date ? (
            <div>
              <span style={{ color: "#64748b" }}>التاريخ: </span>
              <strong>{data.evaluation_date}</strong>
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ background: "#e0f2fe" }}>
              <th style={{ padding: "8px", textAlign: "right", width: "24%" }}>المحور</th>
              <th style={{ padding: "8px", textAlign: "right" }}>الأمور الإيجابية</th>
              <th style={{ padding: "8px", textAlign: "right" }}>الأمور التي بحاجة إلى تطوير</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, idx) => {
              const row = scores[c.id] || {};
              return (
                <tr key={c.id || idx} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px", fontWeight: 700, color: "#0f172a", background: "#f8fafc" }}>{c.label}</td>
                  <td style={{ padding: "8px", color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                    {row.positive || "—"}
                  </td>
                  <td style={{ padding: "8px", color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                    {row.development || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.general_notes ? (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#fff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#334155" }}>ملاحظات عامة</div>
          <div style={{ color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{data.general_notes}</div>
        </div>
      ) : null}
    </div>
  );
}

function PsychologistInstitutionPortfolioReadOnly({ data }) {
  const criteria = Array.isArray(data.criteria) ? data.criteria : [];
  const scores = data.scores && typeof data.scores === "object" ? data.scores : {};
  const total = data.total_score ?? "—";
  const institution = data.institution_name || "—";

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "1rem",
        background: "linear-gradient(180deg, #faf5ff 0%, #fff 100%)",
        borderRadius: "12px",
        border: "1px solid #e9d5ff",
      }}
    >
      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#6b21a8", marginBottom: "0.35rem" }}>
        تقييم مشرف المؤسسة — تدريب نفسي/مؤسسي
      </div>
      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.88rem" }}>
        <div>
          <span style={{ color: "#64748b" }}>المؤسسة: </span>
          <strong style={{ color: "#4c1d95" }}>{institution}</strong>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ color: "#64748b" }}>الدرجة المرجّحة: </span>
            <strong style={{ fontSize: "1.15rem" }}>{total}</strong>
            <span style={{ color: "#94a3b8" }}> / 100</span>
          </div>
          {data.grade_label ? (
            <div>
              <span style={{ color: "#64748b" }}>التقدير: </span>
              <strong>{data.grade_label}</strong>
            </div>
          ) : null}
          {data.supervisor_name ? (
            <div>
              <span style={{ color: "#64748b" }}>مشرف التدريب: </span>
              <strong>{data.supervisor_name}</strong>
            </div>
          ) : null}
          {data.evaluation_date ? (
            <div>
              <span style={{ color: "#64748b" }}>التاريخ: </span>
              <strong>{data.evaluation_date}</strong>
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ background: "#f3e8ff" }}>
              <th style={{ padding: "8px", textAlign: "center", width: 40 }}>#</th>
              <th style={{ padding: "8px", textAlign: "right" }}>معيار التقويم</th>
              <th style={{ padding: "8px", textAlign: "center", width: 56 }}>1–5</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, idx) => (
              <tr key={c.id || idx} style={{ borderTop: "1px solid #e9d5ff" }}>
                <td style={{ padding: "8px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "#334155" }}>{c.label}</td>
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 700 }}>{scores[c.id] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.areas_for_improvement ? (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fff", borderRadius: "8px", border: "1px solid #fde68a" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#92400e" }}>جوانب الضعف وتحسينها (أمثلة)</div>
          <div style={{ color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{data.areas_for_improvement}</div>
        </div>
      ) : null}
      {data.strengths ? (
        <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#fff", borderRadius: "8px", border: "1px solid #c4b5fd" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#5b21b6" }}>الإجراءات المقترحة للتطوير</div>
          <div style={{ color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{data.strengths}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function Portfolio() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [removingFileId, setRemovingFileId] = useState(null);
  const [replacingFileId, setReplacingFileId] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStudentPortfolio();
      const data = res.data?.data || res.data;
            setEntries(data.entries || []);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل ملف الإنجاز.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fileHref = (path) => {
    if (!path) return null;
    const s = String(path);
    if (s.startsWith("http")) return s;
    // Reject timestamps or non-file values (e.g. "2026-05-07 20:24:59")
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
    return `${apiOrigin}/storage/${s.replace(/^\//, "")}`;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("أدخل عنوانًا للمدخل.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.content.trim()) fd.append("content", form.content.trim());
      if (file) fd.append("file", file);
      await addPortfolioEntry(fd);
      setSuccess("تمت إضافة المدخل بنجاح!");
      addToast("تمت إضافة المدخل بنجاح!", "success");
      setForm({ title: "", content: "" });
      setFile(null);
      await load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e2) {
      const errMsg = e2?.response?.data?.errors
          ? Object.values(e2.response.data.errors).flat().join(" | ")
          : e2?.response?.data?.message || "فشل الحفظ.";
      setError(errMsg);
      addToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المدخل؟")) return;
    setError("");
    try {
      await deletePortfolioEntry(id);
      setSuccess("تم الحذف بنجاح.");
      addToast("تم حذف المدخل بنجاح", "success");
      await load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل الحذف.");
      addToast(e?.response?.data?.message || "فشل الحذف.", "error");
    }
  };

  const handleRemoveFile = async (entryId) => {
    if (!window.confirm("هل أنت متأكد من إزالة الملف؟ يمكنك رفع ملف آخر بدلاً منه.")) return;
    setRemovingFileId(entryId);
    setError("");
    try {
      await updatePortfolioEntry(entryId, { file_path: null });
      setSuccess("تم إزالة الملف بنجاح. يمكنك الآن رفع ملف جديد.");
      addToast("تم إزالة الملف بنجاح", "success");
      await load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل إزالة الملف.");
      addToast(e?.response?.data?.message || "فشل إزالة الملف.", "error");
    } finally {
      setRemovingFileId(null);
    }
  };

  const handleReplaceFile = async (entryId) => {
    if (!replacementFile) {
      setError("الرجاء اختيار ملف جديد أولاً.");
      return;
    }
    
    setReplacingFileId(entryId);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", replacementFile);
      
      await updatePortfolioEntry(entryId, fd);
      setSuccess("تم استبدال الملف بنجاح.");
      addToast("تم استبدال الملف بنجاح", "success");
      setReplacingFileId(null);
      setReplacementFile(null);
      await load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل استبدال الملف.");
      addToast(e?.response?.data?.message || "فشل استبدال الملف.", "error");
    } finally {
      setReplacingFileId(null);
    }
  };

  const startEdit = (en) => {
    if (
      parseCounselorPortfolioPayload(en) ||
      parseMentorClassroomVisitPayload(en) ||
      parsePsychologistInstitutionPayload(en)
    ) {
      return;
    }
    // Determine the form key from the title
    const title = (en.title || "").toString();
    let formKey = null;
    if (title.includes("جدول الحصص الأسبوعية") || title.includes("برنامج التدريب") || title.includes("برنامج تدريب")) {
      navigate("/student/schedule", { state: { editEntry: { id: en.id, title: en.title, content: en.content } } });
      return;
    }
    if (title.includes("حضور") || title.includes("غياب")) {
      navigate("/student/attendance", { state: { editEntry: { id: en.id, title: en.title, content: en.content } } });
      return;
    }
    if (title.includes("نقد خبرات") || title.includes("خبرات التعلم")) formKey = "learning_experience_review";
    else if (title.includes("تقرير مختصر") || title.includes("المختصر")) formKey = "weekly_brief_report";
    else if (title.includes("تقرير الأسبوعي") || title.includes("الأسبوعي")) formKey = "weekly_full_report";
    else if (title.includes("حصص")) formKey = "classes_count";
    else if (title.includes("المهام والأعمال اليومية") || title.includes("مهام") && title.includes("يومي")) formKey = "daily_tasks_report";

    if (formKey) {
      navigate("/student/e-forms", { state: { editEntry: { id: en.id, formKey, title: en.title, content: en.content } } });
    } else {
      // Generic entry — use inline editing
      setEditingId(en.id);
      setEditTitle(en.title || "");
      setEditContent(en.content || "");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleEditUpdate = async (id) => {
    if (!editTitle.trim()) {
      setError("أدخل عنوانًا للمدخل.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updatePortfolioEntry(id, { title: editTitle.trim(), content: editContent.trim() });
      setSuccess("تم تعديل المدخل بنجاح!");
      addToast("تم تعديل المدخل بنجاح!", "success");
      cancelEdit();
      await load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل التعديل.");
      addToast(e?.response?.data?.message || "فشل التعديل.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const getEntryStyle = (entry) => {
    const t = (entry?.title || "").toString();
    if (entry?.category === "counselor_field_evaluation" || t.includes("نموذج تقييم المرشد")) {
      return { icon: FileCheck, color: "#0d9488", gradient: "linear-gradient(135deg, #0d9488, #14b8a6)", bg: "#f0fdfa" };
    }
    if (entry?.category === "mentor_classroom_visit" || t.includes("نموذج 6") || t.includes("زيارة صفية")) {
      return { icon: FileCheck, color: "#0369a1", gradient: "linear-gradient(135deg, #0369a1, #0284c7)", bg: "#f0f9ff" };
    }
    if (entry?.category === "psychologist_institution_evaluation" || t.includes("مشرف المؤسسة")) {
      return { icon: FileCheck, color: "#7c3aed", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)", bg: "#faf5ff" };
    }
    if (t.includes('جدول الحصص الأسبوعية') || t.includes('برنامج التدريب')) return { icon: Calendar, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', bg: '#f5f3ff' };
    if (t.includes('حضور') || t.includes('غياب')) return { icon: ClipboardCheck, color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', bg: '#ecfeff' };
    if (t.includes('نقد خبرات') || t.includes('خبرات التعلم')) return { icon: BookOpen, color: '#059669', gradient: 'linear-gradient(135deg, #059669, #34d399)', bg: '#ecfdf5' };
    if (t.includes('تقرير مختصر') || t.includes('المختصر')) return { icon: FileBarChart, color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)', bg: '#fffbeb' };
    if (t.includes('تقرير الأسبوعي') || t.includes('الأسبوعي')) return { icon: FileSpreadsheet, color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', bg: '#fff1f2' };
    if (t.includes('حصص')) return { icon: GraduationCap, color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)', bg: '#f5f3ff' };
    if (t.includes('زيارة') || t.includes('ميدان')) return { icon: FileCheck, color: '#0284c7', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)', bg: '#f0f9ff' };
    return { icon: FolderOpen, color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)', bg: '#f9fafb' };
  };

  return (
    <>
      <style>{fadeInStyles}</style>
      <div className="content-header">
        <h1 className="page-title">ملف الإنجاز</h1>
        <p className="page-subtitle">إرفاق شواهد وأعمال تتعلق بتدريبك الميداني</p>
      </div>

      {success ? (
        <div className="alert-custom alert-success mb-3" style={{ animation: "fadeIn 0.3s ease" }}>{success}</div>
      ) : null}
      {error ? (
        <div className="alert-custom alert-danger mb-3" style={{ animation: "fadeIn 0.3s ease" }}>{error}</div>
      ) : null}

      <div style={{
        backgroundColor: "white",
        borderRadius: "0 0 16px 16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        padding: "2rem",
        border: "1px solid #e8e8e8",
        marginBottom: "2rem",
        animation: "fadeIn 0.4s ease-out"
      }}>
        <form onSubmit={handleAdd}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            marginBottom: "1.5rem"
          }}>
            {/* Title Field */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#495057",
                marginBottom: "0.5rem"
              }}>
                عنوان المدخل *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="مثال: تقرير تدريس الصف الرابع..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  backgroundColor: "white",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary, #007bff)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* File Upload */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#495057",
                marginBottom: "0.5rem"
              }}>
                مرفق (PDF / صور / Word)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: dragActive ? "2px dashed var(--primary, #007bff)" : "2px dashed #ccc",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  backgroundColor: dragActive ? "rgba(0,123,255,0.05)" : "white",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}
              >
                <Upload size={20} color={dragActive ? "var(--primary, #007bff)" : "#666"} />
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ flex: 1, border: "none", background: "transparent", fontSize: "0.9rem" }}
                />
              </div>
              {file && (
                <div style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#e8f5e9",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "#2e7d32",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <FileText size={16} />
                  تم اختيار: {file.name}
                </div>
              )}
            </div>
          </div>

          {/* Description Field */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#495057",
              marginBottom: "0.5rem",
              display: "block"
            }}>
              وصف أو ملاحظات
            </label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="اكتب وصفًا تفصيليًا للعمل أو المرفق..."
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e0e0e0",
                borderRadius: "10px",
                fontSize: "1rem",
                resize: "vertical",
                transition: "all 0.2s",
                backgroundColor: "white",
                fontFamily: "inherit"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary, #007bff)";
                e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e0e0e0";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Submit Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.875rem 2rem",
                backgroundColor: "var(--primary, #007bff)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                opacity: saving ? 0.6 : 1,
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(0,123,255,0.3)"
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = "#0056b3";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary, #007bff)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,123,255,0.3)";
              }}
            >
              {saving ? <LoadingSpinner size="button" /> : <Plus size={20} />}
              {saving ? "جاري الحفظ..." : "إضافة مدخل"}
            </button>
          </div>
        </form>
      </div>

      {/* Entries Section */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        padding: "1.5rem",
        border: "1px solid #e8e8e8",
        animation: "fadeIn 0.4s ease-out"
      }}>
        <h4 style={{
          margin: 0,
          fontSize: "1.2rem",
          fontWeight: 700,
          color: "#495057",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <FolderOpen size={22} color="var(--primary, #007bff)" />
          مدخلاتك ({entries.length})
        </h4>

        {loading ? (
          <LoadingSpinner size="section" text="جاري التحميل..." />
        ) : entries.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "3rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            border: "2px dashed #dee2e6"
          }}>
            <FolderOpen size={60} color="#adb5bd" style={{ marginBottom: "1rem" }} />
            <h5 style={{ color: "#495057", margin: "0 0 0.5rem 0" }}>لا توجد مدخلات بعد</h5>
            <p style={{ color: "#6c757d", margin: 0 }}>ابدأ بإضافة أول عمل أو شاهد لتوثيق تدريبك</p>
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}>
            {entries.map((en) => {
              const counselorPayload = parseCounselorPortfolioPayload(en);
              const mentorVisitPayload = parseMentorClassroomVisitPayload(en);
              const psychInstitutionPayload = parsePsychologistInstitutionPayload(en);
              const style = getEntryStyle(en);
              const EntryIcon = style.icon;
              return (
                <div
                  key={en.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "14px",
                    border: "1px solid #e9ecef",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = `0 10px 24px ${style.color}20`;
                    e.currentTarget.style.borderColor = `${style.color}55`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                    e.currentTarget.style.borderColor = "#e9ecef";
                  }}
                >
                  {/* شريط لوني علوي */}
                  <div style={{ height: "4px", background: style.gradient }} />

                  <div style={{ padding: "1.1rem 1.25rem" }}>
                    {editingId === en.id ? (
                      /* وضع التعديل */
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{
                            width: "36px", height: "36px", borderRadius: "9px",
                            background: style.gradient, display: "flex", alignItems: "center",
                            justifyContent: "center", flexShrink: 0,
                          }}>
                            <Edit3 size={16} color="white" />
                          </div>
                          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>تعديل المدخل</span>
                        </div>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          style={{
                            width: "100%", padding: "10px 14px", border: "1.5px solid #d1d5db",
                            borderRadius: 8, fontSize: "0.9rem", fontWeight: 600,
                          }}
                          placeholder="عنوان المدخل"
                        />
                        <textarea
                          rows={4}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          style={{
                            width: "100%", padding: "10px 14px", border: "1.5px solid #d1d5db",
                            borderRadius: 8, fontSize: "0.85rem", resize: "vertical",
                          }}
                          placeholder="المحتوى أو الوصف..."
                        />
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={cancelEdit}
                            style={{
                              padding: "8px 18px", border: "1px solid #e2e8f0", borderRadius: 8,
                              background: "white", color: "#64748b", fontSize: "0.85rem",
                              fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleEditUpdate(en.id)}
                            disabled={saving}
                            style={{
                              padding: "8px 18px", border: "none", borderRadius: 8,
                              background: saving ? "#9ca3af" : style.color, color: "white",
                              fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", gap: 6,
                            }}
                          >
                            {saving ? <LoadingSpinner size="button" /> : <SaveIcon size={14} />}
                            {saving ? "جاري الحفظ..." : "حفظ التعديل"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* وضع العرض */
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}>
                        {/* أيقونة النموذج */}
                        <div style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "11px",
                          background: style.gradient,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: `0 3px 10px ${style.color}30`,
                        }}>
                          <EntryIcon size={20} color="white" />
                        </div>

                        {/* اسم النموذج + التاريخ */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{
                            margin: 0,
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: "#1e293b",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {en.title}
                          </h5>
                          <span style={{
                            fontSize: "0.72rem",
                            color: "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            marginTop: "0.15rem",
                          }}>
                            <Calendar size={11} />
                            {en.created_at ? new Date(en.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                          </span>
                        </div>

                        {/* أزرار المرفق والتعديل والحذف */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                          {en.file_path ? (
                            <a
                              href={fileHref(en.file_path)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                color: style.color,
                                textDecoration: "none",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                padding: "0.35rem 0.7rem",
                                borderRadius: "8px",
                                backgroundColor: style.bg,
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${style.color}18`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = style.bg;
                              }}
                            >
                              <FileText size={14} />
                              عرض الملف
                            </a>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <span style={{
                                color: "#cbd5e1",
                                fontSize: "0.78rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.35rem 0.5rem",
                              }}>
                                <FileText size={14} />
                                بدون مرفق
                              </span>
                              <button
                                type="button"
                                onClick={() => setReplacingFileId(en.id)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  color: "#28a745",
                                  backgroundColor: "#fff",
                                  border: "1px solid #28a745",
                                  textDecoration: "none",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  padding: "0.35rem 0.7rem",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#28a745";
                                  e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#fff";
                                  e.currentTarget.style.color = "#28a745";
                                }}
                                title="رفع ملف جديد"
                              >
                                <Upload size={12} />
                                رفع ملف
                              </button>
                            </div>
                          )}
                          {!counselorPayload && !mentorVisitPayload && !psychInstitutionPayload ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(en)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#94a3b8",
                                  padding: "4px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#3b82f6";
                                  e.currentTarget.style.backgroundColor = "#eff6ff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#94a3b8";
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }}
                                title="تعديل"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(en.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#cbd5e1",
                                  padding: "4px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#ef4444";
                                  e.currentTarget.style.backgroundColor = "#fef2f2";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#cbd5e1";
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }}
                                title="حذف"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8", padding: "4px 8px" }}>وثيقة رسمية</span>
                          )}
                        </div>
                      </div>
                    )}

                    {counselorPayload && editingId !== en.id ? <CounselorPortfolioReadOnly data={counselorPayload} /> : null}
                    {mentorVisitPayload && editingId !== en.id ? (
                      <MentorClassroomVisitPortfolioReadOnly data={mentorVisitPayload} />
                    ) : null}
                    {psychInstitutionPayload && editingId !== en.id ? (
                      <PsychologistInstitutionPortfolioReadOnly data={psychInstitutionPayload} />
                    ) : null}

                    {/* نموذج استبدال الملف */}
                    {replacingFileId === en.id && (
                      <div style={{
                        marginTop: "0.75rem",
                        padding: "0.75rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0"
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color: "#166534"
                        }}>
                          <Upload size={14} />
                          استبدال الملف
                        </div>
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem"
                        }}>
                          <input
                            type="file"
                            onChange={(e) => setReplacementFile(e.target.files[0])}
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "0.85rem"
                            }}
                          />
                          {replacementFile && (
                            <div style={{
                              fontSize: "0.75rem",
                              color: "#6b7280",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.25rem",
                              padding: "6px 8px",
                              backgroundColor: "#f9fafb",
                              borderRadius: "6px",
                              border: "1px solid #e5e7eb"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <FileText size={12} />
                                {replacementFile.name} ({(replacementFile.size / 1024).toFixed(1)} KB)
                              </div>
                              <button
                                type="button"
                                onClick={() => setReplacementFile(null)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  backgroundColor: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#dc2626";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#ef4444";
                                }}
                                title="إلغاء اختيار الملف"
                              >
                                ×
                              </button>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              type="button"
                              onClick={() => handleReplaceFile(en.id)}
                              disabled={!replacementFile || replacingFileId === en.id}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                borderRadius: "6px",
                                backgroundColor: !replacementFile || replacingFileId === en.id ? "#9ca3af" : "#28a745",
                                color: "white",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: !replacementFile || replacingFileId === en.id ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}
                            >
                              {replacingFileId === en.id ? (
                                <>
                                  <LoadingSpinner size="button" />
                                  جارٍ الاستبدال...
                                </>
                              ) : (
                                <>
                                  <Upload size={12} />
                                  استبدال الملف
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReplacingFileId(null);
                                setReplacementFile(null);
                              }}
                              style={{
                                padding: "6px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                backgroundColor: "white",
                                color: "#6b7280",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* عرض ملاحظات وتقييم المشرف الأكاديمي */}
                    {(en.reviewer_note || en.academic_rating) && (
                      <>
                        <div style={{
                        marginTop: "0.75rem",
                        padding: "0.75rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0"
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color: "#166534"
                        }}>
                          🎓 ملاحظة المشرف الأكاديمي
                        </div>
                        {en.academic_rating != null && en.academic_rating !== "" && (
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#166534", marginBottom: "0.5rem" }}>
                            التقييم: {en.academic_rating} / 5
                          </div>
                        )}
                        {en.reviewer_note && (
                        <div style={{
                          fontSize: "0.9rem",
                          color: "#374151",
                          lineHeight: "1.5"
                        }}>
                          {en.reviewer_note}
                        </div>
                        )}
                        {en.reviewed_at && (
                          <div style={{
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            marginTop: "0.5rem"
                          }}>
                            {new Date(en.reviewed_at).toLocaleDateString('ar-SA', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
