import { useEffect, useState } from "react";
import {
  directorateApprove,
  getTrainingRequests,
  itemsFromPagedResponse,
} from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";
import { siteLabels } from "../../utils/roles";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Save,
  AlertCircle,
  Send,
  FileText,
  Building2,
  Printer,
} from "lucide-react";
import MinistryEducationSeal from "../../components/branding/MinistryEducationSeal";
import MinistryHealthSeal from "../../components/branding/MinistryHealthSeal";
import { readStoredUser } from "../../utils/session";
import {
  buildFormalTrainingLetterHtml,
  printHtmlDocument,
  trainingRequestToPrintRow,
  filterTrainingRequestsForPrint,
  formatEducationDirectorateRecipient,
  DIRECTORATE_TO_COLLEGE_PRINT_INTRO,
  HEALTH_MINISTRY_TO_CENTERS_PRINT_INTRO,
  filterRequestsForEducationDirectorateUi,
  filterRequestsForHealthMinistryUi,
} from "../../utils/trainingRequestPrint";

const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;
  const validationErrors = responseData?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors).flat().find(Boolean);
    if (firstError) return firstError;
  }

  return responseData?.message || fallbackMessage;
};

const OfficialLetters = ({ siteType = "school" }) => {
  const user = readStoredUser();
  const labels = siteLabels(siteType);
  const isHealth = siteType === "health_center";
  
  const governingBody = labels.governingBody;
  const directorateName = labels.directorateName;
  const pageSubtitle = isHealth
    ? "متابعة طلبات التدريب، اعتمادها، وإرسالها تلقائيًا إلى المراكز الصحية عند الموافقة."
    : "متابعة طلبات التدريب، اعتمادها، وإرسالها تلقائيًا إلى المدارس عند الموافقة.";

  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [requestDecision, setRequestDecision] = useState({});
  const [requestReason, setRequestReason] = useState({});
  const [requestSavingId, setRequestSavingId] = useState(null);
  const [letterFormMap, setLetterFormMap] = useState({});

  const autoLetterNumber = (id) => {
    const year = new Date().getFullYear();
    const padded = String(id).padStart(3, "0");
    return `DIR-${year}-${padded}`;
  };

  const handleDecisionChange = (requestId, value) => {
    setRequestDecision((prev) => ({ ...prev, [requestId]: value }));
    if (value === "approved") {
      setLetterFormMap((prev) => ({
        ...prev,
        [requestId]: {
          letter_number: prev[requestId]?.letter_number || autoLetterNumber(requestId),
          letter_date: prev[requestId]?.letter_date || new Date().toISOString().slice(0, 10),
          content: prev[requestId]?.content || "",
        },
      }));
    }
  };

  useEffect(() => {
    fetchTrainingRequests();
  }, []);

  const fetchTrainingRequests = async () => {
    try {
      setLoading(true);
      const rejectedStatus = isHealth ? "health_ministry_rejected" : "directorate_rejected";
      const incomingStatus = isHealth ? "sent_to_health_ministry" : "sent_to_directorate";
      const [incomingRes, sentRes, rejectedRes] = await Promise.all([
        getTrainingRequests({ book_status: incomingStatus, governing_body: governingBody, per_page: 100 }),
        getTrainingRequests({ book_status: "sent_to_school", governing_body: governingBody, per_page: 100 }),
        getTrainingRequests({ book_status: rejectedStatus, governing_body: governingBody, per_page: 100 }),
      ]);
      const incomingItems = itemsFromPagedResponse(incomingRes);
      const sentItems = itemsFromPagedResponse(sentRes);
      const rejectedItems = itemsFromPagedResponse(rejectedRes);

      const incomingFiltered = isHealth
        ? filterRequestsForHealthMinistryUi(incomingItems)
        : filterRequestsForEducationDirectorateUi(incomingItems);
      const sentFiltered = isHealth
        ? filterRequestsForHealthMinistryUi(sentItems)
        : filterRequestsForEducationDirectorateUi(sentItems);
      const rejectedFiltered = isHealth
        ? filterRequestsForHealthMinistryUi(rejectedItems)
        : filterRequestsForEducationDirectorateUi(rejectedItems);

      setIncomingRequests(incomingFiltered);
      setSentRequests(sentFiltered);
      setRejectedRequests(rejectedFiltered);
    } catch (error) {
      toast.apiError(error, "تعذر تحميل طلبات التدريب.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDecision = async (requestId) => {
    const decision = requestDecision[requestId];
    if (!decision) {
      toast.warning("اختر القرار للطلب قبل الحفظ.");
      return;
    }
    if (decision === "rejected") {
      const reason = requestReason[requestId]?.trim();
      if (!reason) {
        toast.warning("سبب الرفض مطلوب عند رفض طلب التدريب.");
        return;
      }
    }
    if (decision === "approved") {
      const form = letterFormMap[requestId] || {};
      const errors = [];
      if (!form.letter_date) errors.push("تاريخ الكتاب");
      if (!form.content?.trim()) errors.push("محتوى الكتاب");
      if (errors.length > 0) {
        toast.warning(`عند الموافقة يرجى تعبئة: ${errors.join("، ")}`);
        return;
      }
    }

    try {
      setRequestSavingId(requestId);

      const payload = {
        status: decision,
        rejection_reason: decision === "rejected" ? requestReason[requestId] : "",
      };
      if (decision === "approved") {
        const form = letterFormMap[requestId] || {};
        payload.letter_number = form.letter_number?.trim() || autoLetterNumber(requestId);
        payload.letter_date = form.letter_date || new Date().toISOString().slice(0, 10);
        payload.content = form.content?.trim();
      }
      await directorateApprove(requestId, payload);

      toast.success(decision === "approved"
        ? `تمت موافقة ${directorateName} وإرسال الكتاب إلى ${labels.siteName} بنجاح.`
        : `تم رفض الطلب من ${directorateName}.`
      );
      await fetchTrainingRequests();
    } catch (error) {
      toast.apiError(error, "تعذر حفظ القرار.");
    } finally {
      setRequestSavingId(null);
    }
  };

  const handleLetterFieldChange = (requestId, field, value) => {
    setLetterFormMap((prev) => ({
      ...prev,
      [requestId]: {
        letter_number: prev[requestId]?.letter_number || autoLetterNumber(requestId),
        letter_date: prev[requestId]?.letter_date || new Date().toISOString().slice(0, 10),
        content: prev[requestId]?.content || "",
        [field]: value,
      },
    }));
  };

  const handlePrintTrainingRequests = () => {
    const sentAccepted = filterTrainingRequestsForPrint(sentRequests);
    const rows = sentAccepted.map(trainingRequestToPrintRow);
    const sectionTitle = isHealth
      ? "كشف المعتمدين — المُحالون إلى المراكز الصحية التدريبية"
      : "كشف الطلبات المعتمدة والمُحالة لجهة التدريب";
    const sections = rows.length > 0 ? [{ title: sectionTitle, rows }] : [];

    if (sections.length === 0) {
      toast.warning("لا توجد طلبات معتمدة ومُرسلة لجهة التدريب لعرضها في المطبوعة.");
      return;
    }

    const regionKey = (user?.directorate || "").trim();
    const variant = isHealth ? "health" : "education";
    const orgLines = isHealth
      ? [
          "وزارة الصحة الفلسطينية",
          `${directorateName}${regionKey ? ` — ${regionKey}` : ""}`,
          "متابعة التدريب الميداني — المراكز الصحية",
        ]
      : ["وزارة التربية والتعليم", formatEducationDirectorateRecipient(regionKey)];

    const recipientTo = isHealth
      ? "مديرو المراكز الصحية التدريبية — وفق الكشف أدناه"
      : "كلية التربية — جامعة الخليل / لجنة التدريب الميداني";
    const subject = isHealth
      ? "طلبات التدريب الميداني الصحي — كشف معتمدين ومُحالين"
      : "طلبات التدريب الميداني — كشف معتمدين";
    const bodyIntro = isHealth ? HEALTH_MINISTRY_TO_CENTERS_PRINT_INTRO : DIRECTORATE_TO_COLLEGE_PRINT_INTRO;

    const html = buildFormalTrainingLetterHtml({
      variant,
      orgLines,
      referenceNumber: null,
      letterDate: new Date().toLocaleDateString("ar-SA"),
      recipientTo,
      subject,
      bodyIntro,
      sections,
      senderFooter: isHealth ? `${directorateName}${regionKey ? ` — ${regionKey}` : ""}` : formatEducationDirectorateRecipient(regionKey),
      attachmentsNote: null,
    });
    printHtmlDocument(html);
  };

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل طلبات التدريب..." />
    );
  }

  return (
    <div>
      {/* ترويسة بصيغة وثيقة رسمية */}
      <div
        className="mb-4"
        style={{
          position: "relative",
          padding: "1.35rem 1.5rem 1.2rem",
          background: "#fff",
          border: "2px solid #1e3a5f",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.07)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "42%",
            height: 120,
            background:
              "radial-gradient(ellipse 90% 80% at 0% 0%, rgba(30, 90, 142, 0.14) 0%, transparent 72%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "46%",
            height: 130,
            background:
              "radial-gradient(ellipse 85% 75% at 100% 100%, rgba(56, 189, 248, 0.12) 0%, transparent 70%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            paddingBottom: 14,
            borderBottom: "2px solid #1e3a5f",
            marginBottom: 12,
          }}
        >
          {isHealth ? <MinistryHealthSeal height={58} maxWidth={260} /> : <MinistryEducationSeal size={62} />}
          <div style={{ flex: 1, textAlign: "right" }}>
            <p style={{ margin: "0 0 4px", fontSize: "0.98rem", fontWeight: 800, color: "#0f172a" }}>
              {isHealth ? "وزارة الصحة الفلسطينية" : "وزارة التربية والتعليم"}
            </p>
            <p style={{ margin: "0 0 2px", fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
              {directorateName}
              {user?.directorate ? ` — ${user.directorate}` : ""}
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>طلبات التدريب — معاملات رسمية</p>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "flex-end",
            gap: 24,
            fontSize: "0.82rem",
            color: "#334155",
            marginBottom: 12,
          }}
        >
          <span>
            <strong>التاريخ:</strong> {new Date().toLocaleDateString("ar-SA")}
          </span>
          <span>
            <strong>العدد:</strong> —
          </span>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", lineHeight: 1.75, flex: "1 1 260px" }}>
            {pageSubtitle}
          </p>
          <button
            type="button"
            onClick={handlePrintTrainingRequests}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0.55rem 1.1rem",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "#fff",
              background: isHealth
                ? "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)"
                : "linear-gradient(135deg, #1e5a8e 0%, #1e3a5f 100%)",
              boxShadow: "0 2px 8px rgba(30, 58, 95, 0.2)",
            }}
          >
            <Printer size={17} />
            طباعة كشف الطلبات
          </button>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: 4,
            padding: "12px 14px",
            borderRadius: 8,
            border: isHealth ? "1px solid rgba(15, 118, 110, 0.22)" : "1px solid rgba(30, 58, 95, 0.2)",
            background: isHealth ? "#f0fdfa" : "#f8fafc",
            fontSize: "0.82rem",
            color: "#334155",
            lineHeight: 1.65,
          }}
        >
          <strong style={{ display: "block", marginBottom: 4, color: isHealth ? "#0f766e" : "#1e3a5f" }}>
            بيانات المعاملة
          </strong>
          {isHealth
            ? `الجهة المرسلة: كلية التربية — جامعة الخليل · الجهة المستقبلة: وزارة الصحة — ${directorateName} · التسمية المعتمدة أمام المستخدم: طلبات التدريب`
            : `الجهة المرسلة: كلية التربية — جامعة الخليل · الجهة المستقبلة: ${directorateName} · التسمية المعتمدة أمام المستخدم: طلبات التدريب`}
        </div>
      </div>


      {/* Incoming Requests - Need Decision */}
      <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <Clock size={20} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"طلبات التدريب الواردة (بانتظار القرار)"}</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"اختر القرار وعبّئ بيانات الكتاب عند الموافقة"}</p>
          </div>
        </div>

        {incomingRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
            <FileCheck size={40} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{"لا توجد طلبات واردة بانتظار القرار حاليًا"}</p>
          </div>
        ) : (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["رقم الطلب", "الموقع التدريبي", "الطالب", "المساق", "مرحلة الطلب", "قرار المديرية", "سبب الرفض", "بيانات كتاب الإرسال", "إجراء"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incomingRequests.map((request, idx) => {
                  const decision = requestDecision[request.id] || "";
                  const showLetterFields = decision === "approved";
                  const showRejectField = decision === "rejected";
                  return (
                    <tr key={request.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                        {request.letter_number || `#${request.id}`}
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Building2 size={13} />
                          {request.training_site?.data?.name || request.training_site?.name || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        {request.students?.[0]?.user?.name || "—"}
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        {request.students?.[0]?.course?.name || "—"}
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.625rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: "#fef3c7", color: "#d97706" }}>
                          <Clock size={12} /> {request.book_status_label || request.book_status}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                        <select value={decision}
                          onChange={(e) => handleDecisionChange(request.id, e.target.value)}
                          style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.8rem", background: "#f8fafc" }}
                        >
                          <option value="">{"اختر القرار"}</option>
                          <option value="approved">{"قبول"}</option>
                          <option value="rejected">{"رفض"}</option>
                        </select>
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                        <textarea placeholder={"سبب الرفض"} value={requestReason[request.id] || ""}
                          onChange={(e) => setRequestReason((prev) => ({ ...prev, [request.id]: e.target.value }))}
                          disabled={!showRejectField} rows={2}
                          style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: showRejectField ? "1px solid #f59e0b" : "1px solid #e2e8f0", fontSize: "0.8rem", background: showRejectField ? "#fffbeb" : "#f8fafc", resize: "vertical" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                        {showLetterFields ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            <div style={{ position: "relative" }}>
                              <input type="text"
                                placeholder={autoLetterNumber(request.id)}
                                value={letterFormMap[request.id]?.letter_number || ""}
                                onChange={(e) => handleLetterFieldChange(request.id, "letter_number", e.target.value)}
                                style={{ padding: "0.375rem 0.5rem", borderRadius: 6, border: "1.5px solid #bae6fd", fontSize: "0.8rem", background: "#f0f9ff", fontWeight: 700, color: "#0c4a6e", width: "100%", boxSizing: "border-box" }}
                              />
                              {!letterFormMap[request.id]?.letter_number && (
                                <span style={{ position: "absolute", top: "50%", right: 6, transform: "translateY(-50%)", fontSize: "0.65rem", background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: 99, fontWeight: 700, pointerEvents: "none" }}>تلقائي</span>
                              )}
                            </div>
                            <input type="date" value={letterFormMap[request.id]?.letter_date || new Date().toISOString().slice(0, 10)}
                              onChange={(e) => handleLetterFieldChange(request.id, "letter_date", e.target.value)}
                              style={{ padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #10b981", fontSize: "0.8rem", background: "#f0fdf4" }}
                            />
                            <textarea placeholder={"محتوى الكتاب"} value={letterFormMap[request.id]?.content || ""}
                              onChange={(e) => handleLetterFieldChange(request.id, "content", e.target.value)} rows={2}
                              style={{ padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #10b981", fontSize: "0.8rem", background: "#f0fdf4", resize: "vertical" }}
                            />
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{"اختر 'قبول' لعرض الحقول"}</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                        <button type="button" onClick={() => handleRequestDecision(request.id)} disabled={requestSavingId === request.id}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.5rem 1rem", background: decision === "approved" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : decision === "rejected" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "#64748b", color: "white", border: "none", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, cursor: requestSavingId === request.id ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                        >
                          {requestSavingId === request.id ? <LoadingSpinner size="button" /> : decision === "approved" ? <Send size={14} /> : <Save size={14} />}
                          {requestSavingId === request.id ? "جاري الحفظ..." : decision === "approved" ? "موافقة وإرسال" : "حفظ القرار"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sent Requests */}
      <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <Send size={20} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"الطلبات المُرسلة إلى "}{labels.siteName}</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"طلبات تمت الموافقة عليها وإرسالها"}</p>
          </div>
        </div>

        {sentRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
            <Send size={40} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{"لا توجد طلبات مُرسلة حاليًا"}</p>
          </div>
        ) : (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["رقم الطلب", "الموقع التدريبي", "الطالب", "المساق", "تاريخ الإرسال", "الحالة"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentRequests.map((request, idx) => (
                  <tr key={request.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                      {request.letter_number || `#${request.id}`}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.training_site?.data?.name || request.training_site?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.students?.[0]?.user?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.students?.[0]?.course?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.sent_to_school_at ? new Date(request.sent_to_school_at).toLocaleDateString("ar-SA") : "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.625rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: "#dbeafe", color: "#2563eb" }}>
                        <Send size={12} /> {"مُرسل للمدرسة"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejected Requests */}
      <div className="section-card" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <XCircle size={20} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"الطلبات المرفوضة"}</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"طلبات تم رفضها من المديرية"}</p>
          </div>
        </div>

        {rejectedRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
            <FileText size={40} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{"لا توجد طلبات مرفوضة حاليًا"}</p>
          </div>
        ) : (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["رقم الطلب", "الموقع التدريبي", "الطالب", "المساق", "الحالة", "سبب الرفض"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rejectedRequests.map((request, idx) => (
                  <tr key={request.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                      {request.letter_number || `#${request.id}`}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.training_site?.data?.name || request.training_site?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.students?.[0]?.user?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.students?.[0]?.course?.name || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.625rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: "#fee2e2", color: "#dc2626" }}>
                        <XCircle size={12} /> {request.book_status_label || request.book_status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {request.rejection_reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialLetters;
