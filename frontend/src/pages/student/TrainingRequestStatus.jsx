import { useEffect, useState } from "react";
import {
  ClipboardList, Building2, MapPin, UserCheck, Clock, AlertCircle,
  CheckCircle2, XCircle, Send, History, RefreshCw, Calendar,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getActivityLogs,
  getStudentTrainingRequests,
  itemsFromPagedResponse,
} from "../../services/api";
import TrainingRequestWorkflowStepper from "../../components/training/TrainingRequestWorkflowStepper";

const fadeIn = `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
const spin = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`;

const STATUS_MAP = {
  draft:                   { label: "مسودة",                  color: "#64748b", bg: "#f1f5f9", icon: ClipboardList },
  sent_to_coordinator:     { label: "عند المنسق",             color: "#3b82f6", bg: "#dbeafe", icon: Send },
  needs_edit:              { label: "يحتاج تعديل",            color: "#d97706", bg: "#fef3c7", icon: AlertCircle },
  prelim_approved:         { label: "موافقة أولية",           color: "#0891b2", bg: "#ecfeff", icon: CheckCircle2 },
  sent_to_directorate:     { label: "أُرسل للمديرية",         color: "#6366f1", bg: "#e0e7ff", icon: Send },
  directorate_approved:    { label: "موافقة المديرية",        color: "#10b981", bg: "#d1fae5", icon: CheckCircle2 },
  directorate_rejected:    { label: "مرفوض من المديرية",      color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  sent_to_school:          { label: "مرسل للمدرسة",           color: "#7c3aed", bg: "#ede9fe", icon: Send },
  school_approved:         { label: "موافقة جهة التدريب",     color: "#059669", bg: "#d1fae5", icon: CheckCircle2 },
  school_rejected:         { label: "مرفوض من جهة التدريب",  color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  sent_to_health_ministry: { label: "مرسل لوزارة الصحة",     color: "#0284c7", bg: "#e0f2fe", icon: Send },
  health_ministry_rejected:{ label: "مرفوض من وزارة الصحة",  color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  approved:                { label: "مقبول نهائياً",          color: "#059669", bg: "#d1fae5", icon: CheckCircle2 },
  rejected:                { label: "مرفوض",                  color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  coordinator_rejected:    { label: "مرفوض من المنسق",        color: "#dc2626", bg: "#fee2e2", icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || { label: status || "قيد المعالجة", color: "#64748b", bg: "#f1f5f9", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-[5px] py-[0.3rem] px-[0.8rem] rounded-full text-[0.8rem] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={13} /> {cfg.label}
    </span>
  );
};

const formatDate = (d) => d ? new Date(d).toLocaleString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const getLogIcon = (event) => {
  if (event?.includes("create"))  return <ClipboardList size={15} color="#3b82f6" />;
  if (event?.includes("update"))  return <RefreshCw size={15} color="#0891b2" />;
  if (event?.includes("approve")) return <CheckCircle2 size={15} color="#10b981" />;
  if (event?.includes("reject"))  return <XCircle size={15} color="#dc2626" />;
  if (event?.includes("sent"))    return <Send size={15} color="#6366f1" />;
  return <History size={15} color="#94a3b8" />;
};

export default function TrainingRequestStatus() {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [requestItem, setRequestItem] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = async () => {
    try {
      const res = await getStudentTrainingRequests();
      const list = itemsFromPagedResponse(res);
      const latest = list[0] || null;
      setRequestItem(latest);
      setActivityLogs([]);
      if (latest?.id) {
        try {
          const logsRes = await getActivityLogs({ subject_type: "training_request", subject_id: latest.id, per_page: 50 });
          setActivityLogs(itemsFromPagedResponse(logsRes));
        } catch (e) { if (e?.response?.status !== 403) throw e; }
      }
      setLastUpdate(new Date());
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل حالة الطلب.");
    }
  };

  useEffect(() => {
    (async () => { setLoading(true); await loadData(); setLoading(false); })();
    const iv = setInterval(() => { if (document.visibilityState !== "hidden") loadData(); }, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{fadeIn}{spin}</style>
      <div className="animate-[fadeIn_0.4s_ease]">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#1e3a5f] via-[#2d5f8a] to-[#3b82f6] rounded-[20px] py-7 px-10 text-white mb-6 shadow-[0_8px_32px_rgba(30,58,95,0.3)] flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-white/20 flex items-center justify-center shrink-0">
            <ClipboardList size={26} />
          </div>
          <div>
            <h1 className="m-0 text-[1.4rem] font-extrabold">متابعة حالة طلب التدريب</h1>
            <p className="m-0 mt-1 opacity-85 text-[0.85rem] flex items-center gap-[5px]">
              <Clock size={13} /> آخر تحديث: {formatDate(lastUpdate)} · يتجدد كل 30 ثانية
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <LoadingSpinner size="section" text="جاري تحميل البيانات..." />
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 py-[0.85rem] px-[1.25rem] bg-[#fee2e2] text-[#dc2626] rounded-[14px] text-[0.9rem] font-semibold mb-4">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* No request */}
        {!loading && !error && !requestItem && (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <ClipboardList size={56} className="mb-4 opacity-30 text-[#94a3b8]" />
            <h3 className="m-0 mb-2 text-[#64748b]">لا يوجد طلب تدريب حالي</h3>
            <p className="m-0 text-[#94a3b8] text-[0.9rem]">يمكنك تقديم طلب جديد من صفحة طلب التدريب.</p>
          </div>
        )}

        {!loading && !error && requestItem && (
          <>
            {/* Stepper */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <TrainingRequestWorkflowStepper
                bookStatus={requestItem.book_status}
                governingBody={requestItem.governing_body}
              />
            </div>

            {/* Info Cards */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-[0.6rem]">
                  <div className="w-[38px] h-[38px] rounded-[10px] bg-[#dbeafe] text-[#2563eb] flex items-center justify-center">
                    <Building2 size={18} />
                  </div>
                  <h3 className="m-0 text-[1rem] font-bold text-[#1e293b]">حالة الطلب الحالي</h3>
                </div>
                <StatusBadge status={requestItem.book_status} />
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {[
                  { icon: ClipboardList, label: "حالة الطلب",      value: <StatusBadge status={requestItem.book_status} />, color: "#3b82f6", bg: "#dbeafe" },
                  { icon: Building2,    label: "الجهة المعتمدة",   value: requestItem.training_site?.name || "—",           color: "#059669", bg: "#d1fae5" },
                  { icon: MapPin,       label: "المديرية",          value: requestItem.training_site?.directorate || "—",    color: "#7c3aed", bg: "#ede9fe" },
                  { icon: UserCheck,    label: "المشرف/المرشد",     value: requestItem.students?.[0]?.assigned_teacher?.name || "غير محدد بعد", color: "#d97706", bg: "#fef3c7" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 py-[0.85rem] px-4 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                      <div className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: item.bg, color: item.color }}>
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[0.72rem] text-[#94a3b8] font-medium">{item.label}</div>
                        <div className="text-[0.88rem] font-bold text-[#1e293b] mt-[2px]">{item.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(requestItem.rejection_reason || requestItem.coordinator_rejection_reason || requestItem.needs_edit_reason) && (
                <div className="flex items-start gap-3 py-4 px-5 bg-[#fef3c7] text-[#92400e] rounded-xl mt-4 border border-[#fde68a]">
                  <AlertCircle size={20} className="shrink-0 mt-[2px]" />
                  <div>
                    <div className="font-bold mb-1">ملاحظات على الطلب:</div>
                    <div className="text-[0.9rem]">{requestItem.rejection_reason || requestItem.coordinator_rejection_reason || requestItem.needs_edit_reason}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-[0.6rem] mb-4">
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <h3 className="m-0 text-[1rem] font-bold text-[#1e293b]">تفاصيل الطلب</h3>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {[
                  { label: "تاريخ التقديم", value: formatDate(requestItem.created_at) },
                  { label: "آخر تحديث",     value: formatDate(requestItem.updated_at) },
                ].map((item, i) => (
                  <div key={i} className="py-[0.85rem] px-4 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                    <div className="text-[0.72rem] text-[#94a3b8] font-medium mb-1">{item.label}</div>
                    <div className="text-[0.9rem] font-bold text-[#1e293b]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-[0.6rem]">
                  <div className="w-[38px] h-[38px] rounded-[10px] bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center">
                    <History size={18} />
                  </div>
                  <h3 className="m-0 text-[1rem] font-bold text-[#1e293b]">سجل تحديثات الطلب</h3>
                </div>
                <span className="py-1 px-3 bg-[#f1f5f9] text-[#64748b] rounded-full text-[0.78rem] font-bold">{activityLogs.length} تحديث</span>
              </div>

              {activityLogs.length === 0 ? (
                <div className="text-center p-10 text-[#94a3b8]">
                  <History size={40} className="mb-3 opacity-30" />
                  <div>لا توجد تحديثات مسجلة</div>
                </div>
              ) : (
                <div className="flex flex-col gap-0">
                  {activityLogs.map((log, idx) => (
                    <div key={idx} className={`flex gap-4 py-4 ${idx < activityLogs.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}>
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[#f8fafc] border-[1.5px] border-[#e2e8f0] flex items-center justify-center">
                          {getLogIcon(log.event)}
                        </div>
                        {idx < activityLogs.length - 1 && <div className="w-px flex-1 bg-[#e2e8f0]" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <div className="font-bold text-[0.9rem] text-[#1e293b]">{log.description || log.event || "تحديث"}</div>
                            {log.causer?.name && <div className="text-[0.78rem] text-[#94a3b8] mt-[2px]">بواسطة: {log.causer.name}</div>}
                          </div>
                          <div className="text-[0.75rem] text-[#94a3b8] whitespace-nowrap">{formatDate(log.created_at)}</div>
                        </div>
                        {log.properties && Object.keys(log.properties).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[0.8rem] text-[#3b82f6] font-semibold">عرض التفاصيل</summary>
                            <pre className="mt-2 p-3 bg-[#f8fafc] rounded-lg text-[0.72rem] overflow-auto">
                              {JSON.stringify(log.properties, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
