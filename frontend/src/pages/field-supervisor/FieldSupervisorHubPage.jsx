import { useMemo } from "react";
import { useFieldSupervisorStudents, useMessageQueueStudents } from "../../hooks/useFieldSupervisorApi";
import FieldSupervisorTaskQueuePanel from "./FieldSupervisorTaskQueuePanel";
import PageHeader from "../../components/common/PageHeader";
import { ClipboardCheck, FileText, Star, MessageCircle } from "lucide-react";
import {
  filterStudentsAttendanceQueue,
  filterStudentsDailyReportsQueue,
  filterStudentsEvaluationQueue,
} from "../../utils/fieldSupervisorQueues";

/** مرجع ثابت — لا تمرّر `[]` مضمّنًا لـ useMessageQueueStudents (مرجع جديد كل render يسبب حلقة). */
const NO_STUDENTS_FOR_MESSAGES = [];

const COPY = {
  attendance: {
    title: "الحضور والغياب",
    subtitle: "هذه الصفحة ليست قائمة كل الطلبة — تعرض فقط من يحتاج إجراءً متعلقًا بحضور اليوم.",
    icon: ClipboardCheck,
    headerBackground: "linear-gradient(135deg, #0d9488 0%, #0f766e 55%, #115e59 100%)",
    taskBoardTitle: "الطلاب الذين يحتاجون تسجيل حضور اليوم",
    panelHint: "الزر الأزرق يفتح ملف الطالب مباشرة على تبويب الحضور. زر «فتح الملف» يفتح نظرة عامة.",
    emptyTitle: "لا يوجد طلبة مرتبطون",
    emptyDescription: "لا يوجد طلبة مرتبطون بحسابك حالياً.",
    queueEmptyTitle: "لا مهام حضور معلّقة اليوم",
    queueEmptyDescription:
      "جميع الطلبة المرتبطين لديهم سجل حضور ليوم اليوم في النظام. يمكنك مراجعة الأيام السابقة من ملف الطالب.",
    primaryActionLabel: "تسجيل / اعتماد الحضور",
    primaryTab: "attendance",
  },
  "daily-reports": {
    title: "السجلات والتقارير اليومية",
    subtitle: "هذه الصفحة ليست قائمة كل الطلبة — تعرض فقط من لديه تقرير اليوم يحتاج مراجعة أو متابعة.",
    icon: FileText,
    headerBackground: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 55%, #1e3a8a 100%)",
    taskBoardTitle: "التقارير اليومية التي تحتاج مراجعة",
    panelHint: "الزر الأزرق يفتح تبويب السجلات اليومية داخل ملف الطالب لاعتماد التقرير أو إعادته.",
    emptyTitle: "لا يوجد طلبة مرتبطون",
    emptyDescription: "لا طلبة في القائمة حالياً.",
    queueEmptyTitle: "لا تقارير تحتاج إجراءً الآن",
    queueEmptyDescription:
      "لا توجد حالات «مرسل» أو «قيد المراجعة» أو «معاد» لتقرير اليوم لطلابك المرتبطين.",
    primaryActionLabel: "مراجعة التقرير",
    primaryTab: "daily-reports",
  },
  evaluation: {
    title: "التقييم الميداني",
    subtitle: "هذه الصفحة ليست قائمة كل الطلبة — تعرض فقط من يحتاج إكمال التقييم الميداني.",
    icon: Star,
    headerBackground: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
    taskBoardTitle: "الطلاب الذين يحتاجون تقييمًا ميدانيًا",
    panelHint: "الزر الرئيسي يفتح تبويب التقييم الميداني داخل الملف لإدخال الدرجات والإرسال.",
    emptyTitle: "لا يوجد طلبة مرتبطون",
    emptyDescription: "لا يوجد طلبة مرتبطون بحسابك حالياً.",
    queueEmptyTitle: "لا مهام تقييم معلّقة",
    queueEmptyDescription:
      "لا يوجد طلاب مرتبطون بحاجة لإكمال تقييم ميداني (مسودة أو لم يبدأ) حسب البيانات الحالية.",
    primaryActionLabel: "إكمال التقييم",
    primaryTab: "evaluation",
  },
  communication: {
    title: "الملاحظات والرسائل",
    subtitle: "هذه الصفحة ليست قائمة كل الطلبة — تعرض فقط من لديه رسائل واردة غير مقروءة من الطالب.",
    icon: MessageCircle,
    headerBackground: "linear-gradient(135deg, #ca8a04 0%, #a16207 55%, #854d0e 100%)",
    taskBoardTitle: "المحادثات أو الملاحظات التي تحتاج متابعة",
    panelHint: "الزر يفتح تبويب الملاحظات والرسائل داخل ملف الطالب لقراءة الرسائل والرد.",
    emptyTitle: "لا يوجد طلبة مرتبطون",
    emptyDescription: "لا طلبة في القائمة.",
    queueEmptyTitle: "لا رسائل غير مقروءة",
    queueEmptyDescription:
      "لا توجد محادثات تحتوي على رسائل واردة غير مقروءة من الطالب حسب آخر تحديث.",
    primaryActionLabel: "فتح المحادثة",
    primaryTab: "communication",
  },
};

export default function FieldSupervisorHubPage({ mode }) {
  const { students, loading, error, refresh } = useFieldSupervisorStudents();
  const {
    queueStudents: messageQueueStudents,
    loading: msgLoading,
    error: msgError,
    refresh: refreshMessages,
  } = useMessageQueueStudents(mode === "communication" ? students : NO_STUDENTS_FOR_MESSAGES);

  const meta = COPY[mode] || COPY.attendance;
  const Icon = meta.icon;

  const displayedStudents = useMemo(() => {
    if (mode === "attendance") return filterStudentsAttendanceQueue(students);
    if (mode === "daily-reports") return filterStudentsDailyReportsQueue(students);
    if (mode === "evaluation") return filterStudentsEvaluationQueue(students);
    if (mode === "communication") return messageQueueStudents;
    return students;
  }, [mode, students, messageQueueStudents]);

  const listLoading = loading || (mode === "communication" && msgLoading);
  const listError = error || msgError || "";

  const workQueueMeta = useMemo(
    () => ({
      totalAssigned: students.length,
      queueEmptyTitle: meta.queueEmptyTitle,
      queueEmptyDescription: meta.queueEmptyDescription,
    }),
    [students.length, meta.queueEmptyTitle, meta.queueEmptyDescription]
  );

  const handleRetry = () => {
    refresh();
    if (mode === "communication") refreshMessages();
  };

  return (
    <>
      <PageHeader icon={Icon} title={meta.title} subtitle={meta.subtitle} background={meta.headerBackground} />
      <FieldSupervisorTaskQueuePanel
        mode={mode}
        students={displayedStudents}
        loading={listLoading}
        error={listError}
        onRetry={handleRetry}
        workQueueMeta={workQueueMeta}
        taskBoardTitle={meta.taskBoardTitle}
        panelHint={meta.panelHint}
        emptyTitle={meta.emptyTitle}
        emptyDescription={meta.emptyDescription}
        primaryActionLabel={meta.primaryActionLabel}
        primaryTab={meta.primaryTab}
      />
    </>
  );
}
