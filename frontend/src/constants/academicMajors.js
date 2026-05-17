/** تخصصات معتمدة — يجب مزامنتها مع App\Support\AcademicMajors */
export const ACADEMIC_MAJORS = [
  "رياضيات",
  "لغة عربية",
  "تربية إسلامية",
  "لغة إنجليزية",
  "علم نفس",
  "علوم",
  "فيزياء",
  "كيمياء",
  "أحياء",
  "تربية خاصة",
  "رياض أطفال",
  "حاسوب",
];

/** تخصصات كل قسم (مفتاح = اسم القسم في قاعدة البيانات) */
export const MAJORS_BY_DEPARTMENT = {
  usool_tarbiah: [
    "رياضيات",
    "لغة عربية",
    "تربية إسلامية",
    "لغة إنجليزية",
    "علوم",
    "فيزياء",
    "كيمياء",
    "أحياء",
    "تربية خاصة",
    "رياض أطفال",
    "حاسوب",
  ],
  psychology: ["علم نفس"],
  administration: [],
};

export function getMajorsForDepartment(departmentId, departments = []) {
  if (!departmentId || !departments?.length) return [];
  const dept = departments.find((d) => String(d.id) === String(departmentId));
  if (!dept?.name) return [];
  return MAJORS_BY_DEPARTMENT[dept.name.trim()] ?? [];
}

export function isValidMajor(value, departmentId = null, departments = []) {
  if (!value || String(value).includes("@")) return false;
  const trimmed = String(value).trim();
  if (departmentId) {
    return getMajorsForDepartment(departmentId, departments).includes(trimmed);
  }
  return ACADEMIC_MAJORS.includes(trimmed);
}

/** يطابق التخصص من القائمة أو يُرجع سلسلة فارغة إن كانت القيمة غير صالحة */
export function resolveMajor(value, departmentId = null, departments = []) {
  if (value == null || value === "") return "";
  const trimmed = String(value).trim();
  if (trimmed.includes("@")) return "";

  const allowed = departmentId
    ? getMajorsForDepartment(departmentId, departments)
    : ACADEMIC_MAJORS;

  if (allowed.includes(trimmed)) return trimmed;
  const found = allowed.find((m) => m.toLowerCase() === trimmed.toLowerCase());
  return found || "";
}
