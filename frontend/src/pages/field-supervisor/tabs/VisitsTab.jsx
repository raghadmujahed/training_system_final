import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";
import { Calendar, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

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
  notes: "",
  rating: "",
  positive_points: "",
  needs_improvement: "",
};

export default function VisitsTab({ studentId, student }) {
  const { addToast } = useToast();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [saving, setSaving] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [reportVisitId, setReportVisitId] = useState(null);
  const [reportForm, setReportForm] = useState(reportFormInitial);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/field-supervisor/students/${studentId}/visits`);
      setVisits(Array.isArray(res.data?.data) ? res.data.data : []);
      setError("");
    } catch (err) {
      const msg = err?.response?.data?.message || "فشل تحميل الزيارات";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        training_assignment_id: student?.assignment_id || student?.training_assignment_id,
        scheduled_date: scheduleForm.scheduled_date,
        visit_type: scheduleForm.visit_type,
        notes: scheduleForm.notes,
      };
      
      await apiClient.post("/field-supervisor/visits", payload);
      setShowScheduleForm(false);
      setScheduleForm(initialScheduleForm);
      setEditingVisit(null);
      addToast("تم جدولة الزيارة بنجاح", "success");
      loadVisits();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || "فشل جدولة الزيارة";
      addToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        scheduled_date: scheduleForm.scheduled_date,
        visit_type: scheduleForm.visit_type,
        notes: scheduleForm.notes,
      };
      
      await apiClient.put(`/field-supervisor/visits/${editingVisit.id}`, payload);
      setShowScheduleForm(false);
      setScheduleForm(initialScheduleForm);
      setEditingVisit(null);
      addToast("تم تعديل الزيارة بنجاح", "success");
      loadVisits();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || "فشل تعديل الزيارة";
      addToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (visitId) => {
    if (!window.confirm("هل أنت متأكد من إلغاء هذه الزيارة؟")) return;
    
    try {
      await apiClient.delete(`/field-supervisor/visits/${visitId}`);
      addToast("تم إلغاء الزيارة بنجاح", "success");
      loadVisits();
    } catch (err) {
      const message = err?.response?.data?.message || "فشل إلغاء الزيارة";
      addToast(message, "error");
    }
  };

  const handleComplete = async (visitId) => {
    setSaving(true);
    try {
      await apiClient.post(`/field-supervisor/visits/${visitId}/complete`, {
        notes: reportForm.notes,
        rating: reportForm.rating ? Number(reportForm.rating) : null,
        positive_points: reportForm.positive_points,
        needs_improvement: reportForm.needs_improvement,
      });
      setReportVisitId(null);
      setReportForm(reportFormInitial);
      addToast("تم إكمال الزيارة بنجاح", "success");
      loadVisits();
    } catch (err) {
      const message = err?.response?.data?.message || "فشل إكمال الزيارة";
      addToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = (visit) => {
    setEditingVisit(visit);
    setScheduleForm({
      scheduled_date: visit.scheduled_date || "",
      visit_type: visit.visit_type || "formative",
      notes: visit.notes || "",
    });
    setShowScheduleForm(true);
  };

  const openReportForm = (visit) => {
    setReportVisitId(visit.id);
    setReportForm({
      notes: visit.notes || "",
      rating: visit.rating || "",
      positive_points: visit.positive_points || "",
      needs_improvement: visit.needs_improvement || "",
    });
  };

  const statusConfig = {
    planned: { label: "مجدولة", color: "#6f42c1", bg: "#ede7f6", icon: Calendar },
    scheduled: { label: "مجدولة", color: "#6f42c1", bg: "#ede7f6", icon: Calendar },
    completed: { label: "تمت", color: "#28a745", bg: "#e8f5e9", icon: CheckCircle },
    cancelled: { label: "ملغاة", color: "#dc3545", bg: "#ffebee", icon: XCircle },
  };

  if (loading) return <LoadingSpinner size="section" text="جاري تحميل الزيارات..." />;

  return (
    <div className="section-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0">جدولة الزيارات</h3>
        {!showScheduleForm && (
          <button
            type="button"
            className="btn-primary-custom"
            onClick={() => {
              setEditingVisit(null);
              setScheduleForm(initialScheduleForm);
              setShowScheduleForm(true);
            }}
          >
            <Plus size={16} className="me-1" />
            جدولة زيارة جديدة
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          {error}
        </div>
      )}

      {showScheduleForm && (
        <div className="card mb-4 border border-primary">
          <h4 className="m-0 mb-3">
            {editingVisit ? "تعديل الزيارة" : "جدولة زيارة جديدة"}
          </h4>
          <form onSubmit={editingVisit ? handleUpdate : handleSchedule}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">تاريخ الزيارة *</label>
                <input
                  type="date"
                  className="form-input-custom"
                  value={scheduleForm.scheduled_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">نوع الزيارة *</label>
                <select
                  className="form-select-custom"
                  value={scheduleForm.visit_type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, visit_type: e.target.value })}
                  required
                >
                  {visitTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea
                  className="form-textarea-custom"
                  rows={3}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="أضف ملاحظات حول الزيارة..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" className="btn-primary-custom" disabled={saving}>
                {saving ? "جاري الحفظ..." : editingVisit ? "تعديل" : "جدولة"}
              </button>
              <button
                type="button"
                className="btn-outline-custom"
                onClick={() => {
                  setShowScheduleForm(false);
                  setEditingVisit(null);
                  setScheduleForm(initialScheduleForm);
                }}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {!visits.length ? (
        <div className="text-center py-5 text-muted">
          <Calendar size={48} className="mb-3 mx-auto d-block" />
          لا توجد زيارات مجدولة
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visits.map((visit) => {
            const sc = statusConfig[visit.status] || statusConfig.planned;
            const StatusIcon = sc.icon;
            
            return (
              <div key={visit.id} className="card" style={{ borderRight: `4px solid ${sc.color}` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <StatusIcon size={16} />
                      <span className="fw-bold">{visit.visit_type}</span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: sc.bg,
                          color: sc.color,
                        }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <div className="text-muted small mb-2">
                      التاريخ: {visit.scheduled_date}
                    </div>
                    {visit.notes && (
                      <div className="small text-muted mb-2">
                        ملاحظات: {visit.notes}
                      </div>
                    )}
                    {visit.status === "completed" && visit.rating && (
                      <div className="small fw-bold text-success mb-2">
                        الدرجة: {visit.rating}/100
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {visit.status === "planned" || visit.status === "scheduled" ? (
                      <>
                        <button
                          type="button"
                          className="btn-sm btn-outline-primary"
                          onClick={() => openEditForm(visit)}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-outline-danger"
                          onClick={() => handleDelete(visit.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-success"
                          onClick={() => openReportForm(visit)}
                        >
                          <CheckCircle size={14} />
                          إكمال
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {reportVisitId === visit.id && (
                  <div className="mt-3 pt-3 border-top">
                    <h5 className="m-0 mb-3">تقرير الزيارة</h5>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleComplete(visit.id);
                      }}
                    >
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">الدرجة (0-100)</label>
                          <input
                            type="number"
                            className="form-input-custom"
                            min="0"
                            max="100"
                            value={reportForm.rating}
                            onChange={(e) => setReportForm({ ...reportForm, rating: e.target.value })}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">ملاحظات</label>
                          <textarea
                            className="form-textarea-custom"
                            rows={2}
                            value={reportForm.notes}
                            onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">نقاط القوة</label>
                          <textarea
                            className="form-textarea-custom"
                            rows={2}
                            value={reportForm.positive_points}
                            onChange={(e) => setReportForm({ ...reportForm, positive_points: e.target.value })}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">جوانب تحت التحسين</label>
                          <textarea
                            className="form-textarea-custom"
                            rows={2}
                            value={reportForm.needs_improvement}
                            onChange={(e) => setReportForm({ ...reportForm, needs_improvement: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button type="submit" className="btn-primary-custom" disabled={saving}>
                          {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                        </button>
                        <button
                          type="button"
                          className="btn-outline-custom"
                          onClick={() => {
                            setReportVisitId(null);
                            setReportForm(reportFormInitial);
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
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
