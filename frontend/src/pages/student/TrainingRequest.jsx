import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Building2, MapPin, School, FileText, Send, Edit3,
  Trash2, AlertCircle, CheckCircle2, XCircle, Loader2, Users, Search,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  createStudentTrainingRequest, deleteStudentTrainingRequest,
  getStudentTrainingRequests, getTrainingSites,
  itemsFromPagedResponse, updateStudentTrainingRequest,
} from "../../services/api";
import { apiCache } from "../../services/apiCache";
import { useTrainingPeriods } from "../../hooks/useSharedData";
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
    <span className="inline-flex items-center gap-[5px] py-[0.3rem] px-[0.8rem] rounded-full text-[0.8rem] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={13} /> {cfg.label}
    </span>
  );
};

const cardStyle = "bg-white rounded-2xl p-6 px-8 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.05)]";
const labelStyle = "text-[0.82rem] font-semibold text-[#475569] mb-[0.4rem] flex items-center gap-1";
const inputStyle = "w-full py-[0.6rem] px-[0.85rem] rounded-[10px] border-[1.5px] border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] text-[#1e293b] outline-none";

export default function TrainingRequest() {
  const { isEducation: isEducationFlow, isPsychology: isPsychologyFlow, config } = useStudentTrack();
  const { addToast } = useToast();
  const governingBodyLabel = config.governingBodyLabel;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

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

  const { data: periods } = useTrainingPeriods({ per_page: 200 });

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try { await loadMyRequests(); }
      catch (e) { setError(e?.response?.data?.message || "فشل تحميل البيانات"); }
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
        const cacheKey = `training-sites:${JSON.stringify({ governing_body: "directorate_of_education", site_type: "school", is_active: true, has_manager_account: true, per_page: 400, include_occupancy: true })}`;
        const res = await apiCache.get(cacheKey, () => getTrainingSites({ governing_body: "directorate_of_education", site_type: "school", is_active: true, has_manager_account: true, per_page: 400, include_occupancy: true }), 2 * 60_000);
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
        const cacheKey2 = `training-sites:${JSON.stringify(params)}`;
        const res = await apiCache.get(cacheKey2, () => getTrainingSites(params), 2 * 60_000);
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
      <div className="animate-[fadeIn_0.4s_ease]">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#1e3a5f] via-[#2d5f8a] to-[#3b82f6] rounded-[20px] py-7 px-10 text-white mb-6 shadow-[0_8px_32px_rgba(30,58,95,0.3)] flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-white/20 flex items-center justify-center shrink-0">
            <ClipboardList size={26} />
          </div>
          <div>
            <h1 className="m-0 text-[1.4rem] font-extrabold">طلب التدريب الميداني</h1>
            <p className="m-0 mt-1 opacity-90 text-[0.92rem] flex items-center gap-[5px]">
              <Building2 size={13} /> اختر المديرية ثم جهة التدريب التابعة لها لإرسال طلبك
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 py-[0.85rem] px-5 bg-[#fee2e2] text-[#dc2626] rounded-[14px] text-[0.9rem] font-semibold mb-4">
            <AlertCircle size={20} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 py-[0.85rem] px-5 bg-[#d1fae5] text-[#059669] rounded-[14px] text-[0.9rem] font-semibold mb-4">
            <CheckCircle2 size={20} /> {success}
          </div>
        )}

        {/* Stepper */}
        {hasSubmittedRequest && latestRequest && (
          <div className={`${cardStyle} mb-5`}>
            <TrainingRequestWorkflowStepper bookStatus={latestRequest.book_status} governingBody={latestRequest.governing_body} />
          </div>
        )}

        {/* Current Request Info */}
        {hasSubmittedRequest && (
          <div className={`${cardStyle} mb-5`}>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-[0.6rem]">
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[#dbeafe] text-[#2563eb] flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <h3 className="m-0 text-[1rem] font-bold text-[#1e293b]">حالة الطلب الحالي</h3>
              </div>
              <StatusBadge status={latestRequest.book_status} />
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {[
                { icon: ClipboardList, label: "حالة الطلب", value: <StatusBadge status={latestRequest.book_status} />, color: "#3b82f6", bg: "#dbeafe" },
                { icon: Building2, label: "الجهة المعتمدة", value: latestRequest.training_site?.name || "—", color: "#059669", bg: "#d1fae5" },
                { icon: MapPin, label: "المديرية", value: latestRequest.training_site?.directorate || "—", color: "#7c3aed", bg: "#ede9fe" },
                { icon: Users, label: "المشرف/المرشد", value: latestRequest.students?.[0]?.assigned_teacher?.name || "غير محدد بعد", color: "#d97706", bg: "#fef3c7" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 py-[0.85rem] px-4 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                    <div className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: item.bg, color: item.color }}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[0.72rem] text-[#94a3b8] font-medium">{item.label}</div>
                      <div className="text-[0.88rem] font-bold text-[#1e293b] mt-[2px]">{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {(latestRequest.rejection_reason || latestRequest.coordinator_rejection_reason || latestRequest.needs_edit_reason) && (
              <div className="flex items-start gap-3 py-4 px-5 bg-[#fef3c7] text-[#92400e] rounded-xl mt-4 border border-[#fde68a]">
                <AlertCircle size={20} className="shrink-0 mt-[2px]" />
                <div>
                  <div className="font-bold mb-1">ملاحظات على الطلب:</div>
                  <div className="text-[0.9rem]">{latestRequest.rejection_reason || latestRequest.coordinator_rejection_reason || latestRequest.needs_edit_reason}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5 flex-wrap">
              {canEditLatestRequest && (
                <button type="button" onClick={() => startEdit(latestRequest)} disabled={saving}
                  className="inline-flex items-center gap-[6px] py-[0.55rem] px-5 bg-gradient-to-br from-[#1e3a5f] to-[#2d5f8a] text-white border-none rounded-[10px] font-bold text-[0.88rem]" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                >
                  <Edit3 size={16} /> تعديل نفس الطلب
                </button>
              )}
              {canCancelLatestRequest && (
                <button type="button" onClick={handleCancelLatestRequest} disabled={saving}
                  className="inline-flex items-center gap-[6px] py-[0.55rem] px-5 bg-white text-[#dc2626] border-[1.5px] border-[#fecaca] rounded-[10px] font-bold text-[0.88rem]" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                >
                  <Trash2 size={16} /> إلغاء الطلب
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        {(!hasSubmittedRequest || editingId) && (
          <div className={cardStyle}>
            <div className="flex items-center gap-[0.6rem] mb-5">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-[#dbeafe] text-[#2563eb] flex items-center justify-center">
                <Send size={18} />
              </div>
              <h3 className="m-0 text-[1rem] font-bold text-[#1e293b]">
                {editingId ? "تعديل الطلب" : hasSubmittedRequest ? "إعادة إرسال الطلب" : "إرسال طلب جديد"}
              </h3>
            </div>

            <div className="flex items-center gap-2 py-3 px-4 bg-[#eff6ff] text-[#1e40af] rounded-xl mb-5 text-[0.85rem] font-semibold border border-[#bfdbfe]">
              <AlertCircle size={16} />
              {hasSubmittedRequest && !canEditLatestRequest
                ? "تم إرسال طلبك مسبقًا. يمكنك فقط متابعة الحالة حتى يتم رفض الطلب."
                : "اختر المديرية أولاً، ثم ابحث واختر جهة التدريب."}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 mb-5">
                {/* Governing Body */}
                <div>
                  <label className={labelStyle}><Building2 size={13} /> الجهة الرسمية</label>
                  <input value={governingBodyLabel} readOnly className={`${inputStyle} bg-[#f1f5f9]`} />
                </div>

                {/* Directorate */}
                <div>
                  <label className={labelStyle}><MapPin size={13} /> المديرية</label>
                  <select value={filters.directorate}
                    onChange={(e) => setFilters(prev => ({ ...prev, directorate: e.target.value, gender_classification: "", school_level: "" }))}
                    disabled={!filters.governing_body}
                    className={`${inputStyle} appearance-auto ${validationErrors.directorate ? 'border-[#f87171]' : ''}`}
                  >
                    <option value="">اختر المديرية</option>
                    {directorates.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {validationErrors.directorate && <div className="text-[0.75rem] text-[#dc2626] mt-1">{validationErrors.directorate}</div>}
                </div>

                {/* Gender Classification */}
                {isEducationFlow && (
                  <div>
                    <label className={labelStyle}><Users size={13} /> تصنيف المدرسة</label>
                    <select value={filters.gender_classification}
                      onChange={(e) => setFilters(prev => ({ ...prev, gender_classification: e.target.value }))}
                      disabled={!filters.directorate}
                      className={`${inputStyle} appearance-auto`}
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
                    <label className={labelStyle}><School size={13} /> مرحلة المدرسة</label>
                    <select value={filters.school_level}
                      onChange={(e) => setFilters(prev => ({ ...prev, school_level: e.target.value }))}
                      disabled={!filters.directorate}
                      className={`${inputStyle} appearance-auto`}
                    >
                      <option value="">الكل (دنيا وعليا)</option>
                      <option value="lower">أساسية دنيا</option>
                      <option value="upper">أساسية عليا</option>
                    </select>
                  </div>
                )}

                {/* Site Search */}
                <div className="col-span-2">
                  <label className={labelStyle}><Search size={13} /> {config.siteSearchLabel}</label>
                  <div className="relative">
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
                      className={`${inputStyle} ${validationErrors.training_site_id ? 'border-[#f87171]' : ''}`}
                    />
                    {isSiteMenuOpen && filters.directorate && (
                      <div className="absolute top-[calc(100%+6px)] right-0 left-0 max-h-[240px] overflow-y-auto bg-white border border-[#e2e8f0] rounded-xl z-25 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                        {filteredSchools.length === 0 ? (
                          <div className="py-4 px-4 text-[#94a3b8] text-[0.88rem] text-center">لا توجد نتائج مطابقة</div>
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
                              className={`w-full text-right border-none py-[0.7rem] px-4 text-[0.88rem] ${atCapacity ? 'text-[#94a3b8] cursor-not-allowed opacity-65' : 'text-[#1e293b] cursor-pointer'} ${isHighlighted ? 'bg-[#eff6ff]' : isSelected ? 'bg-[#f8fafc]' : 'bg-white'} ${idx < filteredSchools.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="font-semibold">{s.name}</span>
                                {atCapacity ? (
                                  <span className="text-[0.7rem] font-bold text-[#b91c1c] bg-[#fee2e2] py-[2px] px-2 rounded-full">مكتملة السعة</span>
                                ) : rem != null && Number.isFinite(rem) ? (
                                  <span className="text-[0.7rem] font-semibold text-[#0369a1]">متبقي: {rem}</span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {validationErrors.training_site_id && <div className="text-[0.75rem] text-[#dc2626] mt-1">{validationErrors.training_site_id}</div>}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className={labelStyle}><FileText size={13} /> ملاحظات (اختياري)</label>
                <textarea rows={3} value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات إضافية تريد إرفاقها بالطلب..."
                  className={`${inputStyle} resize-y`}
                />
              </div>

              {/* Validation warnings */}
              {(Object.keys(validationErrors).length > 0 || (hasSubmittedRequest && !submitTargetRequestId)) && (
                <div className="flex items-start gap-2 py-[0.85rem] px-5 bg-[#fef3c7] text-[#92400e] rounded-xl mb-4 border border-[#fde68a] text-[0.85rem]">
                  <AlertCircle size={18} className="shrink-0 mt-[2px]" />
                  <div>
                    {validationErrors.directorate && <div>• {validationErrors.directorate}</div>}
                    {validationErrors.training_site_id && <div>• {validationErrors.training_site_id}</div>}
                    {hasSubmittedRequest && !submitTargetRequestId && <div>• الطلب الحالي قيد المعالجة ولا يمكن تعديله حالياً</div>}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button type="submit" disabled={saving || (hasSubmittedRequest && !submitTargetRequestId)}
                  className="inline-flex items-center gap-[6px] py-[0.7rem] px-7 border-none rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5f8a] text-white text-[0.95rem] font-bold shadow-[0_4px_12px_rgba(30,58,95,0.3)]" style={{ cursor: saving || (hasSubmittedRequest && !submitTargetRequestId) ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? <LoadingSpinner size="button" /> : submitTargetRequestId ? <Edit3 size={18} /> : <Send size={18} />}
                  {saving ? "جاري الحفظ..." : submitTargetRequestId ? "حفظ التعديلات" : "إرسال الطلب"}
                </button>
                {editingId && (
                  <button type="button"
                    onClick={() => { setEditingId(null); setError(""); setSuccess(""); }}
                    className="inline-flex items-center gap-[6px] py-[0.7rem] px-5 bg-white text-[#64748b] border-[1.5px] border-[#e2e8f0] rounded-xl font-bold text-[0.88rem] cursor-pointer"
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
