import { useEffect, useRef, useState } from "react";
import { getChatUserProfile } from "../../services/chatApi";

const ROLE_COLORS = {
  student:                   { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  academic_supervisor:       { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  field_supervisor:          { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  teacher:                   { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  adviser:                   { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  psychologist:              { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  training_coordinator:      { bg: "#fefce8", color: "#a16207", border: "#fde68a" },
  head_of_department:        { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" },
  admin:                     { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" },
  default:                   { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="upm-field">
      <span className="upm-field-label">{label}</span>
      <span className="upm-field-value">{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  const map = {
    active:   { label: "نشط", color: "#16a34a", bg: "#f0fdf4" },
    inactive: { label: "غير نشط", color: "#dc2626", bg: "#fef2f2" },
    pending:  { label: "قيد المراجعة", color: "#d97706", bg: "#fffbeb" },
  };
  const s = map[status] || { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span className="upm-status" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

export default function UserProfileModal({ userId, userName, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    getChatUserProfile(userId)
      .then(setProfile)
      .catch((err) => setError(err?.response?.data?.message || "فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [userId]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const roleColors = ROLE_COLORS[profile?.role] || ROLE_COLORS.default;
  const initials = (profile?.name || userName || "?")
    .trim().split(" ").filter(Boolean)
    .map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="upm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="upm-modal" role="dialog" aria-modal="true">
        <button className="upm-close" onClick={onClose} title="إغلاق">✕</button>

        {loading && (
          <div className="upm-loading">
            <div className="chat-spinner" />
            <span>جارٍ تحميل البيانات...</span>
          </div>
        )}

        {error && (
          <div className="upm-error">{error}</div>
        )}

        {!loading && profile && (
          <>
            {/* Header */}
            <div className="upm-header" style={{ background: roleColors.bg, borderColor: roleColors.border }}>
              <div
                className={`upm-avatar ${profile.avatar_url ? "chat-avatar--has-image" : ""}`}
                style={profile.avatar_url ? undefined : { background: roleColors.color }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="chat-avatar-img" decoding="async" />
                ) : (
                  initials
                )}
              </div>
              <div className="upm-header-info">
                <h2 className="upm-name">{profile.name}</h2>
                <span className="upm-role-badge" style={{ color: roleColors.color, background: "#fff", borderColor: roleColors.border }}>
                  {profile.role_label}
                </span>
                <StatusBadge status={profile.status} />
              </div>
            </div>

            {/* Contact */}
            <div className="upm-section">
              <h3 className="upm-section-title">معلومات التواصل</h3>
              <Field label="البريد الإلكتروني" value={profile.email} />
              <Field label="رقم الهاتف" value={profile.phone} />
            </div>

            {/* Academic info */}
            <div className="upm-section">
              <h3 className="upm-section-title">المعلومات الأكاديمية</h3>
              <Field label="القسم" value={profile.department} />
              <Field label="الرقم الجامعي" value={profile.university_id} />
              <Field label="التخصص" value={profile.major || profile.specialization} />
              <Field label="موقع التدريب" value={profile.training_site} />
              <Field label="المديرية" value={profile.directorate} />
            </div>

            {/* Role-specific */}
            {profile.role === "student" && (
              <div className="upm-section">
                <h3 className="upm-section-title">التدريب الميداني</h3>
                <Field label="المساق" value={profile.course} />
                <Field label="الشعبة" value={profile.section} />
                <Field label="المشرف الأكاديمي" value={profile.academic_supervisor} />
                <Field label="المشرف الميداني" value={profile.field_supervisor} />
                <Field label="الفترة التدريبية" value={profile.training_period} />
                <Field label="حالة التعيين" value={profile.assignment_status} />
              </div>
            )}

            {(profile.role === "academic_supervisor" ||
              profile.role === "teacher" ||
              profile.role === "adviser" ||
              profile.role === "psychologist" ||
              profile.role === "field_supervisor") && (
              <div className="upm-section">
                <h3 className="upm-section-title">إحصائيات</h3>
                {profile.student_count != null && (
                  <Field label="عدد الطلاب" value={profile.student_count} />
                )}
                {profile.supervisor_type && (
                  <Field label="نوع الإشراف" value={profile.supervisor_type} />
                )}
                {profile.governing_body && (
                  <Field label="الجهة التنظيمية" value={profile.governing_body} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
