import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import {
  getCurrentUser,
  getOfficialLetters,
  getTrainingRequests,
  itemsFromPagedResponse,
} from "../../services/api";
import { useNotifications } from "../../hooks/useNotifications";
import { siteLabels } from "../../utils/roles";
import { isStudentApproved } from "../../utils/status";
import {
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Users,
  FileText,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  School,
  Briefcase,
  FileCheck,
  Inbox,
} from "lucide-react";

const PrincipalDashboard = ({ siteType = "school" }) => {
  const labels = siteLabels(siteType);
  const [loading, setLoading] = useState(true);
  const [principalInfo, setPrincipalInfo] = useState({
    principalName: "—",
    schoolName: "—",
    directorate: "—",
    schoolType: "—",
    phone: "—",
    email: "—",
  });
  const [requests, setRequests] = useState([]);
  const [latestLetters, setLatestLetters] = useState([]);
  const [latestActivities, setLatestActivities] = useState([]);

  const { notifications: notificationsList } = useNotifications({ pollUnread: false, perPage: 5 });

  useEffect(() => {
    setLatestActivities(notificationsList.map((item) => item.message).filter(Boolean));
  }, [notificationsList]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [userRes, requestsRes, lettersRes] =
        await Promise.all([
          getCurrentUser().catch(() => null),
          getTrainingRequests({ per_page: 100 }).catch(() => ({ data: [] })),
          getOfficialLetters({ type: "to_school", per_page: 5 }).catch(() => ({
            data: [],
          })),
        ]);

      const requestsList = itemsFromPagedResponse(requestsRes);
      const lettersList = itemsFromPagedResponse(lettersRes);

      const u = userRes?.data || userRes || {};
      const site = u.training_site?.data || u.training_site || {};
      setPrincipalInfo({
        principalName: u.name || "—",
        schoolName: site.name || "غير محدد — اربط الحساب بموقع تدريب من الإدارة",
        directorate: site.directorate || "—",
        schoolType:
          site.site_type_label ||
          (site.school_type === "private"
            ? "جهة خاصة"
            : site.school_type === "public"
              ? "جهة حكومية"
              : site.site_type === "health_center"
                ? "مركز صحي / تدريب صحي"
                : "مدرسة / جهة تدريب"),
        phone: u.phone || "—",
        email: u.email || "—",
      });
      setRequests(requestsList);
      setLatestLetters(
        lettersList.map((letter) => ({
          id: letter.id,
          subject: letter.letter_number || "طلب تدريب",
          sender: letter.sent_by?.data?.name || letter.sent_by?.name || "—",
          date: letter.letter_date || letter.created_at || "—",
        }))
      );
    } catch (error) {
      console.error("Failed to load principal dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = useMemo(() => {
    return requests
      .filter((request) =>
        ["sent_to_school", "school_approved"].includes(request.book_status)
      )
      .flatMap((request) =>
        (request.students || []).map((student) => ({
          id: `${request.id}-${student.id}`,
          studentName:
            student.user?.data?.name || student.user?.name || "طالب غير معروف",
          specialization:
            student.course?.data?.name || student.course?.name || "—",
          status: student.status_label || student.status || "قيد المراجعة",
          badgeClass: isStudentApproved(student.status)
            ? "badge-custom badge-success"
            : student.status === "rejected"
              ? "badge-custom badge-danger"
              : "badge-custom badge-warning",
        }))
      )
      .slice(0, 6);
  }, [requests]);

  const summaryCards = [
    {
      title: "طلبات التدريب الجديدة",
      value: String(
        requests.filter((request) => request.book_status === "sent_to_school").length
      ),
      desc: "طلبات بحاجة لمراجعة واعتماد",
      icon: Inbox,
      color: "#f59e0b",
      bg: "#fef3c7",
    },
    {
      title: "الطلبة المتدربون",
      value: String(
        requests
          .flatMap((request) => request.students || [])
          .filter((student) => isStudentApproved(student.status)).length
      ),
      desc: `عدد الطلبة المقبولين داخل ${labels.siteName}`,
      icon: Users,
      color: "#3b82f6",
      bg: "#dbeafe",
    },
    {
      title: labels.mentorCol,
      value: String(
        requests
          .flatMap((request) => request.students || [])
          .filter((student) => student.assigned_teacher).length
      ),
      desc: `تم تعيينهم لمتابعة الطلبة`,
      icon: Briefcase,
      color: "#10b981",
      bg: "#d1fae5",
    },
    {
      title: "طلبات التدريب الواردة",
      value: String(latestLetters.length),
      desc: "معاملات جديدة من المديرية",
      icon: FileText,
      color: "#8b5cf6",
      bg: "#ede9fe",
    },
  ];

  return (
    <>
      <PageHeader title={`لوحة ${labels.managerLabel}`} subtitle={`متابعة طلبات التدريب والمرشدين والمعاملات الرسمية داخل ${labels.siteName}`} icon={School} />

      {loading && (
        <LoadingSpinner size="inline" text="جاري تحميل البيانات..." />
      )}

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-white to-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-5 mb-4">
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[#e2e8f0]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#142a42] to-[#2a4a6a] flex items-center justify-center text-white shadow-lg shadow-[#142a42]/25">
            <Building2 size={28} />
          </div>
          <div>
            <h4 className="m-0 mb-1 text-[1.25rem] font-bold text-text">
              {principalInfo.schoolName}
            </h4>
            <p className="m-0 text-text-soft text-[0.9rem]">
              {principalInfo.schoolType}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoItem icon={User} label={labels.managerLabel} value={principalInfo.principalName} />
          <InfoItem icon={MapPin} label="المديرية" value={principalInfo.directorate} />
          <InfoItem icon={Phone} label="رقم الهاتف" value={principalInfo.phone} />
          <InfoItem icon={Mail} label="البريد الإلكتروني" value={principalInfo.email} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white border border-[#e2e8f0] rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div
                className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0"
                style={{ background: card.bg, color: card.color }}
              >
                <Icon size={26} />
              </div>
              <div className="flex-1">
                <div className="text-[0.85rem] text-text-soft mb-1">
                  {card.title}
                </div>
                <div className="text-[1.75rem] font-extrabold text-text">{card.value}</div>
                <div className="text-[0.8rem] text-text-faint mt-1">
                  {card.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Training Requests Table */}
      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-info to-[#2563eb] flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </div>
          <h4 className="m-0 text-secondary font-extrabold text-[1.1rem]">
            {"طلبات التدريب الحديثة"}
          </h4>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="py-3.5 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">
                  {"اسم الطالب"}
                </th>
                <th className="py-3.5 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">
                  {"التخصص"}
                </th>
                <th className="py-3.5 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">
                  {"الحالة"}
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request, idx) => (
                <tr
                  key={request.id}
                  className={`${idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"} transition-colors hover:bg-[#f1f5f9]`}
                >
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] text-[#4f46e5] flex items-center justify-center text-[0.85rem] font-bold"
                      >
                        {request.studentName?.charAt(0) || "?"}
                      </div>
                      <span className="font-medium">{request.studentName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">
                    {request.specialization}
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                    <StatusBadge status={request.status} badgeClass={request.badgeClass} />
                  </td>
                </tr>
              ))}

              {pendingRequests.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 px-4 text-center">
                    <div className="text-text-faint">
                      <Inbox size={40} className="mb-2 opacity-50 mx-auto" />
                      <p className="m-0">{"لا توجد طلبات تدريب حديثة"}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout: Letters & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Official Letters */}
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center text-white">
              <FileCheck size={20} />
            </div>
            <div>
              <h4 className="m-0 mb-1 text-secondary font-extrabold text-[1.1rem]">
                {"آخر طلبات التدريب"}
              </h4>
              <p className="m-0 text-[0.8rem] text-text-faint">
                {`واردة من المديرية`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {latestLetters.length === 0 ? (
              <div className="text-center py-6 text-text-faint">
                <FileText size={32} className="mb-2 opacity-40 mx-auto" />
                <p className="m-0 text-[0.9rem]">{"لا توجد كتب واردة"}</p>
              </div>
            ) : (
              latestLetters.map((letter) => (
                <div
                  key={letter.id}
                  className="p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] cursor-pointer transition-all hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className="text-[#8b5cf6]" />
                    <span className="font-semibold text-[0.9rem]">{letter.subject}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[0.8rem] text-[#64748b]">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {letter.sender}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {letter.date}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-warning to-[#d97706] flex items-center justify-center text-white">
              <Bell size={20} />
            </div>
            <div>
              <h4 className="m-0 mb-1 text-secondary font-extrabold text-[1.1rem]">
                {"آخر الأنشطة والتنبيهات"}
              </h4>
              <p className="m-0 text-[0.8rem] text-text-faint">
                {"تحديثات النظام"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {latestActivities.length === 0 ? (
              <div className="text-center py-6 text-text-faint">
                <Bell size={32} className="mb-2 opacity-40 mx-auto" />
                <p className="m-0 text-[0.9rem]">{"لا توجد تنبيهات جديدة"}</p>
              </div>
            ) : (
              latestActivities.map((activity, index) => (
                <div
                  key={index}
                  className="p-3.5 bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0] flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                  <p className="m-0 text-[0.85rem] text-[#475569]">{activity}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Helper Components
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-[10px] bg-[#f1f5f9] text-[#64748b] flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[0.75rem] text-text-faint mb-0.5">
          {label}
        </div>
        <div className="text-[0.9rem] font-semibold text-text">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, badgeClass }) {
  const isSuccess = badgeClass?.includes("success");
  const isDanger = badgeClass?.includes("danger");
  const isWarning = badgeClass?.includes("warning");

  let colors = { bg: "#f1f5f9", text: "#64748b", icon: Clock };
  if (isSuccess) colors = { bg: "#d1fae5", text: "#059669", icon: CheckCircle2 };
  if (isDanger) colors = { bg: "#fee2e2", text: "#dc2626", icon: AlertCircle };
  if (isWarning) colors = { bg: "#fef3c7", text: "#d97706", icon: Clock };

  const Icon = colors.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8rem] font-semibold"
      style={{ background: colors.bg, color: colors.text }}
    >
      <Icon size={14} />
      {status}
    </span>
  );
}

export default PrincipalDashboard;
