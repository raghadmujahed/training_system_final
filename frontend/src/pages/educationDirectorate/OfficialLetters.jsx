import { useEffect, useState } from "react";
import {
  directorateApprove,
  getTrainingRequests,
  itemsFromPagedResponse,
} from "../../services/api";
import { siteLabels } from "../../utils/roles";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Save,
  Landmark,
  AlertCircle,
  Send,
  FileText,
  Building2,
} from "lucide-react";

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
  const labels = siteLabels(siteType);
  const isHealth = siteType === "health_center";
  
  const governingBody = labels.governingBody;
  const directorateName = labels.directorateName;
  const pageSubtitle = isHealth
    ? "متابعة الكتب الرسمية، اعتمادها، وإرسالها تلقائيًا إلى المراكز الصحية عند الموافقة."
    : "متابعة الكتب الرسمية، اعتمادها، وإرسالها تلقائيًا إلى المدارس عند الموافقة.";

  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [requestDecision, setRequestDecision] = useState({});
  const [requestReason, setRequestReason] = useState({});
  const [requestSavingId, setRequestSavingId] = useState(null);
  const [letterFormMap, setLetterFormMap] = useState({});

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
      setIncomingRequests(incomingItems);
      setSentRequests(sentItems);
      setRejectedRequests(rejectedItems);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "تعذر تحميل طلبات التدريب."));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDecision = async (requestId) => {
    const decision = requestDecision[requestId];
    if (!decision) {
      setErrorMessage("اختر القرار للطلب قبل الحفظ.");
      return;
    }
    if (decision === "rejected") {
      const reason = requestReason[requestId]?.trim();
      if (!reason) {
        setErrorMessage("سبب الرفض مطلوب عند رفض طلب التدريب.");
        return;
      }
    }
    if (decision === "approved") {
      const form = letterFormMap[requestId] || {};
      const errors = [];
      if (!form.letter_number?.trim()) errors.push("رقم الكتاب");
      if (!form.letter_date) errors.push("تاريخ الكتاب");
      if (!form.content?.trim()) errors.push("محتوى الكتاب");
      if (errors.length > 0) {
        setErrorMessage(`عند الموافقة يرجى تعبئة: ${errors.join("، ")}`);
        return;
      }
    }

    try {
      setRequestSavingId(requestId);
      setSavedMessage("");
      setErrorMessage("");

      const payload = {
        status: decision,
        rejection_reason: decision === "rejected" ? requestReason[requestId] : "",
      };
      if (decision === "approved") {
        const form = letterFormMap[requestId] || {};
        payload.letter_number = form.letter_number.trim();
        payload.letter_date = form.letter_date;
        payload.content = form.content.trim();
      }
      await directorateApprove(requestId, payload);

      setSavedMessage(decision === "approved"
        ? `تمت موافقة ${directorateName} وإرسال الكتاب إلى ${labels.siteName} بنجاح.`
        : `تم رفض الطلب من ${directorateName}.`
      );
      await fetchTrainingRequests();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "تعذر حفظ القرار."));
    } finally {
      setRequestSavingId(null);
    }
  };

  const handleLetterFieldChange = (requestId, field, value) => {
    setLetterFormMap((prev) => ({
      ...prev,
      [requestId]: {
        letter_number: prev[requestId]?.letter_number || "",
        letter_date: prev[requestId]?.letter_date || new Date().toISOString().slice(0, 10),
        content: prev[requestId]?.content || "",
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "2rem", color: "var(--text-soft)" }}>
        <Loader2 size={24} className="spin" />
        {"جاري تحميل الكتب الرسمية..."}
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)" }}>
            <Landmark size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">{"الكتب الرسمية — "}{directorateName}</h1>
            <p className="hero-subtitle">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {savedMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#d1fae5", color: "#059669", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <CheckCircle2 size={18} /> {savedMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#fee2e2", color: "#dc2626", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

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
                  {["رقم الطلب", "الموقع التدريبي", "الطالب", "المساق", "حالة الكتاب", "قرار المديرية", "سبب الرفض", "بيانات كتاب الإرسال", "إجراء"].map((h) => (
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
                          onChange={(e) => setRequestDecision((prev) => ({ ...prev, [request.id]: e.target.value }))}
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
                            <input type="text" placeholder={"رقم كتاب الإرسال"} value={letterFormMap[request.id]?.letter_number || ""}
                              onChange={(e) => handleLetterFieldChange(request.id, "letter_number", e.target.value)}
                              style={{ padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #10b981", fontSize: "0.8rem", background: "#f0fdf4" }}
                            />
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
                          {requestSavingId === request.id ? <Loader2 size={14} className="spin" /> : decision === "approved" ? <Send size={14} /> : <Save size={14} />}
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
