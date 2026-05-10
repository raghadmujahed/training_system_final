import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

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

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="m-0">🏫 الزيارات الميدانية</h4>
        <button className="btn-primary-custom" onClick={() => setShowScheduleForm(true)}>+ جدولة زيارة</button>
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <div className="section-card mb-4 border border-[#6f42c1]">
          <h5 className="m-0 mb-4">🗓️ جدولة زيارة جديدة</h5>
          <form onSubmit={handleSchedule}>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="col-span-2">
                <label className="form-label-custom">ملاحظات</label>
                <textarea id="visit-notes" name="notes" className="form-textarea-custom" rows={2} value={scheduleForm.notes} onChange={(e) => setScheduleForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn-primary-custom" type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : "💾 جدولة"}</button>
              <button type="button" className="py-2 px-4 rounded-md border border-[#999] bg-white cursor-pointer" onClick={() => setShowScheduleForm(false)}>إلغاء</button>
            </div>
            <small className="block mt-2 text-[#999] text-[0.75rem]">
              * سيتم استخدام موقع تدريب الطالب تلقائياً وإرسال إشعار للطالب والمشرف الميداني
            </small>
          </form>
        </div>
      )}

      {/* Visits List */}
      {!visits.length ? (
        <div className="text-center p-10 text-[#999]">
          <div className="text-[2rem] mb-3">📭</div>
          لا توجد زيارات مجدولة
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visits.map((visit) => {
            const sc = statusConfig[visit.status] || statusConfig.scheduled;
            return (
              <div key={visit.id} className="bg-white border border-[#e9ecef] rounded-[10px] p-4" style={{ borderRight: `4px solid ${sc.color}` }}>
                <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                  <div>
                    <h5 className="m-0 mb-1 flex items-center gap-[6px]">{sc.icon} زيارة {visit.visit_type || ""}</h5>
                    <span className="text-[0.78rem] text-[#666]">التاريخ: {visit.scheduled_date || visit.visit_date || "—"}</span>
                  </div>
                  <span className="py-1 px-3 rounded-2xl text-[0.78rem] font-semibold" style={{ color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
                </div>

                {visit.location && <p className="m-0 mb-2 text-[0.85rem] text-[#555]">الموقع: {visit.location}</p>}
                {visit.notes && <div className="bg-[#f8f9fa] rounded-md p-2 mb-2 text-[0.85rem]">{visit.notes}</div>}

                {/* Report Form for completed visits */}
                {visit.status === "completed" && visit.rating && (
                  <div className="bg-[#e8f5e9] rounded-lg p-3 mt-2">
                    <div className="text-[0.85rem] font-semibold text-[#28a745] mb-[6px]">📊 تقرير الزيارة</div>
                    {visit.positive_points && <div className="text-[0.82rem] text-[#555]">💪 نقاط القوة: {visit.positive_points}</div>}
                    {visit.needs_improvement && <div className="text-[0.82rem] text-[#555]">⚠️ يحتاج تحسين: {visit.needs_improvement}</div>}
                    {visit.general_notes && <div className="text-[0.82rem] text-[#555]">📋 ملاحظات: {visit.general_notes}</div>}
                    <div className="text-[0.9rem] font-semibold text-[#28a745] mt-[6px]">التقييم: {visit.rating}/10</div>
                  </div>
                )}

                {/* Report Form for scheduled visits */}
                {reportVisitId === visit.id && (
                  <div className="mt-3 bg-[#f8f9fa] p-4 rounded-lg">
                    <h5 className="m-0 mb-3">📝 تقرير الزيارة</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
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
                      <div className="col-span-2">
                        <label className="form-label-custom">التوصيات</label>
                        <input id="report-recommendations" name="recommendations" className="form-input-custom" value={reportForm.recommendations} onChange={(e) => setReportForm((p) => ({ ...p, recommendations: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label-custom">التقييم (1–10)</label>
                        <input id="report-rating" name="rating" type="number" min="1" max="10" className="form-input-custom" value={reportForm.rating} onChange={(e) => setReportForm((p) => ({ ...p, rating: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="btn-primary-custom" onClick={() => handleComplete(visit.id)} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ التقرير"}</button>
                      <button className="py-2 px-4 rounded-md border border-[#999] bg-white cursor-pointer" onClick={() => setReportVisitId(null)}>إلغاء</button>
                    </div>
                  </div>
                )}

                {visit.status === "scheduled" && reportVisitId !== visit.id && (
                  <button className="text-[0.82rem] py-[6px] px-[14px] rounded-md border border-[#28a745] bg-[#28a745] text-white cursor-pointer hover:bg-[#218838] mt-2" onClick={() => setReportVisitId(visit.id)}>
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
