import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";

const initialScheduleForm = {
  scheduled_date: "",
  visit_type: "formative",
  notes: "",
};

const visitTypes = [
  { value: "initial", label: "زيارة أولى" },
  { value: "formative", label: "متابعة / تقويم تكويني" },
  { value: "final", label: "زيارة نهائية" },
];

const reportFormInitial = {
  summary: "",
  strengths: "",
  needs_improvement: "",
  recommendations: "",
  rating: "",
};

export default function FieldVisitsTab({ studentId, student }) {
  const { addToast } = useToast();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [saving, setSaving] = useState(false);
  const [reportVisitId, setReportVisitId] = useState(null);
  const [reportForm, setReportForm] = useState(reportFormInitial);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/visits`, { params: { per_page: 200 } });
      setVisits(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError("فشل تحميل الزيارات");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadVisits(); }, [loadVisits]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post("/supervisor/visits", {
        training_assignment_id: student?.training_assignment_id || student?.assignment_id,
        student_id: studentId,
        scheduled_date: scheduleForm.scheduled_date,
        visit_type: scheduleForm.visit_type,
        notes: scheduleForm.notes,
      });
      setShowScheduleForm(false);
      setScheduleForm(initialScheduleForm);
      addToast("تم جدولة الزيارة بنجاح", "success");
      loadVisits();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || "فشل جدولة الزيارة";
      addToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (visitId) => {
    setSaving(true);
    try {
      await apiClient.post(`/supervisor/visits/${visitId}/complete`, {
        general_notes: [reportForm.summary, reportForm.recommendations].filter(Boolean).join("\n"),
        rating: reportForm.rating ? Number(reportForm.rating) : null,
        positive_points: reportForm.strengths,
        needs_improvement: reportForm.needs_improvement,
      });
      setReportVisitId(null);
      setReportForm(reportFormInitial);
      addToast("تم حفظ تقرير الزيارة بنجاح", "success");
      loadVisits();
    } catch {
      addToast("فشل حفظ تقرير الزيارة", "error");
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = {
    scheduled: { label: "مجدولة", color: "#6f42c1", bg: "#ede7f6", icon: "🗓️" },
    completed: { label: "تمت", color: "#28a745", bg: "#e8f5e9", icon: "✅" },
    cancelled: { label: "ملغاة", color: "#dc3545", bg: "#ffebee", icon: "❌" },
    in_progress: { label: "قيد التنفيذ", color: "#ffc107", bg: "#fff8e1", icon: "⏳" },
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}>⏳ جاري التحميل...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h4 style={{ margin: 0 }}>🏫 الزيارات الميدانية</h4>
        <button className="btn-primary-custom" onClick={() => setShowScheduleForm(true)}>+ جدولة زيارة</button>
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <div className="section-card" style={{ marginBottom: "16px", border: "1px solid #6f42c1" }}>
          <h5 style={{ margin: "0 0 16px" }}>🗓️ جدولة زيارة جديدة</h5>
          <form onSubmit={handleSchedule}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="form-label-custom">تاريخ الزيارة *</label>
                <input id="visit-scheduled-date" name="scheduled_date" type="date" className="form-input-custom" value={scheduleForm.scheduled_date} onChange={(e) => setScheduleForm((p) => ({ ...p, scheduled_date: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label-custom">نوع الزيارة</label>
                <select id="visit-type" name="visit_type" className="form-select-custom" value={scheduleForm.visit_type} onChange={(e) => setScheduleForm((p) => ({ ...p, visit_type: e.target.value }))}>
                  {visitTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label-custom">ملاحظات</label>
                <textarea id="visit-notes" name="notes" className="form-textarea-custom" rows={2} value={scheduleForm.notes} onChange={(e) => setScheduleForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button className="btn-primary-custom" type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : "💾 جدولة"}</button>
              <button type="button" style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #999", background: "#fff", cursor: "pointer" }} onClick={() => setShowScheduleForm(false)}>إلغاء</button>
            </div>
            <small style={{ display: "block", marginTop: "8px", color: "#999", fontSize: "0.75rem" }}>
              * سيتم استخدام موقع تدريب الطالب تلقائياً وإرسال إشعار للطالب والمشرف الميداني
            </small>
          </form>
        </div>
      )}

      {/* Visits List */}
      {!visits.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          لا توجد زيارات مجدولة
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {visits.map((visit) => {
            const sc = statusConfig[visit.status] || statusConfig.scheduled;
            return (
              <div key={visit.id} style={{ background: "#fff", border: "1px solid #e9ecef", borderRadius: "10px", padding: "16px", borderRight: `4px solid ${sc.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h5 style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: "6px" }}>{sc.icon} زيارة {visit.visit_type || ""}</h5>
                    <span style={{ fontSize: "0.78rem", color: "#666" }}>التاريخ: {visit.scheduled_date || visit.visit_date || "—"}</span>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "0.78rem", fontWeight: "600", color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
                </div>

                {visit.location && <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#555" }}>الموقع: {visit.location}</p>}
                {visit.notes && <div style={{ background: "#f8f9fa", borderRadius: "6px", padding: "8px", marginBottom: "8px", fontSize: "0.85rem" }}>{visit.notes}</div>}

                {/* Report Form for completed visits */}
                {visit.status === "completed" && visit.rating && (
                  <div style={{ background: "#e8f5e9", borderRadius: "8px", padding: "12px", marginTop: "8px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#28a745", marginBottom: "6px" }}>📊 تقرير الزيارة</div>
                    {visit.positive_points && <div style={{ fontSize: "0.82rem", color: "#555" }}>💪 نقاط القوة: {visit.positive_points}</div>}
                    {visit.needs_improvement && <div style={{ fontSize: "0.82rem", color: "#555" }}>⚠️ يحتاج تحسين: {visit.needs_improvement}</div>}
                    {visit.general_notes && <div style={{ fontSize: "0.82rem", color: "#555" }}>📋 ملاحظات: {visit.general_notes}</div>}
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#28a745", marginTop: "6px" }}>التقييم: {visit.rating}/10</div>
                  </div>
                )}

                {/* Report Form for scheduled visits */}
                {reportVisitId === visit.id && (
                  <div style={{ marginTop: "12px", background: "#f8f9fa", padding: "16px", borderRadius: "8px" }}>
                    <h5 style={{ margin: "0 0 12px" }}>📝 تقرير الزيارة</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label className="form-label-custom">ملخص الزيارة</label>
                        <textarea id="report-summary" name="summary" className="form-textarea-custom" rows={2} value={reportForm.summary} onChange={(e) => setReportForm((p) => ({ ...p, summary: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label-custom">نقاط القوة</label>
                        <textarea id="report-strengths" name="strengths" className="form-textarea-custom" rows={2} value={reportForm.strengths} onChange={(e) => setReportForm((p) => ({ ...p, strengths: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label-custom">نقاط الضعف</label>
                        <textarea id="report-needs-improvement" name="needs_improvement" className="form-textarea-custom" rows={2} value={reportForm.needs_improvement} onChange={(e) => setReportForm((p) => ({ ...p, needs_improvement: e.target.value }))} />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label className="form-label-custom">التوصيات</label>
                        <input id="report-recommendations" name="recommendations" className="form-input-custom" value={reportForm.recommendations} onChange={(e) => setReportForm((p) => ({ ...p, recommendations: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label-custom">التقييم (1-10)</label>
                        <input id="report-rating" name="rating" type="number" min="1" max="10" className="form-input-custom" value={reportForm.rating} onChange={(e) => setReportForm((p) => ({ ...p, rating: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button className="btn-primary-custom" onClick={() => handleComplete(visit.id)} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ التقرير"}</button>
                      <button style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #999", background: "#fff", cursor: "pointer" }} onClick={() => setReportVisitId(null)}>إلغاء</button>
                    </div>
                  </div>
                )}

                {visit.status === "scheduled" && reportVisitId !== visit.id && (
                  <button style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #28a745", background: "#fff", color: "#28a745", cursor: "pointer", marginTop: "8px" }} onClick={() => setReportVisitId(visit.id)}>
                    📝 إدخال تقرير الزيارة
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
