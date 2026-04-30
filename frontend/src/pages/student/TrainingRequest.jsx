import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Building2,
  MapPin,
  School,
  FileText,
  Send,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
} from "lucide-react";
import {
  createStudentTrainingRequest,
  deleteStudentTrainingRequest,
  getStudentTrainingRequests,
  getTrainingPeriods,
  getTrainingSites,
  itemsFromPagedResponse,
  updateStudentTrainingRequest,
} from "../../services/api";
import { getStudentTrack } from "../../utils/studentSection";
import { readStoredUser } from "../../utils/session";
import {
  getTrainingRequestStatusMeta,
  isTrainingRequestCancelable,
  isTrainingRequestEditable,
} from "../../utils/status";

const educationDirectorates = ["وسط", "شمال", "جنوب", "يطا"];

export default function TrainingRequest() {
  const currentUser = readStoredUser();
  const studentTrack = getStudentTrack(currentUser);
  const isEducationFlow = studentTrack === "education";
  const isPsychologyFlow = studentTrack === "psychology";
  const governingBodyLabel = isEducationFlow ? "مديرية التربية والتعليم" : "وزارة الصحة";

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
    governing_body: isEducationFlow ? "directorate_of_education" : "ministry_of_health",
    site_type: isEducationFlow ? "school" : "health_center",
    directorate: "",
    gender_classification: "",
    school_level: "",
  });

  const [formData, setFormData] = useState({
    training_site_id: "",
    notes: "",
  });

  const loadMyRequests = async () => {
    const myReqRes = await getStudentTrainingRequests();
    setMyRequests(itemsFromPagedResponse(myReqRes));
  };

  useEffect(() => {
    const loadBootstrap = async () => {
      setLoading(true);
      setError("");
      try {
        const [periodsRes] = await Promise.all([
          getTrainingPeriods({ per_page: 200 }),
        ]);
        setPeriods(itemsFromPagedResponse(periodsRes));
        await loadMyRequests();
      } catch (e) {
        setError(e?.response?.data?.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    loadBootstrap();
  }, []);

  useEffect(() => {
    if (!isEducationFlow && !isPsychologyFlow) return;
    setFilters((prev) => ({
      ...prev,
      governing_body: isEducationFlow ? "directorate_of_education" : "ministry_of_health",
      site_type: isEducationFlow ? "school" : "health_center",
      gender_classification: "",
      school_level: "",
    }));
  }, [isEducationFlow, isPsychologyFlow]);

  useEffect(() => {
    const loadDirectorates = async () => {
      if (isEducationFlow || isPsychologyFlow) {
        setDirectorates(educationDirectorates);
        return;
      }
      if (filters.governing_body !== "directorate_of_education" || filters.site_type !== "school") {
        setDirectorates([]);
        return;
      }
      try {
        const res = await getTrainingSites({
          governing_body: "directorate_of_education",
          site_type: "school",
          is_active: true,
          has_manager_account: true,
          per_page: 400,
        });
        const unique = Array.from(
          new Set(
            itemsFromPagedResponse(res)
              .map((s) => String(s?.directorate || "").trim())
              .filter(Boolean)
          )
        );
        setDirectorates(unique);
      } catch {
        setDirectorates([]);
      }
    };
    loadDirectorates();
  }, [filters.governing_body, filters.site_type, isEducationFlow, isPsychologyFlow]);

  useEffect(() => {
    const loadSchools = async () => {
      setFormData((prev) => ({ ...prev, training_site_id: "" }));
      if (!filters.governing_body || !filters.site_type) {
        setSchools([]);
        return;
      }
      if (!filters.directorate) {
        setSchools([]);
        return;
      }
      try {
        const params = {
          governing_body: filters.governing_body,
          site_type: filters.site_type,
          directorate: filters.directorate,
          is_active: true,
          has_manager_account: true,
          per_page: 200,
        };
        if (filters.gender_classification) {
          params.gender_classification = filters.gender_classification;
        }
        if (filters.school_level) {
          params.school_level = filters.school_level;
        }
        const res = await getTrainingSites(params);
        setSchools(itemsFromPagedResponse(res));
      } catch (e) {
        setError(e?.response?.data?.message || "فشل تحميل المدارس");
      }
    };
    loadSchools();
  }, [filters.governing_body, filters.site_type, filters.directorate, filters.gender_classification, filters.school_level]);

  const validationErrors = useMemo(() => {
    const errs = {};
    if (!filters.directorate) {
      errs.directorate = "اختر المديرية أولاً";
    }
    if (!formData.training_site_id) errs.training_site_id = "اختر المدرسة/جهة التدريب";
    return errs;
  }, [formData, filters.directorate, filters.governing_body, filters.gender_classification]);

  const normalizeArabicSearch = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .trim();

  const filteredSchools = useMemo(() => {
    const q = normalizeArabicSearch(siteSearch);
    if (!q) return schools;
    const starts = [];
    const includes = [];
    schools.forEach((s) => {
      const normalizedName = normalizeArabicSearch(s?.name);
      if (normalizedName.startsWith(q)) {
        starts.push(s);
      } else if (normalizedName.includes(q)) {
        includes.push(s);
      }
    });
    return [...starts, ...includes];
  }, [schools, siteSearch]);
  const latestRequest = useMemo(() => {
    const activeRequests = myRequests.filter(r => !r.deleted_at && !r.deletedAt);
    return activeRequests[0] || null;
  }, [myRequests]);
  const hasSubmittedRequest = useMemo(() => Boolean(latestRequest?.id), [latestRequest]);
  const canEditLatestRequest = useMemo(() => {
    if (!latestRequest) return false;
    return isTrainingRequestEditable(latestRequest.book_status);
  }, [latestRequest]);
  const canCancelLatestRequest = useMemo(() => {
    if (!latestRequest) return false;
    return isTrainingRequestCancelable(latestRequest.book_status);
  }, [latestRequest]);
  const submitTargetRequestId = useMemo(() => {
    if (editingId) return editingId;
    if (hasSubmittedRequest && canEditLatestRequest) return latestRequest?.id || null;
    return null;
  }, [editingId, hasSubmittedRequest, canEditLatestRequest, latestRequest]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.keys(validationErrors).length > 0) {
      setError(Object.values(validationErrors).join("، "));
      return;
    }
    if (hasSubmittedRequest && !submitTargetRequestId) {
      setError("الطلب الحالي لا يمكن تعديله في هذه المرحلة.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const activePeriod =
        periods.find((period) => Boolean(period?.is_active)) || periods[0] || null;
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const fallbackStart = today.toISOString().slice(0, 10);
      const fallbackEnd = tomorrow.toISOString().slice(0, 10);

      const payload = {
        training_site_id: Number(formData.training_site_id),
        training_period_id: activePeriod?.id ? Number(activePeriod.id) : null,
        governing_body: filters.governing_body,
        directorate: filters.directorate || null,
        start_date: activePeriod?.start_date || fallbackStart,
        end_date: activePeriod?.end_date || fallbackEnd,
        notes: formData.notes || null,
      };

      if (submitTargetRequestId) {
        try {
          await updateStudentTrainingRequest(submitTargetRequestId, payload);
          setEditingId(null);
          setSuccess("تم حفظ التعديلات على الطلب بنجاح.");
        } catch (updateErr) {
          // إذا الطلب محذوف (404)، نعيد المحاولة كطلب جديد
          if (updateErr?.response?.status === 404) {
            setEditingId(null);
            await createStudentTrainingRequest(payload);
            setSuccess("تم إرسال الطلب بنجاح (طلب جديد).");
          } else {
            throw updateErr;
          }
        }
      } else {
        await createStudentTrainingRequest(payload);
        setSuccess("تم إرسال الطلب بنجاح.");
      }

      setFormData({
        training_site_id: "",
        notes: "",
      });
      setSiteSearch("");
      await loadMyRequests();
    } catch (e) {
      if (e?.response?.status === 409) {
        await loadMyRequests();
      }
      setError(e?.response?.data?.message || "فشل حفظ الطلب");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (requestItem) => {
    const site = requestItem.training_site || requestItem.trainingSite;
    const studentRow = requestItem.students?.[0] || null;

    setEditingId(requestItem.id);
    setFilters((prev) => ({
      ...prev,
      governing_body: site?.governing_body || requestItem.governing_body || prev.governing_body,
      site_type: site?.site_type || prev.site_type,
      directorate: site?.directorate || "",
      gender_classification: site?.gender_classification || "",
      school_level: site?.school_level || "",
    }));
    setFormData({
      training_site_id: site?.id ? String(site.id) : "",
      notes: studentRow?.notes || "",
    });
    setSiteSearch(site?.name || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelLatestRequest = async () => {
    if (!latestRequest?.id) return;
    const ok = window.confirm("هل تريد إلغاء الطلب الحالي؟");
    if (!ok) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await deleteStudentTrainingRequest(latestRequest.id);
      setEditingId(null);
      setFormData({ training_site_id: "", notes: "" });
      setSiteSearch("");
      setFilters((prev) => ({
        ...prev,
        directorate: "",
      }));
      setSchools([]);
      await loadMyRequests();
      setSuccess("تم إلغاء الطلب بنجاح. يمكنك الآن إرسال طلب جديد.");
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر إلغاء الطلب");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const meta = getTrainingRequestStatusMeta(status);
    const iconMap = {
      "badge-danger": XCircle,
      "badge-warning": AlertCircle,
      "badge-success": CheckCircle2,
      "badge-primary": Send,
      "badge-info": ClipboardList,
    };
    const Icon = iconMap[meta.className] || Loader2;
    
    return (
      <span className={`badge-custom ${meta.className} d-inline-flex align-items-center gap-1`}>
        <Icon size={14} />
        {meta.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="section-card">
        <div className="text-center py-4">
          <Loader2 size={32} className="animate-spin text-primary mb-2" />
          <p className="text-muted mb-0">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="content-header">
        <h1 className="page-title d-flex align-items-center gap-2">
          <ClipboardList size={28} />
          طلب التدريب الميداني
        </h1>
        <p className="page-subtitle">
          <Building2 size={14} className="me-1" />
          اختر المديرية ثم جهة التدريب التابعة لها لإرسال طلبك
        </p>
      </div>

      {error && (
        <div className="alert-custom alert-danger d-flex align-items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert-custom alert-success d-flex align-items-center gap-2">
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {hasSubmittedRequest ? (
        <div className="section-card mb-3">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0 d-flex align-items-center gap-2 fw-bold">
              <span style={{
                background: "linear-gradient(135deg, #e8f0fe, #c7d9fc)",
                borderRadius: "10px",
                padding: "7px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Building2 size={18} style={{ color: "var(--primary)" }} />
              </span>
              حالة الطلب الحالي
            </h5>
            {getStatusBadge(latestRequest.book_status)}
          </div>

          <div className="row g-3">
            {/* حالة الطلب */}
            <div className="col-md-3 col-6">
              <div style={{
                background: "#fff",
                border: "1px solid #e9ecef",
                borderRadius: "14px",
                padding: "16px",
                borderRight: "4px solid var(--primary)",
                height: "100%",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <ClipboardList size={13} />
                  حالة الطلب
                </div>
                <div>{getStatusBadge(latestRequest.book_status)}</div>
              </div>
            </div>

            {/* الجهة المعتمدة */}
            <div className="col-md-3 col-6">
              <div style={{
                background: "#fff",
                border: "1px solid #e9ecef",
                borderRadius: "14px",
                padding: "16px",
                borderRight: "4px solid var(--success)",
                height: "100%",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Building2 size={13} />
                  الجهة المعتمدة
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--secondary)", lineHeight: 1.4 }}>
                  {latestRequest.training_site?.name || "—"}
                </div>
              </div>
            </div>

            {/* المديرية */}
            <div className="col-md-3 col-6">
              <div style={{
                background: "#fff",
                border: "1px solid #e9ecef",
                borderRadius: "14px",
                padding: "16px",
                borderRight: "4px solid var(--accent)",
                height: "100%",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <MapPin size={13} />
                  المديرية
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--secondary)" }}>
                  {latestRequest.training_site?.directorate || "—"}
                </div>
              </div>
            </div>

            {/* المشرف/المرشد */}
            <div className="col-md-3 col-6">
              <div style={{
                background: "#fff",
                border: "1px solid #e9ecef",
                borderRadius: "14px",
                padding: "16px",
                borderRight: "4px solid var(--warning)",
                height: "100%",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Users size={13} />
                  المشرف/المرشد
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--secondary)" }}>
                  {latestRequest.students?.[0]?.assigned_teacher?.name || (
                    <span style={{ color: "var(--text-soft)", fontWeight: 500, fontSize: "0.88rem" }}>غير محدد بعد</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(latestRequest.rejection_reason ||
            latestRequest.coordinator_rejection_reason ||
            latestRequest.needs_edit_reason) && (
            <div className="alert-custom alert-warning mt-3 d-flex align-items-start gap-2">
              <AlertCircle size={20} className="mt-1 flex-shrink-0" />
              <div>
                <strong>ملاحظات على الطلب:</strong>
                <p className="mb-0 mt-1">
                  {latestRequest.rejection_reason ||
                    latestRequest.coordinator_rejection_reason ||
                    latestRequest.needs_edit_reason}
                </p>
              </div>
            </div>
          )}

          <div className="mt-3 d-flex gap-2">
            {canEditLatestRequest ? (
              <button
                type="button"
                className="btn-primary-custom d-inline-flex align-items-center gap-2"
                onClick={() => startEdit(latestRequest)}
                disabled={saving}
              >
                <Edit3 size={16} />
                تعديل نفس الطلب
              </button>
            ) : null}
            {canCancelLatestRequest ? (
              <button
                type="button"
                className="btn-outline-custom d-inline-flex align-items-center gap-2"
                onClick={handleCancelLatestRequest}
                disabled={saving}
                style={{ borderColor: "#dc3545", color: "#dc3545" }}
              >
                <Trash2 size={16} />
                إلغاء الطلب
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {(!hasSubmittedRequest || editingId) && (
      <div className="section-card">
        <h5 className="mb-3 d-flex align-items-center gap-2">
          <Send size={20} className="text-primary" />
          {editingId ? "تعديل الطلب" : hasSubmittedRequest ? "إعادة إرسال الطلب" : "إرسال طلب جديد"}
        </h5>
        <div className="alert-custom alert-info mb-3 d-flex align-items-center gap-2">
          <AlertCircle size={18} />
          {hasSubmittedRequest && !canEditLatestRequest
            ? "تم إرسال طلبك مسبقًا. يمكنك فقط متابعة الحالة حتى يتم رفض الطلب."
            : "اختر المديرية أولاً، ثم ابحث واختر جهة التدريب."}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-2">
              <div className="form-field">
                <label
                  htmlFor="training-request-governing-body"
                  className="form-label-custom d-flex align-items-center gap-1"
                >
                  <Building2 size={14} />
                  الجهة الرسمية
                </label>
                <input
                  id="training-request-governing-body"
                  className="form-input-custom bg-light"
                  value={governingBodyLabel}
                  readOnly
                />
              </div>
            </div>

            <div className="col-md-2">
              <div className="form-field">
                <label
                  htmlFor="training-request-directorate"
                  className="form-label-custom d-flex align-items-center gap-1"
                >
                  <MapPin size={14} />
                  المديرية
                </label>
                <select
                  id="training-request-directorate"
                  className={`form-select-custom ${validationErrors.directorate ? "is-invalid" : ""}`}
                  value={filters.directorate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, directorate: e.target.value, gender_classification: "", school_level: "" }))}
                  disabled={!filters.governing_body}
                >
                  <option value="">اختر المديرية</option>
                  {directorates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {validationErrors.directorate && (
                  <div className="invalid-feedback">{validationErrors.directorate}</div>
                )}
              </div>
            </div>

            {isEducationFlow && (
              <div className="col-md-2">
                <div className="form-field">
                  <label
                    htmlFor="training-request-gender"
                    className="form-label-custom d-flex align-items-center gap-1"
                  >
                    <Users size={14} />
                    تصنيف المدرسة
                  </label>
                  <select
                    id="training-request-gender"
                    className="form-select-custom"
                    value={filters.gender_classification}
                    onChange={(e) => setFilters((prev) => ({ ...prev, gender_classification: e.target.value }))}
                    disabled={!filters.directorate}
                  >
                    <option value="">الكل (ذكور وإناث)</option>
                    <option value="boys">مدرسة ذكور</option>
                    <option value="girls">مدرسة إناث</option>
                    <option value="mixed">مدرسة مختلطة</option>
                  </select>
                </div>
              </div>
            )}

            {isEducationFlow && (
              <div className="col-md-2">
                <div className="form-field">
                  <label
                    htmlFor="training-request-level"
                    className="form-label-custom d-flex align-items-center gap-1"
                  >
                    <School size={14} />
                    مرحلة المدرسة
                  </label>
                  <select
                    id="training-request-level"
                    className="form-select-custom"
                    value={filters.school_level}
                    onChange={(e) => setFilters((prev) => ({ ...prev, school_level: e.target.value }))}
                    disabled={!filters.directorate}
                  >
                    <option value="">الكل (دنيا وعليا)</option>
                    <option value="lower">أساسية دنيا</option>
                    <option value="upper">أساسية عليا</option>
                  </select>
                </div>
              </div>
            )}

            <div className="col-md-4">
              <div className="form-field">
                <label
                  htmlFor="training-request-site-search"
                  className="form-label-custom d-flex align-items-center gap-1"
                >
                  <School size={14} />
                  {isEducationFlow ? "المدرسة" : "جهة التدريب"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="training-request-site-search"
                  className={`form-input-custom ${validationErrors.training_site_id ? "is-invalid" : ""}`}
                  placeholder={!filters.directorate ? "اختر المديرية أولاً" : "اكتب للبحث ثم اختر الجهة"}
                  value={siteSearch}
                  onChange={(e) => {
                    setSiteSearch(e.target.value);
                    setIsSiteMenuOpen(true);
                    setHighlightedSiteIndex(-1);
                    setFormData((prev) => ({ ...prev, training_site_id: "" }));
                  }}
                  onFocus={() => {
                    if (filters.directorate) setIsSiteMenuOpen(true);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsSiteMenuOpen(false), 120);
                  }}
                  onKeyDown={(e) => {
                    if (!isSiteMenuOpen || filteredSchools.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedSiteIndex((prev) =>
                        prev < filteredSchools.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedSiteIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredSchools.length - 1
                      );
                    } else if (e.key === "Enter" && highlightedSiteIndex >= 0) {
                      e.preventDefault();
                      const picked = filteredSchools[highlightedSiteIndex];
                      if (picked) {
                        setFormData((prev) => ({ ...prev, training_site_id: String(picked.id) }));
                        setSiteSearch(picked.name || "");
                        setIsSiteMenuOpen(false);
                      }
                    } else if (e.key === "Escape") {
                      setIsSiteMenuOpen(false);
                    }
                  }}
                  disabled={!filters.directorate}
                />

                {isSiteMenuOpen && filters.directorate ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      left: 0,
                      maxHeight: "240px",
                      overflowY: "auto",
                      background: "#fff",
                      border: "1px solid #dee2e6",
                      borderRadius: "8px",
                      zIndex: 25,
                      boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
                    }}
                  >
                    {filteredSchools.length === 0 ? (
                      <div style={{ padding: "10px 12px", color: "#6c757d", fontSize: "0.9rem" }}>
                        لا توجد نتائج مطابقة
                      </div>
                    ) : (
                      filteredSchools.map((s, idx) => {
                        const isSelected = String(s.id) === String(formData.training_site_id);
                        const isHighlighted = idx === highlightedSiteIndex;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, training_site_id: String(s.id) }));
                              setSiteSearch(s.name || "");
                              setIsSiteMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "right",
                              border: "none",
                              background: isHighlighted ? "#f1f7ff" : isSelected ? "#f8f9fa" : "#fff",
                              padding: "10px 12px",
                              fontSize: "0.92rem",
                              color: "#212529",
                              cursor: "pointer",
                            }}
                          >
                            {s.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="form-field">
                <label
                  htmlFor="training-request-notes"
                  className="form-label-custom d-flex align-items-center gap-1"
                >
                  <FileText size={14} />
                  ملاحظات (اختياري)
                </label>
                <textarea
                  id="training-request-notes"
                  rows={3}
                  className="form-textarea-custom"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات إضافية تريد إرفاقها بالطلب..."
                />
              </div>
            </div>
          </div>

          {(Object.keys(validationErrors).length > 0 || (hasSubmittedRequest && !submitTargetRequestId)) && (
            <div className="alert-custom alert-warning mb-3 d-flex align-items-start gap-2">
              <AlertCircle size={18} className="mt-1 flex-shrink-0" />
              <div>
                {validationErrors.directorate && <div>• {validationErrors.directorate}</div>}
                {validationErrors.training_site_id && <div>• {validationErrors.training_site_id}</div>}
                {hasSubmittedRequest && !submitTargetRequestId && (
                  <div>• الطلب الحالي قيد المعالجة ولا يمكن تعديله حالياً</div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 d-flex gap-2">
            <button
              type="submit"
              className="btn-primary-custom d-inline-flex align-items-center gap-2"
              disabled={saving || (hasSubmittedRequest && !submitTargetRequestId)}
            >
              {saving && <Loader2 size={16} className="animate-spin me-1" />}
              {!saving && submitTargetRequestId && <Edit3 size={16} className="me-1" />}
              {!saving && !submitTargetRequestId && <Send size={16} className="me-1" />}
              {saving ? "جاري الحفظ..." : submitTargetRequestId ? "حفظ التعديلات" : "إرسال الطلب"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn-outline-custom d-inline-flex align-items-center gap-2"
                onClick={() => {
                  setEditingId(null);
                  setError("");
                  setSuccess("");
                }}
              >
                <XCircle size={16} />
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>
    )}
    </>
  );
}
