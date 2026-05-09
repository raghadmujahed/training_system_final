import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Loader2,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Printer,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";
import { sendTrainingRequestBatch, getTrainingRequestBatch } from "../../services/api";
import useCoordinatorBatches from "../../hooks/useCoordinatorBatches";
import {
  CoordinatorFilters,
  OfficialLetterPreview,
} from "../../components/coordinator";
import { BATCH_STATUS_LABELS, BATCH_STATUS_COLORS } from "../../config/coordinator/statusLabels";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";
import EmptyState from "../../components/common/EmptyState";
import CoordinatorPsychologyReadOnlyNotice from "../../components/coordinator/CoordinatorPsychologyReadOnlyNotice";
import { printBatchTrainingRequests } from "../../utils/trainingRequestPrint";

export default function CoordinatorOfficialLetters({ audience = "coordinator" }) {
  const toast = useAppToast();
  const isPsych = audience === "psychologySupervisor";
  const {
    loading,
    error,
    batches,
    filters,
    setFilters,
    getBatchRequests,
    getBatchLetter,
    reload,
  } = useCoordinatorBatches();

  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchDetail, setBatchDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [printingBatchId, setPrintingBatchId] = useState(null);

  const listBatches = useMemo(() => {
    if (isPsych) return batches;
    return batches.filter((b) => b.governing_body !== "ministry_of_health");
  }, [batches, isPsych]);

  const visibleBatches = showAllBatches ? listBatches : listBatches.slice(0, 5);
  const hasMoreBatches = listBatches.length > 5;

  const selectedBatch = selectedBatchId
    ? batches.find((b) => b.id === selectedBatchId)
    : null;

  const selectedLetter = selectedBatchId
    ? getBatchLetter(selectedBatchId)
    : null;

  const [sendSaving, setSendSaving] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSend = async (batchId, payload) => {
    setSendError("");
    setSendSaving(true);
    try {
      await sendTrainingRequestBatch(batchId, {
        letter_number: payload.letter_number,
        letter_date: payload.letter_date,
        content: payload.content,
      });
      await reload();
      closeDrawer();
    } catch (e) {
      const msg = e?.response?.data?.message;
      const errs = e?.response?.data?.errors;
      if (errs && typeof errs === "object") {
        setSendError(Object.values(errs).flat().join(" ") || msg || "فشل الإرسال");
      } else {
        setSendError(msg || "فشل الإرسال");
      }
    } finally {
      setSendSaving(false);
    }
  };

  const openDrawer = async (batchId) => {
    setSendError("");
    setSelectedBatchId(batchId);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const detail = await getTrainingRequestBatch(batchId);
      setBatchDetail(detail);
    } catch {
      setBatchDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setSendError("");
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedBatchId(null);
      setBatchDetail(null);
    }, 300);
  };

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل دفعات طلبات التدريب..." />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <FileText size={26} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">{isPsych ? "الكتب الرسمية / الدفعات — علم النفس" : "دفعات طلبات التدريب"}</h1>
            <p className="hero-subtitle">
              {isPsych
                ? "متابعة دفعاتك كمشرف أكاديمي لقسم علم النفس وإرسالها للجهة الرسمية المناسبة."
                : "عرض وإرسال دفعات طلبات التدريب (معاملة رسمية) إلى مديريات التربية والتعليم فقط."}
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
        showSearch
        statusOptions={Object.entries(BATCH_STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
      />

      {/* Batches Table */}
      <div className="section-card">
        <div className="flex items-center gap-[10px] mb-4">
          <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)" }}>
            <FileText size={20} />
          </div>
          <h4 className="m-0">قائمة الدفعات ({listBatches.length})</h4>
        </div>
        {listBatches.length === 0 ? (
          <EmptyState title="لا توجد دفعات" description="لم تُنشأ أي دفعات طلبات تدريب بعد." />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الدفعة</th>
                  <th>الجهة المرسل إليها</th>
                  <th>المديرية</th>
                  <th>عدد الطلبات</th>
                  <th>الحالة</th>
                  <th>تاريخ الإنشاء</th>
                  <th>تاريخ الإرسال</th>
                  <th>رقم المعاملة</th>
                  <th>طباعة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleBatches.map((b) => {
                  const statusLabel = BATCH_STATUS_LABELS[b.status] || b.status;
                  const statusColors = BATCH_STATUS_COLORS[b.status] || {
                    bg: "#e9ecef",
                    text: "#495057",
                  };
                  return (
                    <tr key={b.id}>
                      <td className="font-bold">#{b.id}</td>
                      <td>{b.recipient_label || getGoverningBodyLabel(b.governing_body)}</td>
                      <td>{b.directorate || "—"}</td>
                      <td>{b.items_count ?? "—"}</td>
                      <td>
                        <span
                          className="py-[3px] px-[10px] rounded-full text-[0.78rem] font-bold"
                          style={{
                            background: statusColors.bg,
                            color: statusColors.text,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="text-[0.82rem] text-[var(--text-soft)]">
                        {b.created_at ? new Date(b.created_at).toLocaleString("ar-SA") : "—"}
                      </td>
                      <td className="text-[0.82rem] text-[var(--text-soft)]">
                        {b.sent_at ? new Date(b.sent_at).toLocaleString("ar-SA") : "—"}
                      </td>
                      <td>{b.letter_number || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-outline-custom inline-flex items-center gap-[6px] py-1 px-[10px] text-[0.8rem] rounded-lg"
                          onClick={async () => {
                            setPrintingBatchId(b.id);
                            try {
                              const detail = await getTrainingRequestBatch(b.id);
                              const list = detail?.training_requests || detail?.trainingRequests || [];
                              const ok = printBatchTrainingRequests({
                                batch: { ...b, ...detail },
                                trainingRequests: list,
                                senderFooter: isPsych
                                  ? "مشرف التدريب الأكاديمي — قسم علم النفس — جامعة الخليل"
                                  : "منسّق التدريب الميداني — كلية التربية — جامعة الخليل",
                              });
                              if (!ok) toast.warning("لا توجد طلبات في هذه الدفعة للطباعة.");
                            } catch {
                              toast.error("تعذّر تحميل تفاصيل الدفعة للطباعة.");
                            } finally {
                              setPrintingBatchId(null);
                            }
                          }}
                          disabled={printingBatchId === b.id}
                          title="كشف أسماء هذه الدفعة فقط"
                        >
                          <Printer size={14} />
                          {printingBatchId === b.id ? "..." : "طباعة"}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => openDrawer(b.id)}
                          className="btn-primary-custom flex items-center gap-1 py-1 px-3 text-[0.82rem] rounded-lg"
                        >
                          <Eye size={14} />
                          عرض
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {hasMoreBatches && (
          <button
            onClick={() => setShowAllBatches(!showAllBatches)}
            className="flex items-center justify-center gap-[6px] w-full py-3 mt-3 bg-transparent border border-dashed border-[var(--border)] rounded-xl text-[var(--info)] text-[0.9rem] font-bold cursor-pointer transition-all duration-200"
          >
            {showAllBatches ? (
              <>
                إخفاء <ChevronUp size={18} />
              </>
            ) : (
              <>
                عرض الكل ({listBatches.length - 5} إضافي) <ChevronDown size={18} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-[999] animate-[fadeIn_0.2s_ease] bg-[rgba(0,0,0,0.35)] backdrop-blur-[2px]"
        />
      )}

      {/* Drawer Panel */}
      <div
        className="fixed top-0 left-0 bottom-0 w-[min(520px,90vw)] bg-[#f5f6fa] shadow-[4px_0_24px_rgba(0,0,0,0.12)] z-[1000] overflow-y-auto p-0 transition-transform duration-300"
        style={{
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 text-white py-[18px] px-5 flex justify-between items-center" style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)" }}>
          <div className="flex items-center gap-[10px]">
            <FileText size={22} />
            <h3 className="m-0 text-[1.1rem]">
              تفاصيل دفعة طلبات التدريب
            </h3>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="إغلاق"
            className="w-11 h-11 flex items-center justify-center cursor-pointer transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              borderRadius: 10,
            }}
          >
            <X size={26} strokeWidth={2.25} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5">
          {detailLoading ? (
            <LoadingSpinner size="section" text="جاري تحميل تفاصيل الدفعة..." />
          ) : selectedBatch && (
            <OfficialLetterPreview
              batch={batchDetail || selectedBatch}
              requests={batchDetail?.training_requests || batchDetail?.trainingRequests || batchDetail?.requests || batchDetail?.items || getBatchRequests(selectedBatchId) || []}
              letter={selectedLetter}
              onSend={(payload) => handleSend(selectedBatch.id, payload)}
              saving={sendSaving}
              sendError={sendError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
