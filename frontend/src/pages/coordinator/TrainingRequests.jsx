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
import {
  buildFormalTrainingLetterHtml,
  printHtmlDocument,
  trainingRequestToPrintRow,
  filterTrainingRequestsForPrint,
  formatEducationDirectorateRecipient,
  formatEducationRegionSubtitle,
  DEFAULT_COORDINATOR_TO_DIRECTORATE_INTRO,
} from "../../utils/trainingRequestPrint";

export default function CoordinatorTrainingRequests({ variant = "coordinator" }) {
  const isPsychSupervisor = variant === "psychologySupervisor";
  const lettersLink = isPsychSupervisor ? "/supervisor/psychology/official-letters" : "/coordinator/official-letters";

  const {
    loading,
    saving,
    error,
    success,
    batches,
    requests,
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

  const today = new Date().toISOString().slice(0, 10);
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
    const letterNumber = data.letter_number?.trim() || `كتاب-${batchId}/${new Date().getFullYear()}`;
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

  const requestsByDirectorate = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const gb = r.governing_body || "directorate_of_education";
      const dir = (r.training_site?.directorate || r.directorate || "").trim();
      const key = `${gb}::${dir || "__none__"}`;
      if (!map.has(key)) {
        map.set(key, { governing_body: gb, directorate: dir, requests: [] });
      }
      map.get(key).requests.push(r);
    }
    return Array.from(map.values()).sort((a, b) => {
      const la = `${getGoverningBodyLabel(a.governing_body)} ${a.directorate || ""}`;
      const lb = `${getGoverningBodyLabel(b.governing_body)} ${b.directorate || ""}`;
      return la.localeCompare(lb, "ar");
    });
  }, [requests]);

  const printCoordinatorGroup = (group) => {
    const acceptedOnly = filterTrainingRequestsForPrint(group.requests);
    if (acceptedOnly.length === 0) {
      window.alert("لا توجد طلبات «معتمدة» ضمن هذه المجموعة للطباعة (يُستبعد المسودة والمرفوضة وبانتظار المراجعة).");
      return;
    }
    const variant = group.governing_body === "ministry_of_health" ? "health" : "education";
    const dirLabel = group.directorate || "";
    const orgLines =
      group.governing_body === "ministry_of_health"
        ? [
            "كلية التربية — جامعة الخليل",
            "وزارة الصحة الفلسطينية",
            "قطاع التدريب الميداني — وزارة الصحة",
          ]
        : [
            "كلية التربية — جامعة الخليل",
            "وزارة التربية والتعليم",
            `المنطقة: ${formatEducationRegionSubtitle(dirLabel)}`,
          ];
    const recipientTo =
      group.governing_body === "ministry_of_health"
        ? "وزارة الصحة الفلسطينية — لمتابعة ملفات التدريب الميداني"
        : formatEducationDirectorateRecipient(dirLabel);
    const html = buildFormalTrainingLetterHtml({
      variant,
      orgLines,
      referenceNumber: null,
      letterDate: new Date().toLocaleDateString("ar-SA"),
      recipientTo,
      subject: "طلبات التدريب الميداني",
      bodyIntro: DEFAULT_COORDINATOR_TO_DIRECTORATE_INTRO,
      sections: [{ title: "كشف بأسماء الطلبة — طلبات معتمدة", rows: acceptedOnly.map(trainingRequestToPrintRow) }],
      senderFooter: "منسّق التدريب الميداني — كلية التربية — جامعة الخليل",
      attachmentsNote: null,
    });
    printHtmlDocument(html);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
        <Loader2 size={40} className="spin" style={{ color: "var(--primary)", marginBottom: 12 }} />
        <p style={{ color: "var(--text-faint)", fontSize: "0.95rem" }}>جاري تحميل الطلبات والدفعات...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <ClipboardList size={44} />
          </div>
          <div style={{ flex: 1 }}>
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
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {!isPsychSupervisor && <CoordinatorPsychologyReadOnlyNotice />}

      {success && (
        <div className="alert-custom alert-success mb-3">
          <p style={{ margin: 0 }}>{success}</p>
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

      <div className="section-card mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            className="section-icon"
            style={{ background: "linear-gradient(135deg, #1e5a8e 0%, #1e3a5f 100%)" }}
          >
            <Printer size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>طباعة حسب الجهة والمديرية</h4>
            <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "var(--text-faint)" }}>
              تُطبَع الطلبات المعتمدة فقط (بلا مسودة أو مرفوض أو قيد المراجعة عند المنسّق)، بصيغة كتاب رسمي.
            </p>
          </div>
        </div>
        {requestsByDirectorate.length === 0 ? (
          <EmptyState title="لا توجد طلبات" description="لم تُحمَّل أي طلبات بعد." />
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            }}
          >
            {requestsByDirectorate.map((g) => (
              <div
                key={`${g.governing_body}-${g.directorate || "x"}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: "linear-gradient(180deg, #fff, #f8fafc)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--primary)" }}>
                    {getGoverningBodyLabel(g.governing_body)}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>
                    {g.governing_body === "ministry_of_health"
                      ? "طلبات موجهة إلى وزارة الصحة"
                      : `المديرية: ${g.directorate || "غير محددة"}`}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginTop: 6 }}>
                    {g.requests.length} طلب
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary-custom"
                  onClick={() => printCoordinatorGroup(g)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: "0.84rem",
                    padding: "8px 12px",
                    borderRadius: 8,
                  }}
                >
                  <Printer size={16} />
                  طباعة هذه المجموعة
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* المرحلة ١: طلبات واردة — غير مستخدمة في مسار علم النفس (المشرف يُنشئ الطلب مباشرة) */}
      {!isPsychSupervisor && (
        <div className="section-card mb-4">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="section-icon">
              <ClipboardList size={20} />
            </div>
            <h4 style={{ margin: 0 }}>طلبات واردة ({filteredSearch.length})</h4>
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
        groups={prelimApprovedByGroup}
        onCreateBatchForGroup={createBatchForGroup}
        saving={saving}
      />

      {/* المرحلة ٣: مرفوضة */}
      {coordinatorRejected.length > 0 && (
        <div className="section-card mb-4">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--danger) 0%, #bb2d3b 100%)" }}>
              <XCircle size={20} />
            </div>
            <h4 style={{ margin: 0 }}>مرفوضة ({coordinatorRejected.length})</h4>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--info) 0%, #0aa2c0 100%)" }}>
            <Layers size={20} />
          </div>
          <h4 style={{ margin: 0 }}>دفعات الإرسال</h4>
        </div>
        {batches.length === 0 ? (
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
                  <th>إرسال</th>
                </tr>
              </thead>
              <tbody>
                {batches.slice(0, 4).map((b) => {
                  const statusLabel = BATCH_STATUS_LABELS[b.status] || b.status;
                  const statusColors = BATCH_STATUS_COLORS[b.status] || { bg: "#e9ecef", text: "#495057" };
                  const defaultLetterNumber = `كتاب-${b.id}/${new Date().getFullYear()}`;
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
                          style={{
                            background: statusColors.bg,
                            color: statusColors.text,
                            padding: "3px 10px",
                            borderRadius: 99,
                            fontSize: "0.78rem",
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ minWidth: 340 }}>
                        {b.status === "draft" ? (
                          <div style={{
                            background: "linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%)",
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            padding: "14px 16px",
                            display: "grid",
                            gap: 12,
                            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                          }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.03em" }}>رقم الكتاب</label>
                                <input
                                  className="form-control-custom"
                                  placeholder="تلقائي"
                                  value={effectiveLetterNumber}
                                  onChange={(e) =>
                                    setBatchSendField(b.id, "letter_number", e.target.value)
                                  }
                                  style={{ fontSize: "0.82rem", borderRadius: 8, border: "1.5px solid #cbd5e1", padding: "6px 10px", background: "#fff", outline: "none" }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.03em" }}>تاريخ الكتاب</label>
                                <input
                                  className="form-control-custom"
                                  type="date"
                                  value={effectiveLetterDate}
                                  onChange={(e) =>
                                    setBatchSendField(b.id, "letter_date", e.target.value)
                                  }
                                  style={{ fontSize: "0.82rem", borderRadius: 8, border: "1.5px solid #cbd5e1", padding: "6px 10px", background: "#fff", outline: "none" }}
                                />
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.03em" }}>محتوى الكتاب</label>
                              <textarea
                                className="form-control-custom"
                                placeholder="اكتب محتوى الكتاب هنا..."
                                value={batchSendForm[b.id]?.content || ""}
                                onChange={(e) =>
                                  setBatchSendField(b.id, "content", e.target.value)
                                }
                                rows={3}
                                style={{ fontSize: "0.82rem", borderRadius: 8, border: "1.5px solid #cbd5e1", padding: "8px 10px", background: "#fff", resize: "vertical", outline: "none", lineHeight: 1.6 }}
                              />
                            </div>
                            <button
                              className="btn-primary-custom"
                              onClick={() => handleSendBatch(b.id)}
                              disabled={saving || !isBatchFormComplete}
                              title={
                                isBatchFormComplete
                                  ? "إرسال الدفعة"
                                  : "أدخل محتوى الكتاب قبل الإرسال"
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                borderRadius: 8,
                                padding: "9px 16px",
                                fontSize: "0.88rem",
                                fontWeight: 700,
                                letterSpacing: "0.02em",
                                opacity: (!saving && isBatchFormComplete) ? 1 : 0.6,
                                cursor: (!saving && isBatchFormComplete) ? "pointer" : "not-allowed",
                                transition: "opacity 0.2s",
                              }}
                            >
                              <FileText size={15} />
                              {saving ? "جاري الإرسال..." : "إرسال الدفعة"}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-faint)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <Link
              to={lettersLink}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem", color: "var(--info)", fontWeight: 700 }}
            >
              عرض الكل <ArrowLeft size={14} />
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
