import { useMemo } from "react";

// Health indicator component
const HealthIndicator = ({ status }) => {
  const config = {
    healthy: { color: "#28a745", bg: "#e8f5e9", icon: "🟢", label: "سليم" },
    warning: { color: "#ffc107", bg: "#fff8e1", icon: "🟡", label: "تنبيه" },
    critical: { color: "#dc3545", bg: "#ffebee", icon: "🔴", label: "حرج" },
  };
  const c = config[status] || config.healthy;
  return (
    <span
      className="inline-flex items-center gap-1 py-1 px-[10px] rounded-2xl text-[0.78rem] font-semibold"
      style={{
        color: c.color,
        backgroundColor: c.bg,
        border: `1px solid ${c.color}30`,
      }}
    >
      {c.icon} {c.label}
    </span>
  );
};

// Mini status badge
const MiniBadge = ({ status, label }) => {
  if (!status) return <span className="text-[#999]">—</span>;
  const colors = {
    complete: "#28a745",
    incomplete: "#dc3545",
    pending: "#ffc107",
    good: "#28a745",
    needs_review: "#fd7e14",
    missing: "#dc3545",
    submitted: "#17a2b8",
    graded: "#28a745",
    scheduled: "#6f42c1",
    done: "#28a745",
    none: "#999",
  };
  const color = colors[status] || "#999";
  return (
    <span
      className="inline-block py-[2px] px-2 rounded-[10px] text-[0.7rem] font-semibold"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {label}
    </span>
  );
};

const ACADEMIC_STATUS_COLORS = {
  not_started: "#6c757d",
  in_training: "#0d6efd",
  needs_follow_up: "#fd7e14",
  completed: "#28a745",
  late: "#dc3545",
  withdrawn: "#6f42c1",
};

const AcademicStatusBadge = ({ status, label }) => {
  const color = ACADEMIC_STATUS_COLORS[status] || "#6c757d";
  return (
    <span
      className="inline-block py-1 px-[10px] rounded-2xl text-[0.78rem] font-semibold"
      style={{ color }}
    >
      {label || "لم يباشر"}
    </span>
  );
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
};

export default function StudentsTable({ students, filterStatus, onSelectStudent }) {
  const normalized = useMemo(() => {
    const rows = students.map((s) => {
        const id = s.student_id ?? s.id;
        const rateRaw = s.attendance_status_summary;
        const attendance_rate =
          s.attendance_rate != null
            ? s.attendance_rate
            : rateRaw && rateRaw !== "n/a"
              ? parseFloat(String(rateRaw).replace("%", ""))
              : null;
        return {
          ...s,
          id,
          section_name: s.section_name ?? s.section,
          site_name: s.site_name ?? s.training_site,
          mentor_name: s.mentor_name ?? s.field_supervisor_name,
          health_status:
            s.health_status ??
            (s.risk_level === "critical" ? "critical" : s.risk_level === "medium" ? "warning" : "healthy"),
          attendance_rate: Number.isFinite(attendance_rate) ? attendance_rate : null,
          logs_status:
            s.logs_status ?? (typeof s.daily_log_status_summary === "number" && s.daily_log_status_summary > 0 ? "good" : "needs_review"),
          portfolio_status:
            s.portfolio_status ?? (typeof s.portfolio_completion === "number" && s.portfolio_completion > 0 ? "complete" : "incomplete"),
          evaluation_status:
            s.evaluation_status ?? (s.academic_evaluation_status === "final" ? "graded" : "pending"),
        };
      });

    // API may return repeated rows for the same student (multiple assignments);
    // keep one row per student to avoid duplicate table keys/rendering noise.
    const byStudentId = new Map();
    const severity = { healthy: 0, warning: 1, critical: 2 };
    for (const row of rows) {
      const key = String(row.id);
      const current = byStudentId.get(key);
      if (!current) {
        byStudentId.set(key, row);
        continue;
      }
      const currentLevel = severity[current.health_status] ?? 0;
      const nextLevel = severity[row.health_status] ?? 0;
      if (nextLevel > currentLevel) {
        byStudentId.set(key, row);
      }
    }

    return Array.from(byStudentId.values());
  }, [students]);

  const filtered = useMemo(() => {
    let list = [...normalized];

    if (filterStatus) {
      list = list.filter((s) => s.health_status === filterStatus);
    }

    return list;
  }, [normalized, filterStatus]);

  if (!normalized.length) {
    return (
      <div className="text-center py-[60px] px-5">
        <div className="text-[3rem] mb-4">📭</div>
        <h4 className="text-[#666]">لا يوجد طلبة مشرف عليهم</h4>
        <p className="text-[#999] text-[0.9rem]">
          سيظهر الطلبة هنا بعد تعيينك كمشرف أكاديمي عليهم
        </p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="text-center py-10 px-5">
        <div className="text-[2rem] mb-3">🔍</div>
        <p className="text-[#666]">لا توجد نتائج مطابقة للبحث</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[1050px]">
        <thead>
          <tr>
            <th>الطالب</th>
            <th>الرقم الجامعي</th>
            <th>حالة الإشراف</th>
            <th>آخر تحديث</th>
            <th>ملاحظات</th>
            <th>الشعبة</th>
            <th>جهة التدريب</th>
            <th>المشرف الميداني</th>
            <th>الإنجاز</th>
            <th>التقييم</th>
            <th>الحالة</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id} className="cursor-pointer" onClick={() => onSelectStudent(s.id)}>
              <td>
                <div className="font-semibold">{s.name || "—"}</div>
                <div className="text-[0.75rem] text-[#999]">{s.specialization || ""}</div>
              </td>
              <td>{s.university_id || "—"}</td>
              <td><AcademicStatusBadge status={s.academic_status} label={s.academic_status_label} /></td>
              <td>
                <div className="text-[0.78rem]">{formatDateTime(s.academic_status_updated_at)}</div>
                {s.academic_status_updated_by && (
                  <div className="text-[0.72rem] text-[#888]">{s.academic_status_updated_by}</div>
                )}
              </td>
              <td className="max-w-[180px] text-[#666] text-[0.78rem]">
                {s.academic_status_note || "—"}
              </td>
              <td>{s.section_name || "—"}</td>
              <td>{s.site_name || "—"}</td>
              <td>{s.mentor_name || "—"}</td>
              <td>
                <MiniBadge
                  status={s.portfolio_status || "none"}
                  label={s.portfolio_status === "complete" ? "مكتمل" : s.portfolio_status === "incomplete" ? "ناقص" : "—"}
                />
              </td>
              <td>
                <MiniBadge
                  status={s.evaluation_status || "none"}
                  label={s.evaluation_status === "graded" ? "مقيّم" : s.evaluation_status === "pending" ? "بانتظار" : "—"}
                />
              </td>
              <td>
                <HealthIndicator status={s.health_status || "healthy"} />
              </td>
              <td>
                <button
                  className="btn-sm-custom btn-primary-custom"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStudent(s.id);
                  }}
                >
                  فتح الملف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
