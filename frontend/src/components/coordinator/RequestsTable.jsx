import { Eye } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";

export default function RequestsTable({
  requests = [],
  onView,
  saving = false,
  showActions = true,
  showCheckbox = false,
  selectedForBatch = {},
  onToggleSelect,
}) {
  if (requests.length === 0) {
    return (
      <div className="section-card text-center p-6">
        <p className="text-[var(--text-faint)] m-0">لا توجد طلبات</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {showCheckbox && <th></th>}
            <th>الطالب</th>
            <th>الرقم الجامعي</th>
            <th>المساق</th>
            <th>جهة التدريب</th>
            <th>الجهة الرسمية</th>
            <th>الحالة</th>
            {showActions && <th>إجراء</th>}
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const s0 = r.students?.[0];
            return (
              <tr key={r.id}>
                {showCheckbox && (
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selectedForBatch[r.id]}
                      onChange={(e) =>
                        onToggleSelect?.(r.id, e.target.checked)
                      }
                    />
                  </td>
                )}
                <td>{s0?.user?.name || r.requested_by?.name || "—"}</td>
                <td>{s0?.user?.university_id || "—"}</td>
                <td>{s0?.course?.name || "—"}</td>
                <td>{r.training_site?.name || "—"}</td>
                <td>
                  {getGoverningBodyLabel(r.governing_body) || "—"}
                </td>
                <td>
                  <StatusBadge status={r.book_status} />
                </td>
                {showActions && (
                  <td>
                    {onView && (
                      <button
                        className="btn-primary-custom flex items-center gap-1 py-1 px-3 text-[0.82rem] rounded-lg"
                        onClick={() => onView(r)}
                        disabled={saving}
                      >
                        <Eye size={14} />
                        عرض
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
