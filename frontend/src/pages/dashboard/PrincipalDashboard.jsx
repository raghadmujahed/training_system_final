import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
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
    <div className="principal-dashboard">
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div
            className="hero-icon"
            style={{
              background: "linear-gradient(135deg, #142a42 0%, #2a4a6a 100%)",
            }}
          >
            <School size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">لوحة {labels.managerLabel}</h1>
            <p className="hero-subtitle">
              متابعة طلبات التدريب والمرشدين والمعاملات الرسمية داخل {labels.siteName}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <LoadingSpinner size="inline" text="جاري تحميل البيانات..." />
      )}

      {/* Profile Card */}
      <div
        className="section-card mb-4"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.25rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: "linear-gradient(135deg, #142a42 0%, #2a4a6a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 8px 20px rgba(20, 42, 66, 0.25)",
            }}
          >
            <Building2 size={28} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: 700 }}>
              {principalInfo.schoolName}
            </h4>
            <p style={{ margin: 0, color: "var(--text-soft)", fontSize: "0.9rem" }}>
              {principalInfo.schoolType}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <InfoItem icon={User} label={labels.managerLabel} value={principalInfo.principalName} />
          <InfoItem icon={MapPin} label="المديرية" value={principalInfo.directorate} />
          <InfoItem icon={Phone} label="رقم الهاتف" value={principalInfo.phone} />
          <InfoItem icon={Mail} label="البريد الإلكتروني" value={principalInfo.email} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "1.25rem",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "14px",
                  background: card.bg,
                  color: card.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: "0.25rem" }}>
                  {card.title}
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b" }}>{card.value}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginTop: "0.25rem" }}>
                  {card.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Training Requests Table */}
      <div
        className="section-card mb-4"
        style={{ padding: "1.5rem", borderRadius: "16px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <GraduationCap size={20} />
          </div>
          <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            {"طلبات التدريب الحديثة"}
          </h4>
        </div>

        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th
                  style={{
                    padding: "0.875rem 1rem",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#475569",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {"اسم الطالب"}
                </th>
                <th
                  style={{
                    padding: "0.875rem 1rem",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#475569",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {"التخصص"}
                </th>
                <th
                  style={{
                    padding: "0.875rem 1rem",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#475569",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {"الحالة"}
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request, idx) => (
                <tr
                  key={request.id}
                  style={{
                    background: idx % 2 === 0 ? "#fff" : "#f8fafc",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f8fafc")
                  }
                >
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
                          color: "#4f46e5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                        }}
                      >
                        {request.studentName?.charAt(0) || "?"}
                      </div>
                      <span style={{ fontWeight: 500 }}>{request.studentName}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    {request.specialization}
                  </td>
                  <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <StatusBadge status={request.status} badgeClass={request.badgeClass} />
                  </td>
                </tr>
              ))}

              {pendingRequests.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "2rem", textAlign: "center" }}>
                    <div style={{ color: "#94a3b8" }}>
                      <Inbox size={40} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>{"لا توجد طلبات تدريب حديثة"}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout: Letters & Activities */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Official Letters */}
        <div className="section-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.25rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <FileCheck size={20} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>
                {"آخر طلبات التدريب"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>
                {`واردة من المديرية`}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {latestLetters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                <FileText size={32} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: "0.9rem" }}>{"لا توجد كتب واردة"}</p>
              </div>
            ) : (
              latestLetters.map((letter) => (
                <div
                  key={letter.id}
                  style={{
                    padding: "1rem",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    transition: "all 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <FileText size={16} color="#8b5cf6" />
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{letter.subject}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <User size={12} />
                      {letter.sender}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
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
        <div className="section-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.25rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>
                {"آخر الأنشطة والتنبيهات"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>
                {"تحديثات النظام"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {latestActivities.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                <Bell size={32} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: "0.9rem" }}>{"لا توجد تنبيهات جديدة"}</p>
              </div>
            ) : (
              latestActivities.map((activity, index) => (
                <div
                  key={index}
                  style={{
                    padding: "0.875rem 1rem",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#f59e0b",
                      flexShrink: 0,
                    }}
                  />
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>{activity}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          background: "#f1f5f9",
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.125rem" }}>
          {label}
        </div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{value}</div>
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.375rem 0.75rem",
        background: colors.bg,
        color: colors.text,
        borderRadius: "9999px",
        fontSize: "0.8rem",
        fontWeight: 600,
      }}
    >
      <Icon size={14} />
      {status}
    </span>
  );
}

export default PrincipalDashboard;
