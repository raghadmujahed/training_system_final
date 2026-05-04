export const ROLES = {
  ADMIN: "admin",
  COORDINATOR: "training_coordinator",
  SUPERVISOR: "academic_supervisor",
  MENTOR: "teacher",
  PRINCIPAL: "school_manager",
  SCHOOL_MANAGER: "school_manager",
  PSYCHOLOGY_CENTER_MANAGER: "psychology_center_manager",
  HEALTH_DIRECTORATE: "health_directorate",
  EDUCATION_DIRECTORATE: "education_directorate",
  FIELD_SUPERVISOR: "field_supervisor",
  ADVISER: "adviser",
  PSYCHOLOGIST: "psychologist",
  STUDENT: "student",
  HEAD_OF_DEPARTMENT: "head_of_department",
};

export const ROLE_ALIASES = {
  coordinator: ROLES.COORDINATOR,
  supervisor: ROLES.SUPERVISOR,
  mentor: ROLES.MENTOR,
  principal: ROLES.PRINCIPAL,
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "مدير النظام",
  [ROLES.COORDINATOR]: "منسق التدريب",
  [ROLES.SUPERVISOR]: "المشرف الأكاديمي",
  [ROLES.MENTOR]: "المعلم المرشد",
  [ROLES.FIELD_SUPERVISOR]: "المشرف الميداني",
  [ROLES.ADVISER]: "المرشد التربوي",
  [ROLES.PSYCHOLOGIST]: "الأخصائي النفسي",
  [ROLES.PRINCIPAL]: "مدير جهة التدريب",
  [ROLES.PSYCHOLOGY_CENTER_MANAGER]: "مدير المركز النفسي",
  [ROLES.HEALTH_DIRECTORATE]: "مديرية الصحة",
  [ROLES.EDUCATION_DIRECTORATE]: "مديرية التربية والتعليم",
  [ROLES.STUDENT]: "الطالب المتدرب",
  [ROLES.HEAD_OF_DEPARTMENT]: "رئيس القسم",
};

const DASHBOARD_PATHS = {
  [ROLES.ADMIN]: "/dashboard",
  [ROLES.COORDINATOR]: "/coordinator/dashboard",
  [ROLES.FIELD_SUPERVISOR]: "/field-supervisor",
  [ROLES.MENTOR]: "/field-staff/dashboard",
  [ROLES.ADVISER]: "/field-staff/dashboard",
  [ROLES.SUPERVISOR]: "/supervisor/workspace",
  [ROLES.PSYCHOLOGIST]: "/field-staff/dashboard",
  [ROLES.PRINCIPAL]: "/principal/dashboard",
  [ROLES.PSYCHOLOGY_CENTER_MANAGER]: "/psychology-center/dashboard",
  [ROLES.EDUCATION_DIRECTORATE]: "/education/dashboard",
  [ROLES.HEALTH_DIRECTORATE]: "/health/dashboard",
  [ROLES.HEAD_OF_DEPARTMENT]: "/head-department/dashboard",
};

export function normalizeRole(role) {
  if (role == null || role === "") return "";
  let r = role;
  if (typeof r === "object") {
    r = r?.name;
  }
  if (typeof r !== "string" || !r) return "";
  // Handle head_of_department directly since it's not in ROLE_ALIASES
  if (r === "head_of_department") return "head_of_department";
  return ROLE_ALIASES[r] || r;
}

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_LABELS[normalizedRole] || "مستخدم النظام";
}

export function getDashboardPathByRole(role) {
  const normalizedRole = normalizeRole(role);
  return DASHBOARD_PATHS[normalizedRole] || "/";
}

export function getFieldStaffRoleKey(role) {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case ROLES.MENTOR:
      return "mentor";
    case ROLES.ADVISER:
      return "adviser";
    case ROLES.SUPERVISOR:
      return "supervisor";
    case ROLES.PSYCHOLOGIST:
      return "psychologist";
    case ROLES.PRINCIPAL:
      return "principal";
    case ROLES.FIELD_SUPERVISOR:
      return "field_supervisor";
    default:
      return normalizedRole;
  }
}

/**
 * يعيد مسميات الواجهة حسب نوع موقع التدريب
 * @param {"school"|"health_center"} siteType
 */
export const siteLabels = (siteType = "school") => {
  const isHealth = siteType === "health_center";
  return {
    siteName: isHealth ? "المركز" : "المدرسة",
    siteNameFull: isHealth ? "المركز النفسي" : "المدرسة",
    mentorLabel: isHealth ? "الأخصائي النفسي المرشد" : "المعلم المرشد",
    managerLabel: isHealth ? "مدير المركز" : "مدير المدرسة",
    managerLabelFull: isHealth ? "مدير المركز النفسي" : "مدير المدرسة",
    requestTitle: isHealth ? "طلبات التدريب — مراجعة وتعيين الأخصائي" : "طلبات التدريب — مراجعة وتعيين المرشد",
    approveBtn: isHealth ? "قبول وتعيين الأخصائيين" : "قبول وتعيين المرشدين",
    mentorSelect: isHealth ? "اختر الأخصائي النفسي المرشد" : "اختر المعلم المرشد",
    mentorCol: isHealth ? "الأخصائي النفسي المرشد" : "المعلم المرشد",
    traineeTitle: isHealth ? "المتدربون في المركز" : "الطلبة المتدربون",
    governingBody: isHealth ? "ministry_of_health" : "directorate_of_education",
    directorateName: isHealth ? "مديرية الصحة" : "مديرية التربية",
  };
};
