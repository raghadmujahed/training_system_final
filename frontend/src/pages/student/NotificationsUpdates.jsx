import { useCallback, useEffect, useState } from "react";
import { getStudentNotifications, itemsFromPagedResponse, markNotificationAsRead } from "../../services/api";
import { Bell } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";

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
    if (n.message && /[\u0600-\u06FF]/.test(n.message)) return n.message;
    if (n.data?.message) return n.data.message;
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
      <PageHeader title="الإشعارات والتحديثات" subtitle="متابعة ما يخص طلب التدريب والتكليفات من النظام" icon={Bell} />

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : error ? (
        <div className="bg-danger/8 border border-danger/20 text-danger rounded-[16px] p-4">{error}</div>
      ) : items.length === 0 ? (
        <EmptyState title="لا توجد إشعارات" description="لا توجد إشعارات حالياً." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[16px] p-4 cursor-pointer transition-all hover:shadow-sm ${!item.read_at ? "border-r-4 border-r-accent" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => markRead(item)}
              onKeyDown={(e) => e.key === "Enter" && markRead(item)}
            >
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h5 className="m-0 mb-2 text-secondary font-bold">{titleFor(item)}</h5>
                  <p className="m-0 mb-2 text-text-faint">{messageFor(item)}</p>
                </div>
                <div className="text-left">
                  <small className="block text-text-faint">
                    {item.created_at?.replace("T", " ").slice(0, 16) || ""}
                  </small>
                  {!item.read_at ? (
                    <small className="text-accent font-bold">جديد — اضغط لتعليم كمقروء</small>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
