import { useState, useEffect, useCallback } from "react";
import { apiClient, unwrapSupervisorList, unwrapSupervisorStats } from "../../../services/api";
import DashboardSummary from "./DashboardSummary";
import StudentsTable from "./StudentsTable";
import StudentProfile from "./StudentProfile";

export default function SupervisorWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const [statsRes, studentsRes, sectionsRes] = await Promise.all([
        apiClient.get("/supervisor/stats").then((r) => r.data).catch(() => null),
        apiClient.get("/supervisor/students", { params: { per_page: 200 } }).then((r) => r.data).catch(() => ({})),
        apiClient.get("/supervisor/sections", { params: { per_page: 100 } }).then((r) => r.data).catch(() => ({})),
      ]);

      setStats(unwrapSupervisorStats(statsRes));
      setStudents(unwrapSupervisorList(studentsRes));
      setSections(unwrapSupervisorList(sectionsRes));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل البيانات");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const handleSelectStudent = useCallback((studentId) => {
    setSelectedStudentId(studentId);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedStudentId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    loadWorkspace();
  }, []);

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
              const trackLabel = s.training_track === 'psychology_clinic' ? 'عيادة نفسية'
                : s.training_track === 'psychology_school' ? 'مدرسة (نفسية)'
                : s.training_track === 'psychology' ? 'علم النفس'
                : s.training_track === 'education' ? 'تربية'
                : s.training_track || '—';
              const trackColor = s.training_track?.includes('psych') ? '#6f42c1' : '#0d6efd';
              return (
                <div key={s.id} style={{
                  border: "1px solid #e9ecef",
                  borderRadius: "12px",
                  padding: "16px",
                  backgroundColor: "#fff",
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "1.05rem" }}>{s.section_name || s.name}</h4>
                      <div style={{ fontSize: "0.82rem", color: "#666", marginTop: 2 }}>{s.course || "—"}</div>
                    </div>
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: trackColor,
                      backgroundColor: trackColor + "15",
                      border: `1px solid ${trackColor}30`,
                    }}>
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
                            <tr key={st.id} style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
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
        </div>
      )}

      <div className="section-card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
              👥 الطلبة المشرف عليهم
            </h3>
            <p style={{ margin: "4px 0 0", color: "#666", fontSize: "0.85rem" }}>
              متابعة شاملة لحالة كل طالب
            </p>
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
                <option key={s.id} value={s.id}>
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
          searchTerm={searchTerm}
          filterSection={filterSection}
          filterStatus={filterStatus}
          onSelectStudent={handleSelectStudent}
        />
      </div>
    </div>
  );
}
