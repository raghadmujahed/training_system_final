import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Building2, MapPin, School, FileText, Send, Edit3,
  Trash2, AlertCircle, CheckCircle2, XCircle, Loader2, Users, Search,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  createStudentTrainingRequest, deleteStudentTrainingRequest,
  getStudentTrainingRequests, getTrainingPeriods, getTrainingSites,
  itemsFromPagedResponse, updateStudentTrainingRequest,
} from "../../services/api";
import { useStudentTrack } from "../../hooks/useStudentTrack";
import { useToast } from "../../components/Toast";
import {
  getTrainingRequestStatusMeta, isTrainingRequestCancelable, isTrainingRequestEditable,
} from "../../utils/status";
import TrainingRequestWorkflowStepper from "../../components/training/TrainingRequestWorkflowStepper";

const educationDirectorates = ["وسط", "شمال", "جنوب", "يطا"];

const fadeIn = `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
const spin = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`;

const STATUS_INLINE = {
  draft:                   { label: "مسودة",                  color: "#64748b", bg: "#f1f5f9", icon: ClipboardList },
  sent_to_coordinator:     { label: "عند المنسق",             color: "#3b82f6", bg: "#dbeafe", icon: Send },
  needs_edit:              { label: "يحتاج تعديل",            color: "#d97706", bg: "#fef3c7", icon: AlertCircle },
  prelim_approved:         { label: "موافقة أولية",           color: "#0891b2", bg: "#ecfeff", icon: CheckCircle2 },
  sent_to_directorate:     { label: "أُرسل للمديرية",         color: "#6366f1", bg: "#e0e7ff", icon: Send },
  directorate_approved:    { label: "موافقة المديرية",        color: "#10b981", bg: "#d1fae5", icon: CheckCircle2 },
  directorate_rejected:    { label: "مرفوض من المديرية",      color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  sent_to_school:          { label: "مرسل للمدرسة",           color: "#7c3aed", bg: "#ede9fe", icon: Send },
  school_approved:         { label: "موافقة جهة التدريب",     color: "#059669", bg: "#d1fae5", icon: CheckCircle2 },
  school_rejected:         { label: "مرفوض من جهة التدريب",  color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  approved:                { label: "مقبول نهائياً",          color: "#059669", bg: "#d1fae5", icon: CheckCircle2 },
  rejected:                { label: "مرفوض",                  color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  coordinator_rejected:    { label: "مرفوض من المنسق",        color: "#dc2626", bg: "#fee2e2", icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const meta = getTrainingRequestStatusMeta(status);
  const cfg = STATUS_INLINE[status] || { label: meta?.label || status || "قيد المعالجة", color: "#64748b", bg: "#f1f5f9", icon: ClipboardList };
  const Icon = cfg.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.3rem 0.8rem", borderRadius: 99, fontSize: "0.8rem", fontWeight: 700, background: cfg.bg, color: cfg.color }}>
      <Icon size={13} /> {cfg.label}
    </span>
  );
};

const cardStyle = { background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" };
const labelStyle = { fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: 4 };
const inputStyle = { width: "100%", padding: "0.6rem 0.85rem", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", color: "#1e293b", outline: "none" };

export default function TrainingRequest() {
  const { isEducation: isEducationFlow, isPsychology: isPsychologyFlow, config } = useStudentTrack();
  const { addToast } = useToast();
  const governingBodyLabel = config.governingBodyLabel;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [periods, setPeriods] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [directorates, setDirectorates] = useState([]);
  const [schools, setSchools] = useState([]);
  const [siteSearch, setSiteSearch] = useState("");
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);
  const [highlightedSiteIndex, setHighlightedSiteIndex] = useState(-1);

  const [filters, setFilters] = useState({
    governing_body: config.governingBodyValue,
    site_type: config.siteTypeValue,
    directorate: "",
    gender_classification: "",
    school_level: "",
  });

  const [formData, setFormData] = useState({ training_site_id: "", notes: "" });

  const loadMyRequests = async () => {
    const myReqRes = await getStudentTrainingRequests();
    setMyRequests(itemsFromPagedResponse(myReqRes));
  };

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const [periodsRes] = await Promise.all([getTrainingPeriods({ per_page: 200 })]);
        setPeriods(itemsFromPagedResponse(periodsRes));
        await loadMyRequests();
      } catch (e) { setError(e?.response?.data?.message || "فشل تحميل البيانات"); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!isEducationFlow && !isPsychologyFlow) return;
    setFilters((prev) => ({ ...prev, governing_body: config.governingBodyValue, site_type: config.siteTypeValue, gender_classification: "", school_level: "" }));
  }, [isEducationFlow, isPsychologyFlow]);

  useEffect(() => {
    (async () => {
      if (isEducationFlow || isPsychologyFlow) { setDirectorates(educationDirectorates); return; }
      if (filters.governing_body !== "directorate_of_education" || filters.site_type !== "school") { setDirectorates([]); return; }
      try {
        const res = await getTrainingSites({ governing_body: "directorate_of_education", site_type: "school", is_active: true, has_manager_account: true, per_page: 400, include_occupancy: true });
        setDirectorates(Array.from(new Set(itemsFromPagedResponse(res).map(s => String(s?.directorate || "").trim()).filter(Boolean))));
      } catch { setDirectorates([]); }
    })();
  }, [filters.governing_body, filters.site_type, isEducationFlow, isPsychologyFlow]);

  useEffect(() => {
    (async () => {
      setFormData((prev) => ({ ...prev, training_site_id: "" }));
      if (!filters.governing_body || !filters.site_type || !filters.directorate) { setSchools([]); return; }
      try {
        const params = { governing_body: filters.governing_body, site_type: filters.site_type, directorate: filters.directorate, is_active: true, has_manager_account: true, per_page: 200, include_occupancy: true };
        if (filters.gender_classification) params.gender_classification = filters.gender_classification;
        if (filters.school_level) params.school_level = filters.school_level;
        const res = await getTrainingSites(params);
        setSchools(itemsFromPagedResponse(res));
      } catch (e) { setError(e?.response?.data?.message || "فشل تحميل المدارس"); }
    })();
  }, [filters.governing_body, filters.site_type, filters.directorate, filters.gender_classification, filters.school_level]);

  const validationErrors = useMemo(() => {
    const errs = {};
    if (!filters.directorate) errs.directorate = "اختر المديرية أولاً";
    if (!formData.training_site_id) errs.training_site_id = "اختر المدرسة/جهة التدريب";
    return errs;
  }, [formData, filters.directorate, filters.governing_body, filters.gender_classification]);

  const normalizeArabicSearch = (v) => String(v || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();

  const filteredSchools = useMemo(() => {
    const q = normalizeArabicSearch(siteSearch);
    if (!q) return schools;
    const starts = [], includes = [];
    schools.forEach(s => { const n = normalizeArabicSearch(s?.name); n.startsWith(q) ? starts.push(s) : n.includes(q) && includes.push(s); });
    return [...starts, ...includes];
  }, [schools, siteSearch]);

  const latestRequest = useMemo(() => myRequests.filter(r => !r.deleted_at && !r.deletedAt)[0] || null, [myRequests]);
  const hasSubmittedRequest = useMemo(() => Boolean(latestRequest?.id), [latestRequest]);
  const canEditLatestRequest = useMemo(() => latestRequest && isTrainingRequestEditable(latestRequest.book_status), [latestRequest]);
  const canCancelLatestRequest = useMemo(() => latestRequest && isTrainingRequestCancelable(latestRequest.book_status), [latestRequest]);
  const submitTargetRequestId = useMemo(() => editingId || (hasSubmittedRequest && canEditLatestRequest ? latestRequest?.id || null : null), [editingId, hasSubmittedRequest, canEditLatestRequest, latestRequest]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.keys(validationErrors).length > 0) { setError(Object.values(validationErrors).join("، ")); return; }
    const pickedSite = schools.find(s => String(s.id) === String(formData.training_site_id));
    if (pickedSite && (pickedSite.is_at_capacity === true || (pickedSite.remaining_capacity !== undefined && Number(pickedSite.remaining_capacity) <= 0))) {
      setError("الجهة التدريبية المختارة مكتملة السعة ولا يمكن استقبال طلبات جديدة حاليًا."); return;
    }
    if (hasSubmittedRequest && !submitTargetRequestId) { setError("الطلب الحالي لا يمكن تعديله في هذه المرحلة."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const activePeriod = periods.find(p => Boolean(p?.is_active)) || periods[0] || null;
      const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      const payload = {
        training_site_id: Number(formData.training_site_id),
        training_period_id: activePeriod?.id ? Number(activePeriod.id) : null,
        governing_body: filters.governing_body, directorate: filters.directorate || null,
        start_date: activePeriod?.start_date || today.toISOString().slice(0, 10),
        end_date: activePeriod?.end_date || tomorrow.toISOString().slice(0, 10),
        notes: formData.notes || null,
      };
      if (submitTargetRequestId) {
        try { await updateStudentTrainingRequest(submitTargetRequestId, payload); setEditingId(null); setSuccess("تم حفظ التعديلات على الطلب بنجاح."); addToast("تم حفظ التعديلات على الطلب بنجاح", "success"); }
        catch (updateErr) { if (updateErr?.response?.status === 404) { setEditingId(null); await createStudentTrainingRequest(payload); setSuccess("تم إرسال الطلب بنجاح (طلب جديد)."); addToast("تم إرسال الطلب بنجاح", "success"); } else throw updateErr; }
      } else { await createStudentTrainingRequest(payload); setSuccess("تم إرسال الطلب بنجاح."); addToast("تم إرسال الطلب بنجاح", "success"); }
      setFormData({ training_site_id: "", notes: "" }); setSiteSearch(""); await loadMyRequests();
    } catch (e) { if (e?.response?.status === 409) await loadMyRequests(); setError(e?.response?.data?.message || "فشل حفظ الطلب"); addToast(e?.response?.data?.message || "فشل حفظ الطلب", "error"); }
    finally { setSaving(false); }
  };

  const startEdit = (req) => {
    const site = req.training_site || req.trainingSite;
    setEditingId(req.id);
    setFilters(prev => ({ ...prev, governing_body: site?.governing_body || req.governing_body || prev.governing_body, site_type: site?.site_type || prev.site_type, directorate: site?.directorate || "", gender_classification: site?.gender_classification || "", school_level: site?.school_level || "" }));
    setFormData({ training_site_id: site?.id ? String(site.id) : "", notes: req.students?.[0]?.notes || "" });
    setSiteSearch(site?.name || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelLatestRequest = async () => {
    if (!latestRequest?.id || !window.confirm("هل تريد إلغاء الطلب الحالي؟")) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await deleteStudentTrainingRequest(latestRequest.id);
      setEditingId(null); setFormData({ training_site_id: "", notes: "" }); setSiteSearch("");
      setFilters(prev => ({ ...prev, directorate: "" })); setSchools([]);
      await loadMyRequests(); setSuccess("تم إلغاء الطلب بنجاح. يمكنك الآن إرسال طلب جديد."); addToast("تم إلغاء الطلب بنجاح", "success");
    } catch (e) { setError(e?.response?.data?.message || "تعذر إلغاء الطلب"); addToast(e?.response?.data?.message || "تعذر إلغاء الطلب", "error"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل البيانات..." />
    );
  }

  return (
    <>
      <style>{fadeIn}{spin}</style>
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 60%, #3b82f6 100%)",
          borderRadius: 20, padding: "1.75rem 2.5rem", color: "white",
          marginBottom: "1.5rem", boxShadow: "0 8px 32px rgba(30,58,95,0.3)",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardList size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>طلب التدريب الميداني</h1>
            <p style={{ margin: "0.25rem 0 0", opacity: 0.9, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 5 }}>
              <Building2 size={13} /> اختر المديرية ثم جهة التدريب التابعة لها لإرسال طلبك
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#fee2e2", color: "#dc2626", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}
        {success && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#d1fae5", color: "#059669", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
            <CheckCircle2 size={20} /> {success}
          </div>
        )}

        {/* Stepper */}
        {hasSubmittedRequest && latestRequest && (
          <div style={{ ...cardStyle, marginBottom: "1.25rem" }}>
            <TrainingRequestWorkflowStepper bookStatus={latestRequest.book_status} governingBody={latestRequest.governing_body} />
          </div>
        )}

        {/* Current Request Info */}
        {hasSubmittedRequest && (
          <div style={{ ...cardStyle, marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>حالة الطلب الحالي</h3>
              </div>
              <StatusBadge status={latestRequest.book_status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {[
                { icon: ClipboardList, label: "حالة الطلب", value: <StatusBadge status={latestRequest.book_status} />, color: "#3b82f6", bg: "#dbeafe" },
                { icon: Building2, label: "الجهة المعتمدة", value: latestRequest.training_site?.name || "—", color: "#059669", bg: "#d1fae5" },
                { icon: MapPin, label: "المديرية", value: latestRequest.training_site?.directorate || "—", color: "#7c3aed", bg: "#ede9fe" },
                { icon: Users, label: "المشرف/المرشد", value: latestRequest.students?.[0]?.assigned_teacher?.name || "غير محدد بعد", color: "#d97706", bg: "#fef3c7" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={17} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {(latestRequest.rejection_reason || latestRequest.coordinator_rejection_reason || latestRequest.needs_edit_reason) && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "1rem 1.25rem", background: "#fef3c7", color: "#92400e", borderRadius: 12, marginTop: "1rem", border: "1px solid #fde68a" }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>ملاحظات على الطلب:</div>
                  <div style={{ fontSize: "0.9rem" }}>{latestRequest.rejection_reason || latestRequest.coordinator_rejection_reason || latestRequest.needs_edit_reason}</div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
              {canEditLatestRequest && (
                <button type="button" onClick={() => startEdit(latestRequest)} disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.55rem 1.25rem", background: "linear-gradient(135deg, #1e3a5f, #2d5f8a)", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  <Edit3 size={16} /> تعديل نفس الطلب
                </button>
              )}
              {canCancelLatestRequest && (
                <button type="button" onClick={handleCancelLatestRequest} disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.55rem 1.25rem", background: "white", color: "#dc2626", border: "1.5px solid #fecaca", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  <Trash2 size={16} /> إلغاء الطلب
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        {(!hasSubmittedRequest || editingId) && (
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Send size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                {editingId ? "تعديل الطلب" : hasSubmittedRequest ? "إعادة إرسال الطلب" : "إرسال طلب جديد"}
              </h3>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "#eff6ff", color: "#1e40af", borderRadius: 12, marginBottom: "1.25rem", fontSize: "0.85rem", fontWeight: 600, border: "1px solid #bfdbfe" }}>
              <AlertCircle size={16} />
              {hasSubmittedRequest && !canEditLatestRequest
                ? "تم إرسال طلبك مسبقًا. يمكنك فقط متابعة الحالة حتى يتم رفض الطلب."
                : "اختر المديرية أولاً، ثم ابحث واختر جهة التدريب."}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
                {/* Governing Body */}
                <div>
                  <label style={labelStyle}><Building2 size={13} /> الجهة الرسمية</label>
                  <input value={governingBodyLabel} readOnly style={{ ...inputStyle, background: "#f1f5f9" }} />
                </div>

                {/* Directorate */}
                <div>
                  <label style={labelStyle}><MapPin size={13} /> المديرية</label>
                  <select value={filters.directorate}
                    onChange={(e) => setFilters(prev => ({ ...prev, directorate: e.target.value, gender_classification: "", school_level: "" }))}
                    disabled={!filters.governing_body}
                    style={{ ...inputStyle, appearance: "auto", borderColor: validationErrors.directorate ? "#f87171" : "#e2e8f0" }}
                  >
                    <option value="">اختر المديرية</option>
                    {directorates.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {validationErrors.directorate && <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{validationErrors.directorate}</div>}
                </div>

                {/* Gender Classification */}
                {isEducationFlow && (
                  <div>
                    <label style={labelStyle}><Users size={13} /> تصنيف المدرسة</label>
                    <select value={filters.gender_classification}
                      onChange={(e) => setFilters(prev => ({ ...prev, gender_classification: e.target.value }))}
                      disabled={!filters.directorate}
                      style={{ ...inputStyle, appearance: "auto" }}
                    >
                      <option value="">الكل (ذكور وإناث)</option>
                      <option value="boys">مدرسة ذكور</option>
                      <option value="girls">مدرسة إناث</option>
                      <option value="mixed">مدرسة مختلطة</option>
                    </select>
                  </div>
                )}

                {/* School Level */}
                {isEducationFlow && (
                  <div>
                    <label style={labelStyle}><School size={13} /> مرحلة المدرسة</label>
                    <select value={filters.school_level}
                      onChange={(e) => setFilters(prev => ({ ...prev, school_level: e.target.value }))}
                      disabled={!filters.directorate}
                      style={{ ...inputStyle, appearance: "auto" }}
                    >
                      <option value="">الكل (دنيا وعليا)</option>
                      <option value="lower">أساسية دنيا</option>
                      <option value="upper">أساسية عليا</option>
                    </select>
                  </div>
                )}

                {/* Site Search */}
                <div style={{ gridColumn: isEducationFlow ? "span 2" : "span 2" }}>
                  <label style={labelStyle}><Search size={13} /> {config.siteSearchLabel}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      placeholder={!filters.directorate ? "اختر المديرية أولاً" : "اكتب للبحث ثم اختر الجهة"}
                      value={siteSearch}
                      onChange={(e) => { setSiteSearch(e.target.value); setIsSiteMenuOpen(true); setHighlightedSiteIndex(-1); setFormData(prev => ({ ...prev, training_site_id: "" })); }}
                      onFocus={() => { if (filters.directorate) setIsSiteMenuOpen(true); }}
                      onBlur={() => { setTimeout(() => setIsSiteMenuOpen(false), 150); }}
                      onKeyDown={(e) => {
                        if (!isSiteMenuOpen || filteredSchools.length === 0) return;
                        if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedSiteIndex(prev => prev < filteredSchools.length - 1 ? prev + 1 : 0); }
                        else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedSiteIndex(prev => prev > 0 ? prev - 1 : filteredSchools.length - 1); }
                        else if (e.key === "Enter" && highlightedSiteIndex >= 0) {
                          e.preventDefault();
                          const picked = filteredSchools[highlightedSiteIndex];
                          const cap = picked && (picked.is_at_capacity === true || (picked.remaining_capacity !== undefined && Number(picked.remaining_capacity) <= 0));
                          if (picked && !cap) { setFormData(prev => ({ ...prev, training_site_id: String(picked.id) })); setSiteSearch(picked.name || ""); setIsSiteMenuOpen(false); }
                        }
                        else if (e.key === "Escape") setIsSiteMenuOpen(false);
                      }}
                      disabled={!filters.directorate}
                      style={{ ...inputStyle, borderColor: validationErrors.training_site_id ? "#f87171" : "#e2e8f0" }}
                    />
                    {isSiteMenuOpen && filters.directorate && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 6px)", right: 0, left: 0,
                        maxHeight: 240, overflowY: "auto", background: "#fff",
                        border: "1px solid #e2e8f0", borderRadius: 12, zIndex: 25,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                      }}>
                        {filteredSchools.length === 0 ? (
                          <div style={{ padding: "1rem", color: "#94a3b8", fontSize: "0.88rem", textAlign: "center" }}>لا توجد نتائج مطابقة</div>
                        ) : filteredSchools.map((s, idx) => {
                          const isSelected = String(s.id) === String(formData.training_site_id);
                          const isHighlighted = idx === highlightedSiteIndex;
                          const atCapacity = s.is_at_capacity === true || (s.remaining_capacity !== undefined && Number(s.remaining_capacity) <= 0);
                          const rem = s.remaining_capacity !== undefined ? Number(s.remaining_capacity) : null;
                          return (
                            <button key={s.id} type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { if (atCapacity) return; setFormData(prev => ({ ...prev, training_site_id: String(s.id) })); setSiteSearch(s.name || ""); setIsSiteMenuOpen(false); }}
                              disabled={atCapacity}
                              style={{
                                width: "100%", textAlign: "right", border: "none",
                                background: isHighlighted ? "#eff6ff" : isSelected ? "#f8fafc" : "white",
                                padding: "0.7rem 1rem", fontSize: "0.88rem",
                                color: atCapacity ? "#94a3b8" : "#1e293b",
                                cursor: atCapacity ? "not-allowed" : "pointer",
                                opacity: atCapacity ? 0.65 : 1,
                                borderBottom: idx < filteredSchools.length - 1 ? "1px solid #f1f5f9" : "none",
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <span style={{ fontWeight: 600 }}>{s.name}</span>
                                {atCapacity ? (
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#b91c1c", background: "#fee2e2", padding: "2px 8px", borderRadius: 99 }}>مكتملة السعة</span>
                                ) : rem != null && Number.isFinite(rem) ? (
                                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#0369a1" }}>متبقي: {rem}</span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {validationErrors.training_site_id && <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{validationErrors.training_site_id}</div>}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}><FileText size={13} /> ملاحظات (اختياري)</label>
                <textarea rows={3} value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات إضافية تريد إرفاقها بالطلب..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Validation warnings */}
              {(Object.keys(validationErrors).length > 0 || (hasSubmittedRequest && !submitTargetRequestId)) && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#fef3c7", color: "#92400e", borderRadius: 12, marginBottom: "1rem", border: "1px solid #fde68a", fontSize: "0.85rem" }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    {validationErrors.directorate && <div>• {validationErrors.directorate}</div>}
                    {validationErrors.training_site_id && <div>• {validationErrors.training_site_id}</div>}
                    {hasSubmittedRequest && !submitTargetRequestId && <div>• الطلب الحالي قيد المعالجة ولا يمكن تعديله حالياً</div>}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="submit" disabled={saving || (hasSubmittedRequest && !submitTargetRequestId)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "0.7rem 1.75rem", border: "none", borderRadius: 12,
                    background: "linear-gradient(135deg, #1e3a5f, #2d5f8a)",
                    color: "white", fontSize: "0.95rem", fontWeight: 700,
                    cursor: saving || (hasSubmittedRequest && !submitTargetRequestId) ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                    boxShadow: "0 4px 12px rgba(30,58,95,0.3)",
                  }}
                >
                  {saving ? <LoadingSpinner size="button" /> : submitTargetRequestId ? <Edit3 size={18} /> : <Send size={18} />}
                  {saving ? "جاري الحفظ..." : submitTargetRequestId ? "حفظ التعديلات" : "إرسال الطلب"}
                </button>
                {editingId && (
                  <button type="button"
                    onClick={() => { setEditingId(null); setError(""); setSuccess(""); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.7rem 1.25rem", background: "white", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 12, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}
                  >
                    <XCircle size={16} /> إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
