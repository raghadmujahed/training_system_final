import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
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
      <LoadingSpinner size="page" text="جاري تحميل الشعب..." />
    );
  }

  return (
    <>
      <PageHeader
        title="الشعب"
        subtitle="الشعب الأكاديمية المسندة إليك — عرض الطلاب والانتقال إلى مساحة العمل"
      />

      <div className="page-actions mb-4">
        <Link to="/supervisor/workspace" className="btn-light-custom">
          ← مساحة العمل
        </Link>
      </div>

      {error && (
        <div className="section-card border-r-[4px] border-[#dc3545] mb-4">
          <p className="text-[#dc3545] m-0">⚠️ {error}</p>
        </div>
      )}

      {!sections.length ? (
        <EmptyState
          title="لا توجد شعب"
          description="لم يُعيَّن لك مشرفة على شعب بعد، أو لا توجد بيانات للفترة الحالية."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {sections.map((s) => {
            const isExpanded = expandedSection === s.id;
            const trackLabel = trainingTrackLabel(s.training_track);
            const trackColor = s.training_track?.includes("psych") ? { bg: "#ede7f6", text: "#6f42c1" } : { bg: "#dbeafe", text: "#0d6efd" };
            return (
              <div
                key={s.id}
                className="border border-[#e9ecef] rounded-xl p-4 bg-white transition-shadow duration-200"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="m-0 text-[1.05rem]">{s.section_name || s.section_code || `شعبة #${s.id}`}</h4>
                    <div className="text-[0.82rem] text-[#666] mt-[2px]">{s.course || "—"}</div>
                    {s.section_code && (s.section_name || s.name) && (
                      <div className="text-[0.75rem] text-[#888] mt-[2px]">رمز الشعبة: {s.section_code}</div>
                    )}
                  </div>
                  <span
                    className="py-[3px] px-[10px] rounded-xl text-[0.72rem] font-semibold"
                    style={{
                      background: trackColor.bg,
                      color: trackColor.text,
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

                <div className="flex flex-col gap-2">
                  <Link
                    to={`/supervisor/workspace?section=${s.id}`}
                    className="btn-primary-custom text-center no-underline block"
                  >
                    فتح في مساحة العمل (فلترة الطلاب)
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                    className="border border-[#dee2e6] rounded-md py-[6px] px-3 text-[0.82rem] cursor-pointer text-[#555] w-full"
                  >
                    {isExpanded ? "إخفاء الطلاب ▲" : `عرض الطلاب (${s.students?.length ?? s.students_count ?? 0}) ▼`}
                  </button>
                </div>

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
                  <div className="max-w-md mx-auto mt-3 text-center text-[#999] text-[0.82rem]" onClick={(e) => e.stopPropagation()}>لا يوجد طلاب مسجلون</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
