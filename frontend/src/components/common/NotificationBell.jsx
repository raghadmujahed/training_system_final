import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import { normalizeRole, ROLES } from "../../utils/roles";
import { readStoredToken, readStoredUser } from "../../utils/session";

const notificationIcons = {
  training_request_new_from_student: "🔔",
  training_request_student_resubmitted: "📝",
  training_request_coordinator_review: "📋",
  training_request_received_from_coordinator: "📨",
  training_request_directorate_approved: "✅",
  training_request_received_from_directorate: "📬",
  training_request_school_approved: "🏫",
  training_request_school_approved_student: "🎓",
  training_request_school_rejected: "🚫",
  training_request_directorate_rejected: "❌",
  training_request_rejected_student: "❌",
  enrollment_added: "🎓",
  enrollment_removed: "➖",
  enrollment_status_changed: "🔄",
  section_supervisor_assigned: "👨‍🏫",
  task_assigned: "📌",
  task_submitted: "📤",
  task_graded: "💯",
  default: "🔔",
};

const notificationTitles = {
  training_request_new_from_student: "طلب جديد من طالب",
  training_request_student_resubmitted: "تعديل طلب من طالب",
  training_request_coordinator_review: "مراجعة منسق",
  training_request_received_from_coordinator: "طلب من المنسق",
  training_request_directorate_approved: "موافقة الجهة الرسمية",
  training_request_received_from_directorate: "طلب من الجهة الرسمية",
  training_request_school_approved: "موافقة جهة التدريب",
  training_request_school_approved_student: "موافقة جهة التدريب",
  training_request_school_rejected: "رفض جهة التدريب",
  training_request_directorate_rejected: "رفض الجهة الرسمية",
  training_request_rejected_student: "رفض طلب",
  enrollment_added: "تم تسجيلك في شعبة",
  enrollment_removed: "تمت إزالتك من شعبة",
  enrollment_status_changed: "تغيّرت حالة تسجيلك",
  section_supervisor_assigned: "تعيين مشرف أكاديمي",
  task_assigned: "مهمة جديدة",
  task_submitted: "تسليم مهمة",
  task_graded: "تقييم مهمة",
  default: "إشعار جديد",
};

export default function NotificationBell() {
  const {
    unreadCount,
    notifications,
    notificationsLoading: loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    decrementUnread,
  } = useNotifications({ pollUnread: true, perPage: 5 });

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const hasSession = () => {
    const token = readStoredToken();
    return Boolean(token && token !== "undefined" && token !== "null");
  };

  useEffect(() => {
    if (isOpen) fetchNotifications(5);
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = (event, id) => {
    event.stopPropagation();
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => markAllAsRead();

  const markReadSilently = (notification) => {
    if (notification?.id && !notification?.read_at) {
      markAsRead(notification.id);
    }
  };

  const resolveRoute = (notification, role) => {
    const type = String(notification.type || "");
    const data = notification.data || {};
    const trainingRequestId =
      data.training_request_id || (notification.notifiable_type?.includes("TrainingRequest") ? notification.notifiable_id : null);

    // ----- Training request notifications: route by role to the relevant page -----
    if (type.startsWith("training_request_")) {
      switch (role) {
        case ROLES.STUDENT:
          return "/student/training-request-status";
        case ROLES.COORDINATOR:
          return trainingRequestId
            ? `/coordinator/training-requests?highlight=${trainingRequestId}`
            : "/coordinator/training-requests";
        case ROLES.HEAD_OF_DEPARTMENT:
          return "/head-department/reports";
        case ROLES.ADMIN:
          return "/notifications";
        case ROLES.HEALTH_DIRECTORATE:
          return "/health/official-letters";
        case ROLES.EDUCATION_DIRECTORATE:
          return "/education/official-letters";
        case ROLES.PRINCIPAL:
        case ROLES.PSYCHOLOGY_CENTER_MANAGER:
          return trainingRequestId
            ? `/principal/training-requests?highlight=${trainingRequestId}`
            : "/principal/training-requests";
        default:
          return "/notifications";
      }
    }

    // ----- Enrollment notifications (student) -----
    if (type.startsWith("enrollment_")) {
      if (role === ROLES.STUDENT) return "/student/dashboard";
      return "/notifications";
    }

    // ----- Section supervisor assigned (academic supervisor) -----
    if (type === "section_supervisor_assigned") {
      if (role === ROLES.SUPERVISOR) return "/supervisor/workspace";
      return "/notifications";
    }

    // ----- Task notifications -----
    if (type.startsWith("task_")) {
      if (role === ROLES.STUDENT) return "/student/assignments";
      if (
        role === ROLES.FIELD_SUPERVISOR ||
        role === ROLES.PSYCHOLOGIST ||
        role === ROLES.MENTOR ||
        role === ROLES.ADVISER
      ) {
        return "/field-staff/dashboard";
      }
      if (role === ROLES.SUPERVISOR) {
        return "/supervisor/workspace";
      }
      return "/notifications";
    }

    // ----- Daily reports / attendance / evaluations: supervisor or student -----
    if (type.includes("daily_report") || type.includes("attendance") || type.includes("evaluation")) {
      if (role === ROLES.STUDENT) return "/student/notifications-updates";
      if (
        role === ROLES.FIELD_SUPERVISOR ||
        role === ROLES.PSYCHOLOGIST ||
        role === ROLES.MENTOR ||
        role === ROLES.ADVISER
      ) {
        return "/field-staff/dashboard";
      }
      if (role === ROLES.SUPERVISOR) {
        return "/supervisor/workspace";
      }
      return "/notifications";
    }

    // ----- Supervisor visits -----
    if (type.includes("supervisor_visit")) {
      if (role === ROLES.STUDENT) return "/student/notifications-updates";
      return "/supervisor/workspace";
    }

    // ----- Student escalation: supervisor/admin -----
    if (type.includes("student_escalation")) {
      if (role === ROLES.ADMIN) return "/notifications";
      return "/supervisor/workspace";
    }

    // ----- Generic role-based fallback -----
    switch (role) {
      case ROLES.STUDENT:
        return "/student/notifications-updates";
      case ROLES.COORDINATOR:
        return "/coordinator/training-requests";
      case ROLES.HEAD_OF_DEPARTMENT:
        return "/head-department/dashboard";
      case ROLES.ADMIN:
        return "/notifications";
      case ROLES.HEALTH_DIRECTORATE:
        return "/health/dashboard";
      case ROLES.EDUCATION_DIRECTORATE:
        return "/education/dashboard";
      case ROLES.PRINCIPAL:
      case ROLES.PSYCHOLOGY_CENTER_MANAGER:
        return "/principal/dashboard";
      case ROLES.SUPERVISOR:
        return "/supervisor/workspace";
      case ROLES.MENTOR:
      case ROLES.ADVISER:
      case ROLES.FIELD_SUPERVISOR:
      case ROLES.PSYCHOLOGIST:
        return "/field-staff/dashboard";
      default:
        return "/notifications";
    }
  };

  const handleNotificationClick = (notification) => {
    setIsOpen(false);

    const user = readStoredUser();
    const role = normalizeRole(user?.role?.name || user?.role);

    markReadSilently(notification);
    if (!notification.read_at) decrementUnread();

    const route = resolveRoute(notification, role);
    navigate(route);
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const str = String(dateString).trim();
    // If explicit timezone present parse as-is, otherwise treat as local time
    const date = /Z$|[+-]\d{2}:\d{2}$/.test(str)
      ? new Date(str)
      : new Date(str.replace(" ", "T") + "Z");
    if (isNaN(date)) return "";
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 60) return "الآن";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  if (!hasSession()) {
    return null;
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="الإشعارات"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>الإشعارات</h4>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {loading ? (
              <div className="notification-loading">جاري التحميل...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">لا توجد إشعارات</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read_at ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-icon">
                    {notificationIcons[notification.type] || notificationIcons.default}
                  </span>
                  <div className="notification-content">
                    <p className="notification-title">
                      {notificationTitles[notification.type] || notificationTitles.default}
                    </p>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  {!notification.read_at && (
                    <button
                      className="mark-read-btn"
                      onClick={(event) => handleMarkAsRead(event, notification.id)}
                      title="تعليم كمقروء"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
            >
              عرض جميع الإشعارات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
