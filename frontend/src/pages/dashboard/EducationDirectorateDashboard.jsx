import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getCurrentUser,
  getOfficialLetters,
  getTrainingSites,
  getAnnouncements,
} from "../../services/api";
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [userRes, lettersRes, sitesRes, announcementsRes] =
        await Promise.all([
          getCurrentUser().catch(() => null),
          getOfficialLetters().catch(() => []),
          getTrainingSites().catch(() => []),
          getAnnouncements().catch(() => []),
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

      setTrainingPlaces(
        sitesData.slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name || "بدون اسم",
          type:
            item.site_type === "school"
              ? "مدرسة"
              : item.site_type === "health_center"
              ? "مركز صحي"
              : item.site_type || "غير محدد",
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
          : [
              "لا توجد أنشطة حديثة حاليًا.",
            ]
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
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content" style={{ alignItems: "flex-start" }}>
          <MinistryEducationSeal size={54} />
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">{"لوحة مديرية التربية"}</h1>
            <p className="hero-subtitle">
              {"متابعة طلبات التدريب، أماكن التدريب، والطاقة الاستيعابية داخل المديرية"}
            </p>
          </div>
        </div>
      </div>

      {/* Directorate Info Card */}
      <div className="section-card mb-4" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ width: 56, height: 56, borderRadius: "16px", background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "0 8px 20px rgba(30, 58, 95, 0.25)" }}>
            <Building2 size={28} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: 700 }}>{directorateInfo.name}</h4>
            <p style={{ margin: 0, color: "var(--text-soft)", fontSize: "0.9rem" }}>{"مديرية التربية والتعليم"}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <InfoItem icon={User} label={"المسؤول"} value={directorateInfo.officer} />
          <InfoItem icon={Mail} label={"البريد الإلكتروني"} value={directorateInfo.email} />
          <InfoItem icon={Phone} label={"رقم الهاتف"} value={directorateInfo.phone} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} style={{ background: "#fff", borderRadius: "16px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1rem", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 52, height: 52, borderRadius: "14px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: "0.25rem" }}>{card.title}</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b" }}>{card.value}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginTop: "0.25rem" }}>{card.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Official Letters Table */}
      <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <FileCheck size={20} />
          </div>
          <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{"طلبات التدريب"}</h4>
        </div>
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["عنوان الكتاب", "الجهة المستلمة", "التاريخ", "الحالة"].map((h) => (
                  <th key={h} style={{ padding: "0.875rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {officialLetters.map((letter, idx) => (
                <tr key={letter.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f8fafc")}
                >
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <FileText size={16} color="#3b82f6" />
                      <span style={{ fontWeight: 500 }}>{letter.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>{letter.receiver}</td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Clock size={12} />{letter.date}</span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <StatusBadge status={letter.status} badgeClass={letter.badgeClass} />
                  </td>
                </tr>
              ))}
              {officialLetters.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center" }}>
                  <div style={{ color: "#94a3b8" }}>
                    <Inbox size={40} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>{"لا توجد كتب رسمية مسجلة حاليًا"}</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training Sites Table */}
      <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <School size={20} />
          </div>
          <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{"أماكن التدريب والطاقة الاستيعابية"}</h4>
        </div>
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["اسم الجهة", "النوع", "الطاقة الاستيعابية", "التواصل", "الحالة"].map((h) => (
                  <th key={h} style={{ padding: "0.875rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trainingPlaces.map((place, idx) => (
                <tr key={place.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f8fafc")}
                >
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "8px", background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700 }}>
                        {place.name?.charAt(0) || "?"}
                      </div>
                      <span style={{ fontWeight: 500 }}>{place.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>{place.type}</td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600, color: "#1e293b" }}>
                      <Users size={14} color="#64748b" />{place.capacity}
                    </span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Phone size={12} />{place.contact}</span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <StatusBadge status={place.status} badgeClass={place.badgeClass} />
                  </td>
                </tr>
              ))}
              {trainingPlaces.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center" }}>
                  <div style={{ color: "#94a3b8" }}>
                    <School size={40} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>{"لا توجد أماكن تدريب مسجلة حاليًا"}</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activities Section */}
      <div className="section-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <Bell size={20} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"آخر الأنشطة والتحديثات"}</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"إعلانات وتحديثات المديرية"}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {latestActivities.length === 0 || (latestActivities.length === 1 && latestActivities[0] === "لا توجد أنشطة حديثة حاليًا.") ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
              <Activity size={32} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: "0.9rem" }}>{"لا توجد أنشطة حديثة حاليًا"}</p>
            </div>
          ) : (
            latestActivities.map((activity, index) => (
              <div key={index} style={{ padding: "0.875rem 1rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>{activity}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.125rem" }}>{label}</div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{value}</div>
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", background: colors.bg, color: colors.text, borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600 }}>
      <Icon size={14} />{status}
    </span>
  );
}

export default EducationDirectorateDashboard;