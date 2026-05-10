import { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useToast } from "../../components/Toast";
import { apiClient } from "../../services/api";

export default function Submissions() {
  const { addToast } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/supervisor/task-submissions", { 
        params: { per_page: 100 } 
      });
      const data = response.data?.data || response.data || [];
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading submissions:", err);
      setError("تعذر تحميل التسليمات");
      addToast("تعذر تحميل التسليمات، يرجى المحاولة لاحقاً", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await apiClient.patch(`/task-submissions/${id}`, { status });
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status } : item
        )
      );
      addToast("تم تحديث حالة التسليم بنجاح", "success");
    } catch (err) {
      console.error("Error updating status:", err);
      addToast("تعذر تحديث حالة التسليم", "error");
    }
  };

  const updateNotes = async (id, notes) => {
    try {
      await apiClient.patch(`/task-submissions/${id}`, { supervisor_notes: notes });
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, notes } : item
        )
      );
      addToast("تم إضافة الملاحظة بنجاح", "success");
    } catch (err) {
      console.error("Error updating notes:", err);
      addToast("تعذر إضافة الملاحظة", "error");
    }
  };

  const getBadgeClass = (status) => {
    if (status === "مقبول") return "badge-success";
    if (status === "بحاجة تعديل") return "badge-danger";
    return "badge-warning";
  };

  if (loading) return <LoadingSpinner size="page" text="جاري تحميل التسليمات..." />;
  if (error) {
    return (
      <>
        <PageHeader
          title="متابعة حلول الطلبة"
          subtitle="مراجعة حلول المهام وإضافة الملاحظات الأكاديمية عليها"
        />
        <div className="text-center p-10">
          <div className="text-[#dc3545] mb-4">⚠️ {error}</div>
          <button className="btn-primary-custom" onClick={loadSubmissions}>
            إعادة المحاولة
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="متابعة حلول الطلبة"
        subtitle="مراجعة حلول المهام وإضافة الملاحظات الأكاديمية عليها"
      />

      {!submissions.length ? (
        <EmptyState
          title="لا توجد تسليمات مهام حالياً"
          description="لم يرفع الطلبة أي حلول للمهام حتى الآن."
        />
      ) : (
        <div className="list-clean">
          {submissions.map((item) => (
            <div key={item.id} className="list-item-card">
              <div className="panel-header">
                <div>
                  <h4 className="panel-title">{item.student?.name || item.user?.name || 'طالب غير محدد'}</h4>
                  <p className="panel-subtitle">المهمة: {item.task?.title || `مهمة #${item.task_id}`}</p>
                </div>

                <span className={`badge-custom ${getBadgeClass(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="list-clean mt-3 gap-2">
                <span className="text-soft">تاريخ التسليم: {item.submitted_at || 'غير محدد'}</span>

                <div className="form-group-custom mb-0">
                  <label className="form-label-custom">ملاحظات المشرف</label>
                  <textarea
                    className="form-textarea-custom"
                    value={item.supervisor_notes || item.notes || ''}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    placeholder="أدخل ملاحظاتك على الحل..."
                  />
                </div>

                <div className="table-actions">
                  <button
                    className="btn-success-custom btn-sm-custom"
                    onClick={() => updateStatus(item.id, "approved")}
                  >
                    قبول
                  </button>

                  <button
                    className="btn-warning-custom btn-sm-custom"
                    onClick={() => updateStatus(item.id, "needs_revision")}
                  >
                    بحاجة تعديل
                  </button>

                  <button
                    className="btn-light-custom btn-sm-custom"
                    onClick={() => updateStatus(item.id, "under_review")}
                  >
                    إعادة للمراجعة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}