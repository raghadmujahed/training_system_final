import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { useNotifications } from "../../hooks/useNotifications";
import useAppToast from "../../hooks/useAppToast";

export default function Notifications() {
  const toast = useAppToast();
  const {
    notifications: rawNotifications,
    notificationsLoading: loading,
    markAsRead: markAsReadHook,
    markAllAsRead: markAllAsReadHook,
  } = useNotifications({ pollUnread: false, perPage: 100 });

  const notifications = rawNotifications.map((item) => ({
    id: item.id,
    title: item.type || "إشعار",
    message: item.message || "—",
    status: item.read_at ? "approved" : "pending",
  }));

  const markAsRead = (id) => {
    markAsReadHook(id).catch((err) => console.error("Failed to mark as read:", err));
  };

  const markAllAsRead = () => {
    markAllAsReadHook().catch((err) => console.error("Failed to mark all as read:", err));
  };

  return (
    <>
      <PageHeader
        title="الإشعارات"
        subtitle="هنا تظهر آخر التنبيهات والإشعارات الخاصة بالنظام"
      />

      <div className="page-actions mb-3">
        <button className="btn-outline-custom btn-sm-custom" onClick={markAllAsRead}>
          تعليم الكل كمقروء
        </button>
      </div>

      {loading ? (
        <div className="alert-custom alert-info">جاري تحميل الإشعارات...</div>
      ) : !notifications.length ? (
        <EmptyState
          title="لا توجد إشعارات"
          description="لا يوجد أي إشعار جديد في الوقت الحالي."
        />
      ) : (
        <div className="list-clean">
          {notifications.map((item) => (
            <div key={item.id} className="list-item-card">
              <div className="panel-header">
                <div>
                  <h4 className="panel-title">{item.title}</h4>
                  <p className="panel-subtitle">{item.message}</p>
                </div>

                <StatusBadge
                  label={
                    item.status === "pending"
                      ? "جديد"
                      : item.status === "approved"
                      ? "مقروء"
                      : "نشط"
                  }
                  status={item.status}
                />
              </div>

              <div className="page-actions" style={{ marginTop: "12px" }}>
                <button
                  className="btn-light-custom btn-sm-custom"
                  onClick={() => markAsRead(item.id)}
                >
                  تعليم كمقروء
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}