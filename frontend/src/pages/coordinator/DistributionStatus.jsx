import { useState } from "react";
import { Loader2, GitBranch, GraduationCap, Building2, ChevronDown, ChevronUp } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useCoordinatorRequests from "../../hooks/useCoordinatorRequests";
import { CoordinatorFilters, StatusBadge, DistributionStatusStepper } from "../../components/coordinator";
import { STATUS_LABELS } from "../../config/coordinator/statusLabels";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";
import EmptyState from "../../components/common/EmptyState";
import CoordinatorPsychologyReadOnlyNotice from "../../components/coordinator/CoordinatorPsychologyReadOnlyNotice";

export default function CoordinatorDistributionStatus({ audience = "coordinator" }) {
  const isPsych = audience === "psychologySupervisor";
  const {
    loading,
    error,
    requests,
    filters,
    setFilters,
    periods,
  } = useCoordinatorRequests();

  const [showAll, setShowAll] = useState(false);

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const visibleRequests = showAll ? requests : requests.slice(0, 5);
  const hasMore = requests.length > 5;

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل حالة التوزيع..." />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <GitBranch size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">{isPsych ? "متابعة حالة الطلبات — علم النفس" : "حالة التوزيع"}</h1>
            <p className="hero-subtitle">
              {isPsych
                ? "المسار من الإرسال للجهة الرسمية حتى موافقة المدرسة أو جهة التدريب النهائية؛ القبول النهائي ليس بموافقة المديرية/الوزارة وحدها."
                : "تتبع حالة كل طلب عبر مراحل التوزيع من الإرسال حتى القبول أو الرفض."}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {!isPsych && <CoordinatorPsychologyReadOnlyNotice />}

      {/* Filters */}
      <CoordinatorFilters
        filters={filters}
        setFilters={setFilters}
        showStatus
        showPeriod
        showSearch
        periods={periods}
        statusOptions={statusOptions}
      />

      {/* Requests List */}
      {requests.length === 0 ? (
        <EmptyState title="لا توجد طلبات" description="لا يوجد طلبات تطابق الفلاتر المحددة." />
      ) : (
        <div className="section-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--info) 0%, #0aa2c0 100%)" }}>
              <GitBranch size={20} />
            </div>
            <h4 style={{ margin: 0 }}>مسارات التوزيع ({requests.length})</h4>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visibleRequests.map((r) => {
              const s0 = r.students?.[0];
              const studentName = s0?.user?.name || r.requested_by?.name || "—";
              const universityId = s0?.user?.university_id || "—";
              const courseName = s0?.course?.name || "—";
              const siteName = r.training_site?.name || "—";
              const governingBody = r.governing_body || null;
              const phone = s0?.user?.phone || "";
              const email = s0?.user?.email || "";

              return (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "16px 18px",
                    background: "#fff",
                    transition: "var(--transition)",
                  }}
                >
                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "0.88rem",
                        fontWeight: 800,
                      }}>
                        {studentName.charAt(0)}
                      </div>
                      <div>
                        <h6 style={{ margin: 0, fontSize: "0.95rem" }}>{studentName}</h6>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
                          {universityId}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={r.book_status} size="lg" />
                  </div>

                  {/* Info Chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: "0.82rem", color: "var(--text-soft)", marginBottom: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <GraduationCap size={13} style={{ color: "var(--accent)" }} />
                      {courseName}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Building2 size={13} style={{ color: "var(--info)" }} />
                      {siteName}
                    </span>
                    {governingBody && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <GitBranch size={13} style={{ color: "var(--primary)" }} />
                        {getGoverningBodyLabel(governingBody)}
                      </span>
                    )}
                    {phone && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, direction: "ltr" }}>
                        📱 {phone}
                      </span>
                    )}
                    {email && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, direction: "ltr" }}>
                        ✉️ {email}
                      </span>
                    )}
                  </div>

                  {/* Stepper */}
                  <div style={{
                    background: "#f8f9fb",
                    borderRadius: 10,
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                  }}>
                    <DistributionStatusStepper
                      currentStatus={r.book_status}
                      governingBody={governingBody}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show More Toggle */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                padding: "12px",
                marginTop: 12,
                background: "transparent",
                border: "1px dashed var(--border)",
                borderRadius: 12,
                color: "var(--info)",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {showAll ? (
                <>
                  إخفاء <ChevronUp size={18} />
                </>
              ) : (
                <>
                  عرض الكل ({requests.length - 5} إضافي) <ChevronDown size={18} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
