import { Search, Filter, X } from "lucide-react";
import { GOVERNING_BODIES, DIRECTORATES } from "../../config/coordinator/governingBodies";
import { TRACKS, SITE_TYPES } from "../../config/coordinator/trackFilters";
import { STATUS_LABELS } from "../../config/coordinator/statusLabels";

export default function CoordinatorFilters({
  filters,
  setFilters,
  showStatus = true,
  showDepartment = false,
  showPeriod = false,
  showGoverningBody = false,
  showTrack = false,
  showSiteType = false,
  showSearch = true,
  departments = [],
  periods = [],
  statusOptions = null,
}) {
  const update = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const effectiveStatusOptions =
    statusOptions ||
    Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  const hasActiveFilters = Object.values(filters).some((v) => v && v.trim && v.trim() !== "");

  return (
    <div className="filters-bar" style={{
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      padding: "14px 18px",
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: 12,
      marginBottom: 16,
    }}>
      {showSearch && (
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
          <input
            className="form-control-custom"
            placeholder="بحث بالاسم أو الرقم الجامعي..."
            value={filters.search || ""}
            onChange={(e) => update("search", e.target.value)}
            style={{ paddingRight: 36, width: "100%" }}
          />
        </div>
      )}

      {showStatus && (
        <select
          className="form-control-custom"
          value={filters.status || ""}
          onChange={(e) => update("status", e.target.value)}
          style={{ flex: "0 1 180px", minWidth: 140 }}
        >
          <option value="">كل الحالات</option>
          {effectiveStatusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {showDepartment && departments.length > 0 && (
        <select
          className="form-control-custom"
          value={filters.department || ""}
          onChange={(e) => update("department", e.target.value)}
          style={{ flex: "0 1 180px", minWidth: 140 }}
        >
          <option value="">كل الأقسام</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}

      {showPeriod && periods.length > 0 && (
        <select
          className="form-control-custom"
          value={filters.period || ""}
          onChange={(e) => update("period", e.target.value)}
          style={{ flex: "0 1 180px", minWidth: 140 }}
        >
          <option value="">كل الفترات</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || `فترة #${p.id}`}
            </option>
          ))}
        </select>
      )}

      {showGoverningBody && (
        <select
          className="form-control-custom"
          value={filters.governing_body || ""}
          onChange={(e) => update("governing_body", e.target.value)}
          style={{ flex: "0 1 180px", minWidth: 140 }}
        >
          <option value="">كل الجهات</option>
          {GOVERNING_BODIES.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      )}

      {showTrack && (
        <select
          className="form-control-custom"
          value={filters.track || ""}
          onChange={(e) => update("track", e.target.value)}
          style={{ flex: "0 1 180px", minWidth: 140 }}
        >
          <option value="">كل المسارات</option>
          {TRACKS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      )}

      {showSiteType && (
        <select
          className="form-control-custom"
          value={filters.site_type || ""}
          onChange={(e) => update("site_type", e.target.value)}
          style={{ flex: "0 1 180px", minWidth: 140 }}
        >
          <option value="">كل الأنواع</option>
          {SITE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button
          className="btn-secondary-custom"
          onClick={() =>
            setFilters({
              status: "",
              department: "",
              period: "",
              governing_body: "",
              track: "",
              site_type: "",
              search: "",
            })
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 14px",
            borderRadius: 10,
            fontSize: "0.82rem",
            fontWeight: 700,
            background: "rgba(176, 58, 72, 0.08)",
            color: "var(--danger)",
            border: "1px solid rgba(176, 58, 72, 0.2)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <X size={14} />
          مسح الفلاتر
        </button>
      )}
    </div>
  );
}
