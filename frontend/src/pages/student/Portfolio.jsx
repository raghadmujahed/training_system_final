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
    <div className="mt-4 p-4 bg-gradient-to-b from-[#f8fafc] to-white rounded-xl border border-[#e2e8f0]">
      <div className="grid gap-3 mb-4 text-[0.9rem]">
        <div>
          <span className="text-[#64748b]">المدرسة: </span>
          <strong className="text-[#1e293b]">{school}</strong>
        </div>
        <div className="flex flex-wrap gap-5 items-baseline">
          <div>
            <span className="text-[#64748b]">الدرجة المرجّحة: </span>
            <strong className="text-[1.25rem] text-[#0f172a]">{total}</strong>
            <span className="text-[#94a3b8]"> / 100</span>
          </div>
          {data.grade_label ? (
            <div><span className="text-[#64748b]">التقدير: </span><strong>{data.grade_label}</strong></div>
          ) : null}
          {data.supervisor_name ? (
            <div><span className="text-[#64748b]">المرشد/المدرب: </span><strong>{data.supervisor_name}</strong></div>
          ) : null}
          {data.evaluation_date ? (
            <div><span className="text-[#64748b]">التاريخ: </span><strong>{data.evaluation_date}</strong></div>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.82rem]">
          <thead>
            <tr className="bg-[#f1f5f9]">
              <th className="p-2 text-center w-[44px]">#</th>
              <th className="p-2 text-right">المؤشر</th>
              <th className="p-2 text-center w-[72px]">1–5</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, idx) => (
              <tr key={c.id || idx} className="border-t border-[#e2e8f0]">
                <td className="p-2 text-center text-[#64748b]">{idx + 1}</td>
                <td className="p-2 text-right text-[#334155]">{c.label}</td>
                <td className="p-2 text-center font-bold">{scores[c.id] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.general_notes ? (
        <div className="mt-4 p-3 bg-white rounded-lg border border-[#e2e8f0]">
          <div className="font-bold mb-[0.35rem] text-[#334155]">ملاحظات ومقترحات</div>
          <div className="text-[#475569] leading-[1.6] whitespace-pre-wrap">{data.general_notes}</div>
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
    <div className="mt-4 p-4 bg-gradient-to-b from-[#f0f9ff] to-white rounded-xl border border-[#bae6fd]">
      <div className="text-[0.78rem] font-extrabold text-[#0369a1] mb-[0.35rem]">نموذج رقم (6) — تقرير زيارة صفية</div>
      <div className="grid gap-2 mb-4 text-[0.88rem]">
        <div><span className="text-[#64748b]">المدرسة: </span><strong className="text-[#0c4a6e]">{school}</strong></div>
        <div className="flex flex-wrap gap-4">
          {data.student_name ? <div><span className="text-[#64748b]">الطالب: </span><strong>{data.student_name}</strong></div> : null}
          {fc.university_name ? <div><span className="text-[#64748b]">الجامعة: </span><strong>{fc.university_name}</strong></div> : null}
          {fc.academic_year ? <div><span className="text-[#64748b]">العام الدراسي: </span><strong>{fc.academic_year}</strong></div> : null}
          {fc.semester ? <div><span className="text-[#64748b]">الفصل: </span><strong>{fc.semester}</strong></div> : null}
          {data.supervisor_name ? <div><span className="text-[#64748b]">المعلم المقيم: </span><strong>{data.supervisor_name}</strong></div> : null}
          {data.evaluation_date ? <div><span className="text-[#64748b]">التاريخ: </span><strong>{data.evaluation_date}</strong></div> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8rem]">
          <thead>
            <tr className="bg-[#e0f2fe]">
              <th className="p-2 text-right w-[24%]">المحور</th>
              <th className="p-2 text-right">الأمور الإيجابية</th>
              <th className="p-2 text-right">الأمور التي بحاجة إلى تطوير</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, idx) => {
              const row = scores[c.id] || {};
              return (
                <tr key={c.id || idx} className="border-t border-[#e2e8f0]">
                  <td className="p-2 font-bold text-[#0f172a] bg-[#f8fafc]">{c.label}</td>
                  <td className="p-2 text-[#334155] whitespace-pre-wrap leading-[1.55]">{row.positive || "—"}</td>
                  <td className="p-2 text-[#334155] whitespace-pre-wrap leading-[1.55]">{row.development || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.general_notes ? (
        <div className="mt-4 p-3 bg-white rounded-lg border border-[#e2e8f0]">
          <div className="font-bold mb-[0.35rem] text-[#334155]">ملاحظات عامة</div>
          <div className="text-[#475569] leading-[1.6] whitespace-pre-wrap">{data.general_notes}</div>
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
    <div className="mt-4 p-4 bg-gradient-to-b from-[#faf5ff] to-white rounded-xl border border-[#e9d5ff]">
      <div className="text-[0.78rem] font-extrabold text-[#6b21a8] mb-[0.35rem]">
        تقييم مشرف المؤسسة — تدريب نفسي/مؤسسي
      </div>
      <div className="grid gap-2 mb-4 text-[0.88rem]">
        <div><span className="text-[#64748b]">المؤسسة: </span><strong className="text-[#4c1d95]">{institution}</strong></div>
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="text-[#64748b]">الدرجة المرجّحة: </span>
            <strong className="text-[1.15rem]">{total}</strong>
            <span className="text-[#94a3b8]"> / 100</span>
          </div>
          {data.grade_label ? <div><span className="text-[#64748b]">التقدير: </span><strong>{data.grade_label}</strong></div> : null}
          {data.supervisor_name ? <div><span className="text-[#64748b]">مشرف التدريب: </span><strong>{data.supervisor_name}</strong></div> : null}
          {data.evaluation_date ? <div><span className="text-[#64748b]">التاريخ: </span><strong>{data.evaluation_date}</strong></div> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8rem]">
          <thead>
            <tr className="bg-[#f3e8ff]">
              <th className="p-2 text-center w-[40px]">#</th>
              <th className="p-2 text-right">معيار التقويم</th>
              <th className="p-2 text-center w-[56px]">1–5</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, idx) => (
              <tr key={c.id || idx} className="border-t border-[#e9d5ff]">
                <td className="p-2 text-center text-[#64748b]">{idx + 1}</td>
                <td className="p-2 text-right text-[#334155]">{c.label}</td>
                <td className="p-2 text-center font-bold">{scores[c.id] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.areas_for_improvement ? (
        <div className="mt-4 p-3 bg-white rounded-lg border border-[#fde68a]">
          <div className="font-bold mb-[0.35rem] text-[#92400e]">جوانب الضعف وتحسينها (أمثلة)</div>
          <div className="text-[#475569] leading-[1.6] whitespace-pre-wrap">{data.areas_for_improvement}</div>
        </div>
      ) : null}
      {data.strengths ? (
        <div className="mt-3 p-3 bg-white rounded-lg border border-[#c4b5fd]">
          <div className="font-bold mb-[0.35rem] text-[#5b21b6]">الإجراءات المقترحة للتطوير</div>
          <div className="text-[#475569] leading-[1.6] whitespace-pre-wrap">{data.strengths}</div>
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
  const [previewEntry, setPreviewEntry] = useState(null);

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

  const openMentorVisitPdf = (data) => {
    const criteria = Array.isArray(data.criteria) ? data.criteria : [];
    const scores = data.scores && typeof data.scores === "object" ? data.scores : {};
    const fc = data.form_context && typeof data.form_context === "object" ? data.form_context : {};
    const rows = criteria.map((c) => {
      const row = scores[c.id] || {};
      return `<tr>
        <td style="padding:8px 10px;font-weight:bold;background:#f0f9ff;border:1px solid #bae6fd">${c.label}</td>
        <td style="padding:8px 10px;border:1px solid #bae6fd;white-space:pre-wrap">${row.positive || '—'}</td>
        <td style="padding:8px 10px;border:1px solid #bae6fd;white-space:pre-wrap">${row.development || '—'}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>تقرير زيارة صفية — نموذج 6</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#1e293b;direction:rtl;}
  .header{text-align:center;border-bottom:2px solid #0369a1;padding-bottom:14px;margin-bottom:18px;}
  .header h2{margin:0 0 4px;color:#0369a1;font-size:1.2rem;}
  .header h3{margin:0;color:#0f172a;font-size:1rem;font-weight:normal;}
  .badge{display:inline-block;background:#e0f2fe;color:#0369a1;padding:3px 12px;border-radius:20px;font-size:0.82rem;margin-bottom:10px;}
  .meta{display:flex;flex-wrap:wrap;gap:8px 28px;margin-bottom:16px;font-size:0.9rem;}
  .meta span{color:#64748b;}
  .meta strong{color:#0f172a;}
  table{width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:16px;}
  thead tr th{background:#e0f2fe;padding:8px 10px;text-align:right;border:1px solid #bae6fd;}
  .notes{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.9rem;}
  @media print{body{padding:10px;}}
</style>
</head>
<body>
<div class="header">
  <div class="badge">نموذج رقم (6)</div>
  <h2>تقرير زيارة صفية — مساق التربية العملية</h2>
  <h3>جامعة الخليل — كلية التربية</h3>
</div>
<div class="meta">
  ${data.student_name ? `<div><span>الطالب: </span><strong>${data.student_name}</strong></div>` : ''}
  ${data.school_name ? `<div><span>المدرسة: </span><strong>${data.school_name}</strong></div>` : ''}
  ${fc.university_name ? `<div><span>الجامعة: </span><strong>${fc.university_name}</strong></div>` : ''}
  ${fc.academic_year ? `<div><span>العام الدراسي: </span><strong>${fc.academic_year}</strong></div>` : ''}
  ${fc.semester ? `<div><span>الفصل: </span><strong>${fc.semester}</strong></div>` : ''}
  ${data.supervisor_name ? `<div><span>المعلم المقيم: </span><strong>${data.supervisor_name}</strong></div>` : ''}
  ${data.evaluation_date ? `<div><span>التاريخ: </span><strong>${data.evaluation_date}</strong></div>` : ''}
</div>
<table>
  <thead><tr><th style="width:24%">المحور</th><th>الأمور الإيجابية</th><th>الأمور التي بحاجة إلى تطوير</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
${data.general_notes ? `<div class="notes"><strong>ملاحظات عامة:</strong><br>${data.general_notes}</div>` : ''}
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400); }
  };

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
    if (title.includes("جدول الحصص الأسبوعي") || title.includes("جدول الحصص الأسبوعية") || title.includes("برنامج التدريب") || title.includes("برنامج تدريب")) {
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
    if (t.includes('جدول الحصص الأسبوعي') || t.includes('جدول الحصص الأسبوعية') || t.includes('برنامج التدريب')) return { icon: Calendar, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', bg: '#f5f3ff' };
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
        <div className="content-header-icon">
          <FolderOpen size={26} />
        </div>
        <div className="content-header-content">
          <h1 className="page-title">ملف الإنجاز</h1>
          <p className="page-subtitle">إرفاق شواهد وأعمال تتعلق بتدريبك الميداني</p>
        </div>
      </div>

      {success ? (
        <div className="alert-custom alert-success mb-3 animate-[fadeIn_0.3s_ease]">{success}</div>
      ) : null}
      {error ? (
        <div className="alert-custom alert-danger mb-3 animate-[fadeIn_0.3s_ease]">{error}</div>
      ) : null}

      <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 border border-[#e8e8e8] mb-8 animate-[fadeIn_0.4s_ease-out]">
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 mb-6">
            {/* Title Field */}
            <div className="flex flex-col">
              <label className="text-[0.9rem] font-semibold text-[#495057] mb-2">عنوان المدخل *</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="مثال: تقرير تدريس الصف الرابع..."
                className="w-full py-3 px-4 border-2 border-[#e0e0e0] rounded-[10px] text-[1rem] transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
              />
            </div>

            {/* File Upload */}
            <div className="flex flex-col">
              <label className="text-[0.9rem] font-semibold text-[#495057] mb-2">مرفق (PDF / صور / Word)</label>
              <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-[10px] py-3 px-4 cursor-pointer transition-all flex items-center gap-3 ${dragActive ? 'border-[var(--primary,#007bff)] bg-[rgba(0,123,255,0.05)]' : 'border-[#ccc] bg-white'}`}
              >
                <Upload size={20} color={dragActive ? "var(--primary, #007bff)" : "#666"} />
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="flex-1 border-none bg-transparent text-[0.9rem]"
                />
              </div>
              {file && (
                <div className="mt-2 py-2 px-3 bg-[#e8f5e9] rounded-md text-[0.85rem] text-[#2e7d32] flex items-center gap-2">
                  <FileText size={16} />
                  تم اختيار: {file.name}
                </div>
              )}
            </div>
          </div>

          {/* Description Field */}
          <div className="mb-6">
            <label className="text-[0.9rem] font-semibold text-[#495057] mb-2 block">وصف أو ملاحظات</label>
            <textarea rows={4} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="اكتب وصفًا تفصيليًا للعمل أو المرفق..."
              className="w-full py-3 px-4 border-2 border-[#e0e0e0] rounded-[10px] text-[1rem] resize-y transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[1rem] font-semibold transition-all shadow-[0_2px_8px_rgba(0,123,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,123,255,0.4)] hover:-translate-y-px" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <LoadingSpinner size="button" /> : <Plus size={20} />}
              {saving ? "جاري الحفظ..." : "إضافة مدخل"}
            </button>
          </div>
        </form>
      </div>

      {/* Entries Section */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] animate-[fadeIn_0.4s_ease-out]">
        <h4 className="m-0 text-[1.2rem] font-bold text-[#495057] mb-6 flex items-center gap-2">
          <FolderOpen size={22} color="var(--primary, #007bff)" />
          مدخلاتك ({entries.length})
        </h4>

        {loading ? (
          <LoadingSpinner size="section" text="جاري التحميل..." />
        ) : entries.length === 0 ? (
          <div className="text-center py-12 bg-[#f8f9fa] rounded-xl border-2 border-dashed border-[#dee2e6]">
            <FolderOpen size={60} color="#adb5bd" className="mb-4" />
            <h5 className="text-[#495057] m-0 mb-2">لا توجد مدخلات بعد</h5>
            <p className="text-[#6c757d] m-0">ابدأ بإضافة أول عمل أو شاهد لتوثيق تدريبك</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((en) => {
              const counselorPayload = parseCounselorPortfolioPayload(en);
              const mentorVisitPayload = parseMentorClassroomVisitPayload(en);
              const psychInstitutionPayload = parsePsychologistInstitutionPayload(en);
              const style = getEntryStyle(en);
              const EntryIcon = style.icon;
              return (
                <div key={en.id}
                  className="bg-white rounded-[14px] border border-[#e9ecef] transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:-translate-y-[3px]"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 10px 24px ${style.color}20`;
                    e.currentTarget.style.borderColor = `${style.color}55`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                    e.currentTarget.style.borderColor = "#e9ecef";
                  }}
                >
                  {/* شريط لوني علوي */}
                  <div className="h-1" style={{ background: style.gradient }} />

                  <div className="py-[1.1rem] px-[1.25rem]">
                    {editingId === en.id ? (
                      /* وضع التعديل */
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: style.gradient }}>
                            <Edit3 size={16} color="white" />
                          </div>
                          <span className="font-bold text-[#1e293b] text-[0.95rem]">تعديل المدخل</span>
                        </div>
                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full py-[10px] px-[14px] border-[1.5px] border-[#d1d5db] rounded-lg text-[0.9rem] font-semibold"
                          placeholder="عنوان المدخل"
                        />
                        <textarea rows={4} value={editContent} onChange={(e) => setEditContent(e.target.value)}
                          className="w-full py-[10px] px-[14px] border-[1.5px] border-[#d1d5db] rounded-lg text-[0.85rem] resize-y"
                          placeholder="المحتوى أو الوصف..."
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={cancelEdit}
                            className="py-2 px-[18px] border border-[#e2e8f0] rounded-lg bg-white text-[#64748b] text-[0.85rem] font-semibold cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button onClick={() => handleEditUpdate(en.id)} disabled={saving}
                            className="py-2 px-[18px] border-none rounded-lg text-white text-[0.85rem] font-semibold flex items-center gap-[6px]" style={{ background: saving ? "#9ca3af" : style.color, cursor: saving ? "not-allowed" : "pointer" }}
                          >
                            {saving ? <LoadingSpinner size="button" /> : <SaveIcon size={14} />}
                            {saving ? "جاري الحفظ..." : "حفظ التعديل"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* وضع العرض */
                      <div className="flex items-center gap-3">
                        {/* أيقونة النموذج */}
                        <div className="w-[42px] h-[42px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: style.gradient, boxShadow: `0 3px 10px ${style.color}30` }}>
                          <EntryIcon size={20} color="white" />
                        </div>

                        {/* اسم النموذج + التاريخ */}
                        <div className="flex-1 min-w-0">
                          <h5 className="m-0 text-[1rem] font-bold text-[#1e293b] overflow-hidden text-ellipsis whitespace-nowrap">
                            {en.title}
                          </h5>
                          <span className="text-[0.72rem] text-[#94a3b8] flex items-center gap-1 mt-[0.15rem]">
                            <Calendar size={11} />
                            {en.created_at ? new Date(en.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                          </span>
                        </div>

                        {/* أزرار المرفق والتعديل والحذف */}
                        <div className="flex items-center gap-[0.35rem] shrink-0">
                          {mentorVisitPayload ? (
                            <button type="button"
                              onClick={() => openMentorVisitPdf(mentorVisitPayload)}
                              className="inline-flex items-center gap-[0.35rem] text-[0.82rem] font-semibold py-[0.35rem] px-[0.7rem] rounded-lg transition-all border-none cursor-pointer"
                              style={{ color: style.color, backgroundColor: style.bg }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${style.color}18`; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = style.bg; }}
                            >
                              <FileText size={14} />
                              عرض الملف
                            </button>
                          ) : (counselorPayload || psychInstitutionPayload) ? (
                            <button type="button"
                              onClick={() => setPreviewEntry(en)}
                              className="inline-flex items-center gap-[0.35rem] text-[0.82rem] font-semibold py-[0.35rem] px-[0.7rem] rounded-lg transition-all border-none cursor-pointer"
                              style={{ color: style.color, backgroundColor: style.bg }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${style.color}18`; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = style.bg; }}
                            >
                              <FileText size={14} />
                              عرض النموذج
                            </button>
                          ) : en.file_path ? (
                            <a href={fileHref(en.file_path)} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-[0.35rem] no-underline text-[0.82rem] font-semibold py-[0.35rem] px-[0.7rem] rounded-lg transition-all" style={{ color: style.color, backgroundColor: style.bg }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${style.color}18`; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = style.bg; }}
                            >
                              <FileText size={14} />
                              عرض الملف
                            </a>
                          ) : (
                            <div className="flex items-center gap-[0.35rem]">
                              <span className="text-[#cbd5e1] text-[0.78rem] flex items-center gap-1 py-[0.35rem] px-2">
                                <FileText size={14} />
                                بدون مرفق
                              </span>
                              <button type="button" onClick={() => setReplacingFileId(en.id)}
                                className="inline-flex items-center gap-[0.35rem] text-white bg-[#28a745] border border-[#28a745] text-[0.78rem] font-semibold py-[0.35rem] px-[0.7rem] rounded-lg cursor-pointer transition-all hover:bg-[#218838] hover:border-[#218838]"
                                title="رفع ملف جديد"
                              >
                                <Upload size={12} />
                                رفع ملف
                              </button>
                            </div>
                          )}
                          {!counselorPayload && !mentorVisitPayload && !psychInstitutionPayload ? (
                            <>
                              <button type="button" onClick={() => startEdit(en)}
                                className="bg-transparent border-none cursor-pointer text-[#94a3b8] p-1 rounded-md transition-all hover:text-[#3b82f6] hover:bg-[#eff6ff]"
                                title="تعديل"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button type="button" onClick={() => handleDelete(en.id)}
                                className="bg-transparent border-none cursor-pointer text-[#cbd5e1] p-1 rounded-md transition-all hover:text-[#ef4444] hover:bg-[#fef2f2]"
                                title="حذف"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {counselorPayload && editingId !== en.id ? <CounselorPortfolioReadOnly data={counselorPayload} /> : null}
                    {psychInstitutionPayload && editingId !== en.id ? (
                      <PsychologistInstitutionPortfolioReadOnly data={psychInstitutionPayload} />
                    ) : null}

                    {/* نموذج استبدال الملف */}
                    {replacingFileId === en.id && (
                      <div className="mt-3 p-3 bg-[#f0fdf4] rounded-lg border border-[#bbf7d0]">
                        <div className="flex items-center gap-2 mb-2 text-[0.85rem] font-semibold text-[#166534]">
                          <Upload size={14} />
                          استبدال الملف
                        </div>
                        <div className="flex flex-col gap-2">
                          <input type="file" onChange={(e) => setReplacementFile(e.target.files[0])}
                            className="w-full py-2 px-2 border border-[#d1d5db] rounded-md text-[0.85rem]"
                          />
                          {replacementFile && (
                            <div className="text-[0.75rem] text-[#6b7280] flex items-center justify-between gap-1 py-[6px] px-2 bg-[#f9fafb] rounded-md border border-[#e5e7eb]">
                              <div className="flex items-center gap-1">
                                <FileText size={12} />
                                {replacementFile.name} ({(replacementFile.size / 1024).toFixed(1)} KB)
                              </div>
                              <button type="button" onClick={() => setReplacementFile(null)}
                                className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ef4444] text-white border-none cursor-pointer text-xs font-bold transition-all hover:bg-[#dc2626]"
                                title="إلغاء اختيار الملف"
                              >
                                ×
                              </button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleReplaceFile(en.id)} disabled={!replacementFile || replacingFileId === en.id}
                              className="py-[6px] px-3 border-none rounded-md text-white text-[0.82rem] font-semibold flex items-center gap-[6px]" style={{ backgroundColor: !replacementFile || replacingFileId === en.id ? "#9ca3af" : "#28a745", cursor: !replacementFile || replacingFileId === en.id ? "not-allowed" : "pointer" }}
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
                            <button type="button" onClick={() => { setReplacingFileId(null); setReplacementFile(null); }}
                              className="py-[6px] px-3 border border-[#d1d5db] rounded-md bg-white text-[#6b7280] text-[0.82rem] font-semibold cursor-pointer"
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
                        <div className="mt-3 p-3 bg-[#f0fdf4] rounded-lg border border-[#bbf7d0]">
                          <div className="flex items-center gap-2 mb-2 text-[0.85rem] font-semibold text-[#166534]">
                            🎓 ملاحظة المشرف الأكاديمي
                          </div>
                          {en.academic_rating != null && en.academic_rating !== "" && (
                            <div className="text-[0.88rem] font-semibold text-[#166534] mb-2">
                              التقييم: {en.academic_rating} / 5
                            </div>
                          )}
                          {en.reviewer_note && (
                            <div className="text-[0.9rem] text-[#374151] leading-[1.5]">
                              {en.reviewer_note}
                            </div>
                          )}
                          {en.reviewed_at && (
                            <div className="text-[0.75rem] text-[#6b7280] mt-2">
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
