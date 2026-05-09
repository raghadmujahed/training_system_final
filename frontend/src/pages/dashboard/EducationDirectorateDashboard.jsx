import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import {
  getCurrentUser,
  getOfficialLetters,
} from "../../services/api";
import { useAnnouncements, useTrainingSites } from "../../hooks/useSharedData";
import {
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  School,
  FileCheck,
  Bell,
  Inbox,
  Activity,
  Users,
  AlertTriangle,
} from "lucide-react";
import MinistryEducationSeal from "../../components/branding/MinistryEducationSeal";

const EducationDirectorateDashboard = () => {
  const [loading, setLoading] = useState(true);

  const [directorateInfo, setDirectorateInfo] = useState({
    name: "مديرية التربية",
    officer: "—",
    email: "—",
    phone: "—",
  });

  const [officialLetters, setOfficialLetters] = useState([]);
  const [trainingPlaces, setTrainingPlaces] = useState([]);
  const [latestActivities, setLatestActivities] = useState([]);

  const { data: announcementsData } = useAnnouncements({});
  const { data: sitesData } = useTrainingSites({});

  useEffect(() => {
    setTrainingPlaces(
      sitesData.slice(0, 5).map((item) => ({
        id: item.id,
        name: item.name || "بدون اسم",
        type:
          item.site_type === "school" ? "مدرسة"
          : item.site_type === "health_center" ? "مركز صحي"
          : item.site_type || "غير محدد",
        capacity: item.capacity ?? 0,
        contact: item.phone || item.contact || item.location || "—",
        status: item.is_active === true || item.is_active === 1 ? "متاح" : "غير نشط",
        badgeClass: item.is_active === true || item.is_active === 1
          ? "badge-custom badge-success"
          : "badge-custom badge-danger",
      }))
    );
  }, [sitesData]);

  useEffect(() => {
    setLatestActivities(
      announcementsData.length > 0
        ? announcementsData.slice(0, 4).map((item) => item.title || item.message || item.description)
        : ["لا توجد أنشطة حديثة حاليًا."]
    );
  }, [announcementsData]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [userRes, lettersRes] =
        await Promise.all([
          getCurrentUser().catch(() => null),
          getOfficialLetters().catch(() => []),
        ]);

      const lettersData = Array.isArray(lettersRes?.data)
        ? lettersRes.data
        : Array.isArray(lettersRes)
        ? lettersRes
        : [];

      setDirectorateInfo({
        name:
          userRes?.directorate ||
          userRes?.department?.name ||
          "مديرية الخليل",
        officer: userRes?.name || "مسؤول مديرية التربية",
        email: userRes?.email || "—",
        phone: userRes?.phone || "—",
      });

      setOfficialLetters(
        lettersData.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.training_request?.title || item.letter_number || "بدون عنوان",
          receiver:
            item.training_site?.name ||
            item.received_by?.data?.name ||
            item.received_by?.name ||
            "غير محدد",
          date: item.letter_date || item.created_at || "—",
          status: item.status_label || "مرسل للمديرية",
          badgeClass:
            item.status === "directorate_approved"
              ? "badge-custom badge-success"
              : item.status === "sent_to_school" || item.status === "school_received"
              ? "badge-custom badge-info"
              : item.status === "completed"
              ? "badge-custom badge-soft"
              : item.status === "rejected"
              ? "badge-custom badge-danger"
              : "badge-custom badge-warning",
        }))
      );

    } catch (error) {
      console.error("Failed to load education dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    {
      title: "طلبات التدريب الجديدة",
      value: String(officialLetters.length),
      desc: "كتب بانتظار المراجعة أو الإرسال",
      icon: Inbox,
      color: "#3b82f6",
      bg: "#dbeafe",
    },
    {
      title: "أماكن التدريب",
      value: String(trainingPlaces.length),
      desc: "عدد المدارس والجهات التدريبية",
      icon: School,
      color: "#8b5cf6",
      bg: "#ede9fe",
    },
    {
      title: "الأماكن النشطة",
      value: String(
        trainingPlaces.filter(
          (item) => item.status === "نشط" || item.status === "متاح"
        ).length
      ),
      desc: "جهات متاحة لاستقبال الطلبة",
      icon: CheckCircle2,
      color: "#10b981",
      bg: "#d1fae5",
    },
    {
      title: "بحاجة لتحديث",
      value: String(
        trainingPlaces.filter(
          (item) => item.status !== "نشط" && item.status !== "متاح"
        ).length
      ),
      desc: "مدارس يجب تحديث بياناتها",
      icon: AlertTriangle,
      color: "#f59e0b",
      bg: "#fef3c7",
    },
  ];

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل لوحة مديرية التربية..." />
    );
  }

  return (
    <>
      <div className="flex items-start gap-3 flex-wrap mb-4">
        <MinistryEducationSeal size={54} />
        <div className="flex-1">
          <PageHeader title="لوحة مديرية التربية" subtitle="متابعة طلبات التدريب، أماكن التدريب، والطاقة الاستيعابية داخل المديرية" icon={Building2} />
        </div>
      </div>

      {/* Directorate Info Card */}
      <div className="bg-gradient-to-br from-white to-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-5 mb-4">
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[#e2e8f0]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5f8a] flex items-center justify-center text-white shadow-lg shadow-[#1e3a5f]/25">
            <Building2 size={28} />
          </div>
          <div>
            <h4 className="m-0 mb-1 text-[1.25rem] font-bold text-text">{directorateInfo.name}</h4>
            <p className="m-0 text-text-soft text-[0.9rem]">{"مديرية التربية والتعليم"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem icon={User} label={"المسؤول"} value={directorateInfo.officer} />
          <InfoItem icon={Mail} label={"البريد الإلكتروني"} value={directorateInfo.email} />
          <InfoItem icon={Phone} label={"رقم الهاتف"} value={directorateInfo.phone} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white border border-[#e2e8f0] rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                <Icon size={26} />
              </div>
              <div className="flex-1">
                <div className="text-[0.85rem] text-text-soft mb-1">{card.title}</div>
                <div className="text-[1.75rem] font-extrabold text-text">{card.value}</div>
                <div className="text-[0.8rem] text-text-faint mt-1">{card.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Official Letters Table */}
      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-info to-[#2563eb] flex items-center justify-center text-white">
            <FileCheck size={20} />
          </div>
          <h4 className="m-0 text-secondary font-extrabold text-[1.1rem]">{"طلبات التدريب"}</h4>
        </div>
        <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr className="bg-[#f8fafc]">
                {["عنوان الكتاب", "الجهة المستلمة", "التاريخ", "الحالة"].map((h) => (
                  <th key={h} className="py-3.5 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {officialLetters.map((letter, idx) => (
                <tr key={letter.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"} transition-colors hover:bg-[#f1f5f9]`}>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-info" />
                      <span className="font-medium">{letter.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">{letter.receiver}</td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">
                    <span className="flex items-center gap-1"><Clock size={12} />{letter.date}</span>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                    <StatusBadge status={letter.status} badgeClass={letter.badgeClass} />
                  </td>
                </tr>
              ))}
              {officialLetters.length === 0 && (
                <tr><td colSpan={4} className="py-8 px-4 text-center">
                  <div className="text-text-faint">
                    <Inbox size={40} className="mb-2 opacity-50 mx-auto" />
                    <p className="m-0">{"لا توجد كتب رسمية مسجلة حاليًا"}</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training Sites Table */}
      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center text-white">
            <School size={20} />
          </div>
          <h4 className="m-0 text-secondary font-extrabold text-[1.1rem]">{"أماكن التدريب والطاقة الاستيعابية"}</h4>
        </div>
        <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr className="bg-[#f8fafc]">
                {["اسم الجهة", "النوع", "الطاقة الاستيعابية", "التواصل", "الحالة"].map((h) => (
                  <th key={h} className="py-3.5 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trainingPlaces.map((place, idx) => (
                <tr key={place.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"} transition-colors hover:bg-[#f1f5f9]`}>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] text-[#4f46e5] flex items-center justify-center text-[0.85rem] font-bold">
                        {place.name?.charAt(0) || "?"}
                      </div>
                      <span className="font-medium">{place.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">{place.type}</td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                    <span className="inline-flex items-center gap-1 font-semibold text-text">
                      <Users size={14} className="text-[#64748b]" />{place.capacity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">
                    <span className="flex items-center gap-1"><Phone size={12} />{place.contact}</span>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                    <StatusBadge status={place.status} badgeClass={place.badgeClass} />
                  </td>
                </tr>
              ))}
              {trainingPlaces.length === 0 && (
                <tr><td colSpan={5} className="py-8 px-4 text-center">
                  <div className="text-text-faint">
                    <School size={40} className="mb-2 opacity-50 mx-auto" />
                    <p className="m-0">{"لا توجد أماكن تدريب مسجلة حاليًا"}</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activities Section */}
      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-warning to-[#d97706] flex items-center justify-center text-white">
            <Bell size={20} />
          </div>
          <div>
            <h4 className="m-0 mb-1 text-secondary font-extrabold text-[1.1rem]">{"آخر الأنشطة والتحديثات"}</h4>
            <p className="m-0 text-[0.8rem] text-text-faint">{"إعلانات وتحديثات المديرية"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {latestActivities.length === 0 || (latestActivities.length === 1 && latestActivities[0] === "لا توجد أنشطة حديثة حاليًا.") ? (
            <div className="text-center py-6 text-text-faint">
              <Activity size={32} className="mb-2 opacity-40 mx-auto" />
              <p className="m-0 text-[0.9rem]">{"لا توجد أنشطة حديثة حاليًا"}</p>
            </div>
          ) : (
            latestActivities.map((activity, index) => (
              <div key={index} className="p-3.5 bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                <p className="m-0 text-[0.85rem] text-[#475569]">{activity}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

// Helper Components
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-[10px] bg-[#f1f5f9] text-[#64748b] flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[0.75rem] text-text-faint mb-0.5">{label}</div>
        <div className="text-[0.9rem] font-semibold text-text">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, badgeClass }) {
  const isSuccess = badgeClass?.includes("success");
  const isDanger = badgeClass?.includes("danger");
  const isWarning = badgeClass?.includes("warning");
  const isInfo = badgeClass?.includes("info");

  let colors = { bg: "#f1f5f9", text: "#64748b", icon: Clock };
  if (isSuccess) colors = { bg: "#d1fae5", text: "#059669", icon: CheckCircle2 };
  if (isDanger) colors = { bg: "#fee2e2", text: "#dc2626", icon: AlertCircle };
  if (isWarning) colors = { bg: "#fef3c7", text: "#d97706", icon: Clock };
  if (isInfo) colors = { bg: "#dbeafe", text: "#2563eb", icon: Clock };

  const Icon = colors.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8rem] font-semibold" style={{ background: colors.bg, color: colors.text }}>
      <Icon size={14} />{status}
    </span>
  );
}

export default EducationDirectorateDashboard;