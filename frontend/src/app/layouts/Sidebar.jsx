import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import SidebarMenuGlyph from "./SidebarMenuGlyph";
import { checkFeatureFlag } from "../../services/api";
import { getFieldStaffRoleKey, getRoleLabel, normalizeRole, ROLES } from "../../utils/roles";
import {
  isPsychologyAcademicSupervisor,
  isPsychologyStudentUser,
} from "../../utils/psychologyWorkflow";
import { clearStoredToken, clearStoredUser, readStoredUser } from "../../utils/session";
import huLogo from "../../assets/HU Logo.webp";
import MinistryEducationSeal from "../../components/branding/MinistryEducationSeal";
import MinistryHealthSeal from "../../components/branding/MinistryHealthSeal";

const menuFeatureMap = {
  "/student/training-request": "training_requests.create",
  "/field-staff/tasks": "tasks.create",
  "/admin/announcements": "announcements.create",
};

/** القائمة الموحدة للكادر الميداني — نفس العناصر مع Conditional Rendering */
function buildFieldStaffMenu(roleKey) {
  // الصفحات الموحدة الأساسية لكل الكادر الميداني
  const menu = [
    { name: "الرئيسية", path: "/field-staff/dashboard" },
    { name: "ملفات الطلبة", path: "/field-staff/students" },
    { name: "التقييمات", path: "/field-staff/evaluations" },
    { name: "الملاحظات", path: "/field-staff/notes" },
  ];

  // المهام والسجلات اليومية والتقييم النهائي: للكادر الميداني والمشرف الأكاديمي (دون المشرف الميداني المستقل)
  if (roleKey === "mentor" || roleKey === "adviser" || roleKey === "supervisor") {
    menu.push(
      { name: "المهام", path: "/field-staff/tasks" },
      { name: "السجلات اليومية", path: "/field-staff/daily-reports" },
      { name: "التقييم النهائي", path: "/field-staff/final-evaluation" },
    );
  }

  // الإرشاد النفسي: للأخصائي النفسي فقط
  if (roleKey === "psychologist") {
    menu.push({ name: "الإرشاد والدعم", path: "/field-staff/guidance" });
  }

  // صفحات خاصة بالمشرف الأكاديمي
  if (roleKey === "supervisor") {
    const dashboardIndex = menu.findIndex((item) => item.path === "/field-staff/dashboard");
    if (dashboardIndex >= 0) {
      menu.splice(dashboardIndex, 1);
    }

    const evaluationsIndex = menu.findIndex((item) => item.path === "/field-staff/evaluations");
    if (evaluationsIndex >= 0) {
      menu.splice(evaluationsIndex, 1);
    }

    // إضافة مساحة العمل الموحدة في البداية
    menu.unshift({ name: "🏠 مساحة العمل", path: "/supervisor/workspace" });
    menu.push(
      { name: "الزيارات الميدانية", path: "/supervisor/field-visits" },
      { name: "التحكم بجدول الحصص الأسبوعية", path: "/supervisor/training-program-control" },
      { name: "الشعب", path: "/supervisor/sections" },
      { name: "حلول الطلبة", path: "/supervisor/submissions" },
    );

    const supervisorFieldStaffPaths = {
      "/field-staff/students": "/supervisor/students",
      "/field-staff/notes": "/supervisor/notes",
      "/field-staff/tasks": "/supervisor/tasks",
      "/field-staff/daily-reports": "/supervisor/daily-reports",
      "/field-staff/final-evaluation": "/supervisor/final-evaluation",
    };
    for (let i = 0; i < menu.length; i++) {
      const next = supervisorFieldStaffPaths[menu[i].path];
      if (next) menu[i] = { ...menu[i], path: next };
    }
  }

  // الجدول الأسبوعي: للمعلم فقط
  if (roleKey === "mentor") {
    menu.push(
      { name: "الحضور", path: "/mentor/attendance" },
      { name: "الجدول الأسبوعي", path: "/mentor/schedule" },
    );
  }

  return menu;
}

/** قائمة المشرف الميداني — مسارات /field-supervisor فقط (منفصلة عن المشرف الأكاديمي وعن field-staff الموحّد). */
function buildFieldSupervisorMenu() {
  return [
    { name: "الرئيسية", path: "/field-supervisor" },
    { name: "الحضور والغياب", path: "/field-supervisor/attendance" },
    { name: "السجلات والتقارير اليومية", path: "/field-supervisor/daily-reports" },
    { name: "التقييم الميداني", path: "/field-supervisor/evaluation" },
    { name: "النماذج والتقارير", path: "/field-supervisor/forms" },
    { name: "الملاحظات والرسائل", path: "/field-supervisor/messages" },
    { name: "الإشعارات", path: "/notifications" },
    { name: "الملف الشخصي", path: "/profile" },
  ];
}

function buildFieldSupervisorUnifiedMenu(savedUser) {
  // توحيد كامل للواجهة: جميع أنواع field_supervisor تستخدم نفس قائمة المعلم المرشد.
  // تبقى الفروقات داخل الصفحات (المسميات/النماذج/الطلاب) وليس في بنية الـ sidebar.
  // بدون «المهام» و«الجدول الأسبوعي» — غير مطلوبين لمسار المشرف الميداني الموحّد.
  const base = buildFieldStaffMenu("mentor").filter(
    (item) =>
      item.path !== "/field-staff/final-evaluation" &&
      item.path !== "/field-staff/tasks" &&
      item.path !== "/mentor/schedule"
  );

  // ترتيب عملي حسب رحلة العمل اليومية للمشرف الميداني.
  const preferredOrder = [
    "/field-staff/dashboard",
    "/field-staff/students",
    "/mentor/attendance",
    "/field-staff/daily-reports",
    "/field-staff/evaluations",
    "/field-staff/notes",
  ];

  const rank = new Map(preferredOrder.map((path, index) => [path, index]));

  return [...base].sort((a, b) => {
    const ra = rank.has(a.path) ? rank.get(a.path) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.path) ? rank.get(b.path) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, "ar");
  });
}

const menus = {
  admin: [
    { name: "الرئيسية", path: "/dashboard" },
    
    // إدارة المستخدمين
    { name: "إدارة المستخدمين", path: "/admin/users" },
    { name: "إدارة الأدوار", path: "/admin/roles" },
    
    // إدارة الهيكل الأكاديمي
    { name: "إدارة الأقسام", path: "/admin/departments" },
    { name: "إدارة المساقات", path: "/admin/courses" },
    { name: "إدارة الشعب", path: "/admin/sections" },
    { name: "تسجيل الطلاب في الشعب", path: "/admin/enrollments" },
    
    // إدارة الفترات التدريبية
    { name: "إدارة الفترات التدريبية", path: "/admin/training-periods" },
    { name: "إدارة كوادر المواقع", path: "/admin/training-sites/staff" },
    { name: "إدارة الأرشفة", path: "/admin/archive" },
    
    // إدارة المحتوى والإشعارات
    { name: "إدارة الإعلانات", path: "/admin/announcements" },
    { name: "إدارة قوالب التقييم", path: "/admin/evaluation-templates" },
    
    // إدارة النظام
    { name: "النسخ الاحتياطي", path: "/admin/backups" },
    { name: "سجل النشاطات", path: "/admin/activity-logs" },
    { name: "الميزات الديناميكية", path: "/admin/feature-flags" },
    
    // تقارير
    { name: "التقارير", path: "/reports" },

    // صفحات مشتركة
    { name: "الملف الشخصي", path: "/profile" },
  ],
  

  // الكادر الميداني الموحد — يُبنى ديناميكياً حسب الدور
  mentor: buildFieldStaffMenu("mentor"),
  adviser: buildFieldStaffMenu("adviser"),
  psychologist: buildFieldStaffMenu("psychologist"),
  supervisor: buildFieldStaffMenu("supervisor"),
  school_manager: [
    { name: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629", path: "/principal/dashboard" },
    { name: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a", path: "/principal/profile" },
    { name: "\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u062a\u062f\u0631\u064a\u0628", path: "/principal/training-requests" },
    { name: "\u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u062d\u0636\u0648\u0631", path: "/principal/attendance-approval" },
    { name: "تقييم الطلبة", path: "/principal/student-evaluation" },
  ],
  
  field_supervisor: buildFieldSupervisorMenu(),

  student: [
    { name: "الرئيسية", path: "/student/dashboard" },
    { name: "طلب التدريب", path: "/student/training-request" },
    { name: "جدول الحصص الأسبوعية", path: "/student/schedule" },
    { name: "سجل الحضور والغياب", path: "/student/attendance" },
    { name: "الملف الإنجازي", path: "/student/portfolio" },
    { name: "التكليفات", path: "/student/assignments" },
    { name: "النماذج والتقارير", path: "/student/e-forms" },
    { name: "دليل الموظفين", path: "/student/staff-directory" },
  ],

  head_of_department: [
    { name: "الرئيسية", path: "/head-department/dashboard" },
    { name: "الطلاب", path: "/head-department/students" },
    { name: "حالة التوزيع", path: "/head-department/distribution-status" },
    { name: "التقارير", path: "/head-department/reports" },
    { name: "الحالات المرفوضة", path: "/head-department/rejected-cases" },
    { name: "إدارة المساقات", path: "/head-department/courses" },
    { name: "إدارة الشعب", path: "/head-department/sections" },
    { name: "تسجيل الطلاب", path: "/head-department/enrollments/create" },
    { name: "الأرشفة", path: "/head-department/archive" },
    { name: "الملف الشخصي", path: "/profile" },
  ],

  coordinator: [
    { name: "الرئيسية", path: "/coordinator/dashboard" },
    { name: "طلبات التدريب والتوزيع", path: "/coordinator/training-requests" },
    { name: "دفعات طلبات التدريب", path: "/coordinator/official-letters" },
    { name: "الإعلانات العامة", path: "/coordinator/announcements" },
    { name: "حالة التوزيع", path: "/coordinator/distribution-status" },
    { name: "الطلبة", path: "/coordinator/students" },
    { name: "الإحصائيات", path: "/coordinator/statistics" },
  ],

  principal: [
    { name: "الرئيسية", path: "/principal/dashboard" },
    { name: "الملف الشخصي", path: "/principal/profile" },
    { name: "طلبات التدريب", path: "/principal/training-requests" },
    { name: "اعتماد الحضور", path: "/principal/attendance-approval" },
    { name: "التقييمات", path: "/principal/student-evaluation" },
  ],

  psychology_center_manager: [
    { name: "الرئيسية", path: "/psychology-center/dashboard" },
    { name: "الملف الشخصي", path: "/psychology-center/profile" },
    { name: "طلبات التدريب", path: "/psychology-center/mentor-assignment" },
    { name: "المتدربون في المركز", path: "/psychology-center/trainee-students" },
    { name: "تقييم الطلبة", path: "/principal/student-evaluation" },
  ],

  health_directorate: [
    { name: "الرئيسية", path: "/health/dashboard" },
    { name: "أماكن التدريب", path: "/health/training-sites" },
    { name: "إدارة كوادر المواقع", path: "/health/staff" },
    { name: "طلبات التدريب", path: "/health/official-letters" },
  ],

  education_directorate: [
    { name: "الرئيسية", path: "/education/dashboard" },
    { name: "أماكن التدريب", path: "/education/training-sites" },
    { name: "إدارة كوادر المواقع", path: "/education/staff" },
    { name: "طلبات التدريب", path: "/education/official-letters" },
  ],
};

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [featureFlags, setFeatureFlags] = useState({});
  const savedUser = readStoredUser();
  const rawRole = savedUser?.role?.name || savedUser?.role || ROLES.ADMIN;
  const normalizedRole = normalizeRole(rawRole);
  const role =
    normalizedRole === ROLES.COORDINATOR
      ? "coordinator"
      : normalizedRole === ROLES.PRINCIPAL || normalizedRole === ROLES.SCHOOL_MANAGER
        ? "school_manager"
      : normalizedRole === ROLES.PSYCHOLOGY_CENTER_MANAGER
        ? "psychology_center_manager"
      : getFieldStaffRoleKey(normalizedRole);
  const userName = savedUser?.name || "مستخدم تجريبي";
  const roleName = getRoleLabel(rawRole);

  const menu = useMemo(() => {
    // المعلم المرشد (دور teacher) بنفس هيكل قائمة «معلم مرشد ميداني» (mentor_teacher) — وليس بقائمة المهام/التقييم النهائي القديمة
    if (role === "mentor" || role === "field_supervisor" || role === "psychologist") {
      const unified = buildFieldSupervisorUnifiedMenu(savedUser);
      if (role === "psychologist") {
        const guidance = { name: "الإرشاد والدعم", path: "/field-staff/guidance" };
        if (!unified.some((i) => i.path === guidance.path)) {
          return [...unified, guidance];
        }
      }
      return unified;
    }
    if (role === "supervisor") {
      const base = buildFieldStaffMenu("supervisor");
      if (!isPsychologyAcademicSupervisor(savedUser)) {
        return base;
      }
      const psychItems = [
        { name: "إنشاء طلب تدريب", path: "/supervisor/psychology/create-training-request" },
        { name: "طلبات التدريب والدفعات", path: "/supervisor/psychology/training-requests" },
        { name: "الكتب الرسمية / الدفعات", path: "/supervisor/psychology/official-letters" },
        { name: "حالة التوزيع", path: "/supervisor/psychology/distribution-status" },
      ];
      const workspaceIdx = base.findIndex((i) => i.path === "/supervisor/workspace");
      if (workspaceIdx < 0) {
        return [...psychItems, ...base];
      }
      const next = [...base];
      next.splice(workspaceIdx + 1, 0, ...psychItems);
      return next;
    }
    if (role === "coordinator") {
      return menus.coordinator;
    }
    if (role === "student") {
      const full = menus.student;
      if (isPsychologyStudentUser(savedUser)) {
        return full.filter((i) => i.path !== "/student/training-request" && i.path !== "/student/schedule");
      }
      return full;
    }
    return menus[role] || [];
  }, [role, savedUser]);

  const showMinistryEducationSeal = normalizedRole === ROLES.EDUCATION_DIRECTORATE;
  const showMinistryHealthSeal = normalizedRole === ROLES.HEALTH_DIRECTORATE;

  useEffect(() => {
    let isMounted = true;
    const featureNames = [...new Set(Object.values(menuFeatureMap))];
    Promise.all(
      featureNames.map((name) =>
        checkFeatureFlag(name)
          .then((res) => [name, Boolean(res?.is_open)])
          .catch(() => [name, false])
      )
    )
      .then((entries) => {
        if (!isMounted) return;
        const normalized = entries.reduce((acc, [name, isOpen]) => {
          acc[name] = isOpen;
          return acc;
        }, {});
        setFeatureFlags(normalized);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleMenu = useMemo(
    () =>
      menu.filter((item) => {
        const featureName = menuFeatureMap[item.path];
        if (!featureName) return true;
        return featureFlags[featureName] === true;
      }),
    [menu, featureFlags]
  );

  const getInitials = (name) => {
    if (!name) return "HU";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  };

  const handleLogout = () => {
    clearStoredToken();
    clearStoredUser();
    navigate("/");
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-mobile-header">
        <button className="sidebar-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="sidebar-brand">
        <div className="sidebar-brand-header">
          <img src={huLogo} alt="" className="sidebar-brand-logo" width={44} height={44} decoding="async" />
          <div className="sidebar-brand-text">
            <h2>جامعة الخليل</h2>
            <p>منصة إدارة التدريب الميداني</p>
          </div>
        </div>
      </div>

      {(showMinistryEducationSeal || showMinistryHealthSeal) && (
        <div
          className="sidebar-ministry-strip flex justify-center items-center py-[10px] px-[14px] pb-3 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]"
        >
          {showMinistryEducationSeal ? <MinistryEducationSeal size={46} /> : <MinistryHealthSeal height={42} maxWidth={190} />}
        </div>
      )}

      <div className="sidebar-menu">
        <div className="sidebar-section-title">القائمة الرئيسية</div>

        {visibleMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <SidebarMenuGlyph path={item.path} />
            <span>{item.name}</span>
          </NavLink>
        ))}

      </div>

      <div className="sidebar-footer">
        <NavLink
          to="/profile"
          onClick={handleLinkClick}
          className={({ isActive }) =>
            `sidebar-user-box no-underline cursor-pointer ${isActive ? "active" : ""}`
          }
        >
          <div className="sidebar-user-avatar">{getInitials(userName)}</div>

          <div>
            <strong>{userName}</strong>
            <span>{roleName}</span>
          </div>
        </NavLink>

        <button className="sidebar-logout-btn mt-3" onClick={handleLogout}>
          تسجيل الخروج
        </button>

        <p>البوابة الأكاديمية لإدارة التدريب العملي والتربوي</p>
      </div>
    </aside>
  );
}
