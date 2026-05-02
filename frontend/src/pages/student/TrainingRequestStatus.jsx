import { useEffect, useState } from "react";
import {
  ClipboardList,
  Building2,
  MapPin,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  History,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  getActivityLogs,
  getStudentTrainingRequests,
  itemsFromPagedResponse,
} from "../../services/api";
import TrainingRequestWorkflowStepper from "../../components/training/TrainingRequestWorkflowStepper";

export default function TrainingRequestStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestItem, setRequestItem] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = async () => {
    try {
      const res = await getStudentTrainingRequests();
      const list = itemsFromPagedResponse(res);
      const latestRequest = list[0] || null;

      setRequestItem(latestRequest);
      setActivityLogs([]);

      if (latestRequest?.id) {
        try {
          const logsRes = await getActivityLogs({
            subject_type: "training_request",
            subject_id: latestRequest.id,
            per_page: 50,
          });
          setActivityLogs(itemsFromPagedResponse(logsRes));
        } catch (logsError) {
          // The status page should still render even when logs are not accessible.
          if (logsError?.response?.status !== 403) {
            throw logsError;
          }
        }
      }

      setLastUpdate(new Date());
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل حالة الطلب.");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      await loadData();
      setLoading(false);
    };

    load();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { className: "badge-info", icon: ClipboardList, text: "مسودة" },
      sent_to_directorate: {
        className: "badge-info",
        icon: Send,
        text: "أُرسل للمديرية",
      },
      sent_to_school: {
        className: "badge-info",
        icon: Send,
        text: "أُرسل للمدرسة",
      },
      school_approved: {
        className: "badge-success",
        icon: CheckCircle2,
        text: "موافقة جهة التدريب",
      },
      directorate_approved: {
        className: "badge-success",
        icon: CheckCircle2,
        text: "موافقة المديرية",
      },
      directorate_rejected: {
        className: "badge-danger",
        icon: XCircle,
        text: "مرفوض من المديرية",
      },
      sent_to_health_ministry: {
        className: "badge-info",
        icon: Send,
        text: "مرسل لوزارة الصحة",
      },
      health_ministry_rejected: {
        className: "badge-danger",
        icon: XCircle,
        text: "مرفوض من وزارة الصحة",
      },
      school_rejected: {
        className: "badge-danger",
        icon: XCircle,
        text: "مرفوض من جهة التدريب",
      },
      sent_to_coordinator: {
        className: "badge-primary",
        icon: Send,
        text: "عند المنسق",
      },
      prelim_approved: {
        className: "badge-success",
        icon: CheckCircle2,
        text: "موافقة أولية",
      },
      approved: {
        className: "badge-success",
        icon: CheckCircle2,
        text: "مقبول",
      },
      rejected: {
        className: "badge-danger",
        icon: XCircle,
        text: "مرفوض",
      },
      coordinator_rejected: {
        className: "badge-danger",
        icon: XCircle,
        text: "مرفوض من المنسق",
      },
      needs_edit: {
        className: "badge-warning",
        icon: AlertCircle,
        text: "يحتاج تعديل",
      },
    };

    const config = statusConfig[status] || {
      className: "badge-soft",
      icon: Clock,
      text: status || "قيد المعالجة",
    };
    const Icon = config.icon;

    return (
      <span className={`badge-custom ${config.className} d-inline-flex align-items-center gap-1`}>
        <Icon size={14} />
        {config.text}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";

    return new Date(dateStr).toLocaleString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLogIcon = (event) => {
    if (event?.includes("create")) return <ClipboardList size={16} className="text-primary" />;
    if (event?.includes("update")) return <RefreshCw size={16} className="text-info" />;
    if (event?.includes("delete")) return <XCircle size={16} className="text-danger" />;
    if (event?.includes("approve")) return <CheckCircle2 size={16} className="text-success" />;
    if (event?.includes("reject")) return <XCircle size={16} className="text-danger" />;
    if (event?.includes("sent")) return <Send size={16} className="text-info" />;
    return <History size={16} className="text-muted" />;
  };

  return (
    <>
      <div className="content-header">
        <h1 className="page-title d-flex align-items-center gap-2">
          <ClipboardList size={28} />
          متابعة حالة طلب التدريب
        </h1>
        <p className="page-subtitle">
          <Clock size={14} className="me-1" />
          آخر تحديث: {formatDate(lastUpdate)} · يتم التحديث تلقائيًا كل 30 ثانية
        </p>
      </div>

      {loading && (
        <div className="section-card">
          <div className="text-center py-4">
            <RefreshCw size={32} className="animate-spin text-primary mb-2" />
            <p className="text-muted mb-0">جاري تحميل البيانات...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="alert-custom alert-danger d-flex align-items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {!loading && !error && !requestItem && (
        <div className="section-card">
          <div className="empty-state">
            <ClipboardList size={48} className="text-muted mb-3" />
            <h5>لا يوجد طلب تدريب حالي</h5>
            <p className="text-muted mb-0">يمكنك تقديم طلب جديد من صفحة طلب التدريب.</p>
          </div>
        </div>
      )}

      {!loading && !error && requestItem && (
        <>
          <TrainingRequestWorkflowStepper
            bookStatus={requestItem.book_status}
            governingBody={requestItem.governing_body}
          />
          <div className="section-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <Building2 size={20} className="text-primary" />
                معلومات الطلب
              </h5>
              {getStatusBadge(requestItem.book_status)}
            </div>

            <div className="summary-grid">
              <div className="stat-card primary">
                <div>
                  <div className="stat-title">حالة الطلب</div>
                  <div className="stat-value fs-6">{getStatusBadge(requestItem.book_status)}</div>
                </div>
              </div>

              <div className="stat-card success">
                <div>
                  <div className="stat-title">الجهة المعتمدة</div>
                  <div className="stat-value fs-6">{requestItem.training_site?.name || "—"}</div>
                </div>
              </div>

              <div className="stat-card accent">
                <div>
                  <div className="stat-title">المديرية</div>
                  <div className="stat-value fs-6">
                    <MapPin size={14} className="me-1" />
                    {requestItem.training_site?.directorate || "—"}
                  </div>
                </div>
              </div>

              <div className="stat-card warning">
                <div>
                  <div className="stat-title">المشرف/المرشد</div>
                  <div className="stat-value fs-6">
                    <UserCheck size={14} className="me-1" />
                    {requestItem.students?.[0]?.assigned_teacher?.name || "غير محدد"}
                  </div>
                </div>
              </div>
            </div>

            {(requestItem.rejection_reason ||
              requestItem.coordinator_rejection_reason ||
              requestItem.needs_edit_reason) && (
              <div className="alert-custom alert-warning mt-3 d-flex align-items-start gap-2">
                <AlertCircle size={20} className="mt-1 flex-shrink-0" />
                <div>
                  <strong>ملاحظات على الطلب:</strong>
                  <p className="mb-0 mt-1">
                    {requestItem.rejection_reason ||
                      requestItem.coordinator_rejection_reason ||
                      requestItem.needs_edit_reason}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="section-card mt-3">
            <h5 className="mb-3 d-flex align-items-center gap-2">
              <Calendar size={20} className="text-primary" />
              تفاصيل الطلب
            </h5>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-field">
                  <label className="form-label-custom">تاريخ التقديم</label>
                  <div className="form-input-custom bg-light">{formatDate(requestItem.created_at)}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-field">
                  <label className="form-label-custom">آخر تحديث</label>
                  <div className="form-input-custom bg-light">{formatDate(requestItem.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-card mt-3">
            <h5 className="mb-3 d-flex align-items-center gap-2">
              <History size={20} className="text-primary" />
              سجل تحديثات الطلب
              <span className="badge-custom badge-soft ms-auto">{activityLogs.length} تحديث</span>
            </h5>

            {activityLogs.length === 0 ? (
              <div className="empty-state py-4">
                <History size={32} className="text-muted mb-2" />
                <p className="text-muted mb-0">لا توجد تحديثات مسجلة.</p>
              </div>
            ) : (
              <div className="timeline">
                {activityLogs.map((log, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker">{getLogIcon(log.event)}</div>
                    <div className="timeline-content">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong className="d-block">{log.description || log.event || "تحديث"}</strong>
                          {log.causer?.name && (
                            <small className="text-muted">بواسطة: {log.causer.name}</small>
                          )}
                        </div>
                        <small className="text-muted">{formatDate(log.created_at)}</small>
                      </div>
                      {log.properties && Object.keys(log.properties).length > 0 && (
                        <details className="mt-2">
                          <summary className="small text-primary" style={{ cursor: "pointer" }}>
                            عرض التفاصيل
                          </summary>
                          <pre className="mt-2 p-2 bg-light rounded small" style={{ fontSize: "0.75rem" }}>
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
    </>
  );
}
