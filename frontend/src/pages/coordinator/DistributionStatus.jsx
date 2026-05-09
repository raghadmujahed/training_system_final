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
            <GitBranch size={26} />
          </div>
          <div className="flex-1">
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
          <p className="m-0">{error}</p>
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
          <div className="flex items-center gap-[10px] mb-4">
            <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--info) 0%, #0aa2c0 100%)" }}>
              <GitBranch size={20} />
            </div>
            <h4 className="m-0">مسارات التوزيع ({requests.length})</h4>
          </div>

          <div className="flex flex-col gap-3">
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
                  className="border border-[var(--border)] rounded-[14px] py-4 px-[18px] bg-white transition-[var(--transition)]"
                >
                  {/* Header Row */}
                  <div className="flex justify-between items-center mb-[10px]">
                    <div className="flex items-center gap-[10px]">
                      <div className="w-[38px] h-[38px] rounded-[10px] shrink-0 flex items-center justify-center text-white text-[0.95rem] font-extrabold" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)" }}>
                        {studentName.charAt(0)}
                      </div>
                      <div>
                        <h6 className="m-0 text-[0.95rem]">{studentName}</h6>
                        <span className="text-[0.78rem] text-[var(--text-faint)]">
                          {universityId}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={r.book_status} size="lg" />
                  </div>

                  {/* Info Chips */}
                  <div className="flex flex-wrap gap-x-[14px] gap-y-[6px] text-[0.82rem] text-[var(--text-soft)] mb-3">
                    <span className="flex items-center gap-1">
                      <GraduationCap size={13} className="text-[var(--accent)]" />
                      {courseName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={13} className="text-[var(--info)]" />
                      {siteName}
                    </span>
                    {governingBody && (
                      <span className="flex items-center gap-1">
                        <GitBranch size={13} className="text-[var(--primary)]" />
                        {getGoverningBodyLabel(governingBody)}
                      </span>
                    )}
                    {phone && (
                      <span className="flex items-center gap-1 direction-ltr">
                        📱 {phone}
                      </span>
                    )}
                    {email && (
                      <span className="flex items-center gap-1 direction-ltr">
                        ✉️ {email}
                      </span>
                    )}
                  </div>

                  {/* Stepper */}
                  <div className="bg-[#f8f9fb] rounded-[10px] py-[10px] px-[14px] border border-[var(--border)]">
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
              className="flex items-center justify-center gap-[6px] w-full py-3 mt-3 bg-transparent border border-dashed border-[var(--border)] rounded-xl text-[var(--info)] text-[0.9rem] font-bold cursor-pointer transition-all duration-200"
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
