import { useEffect, useState } from "react";
import { getCurrentUser, getTrainingAssignments } from "../../services/api";
import { siteLabels } from "../../utils/roles";
import {
  Users, GraduationCap, BookOpen, Activity, Search, Loader2, AlertCircle, User
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";

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
      <div className="animate-[fadeIn_0.4s_ease]">
        {/* Hero */}
        <div className="text-white mb-6 py-8 px-10 rounded-[20px] bg-gradient-to-br from-[#1e3a5f] via-[#2d5f8a] to-[#3b82f6] shadow-[0_8px_32px_rgba(30,58,95,0.3)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Users size={28} />
            </div>
            <div>
              <h1 className="m-0 text-[1.5rem] font-extrabold">الطلبة المتدربون</h1>
              <p className="m-0 mt-1 opacity-90 text-[0.95rem]">
                عرض بيانات جميع الطلبة المتدربين في {labels.siteName}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="section" text="جاري تحميل البيانات..." />
        ) : error && !students.length ? (
          <div className="flex items-center gap-2 py-4 px-5 bg-[#fef3c7] text-[#92400e] rounded-[14px] text-[0.9rem] font-semibold">
            <AlertCircle size={20} /> {error}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4 mb-6">
              {[
                { title: "إجمالي الطلبة", value: students.length, icon: Users, color: "#1e3a5f", bg: "#dbeafe" },
                { title: "أصول التربية", value: educCount, icon: BookOpen, color: "#0284c7", bg: "#e0f2fe" },
                { title: "علم النفس", value: psychCount, icon: GraduationCap, color: "#7c3aed", bg: "#ede9fe" },
                { title: "تدريب جارٍ", value: ongoingCount, icon: Activity, color: "#10b981", bg: "#d1fae5" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#e2e8f0] flex items-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="text-[0.78rem] text-[#94a3b8] font-medium">{card.title}</div>
                      <div className="text-[1.5rem] font-extrabold text-[#1e293b]">{card.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl py-4 px-6 border border-[#e2e8f0] mb-5 flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <Search size={20} color="#94a3b8" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الرقم الجامعي أو المعلم المرشد..."
                className="flex-1 border-none outline-none text-[0.9rem] text-[#1e293b] bg-transparent"
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse direction-rtl text-[0.88rem]">
                  <thead>
                    <tr className="text-white bg-gradient-to-br from-[#1e3a5f] to-[#2d5f8a]">
                      {["#", "اسم الطالب", "الرقم الجامعي", "القسم", "التخصص", "العام / الفصل", labels.mentorLabel, "المشرف الأكاديمي", "الحالة"].map((h) => (
                        <th key={h} className="py-[0.85rem] px-3 whitespace-nowrap text-center font-bold text-[0.82rem]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center p-12 text-[#94a3b8]">
                          <Search size={40} className="mb-3 opacity-30" />
                          <div>لا توجد نتائج مطابقة للبحث</div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((s, idx) => {
                        const st = getStatus(s.status);
                        return (
                          <tr key={s.id} className={idx % 2 === 0 ? "bg-[#f8fafc]" : "bg-white"} style={{ transition: "background 0.15s" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "#f8fafc" : "white"}
                          >
                            <td className="py-3 px-2 text-center text-[#94a3b8] font-bold">{idx + 1}</td>
                            <td className="py-3 px-3 font-bold text-[#1e293b]">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] text-[#2563eb]">
                                  <User size={14} />
                                </div>
                                {s.name}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center text-[#475569] font-mono">{s.universityId}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="py-1 px-3 rounded-full text-[0.78rem] font-bold" style={{ background: s.track === "علم النفس" ? "#f5f3ff" : "#eff6ff", color: s.track === "علم النفس" ? "#7c3aed" : "#1d4ed8" }}>{s.track}</span>
                            </td>
                            <td className="py-3 px-2 text-center text-[#475569]">{s.specialization}</td>
                            <td className="py-3 px-2 text-center text-[#475569]">{s.academicYear} / {s.semester}</td>
                            <td className="py-3 px-2 text-center text-[#475569]">{s.mentorName}</td>
                            <td className="py-3 px-2 text-center text-[#475569]">{s.supervisorName}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="py-1 px-3 rounded-full text-[0.78rem] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
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
