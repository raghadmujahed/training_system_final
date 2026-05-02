import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getOfficialLetters,
  getTrainingSites,
  getAnnouncements,
  getTrainingRequests,
} from "../../services/api";
import { siteLabels } from "../../utils/roles";
import MinistryHealthSeal from "../../components/branding/MinistryHealthSeal";

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [userRes, lettersRes, sitesRes, announcementsRes, requestsRes] =
        await Promise.all([
          getCurrentUser().catch(() => null),
          getOfficialLetters().catch(() => []),
          getTrainingSites().catch(() => []),
          getAnnouncements().catch(() => []),
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

      const sitesData = Array.isArray(sitesRes?.data)
        ? sitesRes.data
        : Array.isArray(sitesRes)
        ? sitesRes
        : [];

      const announcementsData = Array.isArray(announcementsRes?.data)
        ? announcementsRes.data
        : Array.isArray(announcementsRes)
        ? announcementsRes
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
            status:
              item.is_active === true || item.is_active === 1 ? "متاح" : "غير نشط",
            badgeClass:
              item.is_active === true || item.is_active === 1
                ? "badge-custom badge-success"
                : "badge-custom badge-danger",
          }))
      );

      setLatestActivities(
        announcementsData.length > 0
          ? announcementsData.slice(0, 4).map((item) => item.title || item.message || item.description)
          : ["لا توجد أنشطة حديثة حاليًا."]
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
    return (
      <div className="alert-custom alert-info">
        جاري تحميل لوحة {labels.directorateName}...
      </div>
    );
  }

  return (
    <>
      <div className="content-header">
        <div className="d-flex align-items-center gap-3 flex-wrap" style={{ flexDirection: "row" }}>
          <MinistryHealthSeal height={56} maxWidth={280} />
          <div style={{ flex: "1 1 220px" }}>
            <h1 className="page-title mb-0">لوحة {labels.directorateName}</h1>
            <p className="page-subtitle mb-0">
              متابعة طلبات التدريب، المراكز الصحية، والطاقة الاستيعابية داخل {labels.directorateName}.
            </p>
          </div>
        </div>
      </div>

      <div className="section-card mb-3">
        <h4>المعلومات الأساسية</h4>
        <div className="summary-grid">
          <div className="kpi-box">
            <strong>{directorateInfo.name}</strong>
            <span>اسم المديرية</span>
          </div>

          <div className="kpi-box">
            <strong>{directorateInfo.officer}</strong>
            <span>المسؤول</span>
          </div>

          <div className="kpi-box">
            <strong>{directorateInfo.email}</strong>
            <span>البريد الإلكتروني</span>
          </div>

          <div className="kpi-box">
            <strong>{directorateInfo.phone}</strong>
            <span>رقم الهاتف</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid mb-3">
        {summaryCards.map((card, index) => (
          <div key={index} className={`stat-card ${card.className}`}>
            <div>
              <div className="stat-title">{card.title}</div>
              <div className="stat-value">{card.value}</div>
            </div>
            <div className="stat-meta">{card.desc}</div>
          </div>
        ))}
      </div>

      <div className="section-card mb-3">
        <h4>طلبات التدريب</h4>

        <div className="table-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th>عنوان الكتاب</th>
                <th>الجهة المستلمة</th>
                <th>التاريخ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {officialLetters.map((letter) => (
                <tr key={letter.id}>
                  <td>{letter.title}</td>
                  <td>{letter.receiver}</td>
                  <td>{letter.date}</td>
                  <td>
                    <span className={letter.badgeClass}>{letter.status}</span>
                  </td>
                </tr>
              ))}

              {officialLetters.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">
                    لا توجد كتب رسمية مسجلة حاليًا
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-card mb-3">
        <h4>المراكز الصحية والطاقة الاستيعابية</h4>

        <div className="table-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th>اسم المركز</th>
                <th>النوع</th>
                <th>الطاقة الاستيعابية</th>
                <th>التواصل</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {trainingPlaces.map((place) => (
                <tr key={place.id}>
                  <td>{place.name}</td>
                  <td>{place.type}</td>
                  <td>{place.capacity}</td>
                  <td>{place.contact}</td>
                  <td>
                    <span className={place.badgeClass}>{place.status}</span>
                  </td>
                </tr>
              ))}

              {trainingPlaces.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    لا توجد مراكز صحية مسجلة حاليًا
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-card">
        <h4>آخر الأنشطة والتحديثات</h4>

        <div className="activity-list">
          {latestActivities.map((activity, index) => (
            <div key={index} className="activity-item">
              <p>{activity}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default HealthDirectorateDashboard;
