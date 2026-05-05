import { useCallback, useEffect, useState } from "react";
import { getStudentNotifications, itemsFromPagedResponse, markNotificationAsRead } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function NotificationsUpdates() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStudentNotifications({ params: { per_page: 50 } });
      setItems(itemsFromPagedResponse(res));
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل الإشعارات.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (n) => {
    if (n.read_at) return;
    try {
      await markNotificationAsRead(n.id);
      await load();
    } catch {
      /* تجاهل صامت */
    }
  };

  const messageFor = (n) => {
    // أولاً: الحقل message المباشر (إذا كان نصاً عربياً سليماً)
    if (n.message && /[\u0600-\u06FF]/.test(n.message)) return n.message;
    // ثانياً: data.message (Laravel built-in notifications)
    if (n.data?.message) return n.data.message;
    // ثالثاً: محاولة parse إذا كان message نص JSON
    if (n.message) {
      try {
        const parsed = JSON.parse(n.message);
        return parsed?.message || parsed?.body || n.message;
      } catch {
        return n.message;
      }
    }
    return "—";
  };

  const titleFor = (n) => {
    const typeMap = {
      training_request_approved: "تحديث على طلب التدريب",
      training_request_coordinator_review: "مراجعة منسق",
      training_request_new_from_student: "طلب جديد",
      training_request_student_resubmitted: "تعديل طلب",
      training_request_directorate_approved: "موافقة الجهة الرسمية",
      training_request_school_approved_student: "موافقة جهة التدريب",
      training_request_directorate_rejected: "رفض الجهة الرسمية",
      training_request_rejected_student: "رفض طلب",
      announcement: "إعلان جديد",
    };
    return typeMap[n.type] || n.data?.title || "تحديث جديد";
  };

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">الإشعارات والتحديثات</h1>
        <p className="page-subtitle">متابعة ما يخص طلب التدريب والتكليفات من النظام</p>
      </div>

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="section-card">
          <p className="text-muted mb-0">لا توجد إشعارات حالياً.</p>
        </div>
      ) : (
        <div className="row g-4">
          {items.map((item) => (
            <div className="col-12" key={item.id}>
              <div
                className={`panel ${item.read_at ? "" : "border-start border-primary border-3"}`}
                role="button"
                tabIndex={0}
                onClick={() => markRead(item)}
                onKeyDown={(e) => e.key === "Enter" && markRead(item)}
              >
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <h5 className="mb-2">{titleFor(item)}</h5>
                    <p className="text-muted mb-2">{messageFor(item)}</p>
                  </div>
                  <div className="text-end">
                    <small className="text-muted d-block">
                      {item.created_at?.replace("T", " ").slice(0, 16) || ""}
                    </small>
                    {!item.read_at ? (
                      <small className="text-primary">جديد — اضغط لتعليم كمقروء</small>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
