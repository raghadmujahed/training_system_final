import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient, unwrapSupervisorList, unwrapSupervisorStats } from "../../../services/api";
import DashboardSummary from "./DashboardSummary";
import StudentsTable from "./StudentsTable";
import StudentProfile from "./StudentProfile";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

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
      <LoadingSpinner size="page" text="جاري تحميل مساحة العمل..." />
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
        <div className="section-card border-r-4 border-r-[#dc3545] mb-4">
          <p className="text-[#dc3545] m-0">⚠️ {error}</p>
        </div>
      )}

      <DashboardSummary stats={stats} loading={loading} />

      {/* Sections Cards */}
      {sections.length > 0 && (
        <div className="section-card mt-6">
          <h3 className="m-0 mb-4 text-[1.2rem] flex items-center gap-2">
            📚 الشعب المشرف عليها
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
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
                  className="border border-[#e9ecef] rounded-xl p-4 bg-white transition-[box-shadow] duration-200"
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="m-0 text-[1.05rem]">{s.section_name || s.name}</h4>
                      <div className="text-[0.82rem] text-[#666] mt-[2px]">{s.course || "—"}</div>
                    </div>
                    <span
                      className="py-[3px] px-[10px] rounded-xl text-[0.72rem] font-semibold"
                      style={{
                        color: trackColor,
                        backgroundColor: trackColor + "15",
                        border: `1px solid ${trackColor}30`,
                      }}
                    >
                      {trackLabel}
                    </span>
                  </div>

                  <div className="flex gap-4 text-[0.82rem] text-[#555] mb-3 flex-wrap">
                    <span>👥 {s.students_count ?? 0} طالب</span>
                    <span>🏛️ {s.department || "—"}</span>
                    <span>🏫 {s.training_sites_count ?? 0} جهة تدريب</span>
                  </div>

                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                    className="bg-none border border-[#dee2e6] rounded-md py-1 px-3 cursor-pointer text-[0.78rem] text-[#0d6efd] w-full"
                  >
                    {isExpanded ? "إخفاء الطلاب ▲" : `عرض الطلاب (${s.students?.length ?? s.students_count ?? 0}) ▼`}
                  </button>

                  {isExpanded && s.students && s.students.length > 0 && (
                    <div className="mt-3 border-t border-[#f0f0f0] pt-3">
                      <table className="w-full text-[0.78rem] border-collapse">
                        <thead>
                          <tr className="border-b border-[#eee]">
                            <th className="text-right py-1 px-2 text-[#888]">الاسم</th>
                            <th className="text-right py-1 px-2 text-[#888]">الرقم الجامعي</th>
                            <th className="text-right py-1 px-2 text-[#888]">القسم</th>
                            <th className="text-right py-1 px-2 text-[#888]">التخصص</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.students.map((st) => (
                            <tr
                              key={st.id}
                              className="border-b border-[#f5f5f5] cursor-pointer"
                              onClick={() => handleSelectStudent(st.id)}
                            >
                              <td className="py-[6px] px-2 font-medium">{st.name}</td>
                              <td className="py-[6px] px-2">{st.university_id}</td>
                              <td className="py-[6px] px-2">{st.department || "—"}</td>
                              <td className="py-[6px] px-2">{st.major || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {isExpanded && (!s.students || s.students.length === 0) && (
                    <div className="mt-3 text-center text-[#999] text-[0.82rem]">
                      لا يوجد طلاب مسجلون
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="section-card mt-6">
        <div
          className="flex justify-between items-center flex-wrap gap-4 mb-5"
        >
          <div>
            <h3 className="m-0 text-[1.2rem] flex items-center gap-2">
              👥 الطلبة المشرف عليهم
            </h3>
            <p className="m-0 mt-1 text-[#666] text-[0.85rem]">متابعة شاملة لحالة كل طالب</p>
            {studentsLoading && (
              <p className="m-0 mt-2 text-[#0d6efd] text-[0.8rem]">جاري تحديث القائمة...</p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <input
              id="student-search"
              name="search"
              type="text"
              className="form-input-custom min-w-[200px]"
              placeholder="🔍 بحث بالاسم أو الرقم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              id="section-filter"
              name="section"
              className="form-select-custom min-w-[140px]"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
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
              className="form-select-custom min-w-[140px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
