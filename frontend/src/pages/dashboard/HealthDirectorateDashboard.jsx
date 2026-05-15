import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getOfficialLetters,
  getTrainingRequests,
} from "../../services/api";
import { useAnnouncements, useTrainingSites } from "../../hooks/useSharedData";
import { siteLabels } from "../../utils/roles";
import MinistryHealthSeal from "../../components/branding/MinistryHealthSeal";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Heart, Building2, FileText, Activity } from "lucide-react";

const HealthDirectorateDashboard = () => {
  const labels = siteLabels("health_center");
  const [loading, setLoading] = useState(true);

  const [directorateInfo, setDirectorateInfo] = useState({
    name: labels.directorateName,
    officer: "—",
    email: "—",
    phone: "—",
  });

  const [officialLetters, setOfficialLetters] = useState([]);
  const [trainingPlaces, setTrainingPlaces] = useState([]);
  const [latestActivities, setLatestActivities] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  const { data: announcementsData } = useAnnouncements({});
  const { data: sitesData } = useTrainingSites({});

  useEffect(() => {
    setTrainingPlaces(
      sitesData
        .filter((item) => item.site_type === "health_center")
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          name: item.name || "بدون اسم",
          type: item.site_type === "health_center" ? "مركز صحي" : item.site_type || "غير محدد",
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

      const [userRes, lettersRes, requestsRes] =
        await Promise.all([
          getCurrentUser().catch(() => null),
          getOfficialLetters().catch(() => []),
          getTrainingRequests({
            book_status: "sent_to_health_ministry",
            governing_body: "ministry_of_health",
            per_page: 100,
          }).catch(() => []),
        ]);

      const lettersData = Array.isArray(lettersRes?.data)
        ? lettersRes.data
        : Array.isArray(lettersRes)
        ? lettersRes
        : [];

      const requestsData = Array.isArray(requestsRes?.data)
        ? requestsRes.data
        : Array.isArray(requestsRes)
        ? requestsRes
        : [];

      setDirectorateInfo({
        name: userRes?.directorate || labels.directorateName,
        officer: userRes?.name || "مسؤول " + labels.directorateName,
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

      setIncomingRequests(requestsData.slice(0, 5));
    } catch (error) {
      console.error("Failed to load health dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    {
      title: "طلبات التدريب الجديدة",
      value: String(officialLetters.length),
      desc: "كتب بانتظار المراجعة أو الإرسال",
      className: "primary",
    },
    {
      title: "أماكن التدريب الصحية",
      value: String(trainingPlaces.length),
      desc: "عدد المراكز الصحية والمصحات",
      className: "accent",
    },
    {
      title: "المراكز المتاحة",
      value: String(
        trainingPlaces.filter(
          (item) => item.status === "نشط" || item.status === "متاح"
        ).length
      ),
      desc: "جهات متاحة لاستقبال الطلبة",
      className: "success",
    },
    {
      title: "طلبات بانتظار القرار",
      value: String(incomingRequests.length),
      desc: "طلبات واردة من المنسق للمراجعة",
      className: "warning",
    },
  ];

  if (loading) {
    return <LoadingSpinner size="page" text={`جاري تحميل لوحة ${labels.directorateName}...`} />;
  }

  const statVariantMap = {
    primary: { border: "border-r-primary", bg: "bg-primary/8" },
    accent: { border: "border-r-accent", bg: "bg-accent/8" },
    success: { border: "border-r-success", bg: "bg-success/8" },
    info: { border: "border-r-info", bg: "bg-info/8" },
    warning: { border: "border-r-warning", bg: "bg-warning/8" },
    danger: { border: "border-r-danger", bg: "bg-danger/8" },
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <MinistryHealthSeal height={56} maxWidth={280} />
        <div className="flex-[1_1_220px]">
          <PageHeader title={`لوحة ${labels.directorateName}`} subtitle={`متابعة طلبات التدريب، المراكز الصحية، والطاقة الاستيعابية داخل ${labels.directorateName}.`} icon={Heart} />
        </div>
      </div>

      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <h4 className="m-0 text-secondary font-extrabold text-[1.05rem]">نطاق المديرية</h4>
            <p className="m-0 mt-1 text-text text-[1rem] font-semibold">{directorateInfo.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {summaryCards.map((card, index) => {
          const vs = statVariantMap[card.className] || statVariantMap.info;
          return (
            <div key={index} className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[16px] p-4 border-r-4 ${vs.border}`}>
              <div className="text-text-faint text-[0.85rem] font-bold">{card.title}</div>
              <div className="text-[1.5rem] font-extrabold text-secondary">{card.value}</div>
              <div className="text-text-faint text-[0.78rem] mt-1">{card.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-3">
        <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">طلبات التدريب</h4>
        <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">عنوان الكتاب</th>
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الجهة المستلمة</th>
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">التاريخ</th>
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {officialLetters.map((letter) => (
                <tr key={letter.id} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors">
                  <td className="py-3 px-4">{letter.title}</td>
                  <td className="py-3 px-4">{letter.receiver}</td>
                  <td className="py-3 px-4">{letter.date}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[0.78rem] font-bold px-2.5 py-0.5 rounded-full ${letter.badgeClass?.includes("success") ? "bg-success/15 text-success" : letter.badgeClass?.includes("danger") ? "bg-danger/15 text-danger" : "bg-info/15 text-info"}`}>{letter.status}</span>
                  </td>
                </tr>
              ))}
              {officialLetters.length === 0 && (
                <tr><td colSpan="4" className="py-6 px-4 text-center text-text-faint">لا توجد كتب رسمية مسجلة حاليًا</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-3">
        <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">المراكز الصحية والطاقة الاستيعابية</h4>
        <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">اسم المركز</th>
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">النوع</th>
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الطاقة الاستيعابية</th>
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">التواصل</th>
                <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {trainingPlaces.map((place) => (
                <tr key={place.id} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors">
                  <td className="py-3 px-4">{place.name}</td>
                  <td className="py-3 px-4">{place.type}</td>
                  <td className="py-3 px-4">{place.capacity}</td>
                  <td className="py-3 px-4">{place.contact}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[0.78rem] font-bold px-2.5 py-0.5 rounded-full ${place.badgeClass?.includes("success") ? "bg-success/15 text-success" : place.badgeClass?.includes("danger") ? "bg-danger/15 text-danger" : "bg-info/15 text-info"}`}>{place.status}</span>
                  </td>
                </tr>
              ))}
              {trainingPlaces.length === 0 && (
                <tr><td colSpan="5" className="py-6 px-4 text-center text-text-faint">لا توجد مراكز صحية مسجلة حاليًا</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
        <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">آخر الأنشطة والتحديثات</h4>
        <div className="flex flex-col gap-3">
          {latestActivities.map((activity, index) => (
            <div key={index} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
              <p className="m-0 text-text-soft text-[0.88rem]">{activity}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default HealthDirectorateDashboard;
