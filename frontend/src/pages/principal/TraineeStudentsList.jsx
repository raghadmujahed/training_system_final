import { useEffect, useState } from "react";
import { getCurrentUser, getTrainingAssignments } from "../../services/api";
import { siteLabels } from "../../utils/roles";
import {
  Users, GraduationCap, BookOpen, Activity, Search, Loader2, AlertCircle, User
} from "lucide-react";

const fadeIn = `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
const spin = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`;

const TraineeStudentsList = ({ siteType = "school" }) => {
  const labels = siteLabels(siteType);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const [userRes, assignmentsRes] = await Promise.all([
        getCurrentUser(),
        getTrainingAssignments({ per_page: 200 }),
      ]);
      const user = userRes?.data || userRes || {};
      const trainingSite = user.training_site?.data || user.training_site || {};
      const allAssignments = Array.isArray(assignmentsRes?.data)
        ? assignmentsRes.data
        : Array.isArray(assignmentsRes) ? assignmentsRes : [];

      const siteAssignments = allAssignments.filter((a) => {
        const siteId = a.training_site?.data?.id || a.training_site?.id;
        return trainingSite?.id ? siteId === trainingSite.id : true;
      });

      const list = siteAssignments
        .map((assignment) => {
          const enrollment = assignment.enrollment?.data || assignment.enrollment || {};
          const student = enrollment.user?.data || enrollment.user || {};
          const section = enrollment.section?.data || enrollment.section || {};
          const course = enrollment.section?.data?.course?.data || enrollment.section?.course?.data || enrollment.section?.course || {};
          const mentor = assignment.teacher?.data || assignment.teacher || {};
          const supervisor = assignment.academic_supervisor?.data || assignment.academic_supervisor || {};
          const deptName = student.department?.data?.name || student.department?.name || null;
          const trackLabel = deptName === "psychology" ? "علم النفس" : deptName === "usool_tarbiah" ? "أصول التربية" : "—";
          return {
            id: assignment.id, name: student.name || "—", universityId: student.university_id || "—",
            specialization: course.name || "—", track: trackLabel,
            academicYear: enrollment.academic_year || section.academic_year || "—",
            semester: enrollment.semester || section.semester || "—",
            mentorName: mentor.name || "—", supervisorName: supervisor.name || "—",
            status: assignment.status || "—",
          };
        })
        .filter((s) => s.name !== "—");

      setStudents(list);
      if (!list.length) setError(`لا يوجد طلبة متدربون معتمدون في ${labels.siteName} حاليًا.`);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل بيانات الطلبة.");
    } finally {
      setLoading(false);
    }
  };

  const statusMap = { assigned: { label: "معين", color: "#f59e0b", bg: "#fef3c7" }, ongoing: { label: "جارٍ", color: "#10b981", bg: "#d1fae5" }, completed: { label: "منتهي", color: "#6366f1", bg: "#e0e7ff" } };
  const getStatus = (s) => statusMap[s] || { label: s, color: "#6b7280", bg: "#f3f4f6" };

  const filtered = students.filter((s) => s.name.includes(search) || s.universityId.includes(search) || s.mentorName.includes(search));
  const educCount = students.filter((s) => s.track === "أصول التربية").length;
  const psychCount = students.filter((s) => s.track === "علم النفس").length;
  const ongoingCount = students.filter((s) => s.status === "ongoing").length;

  return (
    <>
      <style>{fadeIn}{spin}</style>
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 60%, #3b82f6 100%)",
          borderRadius: 20, padding: "2rem 2.5rem", color: "white", marginBottom: "1.5rem",
          boxShadow: "0 8px 32px rgba(30,58,95,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={28} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>الطلبة المتدربون</h1>
              <p style={{ margin: "0.25rem 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                عرض بيانات جميع الطلبة المتدربين في {labels.siteName}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "3rem", color: "#64748b" }}>
            <Loader2 size={28} className="spin" /> جاري تحميل البيانات...
          </div>
        ) : error && !students.length ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 1.25rem", background: "#fef3c7", color: "#92400e", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600 }}>
            <AlertCircle size={20} /> {error}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { title: "إجمالي الطلبة", value: students.length, icon: Users, color: "#1e3a5f", bg: "#dbeafe" },
                { title: "أصول التربية", value: educCount, icon: BookOpen, color: "#0284c7", bg: "#e0f2fe" },
                { title: "علم النفس", value: psychCount, icon: GraduationCap, color: "#7c3aed", bg: "#ede9fe" },
                { title: "تدريب جارٍ", value: ongoingCount, icon: Activity, color: "#10b981", bg: "#d1fae5" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} style={{
                    background: "#fff", borderRadius: 16, padding: "1.25rem",
                    border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500 }}>{card.title}</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{card.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "1rem 1.5rem",
              border: "1px solid #e2e8f0", marginBottom: "1.25rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <Search size={20} color="#94a3b8" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الرقم الجامعي أو المعلم المرشد..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: "0.9rem", color: "#1e293b", background: "transparent" }}
              />
            </div>

            {/* Table */}
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)", color: "white" }}>
                      {["#", "اسم الطالب", "الرقم الجامعي", "القسم", "التخصص", "العام / الفصل", labels.mentorLabel, "المشرف الأكاديمي", "الحالة"].map((h) => (
                        <th key={h} style={{ padding: "0.85rem 0.75rem", whiteSpace: "nowrap", textAlign: "center", fontWeight: 700, fontSize: "0.82rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                          <Search size={40} style={{ marginBottom: "0.75rem", opacity: 0.3 }} />
                          <div>لا توجد نتائج مطابقة للبحث</div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((s, idx) => {
                        const st = getStatus(s.status);
                        return (
                          <tr key={s.id} style={{ background: idx % 2 === 0 ? "#f8fafc" : "white", transition: "background 0.15s" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "#f8fafc" : "white"}
                          >
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>{idx + 1}</td>
                            <td style={{ padding: "0.75rem", fontWeight: 700, color: "#1e293b" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <User size={14} />
                                </div>
                                {s.name}
                              </div>
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "#475569", fontFamily: "monospace" }}>{s.universityId}</td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                              <span style={{ background: s.track === "علم النفس" ? "#f5f3ff" : "#eff6ff", color: s.track === "علم النفس" ? "#7c3aed" : "#1d4ed8", padding: "0.25rem 0.75rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 700 }}>{s.track}</span>
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "#475569" }}>{s.specialization}</td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "#475569" }}>{s.academicYear} / {s.semester}</td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "#475569" }}>{s.mentorName}</td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: "#475569" }}>{s.supervisorName}</td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                              <span style={{ background: st.bg, color: st.color, padding: "0.25rem 0.75rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 700 }}>{st.label}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TraineeStudentsList;
