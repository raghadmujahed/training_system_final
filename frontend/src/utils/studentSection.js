const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

const getUserValue = (user, key) => user?.[key] ?? user?.data?.[key];

// تحميل معرّفات الأقسام من localStorage (لإعادة تحميل الصفحة)
try {
  const ids = JSON.parse(localStorage.getItem("department_ids") || "{}");
  if (ids.psychology != null) window.__PSYCHOLOGY_DEPT_ID = ids.psychology;
  if (ids.usool_tarbiah != null) window.__USOOL_TARBIAH_DEPT_ID = ids.usool_tarbiah;
} catch { /* ignore */ }

export const getStudentTrack = (user) => {
  if (!user) return null;
  const roleName = getUserValue(user, "role")?.name || getUserValue(user, "role");
  if (roleName !== "student") return null;

  // 1) track from API (resolveStudentTrack on backend)
  const currentSection = getUserValue(user, "current_section") || {};
  const track = currentSection.track || getUserValue(user, "track");
  if (track === "education" || track === "psychology") return track;

  // 2) exact department_id match (primary — fastest)
  const deptId = getUserValue(user, "department_id");
  if (deptId != null) {
    const psychId = window.__PSYCHOLOGY_DEPT_ID ?? null;
    const usoolId = window.__USOOL_TARBIAH_DEPT_ID ?? null;
    if (psychId !== null && deptId === psychId) return "psychology";
    if (usoolId !== null && deptId === usoolId) return "education";
  }

  // 3) exact department.name match
  const deptName = getUserValue(user, "department")?.name ?? getUserValue(user, "department");
  if (deptName === "psychology") return "psychology";
  if (deptName === "usool_tarbiah") return "education";

  // 4) fallback: text analysis
  const departmentName = normalizeText(deptName);
  const courseName = normalizeText(currentSection.course_name);
  const courseCode = normalizeText(currentSection.course_code);
  const specialization = normalizeText(getUserValue(user, "specialization") || getUserValue(user, "major"));
  const source = `${departmentName} ${courseName} ${courseCode} ${specialization}`;

  if (source.includes("psych") || source.includes("psyc") || source.includes("نفس")) {
    return "psychology";
  }

  if (
    source.includes("usool") ||
    source.includes("tarb") ||
    source.includes("educ") ||
    source.includes("اصول") ||
    source.includes("تربي")
  ) {
    return "education";
  }

  return null;
};

export const getStudentDashboardPath = (user) => {
  const track = getStudentTrack(user);
  if (track === "psychology") return "/student/dashboard/psychology";
  return "/student/dashboard/education";
};
