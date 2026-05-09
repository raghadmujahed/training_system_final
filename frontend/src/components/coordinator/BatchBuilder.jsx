import { FileText, Send, Layers } from "lucide-react";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";
import StatusBadge from "./StatusBadge";

export default function BatchBuilder({
  groups = [],
  onCreateBatchForGroup,
  saving,
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="section-card mb-4">
      <div className="flex items-center gap-[10px] mb-2">
        <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)" }}>
          <Layers size={20} />
        </div>
        <h4 className="m-0">دفعات طلبات التدريب — تجميع حسب المديرية</h4>
      </div>
      <p className="text-[var(--text-faint)] mb-4 text-[0.88rem] mt-1">
        الطلبات المعتمدة مبدئيًا مُجمّعة تلقائيًا حسب الجهة والمديرية.
        أنشئ دفعة معاملة رسمية لكل مجموعة ثم أرسلها للجهة المعنية.
      </p>

      {groups.map((group, idx) => {
        const groupLabel =
          group.directorate
            ? `${getGoverningBodyLabel(group.governing_body)} — ${group.directorate}`
            : getGoverningBodyLabel(group.governing_body);

        return (
          <div
            key={`${group.governing_body}-${group.directorate}-${idx}`}
            className="border border-[var(--border)] rounded-[14px] p-4 mb-4 bg-[#fbfcfe]"
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <h5 className="m-0 mb-1 flex items-center gap-2 text-[0.95rem]">
                  <FileText size={16} className="text-[var(--accent)]" />
                  {groupLabel}
                </h5>
                <span className="text-[0.82rem] text-[var(--text-faint)]">
                  {group.requests.length} طلب معتمد
                </span>
              </div>
              <button
                className="btn-primary-custom flex items-center gap-[6px] text-[0.85rem]"
                disabled={saving}
                onClick={() =>
                  onCreateBatchForGroup(
                    group.governing_body,
                    group.directorate,
                    group.requests.map((r) => r.id)
                  )
                }
              >
                <Send size={14} />
                {saving ? "جاري الإنشاء..." : `إنشاء دفعة (${group.requests.length})`}
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الرقم الجامعي</th>
                    <th>المساق</th>
                    <th>جهة التدريب</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {group.requests.map((r) => {
                    const s0 = r.students?.[0];
                    return (
                      <tr key={r.id}>
                        <td>{s0?.user?.name || r.requested_by?.name || "—"}</td>
                        <td>{s0?.user?.university_id || "—"}</td>
                        <td>{s0?.course?.name || "—"}</td>
                        <td>{r.training_site?.name || "—"}</td>
                        <td>
                          <StatusBadge status={r.book_status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
