/**
 * مسارات قسم علم النفس — لا تستخدم لأصول التربية.
 */

export function departmentName(user) {
  return String(user?.department?.name ?? user?.department ?? "").toLowerCase();
}

export function isPsychologyDepartmentUser(user) {
  const n = departmentName(user);
  return n.includes("psych") || n.includes("psychology") || n.includes("نفس");
}

/** مشرف أكاديمي ضمن قسم علم النفس (اسم القسم في قاعدة البيانات: psychology) */
export function isPsychologyAcademicSupervisor(user) {
  const role = user?.role?.name ?? user?.role;
  return role === "academic_supervisor" && isPsychologyDepartmentUser(user);
}

/** طالب قسم علم النفس */
export function isPsychologyStudentUser(user) {
  const role = user?.role?.name ?? user?.role;
  return role === "student" && isPsychologyDepartmentUser(user);
}

/** منسق مرتبط بقسم علم النفس — يُخفى عنه امتلاك التوزيع لصالح المشرف */
export function isPsychologyCoordinatorDept(user) {
  const role = user?.role?.name ?? user?.role;
  const isCoord = role === "coordinator" || role === "training_coordinator";
  return isCoord && isPsychologyDepartmentUser(user);
}
