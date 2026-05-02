import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { apiClient, unwrapSupervisorList } from "../../services/api";

async function fetchAllSupervisorSections() {
  const merged = [];
  let page = 1;
  let lastPage = 1;
  do {
    const res = await apiClient.get("/supervisor/sections", {
      params: { per_page: 100, page },
    });
    merged.push(...unwrapSupervisorList(res.data));
    lastPage = res.data?.meta?.last_page ?? 1;
    page++;
  } while (page <= lastPage);
  return merged;
}

function trainingTrackLabel(track) {
  if (track === "psychology_clinic") return "عيادة نفسية";
  if (track === "psychology_school") return "مدرسة (نفسية)";
  if (track === "psychology") return "علم النفس";
  if (track === "education") return "تربية";
  return track || "—";
}

export default function Sections() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAllSupervisorSections();
        if (!cancelled) setSections(data);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "فشل تحميل الشعب");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectStudent = useCallback(
    (id) => {
      const sid = Number(id);
      if (!Number.isFinite(sid)) return;
      navigate(`/supervisor/workspace/${sid}`);
    },
    [navigate]
  );

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⏳</div>
        <p style={{ color: "#666" }}>جاري تحميل الشعب...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="الشعب"
        subtitle="الشعب الأكاديمية المسندة إليك — عرض الطلاب والانتقال إلى مساحة العمل"
      />

      <div className="page-actions" style={{ marginBottom: "16px" }}>
        <Link to="/supervisor/workspace" className="btn-light-custom">
          ← مساحة العمل
        </Link>
      </div>

      {error && (
        <div className="section-card" style={{ borderRight: "4px solid #dc3545", marginBottom: "16px" }}>
          <p style={{ color: "#dc3545", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {!sections.length ? (
        <EmptyState
          title="لا توجد شعب"
          description="لم يُعيَّن لك مشرفة على شعب بعد، أو لا توجد بيانات للفترة الحالية."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {sections.map((s) => {
            const isExpanded = expandedSection === s.id;
            const trackLabel = trainingTrackLabel(s.training_track);
            const trackColor = s.training_track?.includes("psych") ? "#6f42c1" : "#0d6efd";
            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid #e9ecef",
                  borderRadius: "12px",
                  padding: "16px",
                  backgroundColor: "#fff",
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.05rem" }}>{s.section_name || s.section_code || `شعبة #${s.id}`}</h4>
                    <div style={{ fontSize: "0.82rem", color: "#666", marginTop: 2 }}>{s.course || "—"}</div>
                    {s.section_code && (s.section_name || s.name) && (
                      <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 2 }}>رمز الشعبة: {s.section_code}</div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: trackColor,
                      backgroundColor: `${trackColor}15`,
                      border: `1px solid ${trackColor}30`,
                    }}
                  >
                    {trackLabel}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", color: "#555", marginBottom: 12, flexWrap: "wrap" }}>
                  <span>👥 {s.students_count ?? 0} طالب</span>
                  <span>🏛️ {s.department || "—"}</span>
                  <span>🏫 {s.training_sites_count ?? 0} جهة تدريب</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link
                    to={`/supervisor/workspace?section=${s.id}`}
                    className="btn-primary-custom"
                    style={{ textAlign: "center", textDecoration: "none", display: "block" }}
                  >
                    فتح في مساحة العمل (فلترة الطلاب)
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                    style={{
                      background: "none",
                      border: "1px solid #dee2e6",
                      borderRadius: 6,
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      color: "#0d6efd",
                      width: "100%",
                    }}
                  >
                    {isExpanded ? "إخفاء الطلاب ▲" : `عرض الطلاب (${s.students?.length ?? s.students_count ?? 0}) ▼`}
                  </button>
                </div>

                {isExpanded && s.students && s.students.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                    <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #eee" }}>
                          <th style={{ textAlign: "right", padding: "4px 8px", color: "#888" }}>الاسم</th>
                          <th style={{ textAlign: "right", padding: "4px 8px", color: "#888" }}>الرقم الجامعي</th>
                          <th style={{ textAlign: "right", padding: "4px 8px", color: "#888" }}>القسم</th>
                          <th style={{ textAlign: "right", padding: "4px 8px", color: "#888" }}>التخصص</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.students.map((st) => (
                          <tr
                            key={st.id}
                            style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                            onClick={() => handleSelectStudent(st.id)}
                          >
                            <td style={{ padding: "6px 8px", fontWeight: 500 }}>{st.name}</td>
                            <td style={{ padding: "6px 8px" }}>{st.university_id}</td>
                            <td style={{ padding: "6px 8px" }}>{st.department || "—"}</td>
                            <td style={{ padding: "6px 8px" }}>{st.major || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {isExpanded && (!s.students || s.students.length === 0) && (
                  <div style={{ marginTop: 12, textAlign: "center", color: "#999", fontSize: "0.82rem" }}>لا يوجد طلاب مسجلون</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
