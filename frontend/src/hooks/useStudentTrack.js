import { useMemo } from "react";
import { getStudentTrack } from "../utils/studentSection";
import { readStoredUser } from "../utils/session";

export const TRACK_CONFIG = {
  education: {
    track: "education",
    isPsychology: false,
    isEducation: true,

    // Labels
    dashboardTitle: "لوحة تحكم طالب أصول التربية - تابع تقدمك في التدريب الميداني",
    specializationLabel: "أصول التربية",
    collegeLabel: "كلية التربية",
    mentorLabel: "المعلم المرشد",
    siteLabel: "المدرسة المعتمدة",
    directorateLabel: "مديرية التربية",
    governingBodyLabel: "مديرية التربية والتعليم",
    governingBodyValue: "directorate_of_education",
    siteTypeValue: "school",
    siteSearchLabel: "المدرسة",
    scheduleTitle: "جدول الحصص الأسبوعية",
    trainingRequestNote: null,

    // Forms
    showTeachingSessions: true,
    showClassesCount: true,

    // Staff directory roles
    roleLabels: {
      school_principal: "مدير المدرسة",
      mentor: "المعلم المرشد",
      academic_supervisor: "المشرف الأكاديمي",
      coordinator: "المنسق",
    },
  },
  psychology: {
    track: "psychology",
    isPsychology: true,
    isEducation: false,

    // Labels
    dashboardTitle: "لوحة تحكم طالب علم النفس - تابع تقدمك في التدريب الميداني",
    specializationLabel: "علم النفس",
    collegeLabel: "كلية الآداب",
    mentorLabel: "الأخصائي المرشد",
    siteLabel: "الجهة المعتمدة",
    directorateLabel: "الجهة/المديرية",
    governingBodyLabel: "وزارة الصحة",
    governingBodyValue: "ministry_of_health",
    siteTypeValue: "health_center",
    siteSearchLabel: "جهة التدريب",
    scheduleTitle: "البرنامج الأسبوعي",
    trainingRequestNote:
      "لا يتم إنشاء طلب التدريب من حساب الطالب. يقوم المشرف الأكاديمي للقسم بإنشاء الطلب ومتابعة الجهات الرسمية حتى صدور الموافقة النهائية من جهة التدريب.",

    // Forms
    showTeachingSessions: false,
    showClassesCount: false,

    // Staff directory roles
    roleLabels: {
      psychology_center_manager: "مدير المركز",
      mentor: "الأخصائي المرشد",
      academic_supervisor: "المشرف الأكاديمي",
      coordinator: "المنسق",
    },
  },
};

const DEFAULT_CONFIG = TRACK_CONFIG.education;

export function useStudentTrack() {
  const user = useMemo(() => readStoredUser(), []);
  const track = useMemo(() => getStudentTrack(user) || "education", [user]);
  const config = TRACK_CONFIG[track] || DEFAULT_CONFIG;

  return {
    track,
    isPsychology: track === "psychology",
    isEducation: track === "education",
    config,
  };
}
