import { useEffect, useState } from "react";
import {
  ClipboardList, Building2, MapPin, UserCheck, Clock, AlertCircle,
  CheckCircle2, XCircle, Send, History, RefreshCw, Calendar,
  GraduationCap, BookOpen, Users, Paperclip, Info, User,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getActivityLogs,
  getStudentTrainingRequests,
  itemsFromPagedResponse,
} from "../../services/api";
import TrainingRequestWorkflowStepper from "../../components/training/TrainingRequestWorkflowStepper";
import { readStoredUser } from "../../utils/session";

const fadeIn = `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;

const STATUS_MAP = {
  draft:                   { label: "مسودة",                  color: "#64748b", bg: "#f1f5f9", icon: ClipboardList },
  sent_to_coordinator:     { label: "عند المنسق",             color: "#3b82f6", bg: "#dbeafe", icon: Send },
  coordinator_under_review:{ label: "قيد مراجعة المنسق",     color: "#3b82f6", bg: "#dbeafe", icon: Clock },
  needs_edit:              { label: "يحتاج تعديل",            color: "#d97706", bg: "#fef3c7", icon: AlertCircle },
  prelim_approved:         { label: "موافقة أولية",           color: "#0891b2", bg: "#ecfeff", icon: CheckCircle2 },
  batched_pending_send:    { label: "في الدفعة - قيد الإرسال",color: "#6366f1", bg: "#e0e7ff", icon: Send },
  sent_to_directorate:     { label: "أُرسل للجهة الرسمية",   color: "#6366f1", bg: "#e0e7ff", icon: Send },
  directorate_approved:    { label: "موافقة الجهة الرسمية",  color: "#10b981", bg: "#d1fae5", icon: CheckCircle2 },
  directorate_rejected:    { label: "مرفوض من الجهة الرسمية",color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  sent_to_school:          { label: "مرسل لجهة التدريب",     color: "#7c3aed", bg: "#ede9fe", icon: Send },
  school_approved:         { label: "موافقة جهة التدريب",    color: "#059669", bg: "#d1fae5", icon: CheckCircle2 },
  school_rejected:         { label: "مرفوض من جهة التدريب", color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  sent_to_health_ministry: { label: "مرسل لوزارة الصحة",    color: "#0284c7", bg: "#e0f2fe", icon: Send },
  health_ministry_rejected:{ label: "مرفوض من وزارة الصحة", color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  approved:                { label: "مقبول نهائياً",         color: "#059669", bg: "#d1fae5", icon: CheckCircle2 },
  rejected:                { label: "مرفوض",                 color: "#dc2626", bg: "#fee2e2", icon: XCircle },
  coordinator_rejected:    { label: "مرفوض من المنسق",       color: "#dc2626", bg: "#fee2e2", icon: XCircle },
};

const GOVERNING_BODY_LABELS = {
  directorate_of_education: "مديرية التربية والتعليم",
  ministry_of_health:       "وزارة الصحة",
  health_directorate:       "مديرية الصحة",
  education_directorate:    "مديرية التربية",
};

const SEMESTER_LABELS = {
  first:  "الفصل الأول",
  second: "الفصل الثاني",
  summer: "الفصل الصيفي",
};

const DEPT_NAME_LABELS = {
  psychology:    "علم النفس",
  usool_tarbiah: "أصول التربية",
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

const formatDate = (d) => d
  ? new Date(d).toLocaleString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  : "—";

const formatDateOnly = (d) => d
  ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" })
  : "—";

const getLogIcon = (event) => {
  if (event?.includes("create"))  return <ClipboardList size={15} color="#3b82f6" />;
  if (event?.includes("update"))  return <RefreshCw size={15} color="#0891b2" />;
  if (event?.includes("approve")) return <CheckCircle2 size={15} color="#10b981" />;
  if (event?.includes("reject"))  return <XCircle size={15} color="#dc2626" />;
  if (event?.includes("sent"))    return <Send size={15} color="#6366f1" />;
  return <History size={15} color="#94a3b8" />;
};

const InfoCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="flex items-center gap-3 py-[0.85rem] px-4 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
    <div className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: bg, color }}>
      <Icon size={17} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[0.72rem] text-[#94a3b8] font-medium">{label}</div>
      <div className="text-[0.88rem] font-bold text-[#1e293b] mt-[2px] break-words">{value ?? "غير محدد"}</div>
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, iconBg, iconColor, badge }) => (
  <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
    <div className="flex items-center gap-[0.6rem]">
      <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
        <Icon size={18} />
      </div>
      <h3 className="m-0 text-[1rem] font-bold text-[#1e293b]">{title}</h3>
    </div>
    {badge}
  </div>
);

const RejectionBox = ({ title, reason }) => reason ? (
  <div className="flex items-start gap-3 py-4 px-5 bg-[#fee2e2] text-[#991b1b] rounded-xl mt-3 border border-[#fecaca]">
    <XCircle size={18} className="shrink-0 mt-[2px]" />
    <div>
      <div className="font-bold mb-1 text-[0.85rem]">{title}</div>
      <div className="text-[0.88rem]">{reason}</div>
    </div>
  </div>
) : null;

const NoteBox = ({ title, note }) => note ? (
  <div className="flex items-start gap-3 py-4 px-5 bg-[#fef3c7] text-[#92400e] rounded-xl mt-3 border border-[#fde68a]">
    <AlertCircle size={18} className="shrink-0 mt-[2px]" />
    <div>
      <div className="font-bold mb-1 text-[0.85rem]">{title}</div>
      <div className="text-[0.88rem]">{note}</div>
    </div>
  </div>
) : null;

export default function TrainingRequestStatus() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [requestItem, setRequestItem] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [lastUpdate, setLastUpdate]   = useState(new Date());

  const currentUser = readStoredUser();

  const loadData = async () => {
    try {
      const res = await getStudentTrainingRequests();
      const list = itemsFromPagedResponse(res);
      const latest = Array.isArray(list) ? (list[0] || null) : null;
      setRequestItem(latest);
      // استخراج section_info من الـ response الإضافي
      const si = res?.section_info ?? res?.meta?.section_info ?? null;
      setSectionInfo(si);
      setActivityLogs([]);
      if (latest?.id) {
        try {
          const logsRes = await getActivityLogs({ subject_type: "training_request", subject_id: latest.id, per_page: 50 });
          setActivityLogs(itemsFromPagedResponse(logsRes) ?? []);
        } catch (e) { if (e?.response?.status !== 403) throw e; }
      }
      setLastUpdate(new Date());
      setError("");
    } catch (e) {
      if (e?.response?.status === 403) {
        setError("لا تملك صلاحية الوصول إلى هذا الطلب.");
      } else {
        setError(e?.response?.data?.message || "تعذر تحميل حالة الطلب.");
      }
    }
  };

  useEffect(() => {
    (async () => { setLoading(true); await loadData(); setLoading(false); })();
    const iv = setInterval(() => { if (document.visibilityState !== "hidden") loadData(); }, 30000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // الطالب المرتبط بالطلب (من trainingRequestStudents أو requestedBy)
  const studentEntry = requestItem?.students?.[0] ?? null;
  const studentUser  = studentEntry?.user ?? requestItem?.requested_by ?? currentUser ?? null;

  // القسم — من section_info أو من course في studentEntry
  const deptName =
    sectionInfo?.department_name
    ?? studentEntry?.department_name
    ?? studentEntry?.course?.department?.name
    ?? null;
  const deptLabel = (deptName && DEPT_NAME_LABELS[deptName]) || deptName || "غير محدد";

  // المشرف الأكاديمي
  const academicSupervisor =
    sectionInfo?.academic_supervisor
    ?? currentUser?.current_section?.academic_supervisor
    ?? null;

  // المرشد/المشرف الميداني
  const assignedTeacher = studentEntry?.assigned_teacher ?? null;

  // بيانات الشعبة
  const sectionName   = sectionInfo?.section_name   ?? "غير محدد";
  const courseName    = sectionInfo?.course_name     ?? studentEntry?.course?.name  ?? "غير محدد";
  const courseCode    = sectionInfo?.course_code     ?? studentEntry?.course?.code  ?? null;
  const academicYear  = sectionInfo?.academic_year   ?? null;
  const semesterVal   = sectionInfo?.semester        ?? null;
  const semesterLabel = sectionInfo?.semester_label  ?? (semesterVal ? (SEMESTER_LABELS[semesterVal] ?? semesterVal) : "غير محدد");

  // الفترة التدريبية
  const trainingPeriod = requestItem?.training_period ?? sectionInfo?.section_training_period ?? null;

  // مكان التدريب
  const trainingSite = requestItem?.training_site ?? null;
  const siteDirectorate = trainingSite?.directorate_label ?? trainingSite?.directorate ?? requestItem?.directorate ?? "غير محدد";
  const siteType        = trainingSite?.site_type_label   ?? trainingSite?.site_type  ?? null;
  const siteClassification = trainingSite?.gender_classification ?? null;

  // الجهة الرسمية
  const governingBodyLabel = GOVERNING_BODY_LABELS[requestItem?.governing_body] ?? requestItem?.governing_body ?? "غير محدد";

  // أسباب الرفض في كل مرحلة
  const rejectionReasons = [
    { label: "سبب الرفض من المنسق",        reason: requestItem?.coordinator_rejection_reason },
    { label: "ملاحظات تحتاج تعديل",        reason: requestItem?.needs_edit_reason },
    { label: "سبب الرفض من الجهة الرسمية", reason: requestItem?.rejection_reason },
    { label: "سبب رفض جهة التدريب",        reason: studentEntry?.rejection_reason },
  ].filter(r => r.reason);

  return (
    <>
      <style>{fadeIn}</style>
      <div style={{ animation: "fadeIn 0.4s ease" }}>
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
        {loading && <LoadingSpinner size="section" text="جاري تحميل البيانات..." />}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 py-[0.85rem] px-[1.25rem] bg-[#fee2e2] text-[#dc2626] rounded-[14px] text-[0.9rem] font-semibold mb-4">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* No request */}
        {!loading && !error && !requestItem && (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
            <ClipboardList size={56} className="mb-4 opacity-30 text-[#94a3b8]" style={{ display: "block", margin: "0 auto 1rem" }} />
            <h3 className="m-0 mb-2 text-[#64748b]">لا يوجد طلب تدريب مقدم حالياً</h3>
            <p className="m-0 text-[#94a3b8] text-[0.9rem]">يمكنك تقديم طلب جديد من صفحة طلب التدريب، أو التواصل مع القسم.</p>
          </div>
        )}

        {!loading && !error && requestItem && (
          <>
            {/* ── 1. مراحل سير الطلب ── */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <SectionHeader
                icon={Send}
                title="مراحل سير الطلب"
                iconBg="#dbeafe"
                iconColor="#2563eb"
                badge={<StatusBadge status={requestItem.book_status} />}
              />
              <TrainingRequestWorkflowStepper
                bookStatus={requestItem.book_status}
                governingBody={requestItem.governing_body}
              />
              {/* أسباب الرفض / الملاحظات في كل مرحلة */}
              {rejectionReasons.map((r, i) => (
                <RejectionBox key={i} title={r.label} reason={r.reason} />
              ))}
            </div>

            {/* ── 2. بيانات الطالب الأكاديمية ── */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <SectionHeader icon={GraduationCap} title="البيانات الأكاديمية للطالب" iconBg="#e0e7ff" iconColor="#4f46e5" />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                <InfoCard icon={User}         label="اسم الطالب"        value={studentUser?.name ?? currentUser?.name ?? "غير محدد"} color="#2563eb" bg="#dbeafe" />
                <InfoCard icon={Info}         label="الرقم الجامعي"     value={studentUser?.university_id ?? currentUser?.university_id ?? "غير محدد"} color="#7c3aed" bg="#ede9fe" />
                <InfoCard icon={GraduationCap} label="القسم"            value={deptLabel}         color="#0891b2" bg="#e0f2fe" />
                <InfoCard icon={BookOpen}     label="المساق التدريبي"   value={courseCode ? `${courseName} (${courseCode})` : courseName} color="#059669" bg="#d1fae5" />
                <InfoCard icon={Users}        label="الشعبة"            value={sectionName}       color="#d97706" bg="#fef3c7" />
                <InfoCard icon={Calendar}     label="الفصل الدراسي"     value={semesterLabel}     color="#6366f1" bg="#e0e7ff" />
                <InfoCard icon={Calendar}     label="السنة الأكاديمية"  value={academicYear ? `${academicYear}/${academicYear + 1}` : "غير محدد"} color="#64748b" bg="#f1f5f9" />
                <InfoCard icon={UserCheck}    label="المشرف الأكاديمي" value={academicSupervisor?.name ?? "غير محدد"} color="#0891b2" bg="#e0f2fe" />
              </div>
              {!sectionInfo && !studentEntry && (
                <NoteBox title="ملاحظة" note="بيانات الطالب الأكاديمية غير مكتملة، يرجى التواصل مع القسم لتسجيلك في الشعبة المناسبة." />
              )}
            </div>

            {/* ── 3. بيانات مكان التدريب والجهة ── */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <SectionHeader icon={Building2} title="مكان التدريب والجهة المختصة" iconBg="#d1fae5" iconColor="#059669" />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                <InfoCard icon={Building2}  label="مكان التدريب المختار"   value={trainingSite?.name ?? "غير محدد"}    color="#059669" bg="#d1fae5" />
                <InfoCard icon={MapPin}     label="المديرية / الجهة التابعة" value={siteDirectorate}                    color="#7c3aed" bg="#ede9fe" />
                <InfoCard icon={Info}       label="الجهة الرسمية المختصة"   value={governingBodyLabel}                  color="#3b82f6" bg="#dbeafe" />
                {siteType       && <InfoCard icon={Info}  label="نوع مكان التدريب"       value={siteType}           color="#0891b2" bg="#e0f2fe" />}
                {siteClassification && <InfoCard icon={Info} label="التصنيف"             value={siteClassification} color="#d97706" bg="#fef3c7" />}
                <InfoCard icon={UserCheck}  label="المرشد/الأخصائي الميداني" value={assignedTeacher?.name ?? "لم يُعيَّن بعد"} color="#d97706" bg="#fef3c7" />
              </div>
            </div>

            {/* ── 4. الفترة التدريبية والتواريخ ── */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <SectionHeader icon={Calendar} title="الفترة التدريبية والتواريخ" iconBg="#e0f2fe" iconColor="#0284c7" />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {[
                  { label: "الفترة التدريبية",      value: trainingPeriod?.name ?? "غير مرتبط بفترة" },
                  { label: "بداية الفترة",           value: trainingPeriod?.start_date ? formatDateOnly(trainingPeriod.start_date) : "—" },
                  { label: "نهاية الفترة",           value: trainingPeriod?.end_date   ? formatDateOnly(trainingPeriod.end_date)   : "—" },
                  { label: "تاريخ تقديم الطلب",      value: formatDate(requestItem.created_at) },
                  { label: "آخر تحديث على الطلب",   value: formatDate(requestItem.updated_at) },
                  { label: "تاريخ الإرسال للجهة الرسمية", value: requestItem.sent_to_directorate_at ? formatDate(requestItem.sent_to_directorate_at) : "—" },
                  { label: "تاريخ موافقة الجهة الرسمية",  value: requestItem.directorate_approved_at ? formatDate(requestItem.directorate_approved_at) : "—" },
                  { label: "تاريخ الإرسال لجهة التدريب",  value: requestItem.sent_to_school_at       ? formatDate(requestItem.sent_to_school_at)       : "—" },
                  { label: "تاريخ موافقة جهة التدريب",    value: requestItem.school_approved_at       ? formatDate(requestItem.school_approved_at)       : "—" },
                  ...(studentEntry?.start_date ? [{ label: "بداية تدريب الطالب", value: formatDateOnly(studentEntry.start_date) }] : []),
                  ...(studentEntry?.end_date   ? [{ label: "نهاية تدريب الطالب", value: formatDateOnly(studentEntry.end_date)   }] : []),
                ].map((item, i) => (
                  <div key={i} className="py-[0.85rem] px-4 bg-[#f8fafc] rounded-xl border border-[#f1f5f9]">
                    <div className="text-[0.72rem] text-[#94a3b8] font-medium mb-1">{item.label}</div>
                    <div className="text-[0.9rem] font-bold text-[#1e293b]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 5. الملفات والمرفقات ── */}
            {requestItem.attachment_path && (
              <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                <SectionHeader icon={Paperclip} title="المرفقات" iconBg="#f1f5f9" iconColor="#64748b" />
                <a
                  href={requestItem.attachment_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 py-2 px-4 bg-[#dbeafe] text-[#2563eb] rounded-lg text-[0.88rem] font-semibold hover:bg-[#bfdbfe] transition-colors"
                >
                  <Paperclip size={15} /> عرض المرفق
                </a>
              </div>
            )}

            {/* ── 6. سجل تحديثات الطلب ── */}
            <div className="bg-white rounded-2xl py-6 px-8 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <SectionHeader
                icon={History}
                title="سجل تحديثات الطلب"
                iconBg="#ede9fe"
                iconColor="#7c3aed"
                badge={
                  <span className="py-1 px-3 bg-[#f1f5f9] text-[#64748b] rounded-full text-[0.78rem] font-bold">
                    {activityLogs.length} تحديث
                  </span>
                }
              />
              {activityLogs.length === 0 ? (
                <div className="text-center p-10 text-[#94a3b8]">
                  <History size={40} style={{ display: "block", margin: "0 auto 0.75rem", opacity: 0.3 }} />
                  <div>لا توجد تحديثات مسجلة</div>
                </div>
              ) : (
                <div className="flex flex-col gap-0">
                  {activityLogs.map((log, idx) => (
                    <div key={idx} className={`flex gap-4 py-4 ${idx < activityLogs.length - 1 ? "border-b border-[#f1f5f9]" : ""}`}>
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
