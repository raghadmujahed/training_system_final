import { useEffect, useState } from "react";
import {
  ClipboardList, Building2, MapPin, UserCheck, Clock, AlertCircle,
  CheckCircle2, XCircle, Send, History, RefreshCw, Calendar, Loader2,
} from "lucide-react";
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.3rem 0.8rem", borderRadius: 99, fontSize: "0.8rem", fontWeight: 700, background: cfg.bg, color: cfg.color }}>
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
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 60%, #3b82f6 100%)",
          borderRadius: 20, padding: "1.75rem 2.5rem", color: "white",
          marginBottom: "1.5rem", boxShadow: "0 8px 32px rgba(30,58,95,0.3)",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardList size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>متابعة حالة طلب التدريب</h1>
            <p style={{ margin: "0.25rem 0 0", opacity: 0.85, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={13} /> آخر تحديث: {formatDate(lastUpdate)} · يتجدد كل 30 ثانية
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "3rem", color: "#64748b" }}>
            <Loader2 size={28} className="spin" /> جاري تحميل البيانات...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#fee2e2", color: "#dc2626", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* No request */}
        {!loading && !error && !requestItem && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "3rem", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
            <ClipboardList size={56} style={{ marginBottom: "1rem", opacity: 0.3, color: "#94a3b8" }} />
            <h3 style={{ margin: "0 0 0.5rem", color: "#64748b" }}>لا يوجد طلب تدريب حالي</h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>يمكنك تقديم طلب جديد من صفحة طلب التدريب.</p>
          </div>
        )}

        {!loading && !error && requestItem && (
          <>
            {/* Stepper */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", border: "1px solid #e2e8f0", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <TrainingRequestWorkflowStepper
                bookStatus={requestItem.book_status}
                governingBody={requestItem.governing_body}
              />
            </div>

            {/* Info Cards */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", border: "1px solid #e2e8f0", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>حالة الطلب الحالي</h3>
                </div>
                <StatusBadge status={requestItem.book_status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                {[
                  { icon: ClipboardList, label: "حالة الطلب",      value: <StatusBadge status={requestItem.book_status} />, color: "#3b82f6", bg: "#dbeafe" },
                  { icon: Building2,    label: "الجهة المعتمدة",   value: requestItem.training_site?.name || "—",           color: "#059669", bg: "#d1fae5" },
                  { icon: MapPin,       label: "المديرية",          value: requestItem.training_site?.directorate || "—",    color: "#7c3aed", bg: "#ede9fe" },
                  { icon: UserCheck,    label: "المشرف/المرشد",     value: requestItem.students?.[0]?.assigned_teacher?.name || "غير محدد بعد", color: "#d97706", bg: "#fef3c7" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={17} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{item.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(requestItem.rejection_reason || requestItem.coordinator_rejection_reason || requestItem.needs_edit_reason) && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "1rem 1.25rem", background: "#fef3c7", color: "#92400e", borderRadius: 12, marginTop: "1rem", border: "1px solid #fde68a" }}>
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>ملاحظات على الطلب:</div>
                    <div style={{ fontSize: "0.9rem" }}>{requestItem.rejection_reason || requestItem.coordinator_rejection_reason || requestItem.needs_edit_reason}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Dates */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", border: "1px solid #e2e8f0", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Calendar size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>تفاصيل الطلب</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                {[
                  { label: "تاريخ التقديم", value: formatDate(requestItem.created_at) },
                  { label: "آخر تحديث",     value: formatDate(requestItem.updated_at) },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "0.85rem 1rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#ede9fe", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <History size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>سجل تحديثات الطلب</h3>
                </div>
                <span style={{ padding: "0.25rem 0.75rem", background: "#f1f5f9", color: "#64748b", borderRadius: 99, fontSize: "0.78rem", fontWeight: 700 }}>{activityLogs.length} تحديث</span>
              </div>

              {activityLogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                  <History size={40} style={{ marginBottom: "0.75rem", opacity: 0.3 }} />
                  <div>لا توجد تحديثات مسجلة</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {activityLogs.map((log, idx) => (
                    <div key={idx} style={{
                      display: "flex", gap: "1rem", padding: "1rem 0",
                      borderBottom: idx < activityLogs.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f8fafc", border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {getLogIcon(log.event)}
                        </div>
                        {idx < activityLogs.length - 1 && <div style={{ width: 1, flex: 1, background: "#e2e8f0" }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>{log.description || log.event || "تحديث"}</div>
                            {log.causer?.name && <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>بواسطة: {log.causer.name}</div>}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{formatDate(log.created_at)}</div>
                        </div>
                        {log.properties && Object.keys(log.properties).length > 0 && (
                          <details style={{ marginTop: "0.5rem" }}>
                            <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "#3b82f6", fontWeight: 600 }}>عرض التفاصيل</summary>
                            <pre style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#f8fafc", borderRadius: 8, fontSize: "0.72rem", overflow: "auto" }}>
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
