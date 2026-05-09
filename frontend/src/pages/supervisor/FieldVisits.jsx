import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";
import { apiClient, unwrapSupervisorList } from "../../services/api";

const initialForm = {
  scheduled_date: "",
  visit_type: "formative",
  notes: "",
};

const initialReportForm = {
  summary: "",
  positive_points: "",
  needs_improvement: "",
  rating: "",
};

export default function FieldVisits() {
  const toast = useAppToast();
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [visits, setVisits] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reportVisitId, setReportVisitId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const studentsInSection = useMemo(
    () => students.filter((student) => String(student.section_id || "") === String(selectedSectionId || "")),
    [students, selectedSectionId]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.student_id) === String(selectedStudentId)),
    [students, selectedStudentId]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadBaseData() {
      setLoading(true);
      setError("");
      try {
        const [sectionsRes, studentsRes] = await Promise.all([
          apiClient.get("/supervisor/sections", { params: { per_page: 100 } }).then((res) => res.data),
          apiClient.get("/supervisor/students", { params: { per_page: 300 } }).then((res) => res.data),
        ]);

        if (!isMounted) return;
        setSections(unwrapSupervisorList(sectionsRes));
        setStudents(unwrapSupervisorList(studentsRes));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.message || "فشل تحميل الشعب والطلبة");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBaseData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedStudentId("");
    setVisits([]);
    setIsFormOpen(false);
    setReportVisitId(null);
  }, [selectedSectionId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setVisits([]);
      return;
    }

    loadVisits(selectedStudentId);
  }, [selectedStudentId]);

  async function loadVisits(studentId) {
    setVisitsLoading(true);
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/visits`, { params: { per_page: 200 } });
      setVisits(unwrapSupervisorList(res.data));
    } catch (err) {
      setError(err?.response?.data?.message || "فشل تحميل زيارات الطالب");
      setVisits([]);
    } finally {
      setVisitsLoading(false);
    }
  }

  const openAddForm = () => {
    if (!selectedSectionId || !selectedStudentId) {
      toast.warning("اختر الشعبة ثم الطالب أولاً");
      return;
    }

    setForm(initialForm);
    setIsFormOpen(true);
  };

  const openReportForm = (visit) => {
    setReportVisitId(visit.id);
    setReportForm({
      summary: visit.general_notes || "",
      positive_points: visit.positive_points || "",
      needs_improvement: visit.needs_improvement || "",
      rating: visit.rating || "",
    });
  };

  const closeForm = () => {
    setForm(initialForm);
    setIsFormOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReportChange = (e) => {
    const { name, value } = e.target;

    setReportForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      toast.warning("اختر الطالب أولاً");
      return;
    }

    if (!form.scheduled_date) {
      toast.warning("يرجى اختيار تاريخ الزيارة");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/supervisor/visits", {
        training_assignment_id: selectedStudent.training_assignment_id,
        student_id: selectedStudent.student_id,
        scheduled_date: form.scheduled_date,
        visit_type: form.visit_type,
        notes: form.notes || null,
      });

      await loadVisits(selectedStudent.student_id);
      toast.success("تمت جدولة الزيارة بنجاح");
      closeForm();
    } catch (err) {
      toast.apiError(err, "فشل جدولة الزيارة");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (visitId) => {
    setSaving(true);
    try {
      await apiClient.post(`/supervisor/visits/${visitId}/complete`, {
        general_notes: reportForm.summary || null,
        positive_points: reportForm.positive_points || null,
        needs_improvement: reportForm.needs_improvement || null,
        rating: reportForm.rating ? Number(reportForm.rating) : null,
      });

      setReportVisitId(null);
      setReportForm(initialReportForm);
      await loadVisits(selectedStudentId);
      toast.success("تم حفظ تقرير الزيارة");
    } catch (err) {
      toast.apiError(err, "فشل حفظ تقرير الزيارة");
    } finally {
      setSaving(false);
    }
  };

  const getBadgeClass = (status) => {
    if (status === "completed") return "badge-success";
    if (status === "cancelled") return "badge-danger";
    return "badge-primary";
  };

  const getStatusLabel = (status) => {
    if (status === "completed") return "تمت";
    if (status === "cancelled") return "ملغاة";
    return "مجدولة";
  };

  if (loading) {
    return (
      <>
        <PageHeader title="الزيارات الميدانية" subtitle="تحميل الشعب والطلبة المرتبطين بك..." />
        <LoadingSpinner size="section" text="جاري التحميل..." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="الزيارات الميدانية"
        subtitle="جدولة الزيارات الميدانية ومتابعة حالتها وتقاريرها"
      />

      {error && (
        <div className="alert-custom alert-danger mb-4">
          {error}
        </div>
      )}

      <div className="section-card mb-3">
        <div className="page-grid two-cols">
          <div className="form-group-custom">
            <label className="form-label-custom">اختر الشعبة أولاً</label>
            <select
              id="visit-section"
              name="section_id"
              className="form-select-custom"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
            >
              <option value="">— اختر الشعبة —</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.section_name || section.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-custom">
            <label className="form-label-custom">الطلبة داخل الشعبة</label>
            <select
              id="visit-student"
              name="student_id"
              className="form-select-custom"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={!selectedSectionId}
            >
              <option value="">
                {selectedSectionId ? "— اختر الطالب —" : "اختر الشعبة أولاً"}
              </option>
              {studentsInSection.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.name} {student.university_id ? `— ${student.university_id}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSectionId && !studentsInSection.length && (
          <p className="text-soft m-0">
            لا يوجد طلبة مرتبطون بهذه الشعبة ضمن إشرافك الحالي.
          </p>
        )}

        {selectedStudent && (
          <div className="alert-custom alert-info mt-3">
            <strong>{selectedStudent.name}</strong>
            <div>
              جهة التدريب: {selectedStudent.training_site?.name || selectedStudent.training_site || "غير محددة"}
              {selectedStudent.field_supervisor_name ? ` — المشرف الميداني: ${selectedStudent.field_supervisor_name}` : ""}
            </div>
          </div>
        )}
      </div>

      <div className="page-actions">
        <button className="btn-primary-custom" onClick={openAddForm} disabled={!selectedStudentId}>
          جدولة زيارة جديدة
        </button>
      </div>

      {isFormOpen && (
        <div className="form-card mb-3">
          <form onSubmit={handleSubmit}>
            <div className="page-grid two-cols">
              <div className="form-group-custom">
                <label className="form-label-custom">الطالب</label>
                <input
                  type="text"
                  name="student_name"
                  className="form-control-custom"
                  value={selectedStudent?.name || ""}
                  disabled
                />
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom">مكان الزيارة</label>
                <input
                  type="text"
                  name="training_site"
                  className="form-control-custom"
                  value={selectedStudent?.training_site?.name || selectedStudent?.training_site || "يؤخذ تلقائياً من موقع التدريب"}
                  disabled
                />
              </div>
            </div>

            <div className="page-grid two-cols">
              <div className="form-group-custom">
                <label className="form-label-custom">تاريخ الزيارة</label>
                <input
                  type="date"
                  name="scheduled_date"
                  className="form-control-custom"
                  value={form.scheduled_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom">نوع الزيارة</label>
                <select
                  name="visit_type"
                  className="form-select-custom"
                  value={form.visit_type}
                  onChange={handleChange}
                >
                  <option value="initial">زيارة أولى</option>
                  <option value="formative">متابعة / تقويم تكويني</option>
                  <option value="final">زيارة نهائية</option>
                </select>
              </div>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">ملاحظات الجدولة</label>
              <textarea
                name="notes"
                className="form-textarea-custom"
                value={form.notes}
                onChange={handleChange}
                placeholder="ملاحظات اختيارية تصل ضمن تفاصيل الزيارة..."
              />
            </div>

            <div className="table-actions">
              <button type="submit" className="btn-primary-custom" disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ الزيارة"}
              </button>

              <button
                type="button"
                className="btn-light-custom"
                onClick={closeForm}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {!selectedStudentId ? (
        <EmptyState
          title="اختر شعبة وطالباً"
          description="ستظهر الزيارات الحقيقية بعد اختيار الشعبة ثم الطالب من القوائم أعلاه."
        />
      ) : visitsLoading ? (
        <LoadingSpinner size="section" text="جاري تحميل الزيارات..." />
      ) : !visits.length ? (
        <EmptyState
          title="لا توجد زيارات ميدانية"
          description="لا توجد زيارات مجدولة لهذا الطالب بعد."
        />
      ) : (
        <div className="list-clean">
          {visits.map((visit) => (
            <div key={visit.id} className="list-item-card">
              <div className="panel-header">
                <div>
                  <h4 className="panel-title">{selectedStudent?.name || "طالب"}</h4>
                  <p className="panel-subtitle">{visit.location || selectedStudent?.training_site?.name || selectedStudent?.training_site || "موقع التدريب"}</p>
                </div>

                <span className={`badge-custom ${getBadgeClass(visit.status)}`}>
                  {getStatusLabel(visit.status)}
                </span>
              </div>

              <div className="page-actions mt-3">
                <span className="text-soft">تاريخ الزيارة: {visit.scheduled_date || visit.visit_date || "—"}</span>

                <div className="table-actions">
                  {visit.status !== "completed" && (
                    <button
                      className="btn-light-custom btn-sm-custom"
                      onClick={() => openReportForm(visit)}
                    >
                      رفع تقرير
                    </button>
                  )}
                </div>
              </div>

              {reportVisitId === visit.id && (
                <div className="form-card mt-3">
                  <div className="form-group-custom">
                    <label className="form-label-custom">ملخص الزيارة</label>
                    <textarea name="summary" className="form-textarea-custom" value={reportForm.summary} onChange={handleReportChange} />
                  </div>
                  <div className="page-grid two-cols">
                    <div className="form-group-custom">
                      <label className="form-label-custom">نقاط القوة</label>
                      <textarea name="positive_points" className="form-textarea-custom" value={reportForm.positive_points} onChange={handleReportChange} />
                    </div>
                    <div className="form-group-custom">
                      <label className="form-label-custom">يحتاج تحسين</label>
                      <textarea name="needs_improvement" className="form-textarea-custom" value={reportForm.needs_improvement} onChange={handleReportChange} />
                    </div>
                  </div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">التقييم من 1 إلى 10</label>
                    <input type="number" min="1" max="10" name="rating" className="form-control-custom" value={reportForm.rating} onChange={handleReportChange} />
                  </div>
                  <div className="table-actions">
                    <button className="btn-primary-custom" type="button" onClick={() => handleComplete(visit.id)} disabled={saving}>
                      {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                    </button>
                    <button className="btn-light-custom" type="button" onClick={() => setReportVisitId(null)}>
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {visit.general_notes || visit.positive_points || visit.needs_improvement ? (
                <div className="alert-custom alert-info mt-3">
                  <strong>تقرير الزيارة:</strong>
                  {visit.general_notes && <div>{visit.general_notes}</div>}
                  {visit.positive_points && <div>نقاط القوة: {visit.positive_points}</div>}
                  {visit.needs_improvement && <div>يحتاج تحسين: {visit.needs_improvement}</div>}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}