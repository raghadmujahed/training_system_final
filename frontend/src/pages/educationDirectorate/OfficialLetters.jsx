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
import PageHeader from "../../components/common/PageHeader";
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
      <div className="relative p-[1.35rem_1.5rem_1.2rem] bg-white border-2 border-[#1e3a5f] rounded-md overflow-hidden shadow-[0_4px_24px_rgba(15,23,42,0.07)] mb-4">
        <div aria-hidden className="absolute top-0 left-0 w-[42%] h-[120px] bg-[radial-gradient(ellipse_90%_80%_at_0%_0%,rgba(30,90,142,0.14)_0%,transparent_72%)]" />
        <div aria-hidden className="absolute bottom-0 right-0 w-[46%] h-[130px] bg-[radial-gradient(ellipse_85%_75%_at_100%_100%,rgba(56,189,248,0.12)_0%,transparent_70%)]" />

        <div className="relative flex justify-between items-start gap-4 pb-3.5 border-b-2 border-[#1e3a5f] mb-3">
          {isHealth ? <MinistryHealthSeal height={58} maxWidth={260} /> : <MinistryEducationSeal size={62} />}
          <div className="flex-1 text-right">
            <p className="m-0 mb-1 text-[0.98rem] font-extrabold text-[#0f172a]">
              {isHealth ? "وزارة الصحة الفلسطينية" : "وزارة التربية والتعليم"}
            </p>
            <p className="m-0 mb-0.5 text-[0.88rem] font-semibold text-[#334155]">
              {directorateName}
              {user?.directorate ? ` — ${user.directorate}` : ""}
            </p>
            <p className="m-0 text-[0.8rem] text-[#64748b]">طلبات التدريب — معاملات رسمية</p>
          </div>
        </div>

        <div className="relative flex justify-end gap-6 text-[0.82rem] text-[#334155] mb-3">
          <span><strong>التاريخ:</strong> {new Date().toLocaleDateString("ar-SA")}</span>
          <span><strong>العدد:</strong> —</span>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="m-0 text-[0.85rem] text-[#475569] leading-[1.75] flex-[1_1_260px]">{pageSubtitle}</p>
          <button type="button" onClick={handlePrintTrainingRequests}
            className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg border-none cursor-pointer font-bold text-[0.85rem] text-white shadow-[0_2px_8px_rgba(30,58,95,0.2)]"
            style={{ background: isHealth ? "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" : "linear-gradient(135deg, #1e5a8e 0%, #1e3a5f 100%)" }}
          >
            <Printer size={17} />
            طباعة كشف الطلبات
          </button>
        </div>

        <div className="relative mt-1 p-3 rounded-lg text-[0.82rem] text-[#334155] leading-[1.65]"
          style={{ border: isHealth ? "1px solid rgba(15, 118, 110, 0.22)" : "1px solid rgba(30, 58, 95, 0.2)", background: isHealth ? "#f0fdfa" : "#f8fafc" }}
        >
          <strong className="block mb-1" style={{ color: isHealth ? "#0f766e" : "#1e3a5f" }}>بيانات المعاملة</strong>
          {isHealth
            ? `الجهة المرسلة: كلية التربية — جامعة الخليل · الجهة المستقبلة: وزارة الصحة — ${directorateName} · التسمية المعتمدة أمام المستخدم: طلبات التدريب`
            : `الجهة المرسلة: كلية التربية — جامعة الخليل · الجهة المستقبلة: ${directorateName} · التسمية المعتمدة أمام المستخدم: طلبات التدريب`}
        </div>
      </div>


      {/* Incoming Requests - Need Decision */}
      <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] mb-4">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-white">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="m-0 mb-1 text-[1.1rem] font-bold">طلبات التدريب الواردة (بانتظار القرار)</h4>
            <p className="m-0 text-[0.8rem] text-text-faint">اختر القرار وعبّئ بيانات الكتاب عند الموافقة</p>
          </div>
        </div>

        {incomingRequests.length === 0 ? (
          <div className="text-center py-8 text-[#94a3b8]">
            <FileCheck size={40} className="mb-2 opacity-40" />
            <p className="m-0">لا توجد طلبات واردة بانتظار القرار حاليًا</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
            <table className="w-full border-collapse text-[0.85rem]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  {["رقم الطلب", "الموقع التدريبي", "الطالب", "المساق", "مرحلة الطلب", "قرار المديرية", "سبب الرفض", "بيانات كتاب الإرسال", "إجراء"].map((h) => (
                    <th key={h} className="py-3 px-3 text-right font-semibold text-[#475569] border-b border-[#e2e8f0] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incomingRequests.map((request, idx) => {
                  const decision = requestDecision[request.id] || "";
                  const showLetterFields = decision === "approved";
                  const showRejectField = decision === "rejected";
                  return (
                    <tr key={request.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                      <td className="py-3 px-3 border-b border-[#e2e8f0] font-semibold">{request.letter_number || `#${request.id}`}</td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0] text-[#64748b]">
                        <span className="flex items-center gap-1"><Building2 size={13} />{request.training_site?.data?.name || request.training_site?.name || "—"}</span>
                      </td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0] text-[#64748b]">{request.students?.[0]?.user?.name || "—"}</td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0] text-[#64748b]">{request.students?.[0]?.course?.name || "—"}</td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0]">
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-full text-[0.75rem] font-semibold bg-[#fef3c7] text-[#d97706]">
                          <Clock size={12} /> {request.book_status_label || request.book_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0]">
                        <select value={decision} onChange={(e) => handleDecisionChange(request.id, e.target.value)}
                          className="w-full py-1.5 px-2 rounded-md border border-[#e2e8f0] text-[0.8rem] bg-[#f8fafc]"
                        >
                          <option value="">اختر القرار</option>
                          <option value="approved">قبول</option>
                          <option value="rejected">رفض</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0]">
                        <textarea placeholder="سبب الرفض" value={requestReason[request.id] || ""}
                          onChange={(e) => setRequestReason((prev) => ({ ...prev, [request.id]: e.target.value }))}
                          disabled={!showRejectField} rows={2}
                          className={`w-full py-1.5 px-2 rounded-md text-[0.8rem] resize-y ${showRejectField ? 'border border-[#f59e0b] bg-[#fffbeb]' : 'border border-[#e2e8f0] bg-[#f8fafc]'}`}
                        />
                      </td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0]">
                        {showLetterFields ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="relative">
                              <input type="text" placeholder={autoLetterNumber(request.id)}
                                value={letterFormMap[request.id]?.letter_number || ""}
                                onChange={(e) => handleLetterFieldChange(request.id, "letter_number", e.target.value)}
                                className="py-1.5 px-2 rounded-md border-[1.5px] border-[#bae6fd] text-[0.8rem] bg-[#f0f9ff] font-bold text-[#0c4a6e] w-full box-border"
                              />
                              {!letterFormMap[request.id]?.letter_number && (
                                <span className="absolute top-1/2 right-1.5 -translate-y-1/2 text-[0.65rem] bg-[#e0f2fe] text-[#0369a1] px-1.5 py-px rounded-full font-bold pointer-events-none">تلقائي</span>
                              )}
                            </div>
                            <input type="date" value={letterFormMap[request.id]?.letter_date || new Date().toISOString().slice(0, 10)}
                              onChange={(e) => handleLetterFieldChange(request.id, "letter_date", e.target.value)}
                              className="py-1.5 px-2 rounded-md border border-[#10b981] text-[0.8rem] bg-[#f0fdf4]"
                            />
                            <textarea placeholder="محتوى الكتاب" value={letterFormMap[request.id]?.content || ""}
                              onChange={(e) => handleLetterFieldChange(request.id, "content", e.target.value)} rows={2}
                              className="py-1.5 px-2 rounded-md border border-[#10b981] text-[0.8rem] bg-[#f0fdf4] resize-y"
                            />
                          </div>
                        ) : (
                          <span className="text-[#94a3b8] text-[0.8rem]">اختر 'قبول' لعرض الحقول</span>
                        )}
                      </td>
                      <td className="py-3 px-3 border-b border-[#e2e8f0]">
                        <button type="button" onClick={() => handleRequestDecision(request.id)} disabled={requestSavingId === request.id}
                          className="inline-flex items-center gap-1 py-2 px-4 text-white border-none rounded-lg text-[0.8rem] font-semibold whitespace-nowrap"
                          style={{ background: decision === "approved" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : decision === "rejected" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "#64748b", cursor: requestSavingId === request.id ? "not-allowed" : "pointer" }}
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
      <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] mb-4">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white">
            <Send size={20} />
          </div>
          <div>
            <h4 className="m-0 mb-1 text-[1.1rem] font-bold">الطلبات المُرسلة إلى {labels.siteName}</h4>
            <p className="m-0 text-[0.8rem] text-text-faint">طلبات تمت الموافقة عليها وإرسالها</p>
          </div>
        </div>

        {sentRequests.length === 0 ? (
          <div className="text-center py-8 text-[#94a3b8]">
            <Send size={40} className="mb-2 opacity-40" />
            <p className="m-0">لا توجد طلبات مُرسلة حاليًا</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
            <table className="w-full border-collapse text-[0.85rem]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  {["رقم الطلب", "الموقع التدريبي", "الطالب", "المساق", "تاريخ الإرسال", "الحالة"].map((h) => (
                    <th key={h} className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentRequests.map((request, idx) => (
                  <tr key={request.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] font-semibold">{request.letter_number || `#${request.id}`}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.training_site?.data?.name || request.training_site?.name || "—"}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.students?.[0]?.user?.name || "—"}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.students?.[0]?.course?.name || "—"}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.sent_to_school_at ? new Date(request.sent_to_school_at).toLocaleDateString("ar-SA") : "—"}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0]">
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-full text-[0.75rem] font-semibold bg-[#dbeafe] text-[#2563eb]">
                        <Send size={12} /> مُرسل للمدرسة
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
      <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0]">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center text-white">
            <XCircle size={20} />
          </div>
          <div>
            <h4 className="m-0 mb-1 text-[1.1rem] font-bold">الطلبات المرفوضة</h4>
            <p className="m-0 text-[0.8rem] text-text-faint">طلبات تم رفضها من المديرية</p>
          </div>
        </div>

        {rejectedRequests.length === 0 ? (
          <div className="text-center py-8 text-[#94a3b8]">
            <FileText size={40} className="mb-2 opacity-40" />
            <p className="m-0">لا توجد طلبات مرفوضة حاليًا</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
            <table className="w-full border-collapse text-[0.85rem]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  {["رقم الطلب", "الموقع التدريبي", "الطالب", "المساق", "الحالة", "سبب الرفض"].map((h) => (
                    <th key={h} className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rejectedRequests.map((request, idx) => (
                  <tr key={request.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] font-semibold">{request.letter_number || `#${request.id}`}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.training_site?.data?.name || request.training_site?.name || "—"}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.students?.[0]?.user?.name || "—"}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.students?.[0]?.course?.name || "—"}</td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0]">
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-full text-[0.75rem] font-semibold bg-[#fee2e2] text-[#dc2626]">
                        <XCircle size={12} /> {request.book_status_label || request.book_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">{request.rejection_reason || "—"}</td>
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
