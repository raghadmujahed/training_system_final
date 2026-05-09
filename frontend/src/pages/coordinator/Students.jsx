import { useEffect, useState, useCallback } from "react";
import { Search, Users, GraduationCap, Mail, Phone, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getUsers, itemsFromPagedResponse } from "../../services/api";
import EmptyState from "../../components/common/EmptyState";
import CoordinatorPsychologyReadOnlyNotice from "../../components/coordinator/CoordinatorPsychologyReadOnlyNotice";

export default function CoordinatorStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getUsers({
        per_page: 100,
        status: "active",
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setItems(itemsFromPagedResponse(res));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل الطلبة");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = showAll ? items : items.slice(0, 5);
  const hasMore = items.length > 5;

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل الطلبة..." />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <Users size={44} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">الطلبة</h1>
            <p className="hero-subtitle">
              قائمة الطلبة المتاحين للتوزيع على جهات التدريب.
            </p>
          </div>
        </div>
      </div>

      <CoordinatorPsychologyReadOnlyNotice />

      {/* Filters */}
      <div className="filters-bar flex gap-[10px] flex-wrap items-center py-3 px-4 bg-white border border-[var(--border)] rounded-xl mb-4 shadow-[var(--shadow-sm)]">
        <div className="relative flex-[1_1_280px] min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
          <input
            className="form-control-custom pr-9 w-full"
            placeholder="بحث بالاسم أو البريد أو الرقم الجامعي..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p className="m-0">{error}</p>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="لا يوجد طلبة" description="لا يوجد طلبة مطابقون للبحث." />
      ) : (
        <div className="section-card">
          <div className="flex items-center gap-[10px] mb-4">
            <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--success) 0%, #5cb85c 100%)" }}>
              <GraduationCap size={20} />
            </div>
            <h4 className="m-0">قائمة الطلبة ({items.length})</h4>
          </div>

          <div className="flex flex-col gap-[10px]">
            {visibleItems.map((u) => (
              <div
                key={u.id}
                className="border border-[var(--border)] rounded-xl py-[14px] px-4 bg-white transition-[var(--transition)]"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center text-white text-[0.95rem] font-extrabold" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)" }}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h6 className="m-0 text-[0.95rem]">{u.name}</h6>
                      <span className="text-[0.78rem] text-[var(--text-faint)] direction-ltr inline-block">
                        {u.university_id || "—"}
                      </span>
                    </div>
                  </div>
                  <span
                    className="py-1 px-3 rounded-full text-[0.78rem] font-bold"
                    style={{
                      background: u.status === "active" ? "#d4edda" : "#e9ecef",
                      color: u.status === "active" ? "#155724" : "#495057",
                    }}
                  >
                    {u.status === "active" ? "نشط" : u.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-[6px] text-[0.82rem] text-[var(--text-soft)] mt-[10px] pt-[10px] border-t border-[var(--border)]">
                  {u.department?.name && (
                    <span className="flex items-center gap-1">
                      <GraduationCap size={13} className="text-[var(--info)]" />
                      {u.department.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-[var(--accent)]" />
                    {u.email}
                  </span>
                  {u.phone && (
                    <span className="flex items-center gap-1 direction-ltr">
                      <Phone size={13} className="text-[var(--success)]" />
                      {u.phone}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Show More Toggle */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center justify-center gap-[6px] w-full py-3 mt-3 bg-transparent border border-dashed border-[var(--border)] rounded-xl text-[var(--info)] text-[0.9rem] font-bold cursor-pointer transition-all duration-200"
            >
              {showAll ? (
                <>
                  إخفاء <ChevronUp size={18} />
                </>
              ) : (
                <>
                  عرض الكل ({items.length - 5} إضافي) <ChevronDown size={18} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

