import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  Layers,
  XCircle,
  Loader2,
  ArrowLeft,
  Printer,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";
import useCoordinatorDistribution from "../../hooks/useCoordinatorDistribution";
import {
  RequestsTable,
  RequestReviewDrawer,
  BatchBuilder,
  CoordinatorFilters,
} from "../../components/coordinator";
import { BATCH_STATUS_LABELS, BATCH_STATUS_COLORS } from "../../config/coordinator/statusLabels";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";
import { STATUS_LABELS } from "../../config/coordinator/statusLabels";
import EmptyState from "../../components/common/EmptyState";
import CoordinatorPsychologyReadOnlyNotice from "../../components/coordinator/CoordinatorPsychologyReadOnlyNotice";
import { printBatchTrainingRequests } from "../../utils/trainingRequestPrint";
import { getTrainingRequestBatch } from "../../services/api";

export default function CoordinatorTrainingRequests({ variant = "coordinator" }) {
  const toast = useAppToast();
  const isPsychSupervisor = variant === "psychologySupervisor";
  const lettersLink = isPsychSupervisor ? "/supervisor/psychology/official-letters" : "/coordinator/official-letters";

  const {
    loading,
    saving,
    error,
    success,
    batches,
    incomingRequests,
    coordinatorRejected,
    prelimApprovedByGroup,
    reviewDecision,
    createBatchForGroup,
    sendBatch,
    sites,
  } = useCoordinatorDistribution();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [presetDecision, setPresetDecision] = useState("");
  const [batchSendForm, setBatchSendForm] = useState({});
  const [printingBatchId, setPrintingBatchId] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const autoLetterNumber = (id) => `TR-${new Date().getFullYear()}-${String(id).padStart(3, "0")}`;
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });

  const handleView = (req) => {
    setSelectedRequest(req);
    setPresetDecision("");
    setDrawerOpen(true);
  };

  // Auto-open request when navigated from a notification via ?highlight=ID
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (!highlightId || loading) return;

    const idNum = Number(highlightId);
    const allRequests = [
      ...(incomingRequests || []),
      ...(coordinatorRejected || []),
      ...Object.values(prelimApprovedByGroup || {}).flat(),
    ];
    const found = allRequests.find((r) => Number(r.id) === idNum);
    if (found) {
      queueMicrotask(() => {
        handleView(found);
        const next = new URLSearchParams(searchParams);
        next.delete("highlight");
        setSearchParams(next, { replace: true });
      });
    }
  }, [searchParams, loading, incomingRequests, coordinatorRejected, prelimApprovedByGroup, setSearchParams]);

  const handleReview = async (id, decision, reason) => {
    try {
      await reviewDecision(id, decision, reason);
      setDrawerOpen(false);
      setSelectedRequest(null);
      setPresetDecision("");
    } catch {
      // error handled in hook
    }
  };

  function setBatchSendField(batchId, key, value) {
    setBatchSendForm((prev) => ({
      ...prev,
      [batchId]: { ...(prev[batchId] || {}), [key]: value },
    }));
  }

  async function handleSendBatch(batchId) {
    const data = batchSendForm[batchId] || {};
    const letterNumber = data.letter_number?.trim() || autoLetterNumber(batchId);
    const letterDate = data.letter_date || today;
    const payload = {
      letter_number: letterNumber,
      letter_date: letterDate,
      content: data.content?.trim() || "",
    };

    if (!payload.content) {
      return;
    }

    const sent = await sendBatch(batchId, payload);
    if (!sent) return;

    setBatchSendForm((prev) => {
      const next = { ...prev };
      delete next[batchId];
      return next;
    });
  }

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const filteredIncoming = filters.status
    ? incomingRequests.filter((r) => r.book_status === filters.status)
    : incomingRequests;

  const filteredSearch = filters.search
    ? filteredIncoming.filter((r) => {
        const s0 = r.students?.[0];
        const name = s0?.user?.name || r.requested_by?.name || "";
        const uid = s0?.user?.university_id || "";
        const site = r.training_site?.name || "";
        const q = filters.search.toLowerCase();
        return (
          name.toLowerCase().includes(q) ||
          uid.toLowerCase().includes(q) ||
          site.toLowerCase().includes(q)
        );
      })
    : filteredIncoming;

  const batchBuilderGroups = useMemo(() => {
    if (isPsychSupervisor) return prelimApprovedByGroup;
    return prelimApprovedByGroup.filter((g) => g.governing_body !== "ministry_of_health");
  }, [prelimApprovedByGroup, isPsychSupervisor]);

  const batchesForCoordinatorTable = useMemo(() => {
    if (isPsychSupervisor) return batches;
    return batches.filter((b) => b.governing_body !== "ministry_of_health");
  }, [batches, isPsychSupervisor]);

  async function handlePrintBatch(b) {
    setPrintingBatchId(b.id);
    try {
      const detail = await getTrainingRequestBatch(b.id);
      const list = detail?.training_requests || detail?.trainingRequests || [];
      const ok = printBatchTrainingRequests({
        batch: { ...b, ...detail },
        trainingRequests: list,
        senderFooter: isPsychSupervisor
          ? "مشرف التدريب الأكاديمي — قسم علم النفس — جامعة الخليل"
          : "منسّق التدريب الميداني — كلية التربية — جامعة الخليل",
      });
      if (!ok) {
        toast.warning("لا توجد طلبات في هذه الدفعة للطباعة.");
      }
    } catch {
      toast.error("تعذّر تحميل تفاصيل الدفعة للطباعة.");
    } finally {
      setPrintingBatchId(null);
    }
  }

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل الطلبات والدفعات..." />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <ClipboardList size={26} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">
              {isPsychSupervisor ? "طلبات التدريب والدفعات — علم النفس" : "طلبات التدريب والتوزيع"}
            </h1>
            <p className="hero-subtitle">
              {isPsychSupervisor
                ? "إنشاء الطلبات ومتابعة الدفعات والكتب الرسمية ضمن صلاحيات مشرف قسم علم النفس (لا يعرض مسار أصول التربية)."
                : "مراجعة الطلبات، اعتمادها، تجميعها في كتب رسمية حسب المديرية، وإرسالها للجهات الرسمية."}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p className="m-0">{error}</p>
        </div>
      )}

      {!isPsychSupervisor && <CoordinatorPsychologyReadOnlyNotice />}

      {success && (
        <div className="alert-custom alert-success mb-3">
          <p className="m-0">{success}</p>
        </div>
      )}

      {/* Filters */}
      <CoordinatorFilters
        filters={filters}
        setFilters={setFilters}
        showStatus
        showSearch
        statusOptions={statusOptions}
      />

      {/* المرحلة ١: طلبات واردة — غير مستخدمة في مسار علم النفس (المشرف يُنشئ الطلب مباشرة) */}
      {!isPsychSupervisor && (
        <div className="section-card mb-4">
          <div className="flex items-center gap-[10px] mb-4">
            <div className="section-icon">
              <ClipboardList size={20} />
            </div>
            <h4 className="m-0">طلبات واردة ({filteredSearch.length})</h4>
          </div>
          {filteredSearch.length === 0 ? (
            <EmptyState title="لا توجد طلبات واردة" description="جميع الطلبات تمت مراجعتها." />
          ) : (
            <RequestsTable requests={filteredSearch} onView={handleView} saving={saving} />
          )}
        </div>
      )}

      {/* المرحلة ٢: معتمد مبدئيًا — تجميع كتب رسمية */}
      <BatchBuilder
        groups={batchBuilderGroups}
        onCreateBatchForGroup={createBatchForGroup}
        saving={saving}
      />

      {/* المرحلة ٣: مرفوضة */}
      {coordinatorRejected.length > 0 && (
        <div className="section-card mb-4">
          <div className="flex items-center gap-[10px] mb-4">
            <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--danger) 0%, #bb2d3b 100%)" }}>
              <XCircle size={20} />
            </div>
            <h4 className="m-0">مرفوضة ({coordinatorRejected.length})</h4>
          </div>
          <RequestsTable
            requests={coordinatorRejected}
            onView={handleView}
            showActions={false}
            saving={saving}
          />
        </div>
      )}

      {/* المرحلة ٤: دفعات الإرسال */}
      <div className="section-card mb-4">
        <div className="flex items-center gap-[10px] mb-4">
          <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--info) 0%, #0aa2c0 100%)" }}>
            <Layers size={20} />
          </div>
          <h4 className="m-0">دفعات الإرسال</h4>
        </div>
        {batchesForCoordinatorTable.length === 0 ? (
          <EmptyState title="لا توجد دفعات" description="لم تُنشأ دفعات بعد." />
        ) : (
          <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الدفعة</th>
                  <th>الجهة الرسمية</th>
                  <th>المديرية/المنطقة</th>
                  <th>عدد الطلبات</th>
                  <th>الحالة</th>
                  <th>طباعة</th>
                  <th>إرسال</th>
                </tr>
              </thead>
              <tbody>
                {batchesForCoordinatorTable.slice(0, 4).map((b) => {
                  const statusLabel = BATCH_STATUS_LABELS[b.status] || b.status;
                  const statusColors = BATCH_STATUS_COLORS[b.status] || { bg: "#e9ecef", text: "#495057" };
                  const defaultLetterNumber = autoLetterNumber(b.id);
                  const batchDraft = batchSendForm[b.id] || {};
                  const effectiveLetterNumber = batchDraft.letter_number?.trim() || defaultLetterNumber;
                  const effectiveLetterDate = batchDraft.letter_date || today;
                  const isBatchFormComplete = Boolean(
                    effectiveLetterNumber &&
                    effectiveLetterDate &&
                    batchDraft.content?.trim()
                  );
                  return (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td>{getGoverningBodyLabel(b.governing_body)}</td>
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
                      <td>
                        <button
                          type="button"
                          className="btn-primary-custom inline-flex items-center gap-[6px] py-[6px] px-[10px] text-[0.8rem] rounded-lg"
                          style={{ opacity: printingBatchId === b.id ? 0.7 : 1 }}
                          onClick={() => handlePrintBatch(b)}
                          disabled={printingBatchId === b.id}
                          title="طباعة كشف أسماء هذه الدفعة فقط"
                        >
                          <Printer size={14} />
                          {printingBatchId === b.id ? "..." : "طباعة الدفعة"}
                        </button>
                      </td>
                      <td className="min-w-[340px]">
                        {b.status === "draft" ? (
                          <div className="grid gap-3 py-[14px] px-4 rounded-xl border border-[#e2e8f0] shadow-[0_1px_4px_rgba(0,0,0,0.06)] bg-gradient-to-br from-[#f8fafc] to-[#f0f4f8]">
                            <div className="grid grid-cols-2 gap-[10px]">
                              <div className="flex flex-col gap-1">
                                <label className="text-[0.72rem] font-bold text-[var(--primary)] tracking-[0.03em] flex items-center gap-[6px]">
                                  رقم الكتاب
                                  <span className="text-[0.68rem] bg-[#e0f2fe] text-[#0369a1] py-[1px] px-[7px] rounded-full font-bold">تلقائي</span>
                                </label>
                                <input
                                  className="form-control-custom text-[0.82rem] rounded-lg border-[1.5px] border-[#bae6fd] py-[6px] px-[10px] bg-[#f0f9ff] outline-none font-bold text-[#0c4a6e]"
                                  placeholder={defaultLetterNumber}
                                  value={effectiveLetterNumber}
                                  onChange={(e) =>
                                    setBatchSendField(b.id, "letter_number", e.target.value)
                                  }
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[0.72rem] font-bold text-[var(--primary)] tracking-[0.03em]">تاريخ الكتاب</label>
                                <input
                                  className="form-control-custom text-[0.82rem] rounded-lg border-[1.5px] border-[#cbd5e1] py-[6px] px-[10px] bg-white outline-none"
                                  type="date"
                                  value={effectiveLetterDate}
                                  onChange={(e) =>
                                    setBatchSendField(b.id, "letter_date", e.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[0.72rem] font-bold text-[var(--primary)] tracking-[0.03em]">محتوى الكتاب</label>
                              <textarea
                                className="form-control-custom text-[0.82rem] rounded-lg border-[1.5px] border-[#cbd5e1] py-2 px-[10px] bg-white resize-y outline-none leading-[1.6]"
                                placeholder="اكتب محتوى الكتاب هنا..."
                                value={batchSendForm[b.id]?.content || ""}
                                onChange={(e) =>
                                  setBatchSendField(b.id, "content", e.target.value)
                                }
                                rows={3}
                              />
                            </div>
                            <button
                              className="btn-primary-custom flex items-center justify-center gap-2 rounded-lg py-[9px] px-4 text-[0.88rem] font-bold tracking-[0.02em] transition-opacity duration-200"
                              style={{
                                opacity: (!saving && isBatchFormComplete) ? 1 : 0.6,
                                cursor: (!saving && isBatchFormComplete) ? "pointer" : "not-allowed",
                              }}
                              onClick={() => handleSendBatch(b.id)}
                              disabled={saving || !isBatchFormComplete}
                              title={
                                isBatchFormComplete
                                  ? "إرسال الدفعة"
                                  : "أدخل محتوى الكتاب قبل الإرسال"
                              }
                            >
                              <FileText size={15} />
                              {saving ? "جاري الإرسال..." : "إرسال الدفعة"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[var(--text-faint)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-center">
            <Link
              to={lettersLink}
              className="inline-flex items-center gap-1 text-[0.85rem] text-[var(--info)] font-bold"
            >
              عرض كل الدفعات <ArrowLeft size={14} />
            </Link>
          </div>
          </>
        )}
      </div>

      <RequestReviewDrawer
        request={selectedRequest}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedRequest(null);
          setPresetDecision("");
        }}
        onReview={handleReview}
        saving={saving}
        sites={sites}
        initialDecision={presetDecision}
      />
    </div>
  );
}
