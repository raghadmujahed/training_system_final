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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)" }}>
          <Layers size={20} />
        </div>
        <h4 style={{ margin: 0 }}>دفعات طلبات التدريب — تجميع حسب المديرية</h4>
      </div>
      <p style={{ color: "var(--text-faint)", marginBottom: 16, fontSize: "0.88rem", marginTop: 4 }}>
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
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 16,
              marginBottom: idx < groups.length - 1 ? 12 : 0,
              background: "#fbfcfe",
              transition: "var(--transition)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <h5 style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem" }}>
                  <FileText size={16} style={{ color: "var(--accent)" }} />
                  {groupLabel}
                </h5>
                <span style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
                  {group.requests.length} طلب معتمد
                </span>
              </div>
              <button
                className="btn-primary-custom"
                disabled={saving}
                onClick={() =>
                  onCreateBatchForGroup(
                    group.governing_body,
                    group.directorate,
                    group.requests.map((r) => r.id)
                  )
                }
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
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
