import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient, unwrapSupervisorList, unwrapSupervisorStats } from "../../../services/api";
import DashboardSummary from "./DashboardSummary";
import StudentsTable from "./StudentsTable";
import StudentProfile from "./StudentProfile";

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

export default function SupervisorWorkspace() {
  const { studentId: studentIdParam } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedStudentId =
    studentIdParam && /^\d+$/.test(String(studentIdParam)) ? Number(studentIdParam) : null;

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [initialReady, setInitialReady] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);

  const loadAbortRef = useRef(null);

  useEffect(() => {
    return () => loadAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadStatsAndSections = useCallback(async () => {
    const statsRes = await apiClient.get("/supervisor/stats").then((r) => r.data).catch(() => null);
    setStats(unwrapSupervisorStats(statsRes));
    const sectionsMerged = await fetchAllSupervisorSections();
    setSections(sectionsMerged);
  }, []);

  useEffect(() => {
    const sid = searchParams.get("section");
    if (!sid || !sections.length) return;
    const exists = sections.some((s) => String(s.id) === String(sid));
    if (exists) setFilterSection(String(sid));
  }, [searchParams, sections]);

  const loadStudentsOnly = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setStudentsLoading(true);
    setError("");
    try {
      const params = {};
      if (filterSection) params.section_id = filterSection;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const merged = [];
      let page = 1;
      let lastPage = 1;
      do {
        const res = await apiClient.get("/supervisor/students", {
          params: { per_page: 100, page, ...params },
          signal: controller.signal,
        });
        merged.push(...unwrapSupervisorList(res.data));
        lastPage = res.data?.meta?.last_page ?? 1;
        page++;
      } while (page <= lastPage);

      if (!controller.signal.aborted) {
        setStudents(merged);
      }
    } catch (e) {
      if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError") {
        return;
      }
      setError(e?.response?.data?.message || "فشل تحميل قائمة الطلبة");
    } finally {
      if (!controller.signal.aborted) {
        setStudentsLoading(false);
      }
    }
  }, [filterSection, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadStatsAndSections();
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "فشل تحميل البيانات");
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitialReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatsAndSections]);

  useEffect(() => {
    if (!initialReady) return;
    loadStudentsOnly();
  }, [initialReady, loadStudentsOnly]);

  const handleSelectStudent = useCallback(
    (id) => {
      const sid = Number(id);
      if (!Number.isFinite(sid)) return;
      navigate(`/supervisor/workspace/${sid}`);
    },
    [navigate]
  );

  const handleBackToList = useCallback(() => {
    navigate("/supervisor/workspace", { replace: true });
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    setError("");
    try {
      await loadStatsAndSections();
      await loadStudentsOnly();
    } catch (e) {
      setError(e?.response?.data?.message || "فشل التحديث");
    }
  }, [loadStatsAndSections, loadStudentsOnly]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⏳</div>
        <p style={{ color: "#666" }}>جاري تحميل مساحة العمل...</p>
      </div>
    );
  }

  if (selectedStudentId) {
    return (
      <StudentProfile
        studentId={selectedStudentId}
        onBack={handleBackToList}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <div>
      {error && (
        <div className="section-card" style={{ borderRight: "4px solid #dc3545", marginBottom: "16px" }}>
          <p style={{ color: "#dc3545", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      <DashboardSummary stats={stats} loading={loading} />

      {/* Sections Cards */}
      {sections.length > 0 && (
        <div className="section-card" style={{ marginTop: "24px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
            📚 الشعب المشرف عليها
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {sections.map((s) => {
              const isExpanded = expandedSection === s.id;
              const trackLabel = s.training_track === "psychology_clinic"
                ? "عيادة نفسية"
                : s.training_track === "psychology_school"
                  ? "مدرسة (نفسية)"
                  : s.training_track === "psychology"
                    ? "علم النفس"
                    : s.training_track === "education"
                      ? "تربية"
                      : s.training_track || "—";
              const trackColor = s.training_track?.includes("psych") ? "#6f42c6" : "#0d6efd";
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
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "1.05rem" }}>{s.section_name || s.name}</h4>
                      <div style={{ fontSize: "0.82rem", color: "#666", marginTop: 2 }}>{s.course || "—"}</div>
                    </div>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: trackColor,
                        backgroundColor: trackColor + "15",
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

                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                    style={{
                      background: "none",
                      border: "1px solid #dee2e6",
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      color: "#0d6efd",
                      width: "100%",
                    }}
                  >
                    {isExpanded ? "إخفاء الطلاب ▲" : `عرض الطلاب (${s.students?.length ?? s.students_count ?? 0}) ▼`}
                  </button>

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
                    <div style={{ marginTop: 12, textAlign: "center", color: "#999", fontSize: "0.82rem" }}>
                      لا يوجد طلاب مسجلون
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="section-card" style={{ marginTop: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
              👥 الطلبة المشرف عليهم
            </h3>
            <p style={{ margin: "4px 0 0", color: "#666", fontSize: "0.85rem" }}>متابعة شاملة لحالة كل طالب</p>
            {studentsLoading && (
              <p style={{ margin: "8px 0 0", color: "#0d6efd", fontSize: "0.8rem" }}>جاري تحديث القائمة...</p>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              id="student-search"
              name="search"
              type="text"
              className="form-input-custom"
              placeholder="🔍 بحث بالاسم أو الرقم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: "200px" }}
            />
            <select
              id="section-filter"
              name="section"
              className="form-select-custom"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              style={{ minWidth: "140px" }}
            >
              <option value="">كل الشعب</option>
              {sections.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.section_name || s.name}
                </option>
              ))}
            </select>
            <select
              id="status-filter"
              name="status"
              className="form-select-custom"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ minWidth: "140px" }}
            >
              <option value="">كل الحالات</option>
              <option value="healthy">🟢 سليم</option>
              <option value="warning">🟡 تنبيه</option>
              <option value="critical">🔴 حرج</option>
            </select>
          </div>
        </div>

        <StudentsTable
          students={students}
          filterStatus={filterStatus}
          onSelectStudent={handleSelectStudent}
        />
      </div>
    </div>
  );
}
