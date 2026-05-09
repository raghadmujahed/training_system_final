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
    <div className="filters-bar flex gap-[10px] flex-wrap items-center p-[14px_18px] bg-white border border-[var(--border)] rounded-xl mb-4">
      {showSearch && (
        <div className="relative flex-[1_1_220px] min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
          <input
            className="form-control-custom pr-9 w-full"
            placeholder="بحث بالاسم أو الرقم الجامعي..."
            value={filters.search || ""}
            onChange={(e) => update("search", e.target.value)}
          />
        </div>
      )}

      {showStatus && (
        <select
          className="form-control-custom flex-[0_1_180px] min-w-[140px]"
          value={filters.status || ""}
          onChange={(e) => update("status", e.target.value)}
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
          className="form-control-custom flex-[0_1_180px] min-w-[140px]"
          value={filters.department || ""}
          onChange={(e) => update("department", e.target.value)}
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
          className="form-control-custom flex-[0_1_180px] min-w-[140px]"
          value={filters.period || ""}
          onChange={(e) => update("period", e.target.value)}
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
          className="form-control-custom flex-[0_1_180px] min-w-[140px]"
          value={filters.governing_body || ""}
          onChange={(e) => update("governing_body", e.target.value)}
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
          className="form-control-custom flex-[0_1_180px] min-w-[140px]"
          value={filters.track || ""}
          onChange={(e) => update("track", e.target.value)}
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
          className="form-control-custom flex-[0_1_180px] min-w-[140px]"
          value={filters.site_type || ""}
          onChange={(e) => update("site_type", e.target.value)}
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
          className="btn-secondary-custom flex items-center gap-1 py-[6px] px-[14px] rounded-[10px] text-[0.82rem] font-bold bg-[rgba(176,58,72,0.08)] text-[var(--danger)] border border-[rgba(176,58,72,0.2)] cursor-pointer transition-all duration-200"
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
        >
          <X size={14} />
          مسح الفلاتر
        </button>
      )}
    </div>
  );
}
