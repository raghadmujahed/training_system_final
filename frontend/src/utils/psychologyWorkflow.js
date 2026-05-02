/**
 * مسارات قسم علم النفس — لا تستخدم لأصول التربية.
 */

export function departmentName(user) {
  return String(user?.department?.name ?? user?.department ?? "").toLowerCase();
}

export function isPsychologyDepartmentUser(user) {
  // 1) مقارنة بمعرّف القسم (الأسرع)
  const deptId = user?.department_id ?? user?.data?.department_id;
  const psychId = window.__PSYCHOLOGY_DEPT_ID ?? null;
  if (psychId !== null && deptId === psychId) return true;
  const usoolId = window.__USOOL_TARBIAH_DEPT_ID ?? null;
  if (usoolId !== null && deptId === usoolId) return false;
  // 2) مقارنة صريحة باسم القسم (من API)
  const deptName = user?.department?.name ?? user?.department;
  if (deptName === "psychology") return true;
  if (deptName === "usool_tarbiah") return false;
  // 3) fallback: تحليل نصي
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
