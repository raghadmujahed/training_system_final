/**
 * تصفية قائمة طلاب المشرف الميداني (بيانات GET /field-supervisor/students)
 * لصفحات «المهام» دون تغيير الـ API.
 */

export function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** لم يُسجّل حضور اليوم (يطابق منطق pending_attendance_today على مستوى القائمة). */
export function filterStudentsAttendanceQueue(students) {
  const today = ymdLocal();
  return (students || []).filter((s) => !s.last_attendance || s.last_attendance !== today);
}

const NEEDS_SUPERVISOR_REVIEW = new Set(["submitted", "under_review"]);
const NEEDS_FOLLOWUP = new Set(["returned"]);

/** تقرير اليوم: يحتاج مراجعة/اعتماد أو معاد للمتابعة. */
export function filterStudentsDailyReportsQueue(students) {
  return (students || []).filter((s) => {
    const st = s.today_report_status || "not_submitted";
    return NEEDS_SUPERVISOR_REVIEW.has(st) || NEEDS_FOLLOWUP.has(st);
  });
}

/** تقييم ميداني غير مُكتمل من جهة المشرف الميداني. */
export function filterStudentsEvaluationQueue(students) {
  return (students || []).filter((s) => {
    const ev = s.evaluation_status;
    return ev === "draft" || ev === "not_started";
  });
}

/** نص «سبب الظهور» لصفحة مهام الحضور (بيانات قائمة الطلاب فقط). */
export function getAttendanceQueueReason(student) {
  const parts = ["لا يوجد تسجيل حضور لهذا اليوم بعد"];
  if (student.last_attendance) {
    parts.push(`آخر يوم مسجّل: ${student.last_attendance}`);
  }
  parts.push("راجع تبويب الحضور لتسجيل اليوم أو اعتماد السجل وملاحظات المشرف إن وُجدت.");
  return parts.join(" — ");
}

/** نص «سبب الظهور» لصفحة مهام التقرير اليومي. */
export function getDailyReportQueueReason(student) {
  const st = student.today_report_status || "not_submitted";
  switch (st) {
    case "submitted":
      return "تقرير اليوم: مرسل — يحتاج مراجعتك أو اعتمادك";
    case "under_review":
      return "تقرير اليوم: قيد المراجعة — يحتاج إكمال خطوة المراجعة";
    case "returned":
      return "تقرير اليوم: معاد للطالب — يحتاج متابعة حتى إعادة الإرسال";
    default:
      return "يتطلب متابعة حالة التقرير اليومي";
  }
}

/** نص «سبب الظهور» لصفحة مهام التقييم الميداني. */
export function getEvaluationQueueReason(student) {
  const ev = student.evaluation_status;
  if (ev === "draft") return "التقييم الميداني: مسودة — يحتاج إكمال الحقول ثم الإرسال";
  if (ev === "not_started") return "التقييم الميداني: لم يبدأ بعد — يحتاج البدء والتعبئة";
  return "التقييم الميداني يحتاج إجراءً منك";
}

/** نص «سبب الظهور» لصفحة الرسائل (يتطلب _queueUnread من الـ hook). */
export function getMessagesQueueReason(student) {
  const n = Number(student._queueUnread) || 0;
  if (n > 1) return `${n} رسائل غير مقروءة من الطالب`;
  if (n === 1) return "رسالة غير مقروءة من الطالب";
  return "محادثة تحتاج متابعة (رسائل واردة)";
}

/** شارة أولوية بسيطة للتمييز البصري دون تغيير API. */
export function getQueuePriority(mode, student) {
  if (mode === "daily-reports" && student.today_report_status === "returned") return { label: "عالٍ", className: "fs-queue-pill--high" };
  if (mode === "daily-reports" && student.today_report_status === "submitted") return { label: "عالٍ", className: "fs-queue-pill--high" };
  if (mode === "communication" && Number(student._queueUnread) >= 3) return { label: "عالٍ", className: "fs-queue-pill--high" };
  if (mode === "attendance") return { label: "عالٍ", className: "fs-queue-pill--high" };
  if (mode === "evaluation" && student.evaluation_status === "not_started") return { label: "عالٍ", className: "fs-queue-pill--high" };
  if (mode === "evaluation" && student.evaluation_status === "draft") return { label: "متوسط", className: "fs-queue-pill--med" };
  return { label: "متوسط", className: "fs-queue-pill--med" };
}
