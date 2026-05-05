export const FIELD_SUPERVISOR_TYPES = {
  MENTOR_TEACHER: "mentor_teacher",
  SCHOOL_COUNSELOR: "school_counselor",
  PSYCHOLOGIST: "psychologist",
  LEGACY_CLINICAL_PSYCHOLOGIST: "clinical_psychologist",
};

export function normalizeFieldSupervisorType(type) {
  if (type === FIELD_SUPERVISOR_TYPES.LEGACY_CLINICAL_PSYCHOLOGIST) {
    return FIELD_SUPERVISOR_TYPES.PSYCHOLOGIST;
  }

  if (
    type === FIELD_SUPERVISOR_TYPES.SCHOOL_COUNSELOR ||
    type === FIELD_SUPERVISOR_TYPES.PSYCHOLOGIST
  ) {
    return type;
  }

  return FIELD_SUPERVISOR_TYPES.MENTOR_TEACHER;
}
