import { useNavigate } from "react-router-dom";
import { useFieldSupervisorStudent } from "../../../hooks/useFieldSupervisorApi";
import FieldSupervisorReferenceCard from "../FieldSupervisorReferenceCard";
import {
  User,
  MapPin,
  Building,
  Calendar,
  CheckCircle,
  FileText,
  Star,
  MessageCircle,
  AlertCircle,
  Clock,
  FileStack,
} from "lucide-react";

export default function OverviewTab({ studentId, labels }) {
  const navigate = useNavigate();
  const { student, loading } = useFieldSupervisorStudent(studentId);

  if (loading) {
    return <div className="section-card">جاري التحميل...</div>;
  }

  const studentData = student?.student || student || {};
  const attendance = student?.attendance || {};
  const lastReport = student?.last_report || {};
  const evaluation = student?.evaluation || {};

  const quickActions = [
    {
      key: "record_attendance",
      label: "تسجيل حضور",
      icon: CheckCircle,
      action: () => navigate(`/field-supervisor/students/${studentId}?tab=attendance`),
    },
    {
      key: "review_today_report",
      label: "مراجعة تقرير اليوم",
      icon: FileText,
      action: () => navigate(`/field-supervisor/students/${studentId}?tab=daily-reports`),
    },
    {
      key: "open_evaluation",
      label: "فتح التقييم",
      icon: Star,
      action: () => navigate(`/field-supervisor/students/${studentId}?tab=evaluation`),
    },
    {
      key: "forms_reports",
      label: "النماذج والتقارير",
      icon: FileStack,
      action: () => navigate(`/field-supervisor/students/${studentId}?tab=forms`),
    },
    {
      key: "message_student",
      label: "رسالة للطالب",
      icon: MessageCircle,
      action: () => navigate(`/field-supervisor/students/${studentId}?tab=communication`),
    },
    {
      key: "message_supervisor",
      label: "رسالة للمشرف الأكاديمي",
      icon: MessageCircle,
      action: () => navigate(`/field-supervisor/students/${studentId}?tab=communication`),
    },
  ];

  const rate = attendance.attendance_rate || 0;

  return (
    <div>
      <FieldSupervisorReferenceCard supervisorType={student?.supervisor_type} />

      <div className="section-card mb-4">
        <h4 className="mt-0 flex items-center gap-2">
          <Clock size={20} />
          إجراءات سريعة
        </h4>
        <div className="table-actions">
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="btn-outline-custom btn-sm-custom"
              onClick={action.action}
            >
              <action.icon size={16} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 mb-16">
        <div className="section-card">
          <h4 className="mt-0 flex items-center gap-2">
            <User size={20} />
            معلومات الطالب
          </h4>
          <InfoRow icon={User} label="الاسم الكامل" value={studentData.name} />
          <InfoRow icon={Building} label="الرقم الجامعي" value={studentData.university_id} />
          <InfoRow icon={MapPin} label="التخصص" value={studentData.specialization || "—"} />
          <InfoRow icon={Building} label="القسم" value={studentData.department || "—"} />
          <InfoRow icon={Building} label="المساق التدريبي" value={studentData.section || "—"} />
          <InfoRow icon={MapPin} label="جهة التدريب" value={studentData.training_site || "—"} />
          <InfoRow icon={Calendar} label="تاريخ بدء التدريب" value={studentData.training_start || "—"} />
          <InfoRow
            icon={CheckCircle}
            label="حالة الطالب"
            value={
              studentData.training_status ? (
                <span
                  className={`badge-custom ${
                    studentData.training_status === "ongoing" ? "badge-success" : "badge-primary"
                  }`}
                >
                  {studentData.training_status === "ongoing" ? "مستمر" : studentData.training_status}
                </span>
              ) : (
                "—"
              )
            }
          />
        </div>

        <div className="section-card">
          <h4 className="mt-0 flex items-center gap-2">
            <Star size={20} />
            مؤشرات الأداء
          </h4>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="font-bold">نسبة الالتزام بالحضور</span>
              <span>{rate}%</span>
            </div>
            <div className="bg-[#e9ecef] rounded-lg h-[10px] overflow-hidden">
              <div
                className={`h-full rounded-lg ${
                  rate >= 80 ? "bg-[#198754]" : rate >= 60 ? "bg-[#ffc107]" : "bg-[#dc3545]"
                }`}
                style={{
                  width: `${Math.min(100, rate)}%`,
                }}
              />
            </div>
          </div>

          <InfoRow icon={CheckCircle} label="آخر حضور" value={student?.last_attendance || "—"} />

          <InfoRow
            icon={FileText}
            label="آخر تقرير يومي"
            value={
              lastReport?.date ? (
                <span>
                  {lastReport.date}{" "}
                  <span
                    className={`badge-custom ${
                      lastReport.status === "confirmed"
                        ? "badge-success"
                        : lastReport.status === "returned"
                          ? "badge-danger"
                          : "badge-info"
                    }`}
                  >
                    {lastReport.status_label || lastReport.status}
                  </span>
                </span>
              ) : (
                "—"
              )
            }
          />

          <InfoRow
            icon={Star}
            label="حالة التقييم الميداني"
            value={
              evaluation?.status || evaluation?.is_final ? (
                <span>
                  <span
                    className={`badge-custom ${
                      evaluation.is_final || evaluation.status === "submitted"
                        ? "badge-success"
                        : evaluation.status === "draft"
                          ? "badge-warning"
                          : "badge-primary"
                    }`}
                  >
                    {evaluation.status_label || evaluation.status || "—"}
                  </span>
                  {evaluation.is_final && (
                    <span className="badge-custom badge-info mr-[6px]">
                      نهائي
                    </span>
                  )}
                </span>
              ) : (
                <span className="badge-custom badge-primary">لم يبدأ</span>
              )
            }
          />

          {(attendance?.required_training_hours ?? 0) > 0 && (
            <>
              <InfoRow
                icon={Clock}
                label="ساعات التدريب المطلوبة"
                value={<strong>{attendance.required_training_hours} ساعة</strong>}
              />
              <InfoRow
                icon={CheckCircle}
                label="الساعات المنجزة (تقدير من سجلات الحضور)"
                value={<strong>{attendance.completed_training_hours ?? 0} ساعة</strong>}
              />
              <InfoRow
                icon={Clock}
                label="المتبقي"
                value={
                  <strong>
                    {attendance.remaining_training_hours != null
                      ? `${attendance.remaining_training_hours} ساعة`
                      : "—"}
                  </strong>
                }
              />
            </>
          )}

          {evaluation?.is_final && evaluation?.total_score != null && (
            <InfoRow
              icon={Star}
              label="الدرجة الميدانية (نهائية)"
              value={
                <span>
                  <strong>{evaluation.total_score}</strong>
                  {evaluation.grade_label ? (
                    <span className="text-soft mr-2">
                      — {evaluation.grade_label}
                    </span>
                  ) : null}
                </span>
              }
            />
          )}

          {student?.last_note && (
            <div
              className="section-card mt-3 p-3 bg-[rgba(255,193,7,0.08)] border-[rgba(255,193,7,0.35)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={18} />
                <strong>آخر ملاحظة</strong>
              </div>
              <p className="m-0 text-[0.95rem]">{student.last_note}</p>
            </div>
          )}

        </div>
      </div>

      {attendance?.total_days > 0 && (
        <div className="section-card">
          <h4 className="mt-0 flex items-center gap-2">
            <CheckCircle size={20} />
            ملخص الحضور
          </h4>
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3"
          >
            <StatBox label="إجمالي الأيام" value={attendance.total_days} tone="neutral" />
            <StatBox label="أيام الحضور" value={attendance.present_days} tone="success" />
            <StatBox label="أيام الغياب" value={attendance.absent_days} tone="danger" />
            <StatBox label="التأخر" value={attendance.late_days} tone="warning" />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 mb-[14px] items-start">
      <Icon size={20} className="text-[var(--text-faint)] shrink-0 mt-[2px]" />
      <div>
        <div className="text-soft text-[0.88rem]">
          {label}
        </div>
        <div className="font-bold mt-[2px]">{value}</div>
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }) {
  const border =
    tone === "success"
      ? "var(--success)"
      : tone === "danger"
        ? "var(--danger)"
        : tone === "warning"
          ? "var(--warning)"
          : "var(--border)";
  return (
    <div
      className="section-card p-[14px] text-center"
      style={{ borderTop: `3px solid ${border}` }}
    >
      <div className="text-[1.35rem] font-extrabold">{value}</div>
      <div className="text-soft text-[0.88rem] mt-1">
        {label}
      </div>
    </div>
  );
}
