import { useEffect, useState, useCallback } from "react";
import { Search, Users, GraduationCap, Mail, Phone, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
        <Loader2 size={40} className="spin" style={{ color: "var(--primary)", marginBottom: 12 }} />
        <p style={{ color: "var(--text-faint)", fontSize: "0.95rem" }}>جاري تحميل الطلبة...</p>
      </div>
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
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">الطلبة</h1>
            <p className="hero-subtitle">
              قائمة الطلبة المتاحين للتوزيع على جهات التدريب.
            </p>
          </div>
        </div>
      </div>

      <CoordinatorPsychologyReadOnlyNotice />

      {/* Filters */}
      <div className="filters-bar" style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "14px 18px",
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 16,
        marginBottom: 16,
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ position: "relative", flex: "1 1 280px", minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
          <input
            className="form-control-custom"
            placeholder="بحث بالاسم أو البريد أو الرقم الجامعي..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ paddingRight: 36, width: "100%" }}
          />
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="لا يوجد طلبة" description="لا يوجد طلبة مطابقون للبحث." />
      ) : (
        <div className="section-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--success) 0%, #5cb85c 100%)" }}>
              <GraduationCap size={20} />
            </div>
            <h4 style={{ margin: 0 }}>قائمة الطلبة ({items.length})</h4>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleItems.map((u) => (
              <div
                key={u.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: "#fff",
                  transition: "var(--transition)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "0.95rem",
                      fontWeight: 800,
                    }}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h6 style={{ margin: 0, fontSize: "0.95rem" }}>{u.name}</h6>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", direction: "ltr", display: "inline-block" }}>
                        {u.university_id || "—"}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: u.status === "active" ? "#d4edda" : "#e9ecef",
                      color: u.status === "active" ? "#155724" : "#495057",
                      padding: "4px 12px",
                      borderRadius: 99,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {u.status === "active" ? "نشط" : u.status}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: "0.82rem", color: "var(--text-soft)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  {u.department?.name && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <GraduationCap size={13} style={{ color: "var(--info)" }} />
                      {u.department.name}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Mail size={13} style={{ color: "var(--accent)" }} />
                    {u.email}
                  </span>
                  {u.phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, direction: "ltr" }}>
                      <Phone size={13} style={{ color: "var(--success)" }} />
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
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                padding: "12px",
                marginTop: 12,
                background: "transparent",
                border: "1px dashed var(--border)",
                borderRadius: 12,
                color: "var(--info)",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
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

