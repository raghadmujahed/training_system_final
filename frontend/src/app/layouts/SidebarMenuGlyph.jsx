/**
 * أيقونات مسار القائمة الجانبية — SVG بسيط بلا تبعيات.
 * المفتاح: المسار الكامل كما في NavLink.
 */

const ROUTE_ICON = {
  "/dashboard": "home",
  "/admin/users": "users",
  "/admin/roles": "roles",
  "/admin/departments": "building",
  "/admin/courses": "book",
  "/admin/sections": "layers",
  "/admin/enrollments": "userPlus",
  "/admin/training-sites": "mapPin",
  "/admin/training-periods": "calendar",
  "/admin/announcements": "megaphone",
  "/admin/evaluation-templates": "clipboard",
  "/admin/backups": "database",
  "/admin/activity-logs": "activity",
  "/admin/feature-flags": "flag",
  "/reports": "chart",
  "/profile": "user",
  "/change-password": "lock",

  "/supervisor/dashboard": "home",
  "/supervisor/workspace": "home",
  "/supervisor/students": "graduation",
  "/supervisor/notes": "fileText",
  "/supervisor/daily-reports": "journal",
  "/supervisor/final-evaluation": "star",
  "/supervisor/tasks": "task",
  "/supervisor/submissions": "inbox",
  "/supervisor/training-logs": "journal",
  "/supervisor/attendance-follow-up": "clock",
  "/supervisor/field-visits": "map",
  "/supervisor/training-program-control": "flag",
  "/supervisor/sections": "layers",
  "/supervisor/evaluations": "star",
  "/supervisor/reports": "chart",
  "/supervisor/psychology/create-training-request": "fileText",
  "/supervisor/psychology/training-requests": "share",
  "/supervisor/psychology/official-letters": "document",
  "/supervisor/psychology/distribution-status": "mapPin",

  // Unified field-staff paths
  "/field-staff/dashboard": "home",
  "/field-staff/students": "graduation",
  "/field-staff/evaluations": "star",
  "/field-staff/notes": "fileText",
  "/field-staff/daily-reports": "journal",
  "/field-staff/guidance": "clipboard",
  "/field-staff/tasks": "task",
  "/field-staff/final-evaluation": "star",

  "/field-supervisor": "home",
  "/field-supervisor/students": "graduation",
  "/field-supervisor/attendance": "clipboardCheck",
  "/field-supervisor/daily-reports": "journal",
  "/field-supervisor/evaluation": "star",
  "/field-supervisor/forms": "clipboard",
  "/field-supervisor/messages": "fileText",

  // Legacy mentor paths (still used for attendance/schedule)
  "/mentor/attendance": "clipboardCheck",
  "/mentor/schedule": "calendar",

  "/notifications": "bell",

  "/student/dashboard": "home",
  "/student/training-request": "fileText",
  "/student/schedule": "calendar",
  "/student/attendance": "clipboardCheck",
  "/student/portfolio": "folder",
  "/student/assignments": "assignment",
  "/student/notifications-updates": "bell",

  "/coordinator/dashboard": "home",
  "/coordinator/students": "users",
  "/coordinator/training-requests": "share",
  "/coordinator/official-letters": "document",
  "/coordinator/announcements": "megaphone",
  "/coordinator/distribution-status": "mapPin",
  "/coordinator/statistics": "chart",

  "/principal/dashboard": "home",
  "/principal/profile": "user",
  "/principal/training-requests": "fileText",
  "/principal/mentor-assignment": "fileText",
  "/principal/trainee-students": "graduation",

  "/psychology-center/dashboard": "home",
  "/psychology-center/profile": "user",
  "/psychology-center/mentor-assignment": "fileText",
  "/psychology-center/trainee-students": "graduation",

  "/health/dashboard": "home",
  "/health/training-requests": "fileText",
  "/health/training-sites": "mapPin",
  "/health/official-letters": "document",

  "/education/dashboard": "home",
  "/education/training-requests": "fileText",
  "/education/training-sites": "school",
  "/education/official-letters": "document",
};

const svgProps = {
  viewBox: "0 0 24 24",
  width: "22",
  height: "22",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
};

function Path({ d }) {
  return (
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Icon({ children }) {
  return (
    <svg {...svgProps} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function renderType(type) {
  switch (type) {
    case "home":
      return (
        <Icon>
          <Path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5Z" />
          <Path d="M9 21.75V12h6v9.75" />
        </Icon>
      );
    case "users":
      return (
        <Icon>
          <Path d="M16.5 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          <Path d="M4.5 19.5v-1.125A4.125 4.125 0 0 1 8.625 14.25h2.25" />
          <Path d="M19.5 19.5v-1.125a4.125 4.125 0 0 0-3-3.984" />
        </Icon>
      );
    case "user":
      return (
        <Icon>
          <Path d="M12 12.75a3.75 3.75 0 1 0-3.75-3.75A3.75 3.75 0 0 0 12 12.75Z" />
          <Path d="M4.5 20.25v-.75a6 6 0 0 1 6-6h3a6 6 0 0 1 6 6v.75" />
        </Icon>
      );
    case "roles":
      return (
        <Icon>
          <Path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
          <Path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" />
        </Icon>
      );
    case "lock":
      return (
        <Icon>
          <Path d="M7 11V8.25A5 5 0 0 1 17 8.25V11" />
          <Path d="M6.75 11h10.5A1.25 1.25 0 0 1 18.5 12.25v7.5A1.25 1.25 0 0 1 17.25 21H6.75a1.25 1.25 0 0 1-1.25-1.25v-7.5A1.25 1.25 0 0 1 6.75 11Z" />
        </Icon>
      );
    case "building":
      return (
        <Icon>
          <Path d="M4.5 21V6.75L12 3l7.5 3.75V21" />
          <Path d="M9 21v-4.5h6V21" />
          <Path d="M9 10.5h.01M15 10.5h.01M9 14.25h.01M15 14.25h.01" />
        </Icon>
      );
    case "book":
      return (
        <Icon>
          <Path d="M5 4.5h6a3 3 0 0 1 3 3V21a2.25 2.25 0 0 0-2.25-2.25H5V4.5Z" />
          <Path d="M19 4.5h-6a3 3 0 0 0-3 3V21a2.25 2.25 0 0 1 2.25-2.25H19V4.5Z" />
        </Icon>
      );
    case "layers":
      return (
        <Icon>
          <Path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
          <Path d="m3 12 9 4.5L21 12" />
          <Path d="m3 16.5 9 4.5 9-4.5" />
        </Icon>
      );
    case "userPlus":
      return (
        <Icon>
          <Path d="M15 10.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          <Path d="M3 20.25v-.75a5.25 5.25 0 0 1 5.25-5.25h1.5" />
          <Path d="M18.75 8.25v4.5M21 10.5h-4.5" />
        </Icon>
      );
    case "mapPin":
      return (
        <Icon>
          <Path d="M12 21s7.5-5.63 7.5-11.25a7.5 7.5 0 1 0-15 0C4.5 15.37 12 21 12 21Z" />
          <Path d="M12 12.75a2.25 2.25 0 1 0-2.25-2.25A2.25 2.25 0 0 0 12 12.75Z" />
        </Icon>
      );
    case "calendar":
      return (
        <Icon>
          <Path d="M4.5 9.75h15v10.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V9.75Z" />
          <Path d="M8.25 5.25V3M15.75 5.25V3M4.5 8.25h15" />
        </Icon>
      );
    case "megaphone":
      return (
        <Icon>
          <Path d="M4.5 9.75v4.5l4.5 2.25V7.5L4.5 9.75Z" />
          <Path d="M9 7.5v9l3.75 2.25a3 3 0 0 0 3-3v-7.5a3 3 0 0 0-3-3L9 7.5Z" />
          <Path d="M18 9v6" />
        </Icon>
      );
    case "clipboard":
      return (
        <Icon>
          <Path d="M9 4.5h6l1.5 1.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19.5V7.5A1.5 1.5 0 0 1 6 6h1.5L9 4.5Z" />
          <Path d="M9 12h6M9 15.75h4.5" />
        </Icon>
      );
    case "clipboardCheck":
      return (
        <Icon>
          <Path d="M9 4.5h6l1.5 1.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19.5V7.5A1.5 1.5 0 0 1 6 6h1.5L9 4.5Z" />
          <Path d="m9.75 15 1.5 1.5 3-3.75" />
        </Icon>
      );
    case "database":
      return (
        <Icon>
          <Path d="M12 3c4.5 0 8.25 1.5 8.25 3.75S16.5 10.5 12 10.5 3.75 9 3.75 6.75 7.5 3 12 3Z" />
          <Path d="M3.75 6.75v10.5c0 2.25 3.75 3.75 8.25 3.75s8.25-1.5 8.25-3.75V6.75" />
          <Path d="M3.75 12c0 2.25 3.75 3.75 8.25 3.75s8.25-1.5 8.25-3.75" />
        </Icon>
      );
    case "activity":
      return (
        <Icon>
          <Path d="M4.5 15.75 8.25 12l3 3 4.5-6 3.75 3.75" />
          <Path d="M19.5 9.75v9M4.5 5.25v14.25" />
        </Icon>
      );
    case "flag":
      return (
        <Icon>
          <Path d="M5.25 21V3" />
          <Path d="M5.25 5.25h9l-2.25 3 2.25 3h-9" />
        </Icon>
      );
    case "chart":
      return (
        <Icon>
          <Path d="M4.5 19.5V5.25M9 19.5v-6M13.5 19.5v-9M18 19.5v-3.75" />
        </Icon>
      );
    case "task":
      return (
        <Icon>
          <Path d="M8.25 6.75h7.5M8.25 12h7.5M8.25 17.25h4.5" />
          <Path d="M18.75 6.75 21 9l-6 6-3-3-2.25 2.25" />
        </Icon>
      );
    case "inbox":
      return (
        <Icon>
          <Path d="M4.5 6.75h15v10.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V6.75Z" />
          <Path d="M8.25 14.25h7.5l1.5 1.5h-10.5l1.5-1.5Z" />
        </Icon>
      );
    case "journal":
      return (
        <Icon>
          <Path d="M7.5 3.75h9A1.5 1.5 0 0 1 18 5.25v15a1.5 1.5 0 0 1-1.5 1.5h-9l-3-3.75v-15a1.5 1.5 0 0 1 1.5-1.5Z" />
          <Path d="M7.5 8.25h6M7.5 12h6" />
        </Icon>
      );
    case "clock":
      return (
        <Icon>
          <Path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
          <Path d="M12 7.5V12l3 1.5" />
        </Icon>
      );
    case "map":
      return (
        <Icon>
          <Path d="M4.5 7.5 9 5.25l6 2.25 4.5-2.25v12l-4.5 2.25-6-2.25-4.5 2.25V7.5Z" />
          <Path d="M9 5.25v12M15 7.5v12" />
        </Icon>
      );
    case "star":
      return (
        <Icon>
          <Path d="M12 3.75 14.09 9l5.41.39-4.13 3.57 1.25 5.28L12 15.9 7.38 18.24l1.25-5.28L4.5 9.39 9.91 9 12 3.75Z" />
        </Icon>
      );
    case "fileText":
      return (
        <Icon>
          <Path d="M14.25 3H6.75A1.5 1.5 0 0 0 5.25 4.5v15A1.5 1.5 0 0 0 6.75 21h10.5a1.5 1.5 0 0 0 1.5-1.5V7.5L14.25 3Z" />
          <Path d="M14.25 3v4.5h4.5M9 12h6M9 15.75h6" />
        </Icon>
      );
    case "folder":
      return (
        <Icon>
          <Path d="M4.5 7.5h6l1.5 1.5h7.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V7.5Z" />
        </Icon>
      );
    case "assignment":
      return (
        <Icon>
          <Path d="M8.25 4.5h7.5A1.5 1.5 0 0 1 17.25 6v12a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 8.25 4.5Z" />
          <Path d="M9.75 9.75h4.5M9.75 13.5h4.5M9.75 17.25h3" />
        </Icon>
      );
    case "bell":
      return (
        <Icon>
          <Path d="M12 21a2.25 2.25 0 0 0 2.25-2.25h-4.5A2.25 2.25 0 0 0 12 21Z" />
          <Path d="M18 15.75v-3.75a6 6 0 1 0-12 0v3.75l-1.5 1.5h15l-1.5-1.5Z" />
        </Icon>
      );
    case "share":
      return (
        <Icon>
          <Path d="M16.5 7.5a2.25 2.25 0 1 0-2.25-2.25A2.25 2.25 0 0 0 16.5 7.5Z" />
          <Path d="M7.5 13.5a2.25 2.25 0 1 0-2.25-2.25A2.25 2.25 0 0 0 7.5 13.5Z" />
          <Path d="M14.25 8.25 9.75 11.25" />
          <Path d="M9.75 12.75 14.25 15.75" />
          <Path d="M16.5 16.5a2.25 2.25 0 1 0-2.25-2.25 2.25 2.25 0 0 0 2.25 2.25Z" />
        </Icon>
      );
    case "mentor":
      return (
        <Icon>
          <Path d="M12 12.75a3.75 3.75 0 1 0-3.75-3.75A3.75 3.75 0 0 0 12 12.75Z" />
          <Path d="M19.5 20.25v-.75a4.5 4.5 0 0 0-4.5-4.5h-1.5" />
          <Path d="M6 8.25h3M7.5 6.75v3" />
        </Icon>
      );
    case "graduation":
      return (
        <Icon>
          <Path d="M3.75 9 12 5.25 20.25 9 12 12.75 3.75 9Z" />
          <Path d="M5.25 10.5V16.5L12 19.5l6.75-3V10.5" />
        </Icon>
      );
    case "document":
      return (
        <Icon>
          <Path d="M14.25 3H6.75A1.5 1.5 0 0 0 5.25 4.5v15A1.5 1.5 0 0 0 6.75 21h10.5a1.5 1.5 0 0 0 1.5-1.5V7.5L14.25 3Z" />
          <Path d="M14.25 3v4.5h4.5" />
        </Icon>
      );
    case "school":
      return (
        <Icon>
          <Path d="M4.5 10.5 12 6l7.5 4.5V19.5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19.5V10.5Z" />
          <Path d="M9 21v-4.5h6V21" />
        </Icon>
      );
    default:
      return (
        <Icon>
          <Path d="M5.25 5.25h6l1.5 6-2.25 8.25-2.25-3-2.25 3L5.25 11.25l1.5-6Z" />
          <Path d="M12.75 5.25H18l1.5 6-1.13 4.13" />
        </Icon>
      );
  }
}

export default function SidebarMenuGlyph({ path }) {
  const type = ROUTE_ICON[path] || "default";
  return (
    <span className="menu-icon" aria-hidden="true">
      {renderType(type)}
    </span>
  );
}
