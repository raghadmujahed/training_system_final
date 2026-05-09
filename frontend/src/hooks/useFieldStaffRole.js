import { getFieldStaffRoleKey, normalizeRole, ROLES } from "../utils/roles";
import { readStoredUser } from "../utils/session";

/**
 * Hook يحدد دور المستخدم ضمن مجموعة الكادر الميداني الموحد
 * (المعلم المرشد، المشرف الأكاديمي، الأخصائي النفسي، مدير المدرسة، المشرف الميداني).
 *
 * الأدوار الخلفية (backend role names):
 *   teacher             → mentor
 *   adviser             → adviser
 *   academic_supervisor → supervisor
 *   psychologist        → psychologist
 *   school_manager      → principal
 *   field_supervisor    → field_supervisor (مع نوع فرعي: mentor_teacher | school_counselor | psychologist)
 *
 * يوفّر:
 *  - roleKey       : المفتاح الموحّد (mentor | adviser | supervisor | psychologist | principal | field_supervisor)
 *  - rawRole       : اسم الدور الأصلي من قاعدة البيانات
 *  - label         : التسمية العربية
 *  - isMentor / isSupervisor / isPsychologist / isPrincipal / isFieldSupervisor : اختصارات
 *  - targetRole    : القيمة المطلوبة لفلترة قوالب التقييم (تُرسل كـ target_role للـ API)
 *  - basePath      : المسار الأساسي الموحّد (/field-staff)
 *  - supervisorSubtype : النوع الفرعي للمشرف الميداني (mentor_teacher | school_counselor | psychologist)
 *  - subtypeLabel  : التسمية العربية للنوع الفرعي
 */

// التسميات حسب النوع الفرعي للمشرف الميداني
const SUBTYPE_LABELS = {
  mentor_teacher: "المعلم المرشد",
  school_counselor: "المرشد التربوي",
  psychologist: "الأخصائي النفسي",
};

// مصطلحات ديناميكية حسب النوع الفرعي
const SUBTYPE_TERMS = {
  mentor_teacher: {
    dailyReport: "التقرير اليومي للتدريس",
    evaluation: "تقييم الأداء التدريسي",
    lesson: "الحصة / الدرس",
    topic: "موضوع الدرس",
    classroom: "إدارة الصف",
  },
  school_counselor: {
    dailyReport: "التقرير الإرشادي اليومي",
    evaluation: "تقييم الأداء الإرشادي",
    lesson: "النشاط الإرشادي",
    topic: "الحالة / الموقف",
    classroom: "الملاحظة التربوية",
  },
  psychologist: {
    dailyReport: "التقرير المهني اليومي",
    evaluation: "تقييم الأداء المهني",
    lesson: "الجلسة / النشاط",
    topic: "طبيعة الحالة",
    classroom: "الملاحظة العلاجية",
  },
};

const FIELD_STAFF_MAP = {
  [ROLES.MENTOR]: {
    roleKey: "mentor",
    label: "المعلم المرشد (المشرف الميداني)",
    targetRole: ROLES.MENTOR,
  },
  [ROLES.ADVISER]: {
    roleKey: "adviser",
    label: "المرشد التربوي (المشرف الميداني)",
    targetRole: ROLES.ADVISER,
  },
  [ROLES.SUPERVISOR]: {
    roleKey: "supervisor",
    label: "المشرف الأكاديمي",
    targetRole: ROLES.SUPERVISOR,
  },
  [ROLES.PSYCHOLOGIST]: {
    roleKey: "psychologist",
    label: "الأخصائي النفسي",
    targetRole: ROLES.PSYCHOLOGIST,
  },
  [ROLES.PRINCIPAL]: {
    roleKey: "principal",
    label: "مدير جهة التدريب",
    targetRole: ROLES.PRINCIPAL,
  },
  [ROLES.FIELD_SUPERVISOR]: {
    roleKey: "field_supervisor",
    label: "المشرف الميداني",
    targetRole: ROLES.FIELD_SUPERVISOR,
  },
};

export default function useFieldStaffRole() {
  const savedUser = readStoredUser();
  const rawRole = normalizeRole(savedUser?.role?.name || savedUser?.role || "");

  const mapped = FIELD_STAFF_MAP[rawRole];

  if (!mapped) {
    return {
      isFieldStaff: false,
      roleKey: getFieldStaffRoleKey(rawRole),
      rawRole,
      label: "",
      targetRole: rawRole,
      basePath: "",
      isMentor: false,
      isAdviser: false,
      isSupervisor: false,
      isPsychologist: false,
      isPrincipal: false,
      isFieldSupervisor: false,
      supervisorSubtype: null,
      subtypeLabel: "",
      terms: {},
    };
  }

  const supervisorSubtype = savedUser?.field_supervisor_profile?.supervisor_type || null;
  let terms = SUBTYPE_TERMS[supervisorSubtype] || {};
  // معلم مرشد بدور teacher (بلا سجل field_supervisor_profiles): نفس مصطلحات mentor_teacher
  if (mapped.roleKey === "mentor" && !supervisorSubtype) {
    terms = SUBTYPE_TERMS.mentor_teacher || {};
  }
  // أخصائي بموقع تدريب (دور psychologist) بلا سجل مشرف ميداني: نفس مصطلحات مسار المؤسسة
  if (mapped.roleKey === "psychologist" && !supervisorSubtype) {
    terms = SUBTYPE_TERMS.psychologist || {};
  }
  const subtypeLabel =
    SUBTYPE_LABELS[supervisorSubtype] ||
    (mapped.roleKey === "mentor" && !supervisorSubtype ? SUBTYPE_LABELS.mentor_teacher : "");
  const label = rawRole === "field_supervisor" ? subtypeLabel || mapped.label : mapped.label;

  return {
    isFieldStaff: true,
    roleKey: mapped.roleKey,
    rawRole,
    label,
    targetRole: mapped.targetRole,
    basePath: "/field-staff",
    isMentor: mapped.roleKey === "mentor",
    isAdviser: mapped.roleKey === "adviser",
    isSupervisor: mapped.roleKey === "supervisor",
    isPsychologist: mapped.roleKey === "psychologist",
    isPrincipal: mapped.roleKey === "principal",
    isFieldSupervisor: mapped.roleKey === "field_supervisor",
    supervisorSubtype,
    subtypeLabel,
    terms,
  };
}

export { SUBTYPE_LABELS, SUBTYPE_TERMS };
