// src/services/api.js
import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
});

/** أصل الخادم بدون ‎/api (لروابط التخزين /storage/...) */
export const apiOrigin = String(apiClient.defaults.baseURL || "").replace(/\/api\/?$/, "") || "http://localhost:8000";

// Laravel API Resources often return payload as { data: ... }.
// Normalize responses to keep frontend forms and lists stable.
const unwrapResource = (payload) => payload?.data ?? payload;

// Inject token automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || "");
    const isOptionalNotificationsRequest = requestUrl.includes("/notifications");
    const isOptionalActivityRequest = requestUrl.includes("/activity-logs");
    const shouldPreserveSession =
      isOptionalNotificationsRequest ||
      isOptionalActivityRequest;

    if (error?.response?.status === 401 && !shouldPreserveSession) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// -------------------- AUTH --------------------

// LOGIN
export const login = async (credentials) => {
  const response = await apiClient.post("/login", credentials);
  return response.data;
};

// LOGOUT
export const logout = async () => {
  const response = await apiClient.post("/logout");
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  return response.data;
};

/** Laravel paginator or plain array from API list endpoints */
export const itemsFromPagedResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

/** استجابة { success, data } قد تتضمن JsonResource كـ { data: [...] } */
export const unwrapSupervisorList = (body) => {
  if (!body || typeof body !== "object") return [];
  const d = body.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object" && Array.isArray(d.data)) return d.data;
  return [];
};

export const unwrapSupervisorStats = (body) => {
  if (!body || typeof body !== "object") return null;
  const raw = body.data;
  if (!raw || typeof raw !== "object") return null;
  return {
    sections_count: raw.sections_count ?? 0,
    students_count: raw.students_count ?? 0,
    visits_this_week: raw.visits_this_week ?? 0,
    unreviewed_logs: raw.unreviewed_logs ?? 0,
    absence_alerts: raw.attendance_alerts_count ?? 0,
    incomplete_portfolios: raw.missing_portfolio_items_count ?? 0,
    pending_task_reviews: raw.pending_submissions_count ?? 0,
    unevaluated_students: raw.pending_academic_evaluations_count ?? 0,
    open_tasks_count: raw.open_tasks_count ?? 0,
    supervisor_profile: raw.supervisor_profile,
    department_summary: raw.department_summary,
    recent_activity: raw.recent_activity,
    upcoming_visits: raw.upcoming_visits,
    track_distribution: raw.track_distribution,
    academic_status_distribution: raw.academic_status_distribution,
  };
};

// CURRENT USER
export const getCurrentUser = async (config = {}) => {
  const response = await apiClient.get("/user", config);
  return response.data;
};

// -------------------- TRAINING --------------------

export const getTrainingRequests = async (params = {}) => {
  const response = await apiClient.get("/training-requests", { params });
  return response.data;
};

export const createTrainingRequest = async (data) => {
  const response = await apiClient.post("/training-requests", data);
  return response.data;
};

export const sendToDirectorate = async (id, letterData) => {
  const response = await apiClient.post(`/training-requests/${id}/send-to-directorate`, letterData);
  return response.data;
};

export const directorateApprove = async (id, data) => {
  const response = await apiClient.post(`/training-requests/${id}/directorate-approve`, data);
  return response.data;
};

export const sendToSchool = async (id, letterData) => {
  const response = await apiClient.post(`/training-requests/${id}/send-to-school`, letterData);
  return response.data;
};

export const schoolApprove = async (id, data) => {
  const response = await apiClient.post(`/training-requests/${id}/school-approve`, data);
  return response.data;
};

export const coordinatorReviewTrainingRequest = (id, data) =>
  apiClient.post(`/training-requests/${id}/coordinator-review`, data).then((res) => res.data);

// ==================== Coordinator batching ====================
export const getTrainingRequestBatches = (params = {}) =>
  apiClient.get("/training-request-batches", { params }).then((res) => res.data);

export const getTrainingRequestBatch = (id) =>
  apiClient.get(`/training-request-batches/${id}`).then((res) => res.data?.data ?? res.data);

export const createTrainingRequestBatch = (data) =>
  apiClient.post("/training-request-batches", data).then((res) => res.data);

export const sendTrainingRequestBatch = (id, data) =>
  apiClient.post(`/training-request-batches/${id}/send`, data).then((res) => res.data);


// services/api.js
export const getDashboardStats = () => apiClient.get('/dashboard/stats').then(res => res.data);
// ==================== Users ====================
export const getUsers = (params) => apiClient.get('/users', { params }).then(res => res.data);
export const searchSupervisors = (query) => apiClient.get('/users/search', { params: { query, role: 'academic_supervisor' } }).then(res => res.data);
export const createUser = (data) => apiClient.post('/users', data).then(res => res.data);
export const updateUser = (id, data) => apiClient.put(`/users/${id}`, data).then(res => res.data);
export const deleteUser = (id) => apiClient.delete(`/users/${id}`).then(res => res.data);
export const changeUserStatus = (id, status) => apiClient.patch(`/users/${id}/status`, { status }).then(res => res.data);
export const bulkAddUsers = (users) => apiClient.post('/users/bulk-add', { users }).then(res => res.data);

// ==================== Roles & Permissions ====================
export const getRoles = (params = {}) => apiClient.get('/roles', { params }).then(res => res.data);
export const createRole = (data) => apiClient.post('/roles', data).then(res => res.data);
export const updateRole = (id, data) => apiClient.put(`/roles/${id}`, data).then(res => res.data);
export const deleteRole = (id) => apiClient.delete(`/roles/${id}`).then(res => res.data);
export const getPermissions = () => apiClient.get('/permissions?per_page=100').then(res => res.data);

// ==================== Departments ====================
export const getDepartments = () => apiClient.get('/departments').then(res => res.data);
export const createDepartment = (data) => apiClient.post('/departments', data).then(res => res.data);
export const updateDepartment = (id, data) => apiClient.put(`/departments/${id}`, data).then(res => res.data);
export const deleteDepartment = (id) => apiClient.delete(`/departments/${id}`).then(res => res.data);

// ==================== Courses ====================
export const getCourses = (params) => apiClient.get('/courses', { params }).then(res => res.data);
export const createCourse = (data) => apiClient.post('/courses', data).then(res => res.data);
export const updateCourse = (id, data) => apiClient.put(`/courses/${id}`, data).then(res => res.data);
export const deleteCourse = (id) => apiClient.delete(`/courses/${id}`).then(res => res.data);
export const archiveCourse = (id) => apiClient.post(`/courses/${id}/archive`).then(res => res.data);

// ==================== Sections ====================
export const getSections = (params) => apiClient.get('/sections', { params }).then(res => res.data);
export const createSection = (data) => apiClient.post('/sections', data).then(res => res.data);
export const updateSection = (id, data) => apiClient.put(`/sections/${id}`, data).then(res => res.data);
export const deleteSection = (id) => apiClient.delete(`/sections/${id}`).then(res => res.data);
export const addStudentToSection = (sectionId, data) => apiClient.post(`/sections/${sectionId}/add-student`, data).then(res => res.data);
export const removeStudentFromSection = (sectionId, data) => apiClient.post(`/sections/${sectionId}/remove-student`, data).then(res => res.data);
export const getEnrollments = (params) => apiClient.get('/enrollments', { params }).then(res => res.data);
export const enrollStudent = (data) => apiClient.post('/enrollments', data).then(res => res.data);
export const getStudents = (params = {}) =>
  apiClient.get('/users', { params: { role: 'student', ...params } }).then((res) => res.data);
export const createEnrollment = (data) => apiClient.post('/enrollments', data).then(res => res.data);
export const updateEnrollment = (id, data) => apiClient.put(`/enrollments/${id}`, data).then(res => res.data);
export const deleteEnrollment = (id) => apiClient.delete(`/enrollments/${id}`).then(res => res.data);

// ==================== Training Sites ====================
export const getTrainingSites = (params) => apiClient.get('/training-sites', { params }).then(res => res.data);
export const createTrainingSite = (data) => apiClient.post('/training-sites', data).then(res => res.data);
export const updateTrainingSite = (id, data) => apiClient.put(`/training-sites/${id}`, data).then(res => res.data);
export const deleteTrainingSite = (id) => apiClient.delete(`/training-sites/${id}`).then(res => res.data);

// ==================== Training Periods ====================
export const getTrainingPeriods = (params = {}) =>
  apiClient.get('/training-periods', { params }).then((res) => res.data);
export const createTrainingPeriod = (data) => apiClient.post('/training-periods', data).then(res => res.data);
export const updateTrainingPeriod = (id, data) => apiClient.put(`/training-periods/${id}`, data).then(res => res.data);
export const deleteTrainingPeriod = (id) => apiClient.delete(`/training-periods/${id}`).then(res => res.data);
export const setActivePeriod = (id) => apiClient.patch(`/training-periods/${id}/set-active`).then(res => res.data);

// ==================== Announcements ====================
export const getAnnouncements = (params = {}) =>
  apiClient.get('/announcements', { params }).then((res) => res.data);
export const createAnnouncement = (data) => apiClient.post('/announcements', data).then(res => res.data);
export const updateAnnouncement = (id, data) => apiClient.put(`/announcements/${id}`, data).then(res => res.data);
export const deleteAnnouncement = (id) => apiClient.delete(`/announcements/${id}`).then(res => res.data);

// ==================== Backups ====================
export const getBackups = () => apiClient.get('/backups').then(res => res.data);
export const getBackupDetails = (id) => apiClient.get(`/backups/${id}`).then(res => res.data);
export const getBackup = (id) => getBackupDetails(id);
export const getBackupTableData = (id, tableName) => apiClient.get(`/backups/${id}/table/${tableName}`).then(res => res.data);
export const createBackup = (data) => apiClient.post('/backups', data).then(res => res.data);
export const restoreBackup = (id) => apiClient.post(`/backups/${id}/restore`).then(res => res.data);
export const deleteBackup = (id) => apiClient.delete(`/backups/${id}`).then(res => res.data);
export const downloadBackup = async (id, filename) => {
  try {
    console.log('Starting download for backup:', id, 'filename:', filename);
    
    const response = await apiClient.get(`/backups/${id}/download`, {
      responseType: 'blob',
    });
    
    console.log('Download response received:', response);
    console.log('Response data type:', typeof response.data);
    console.log('Response data size:', response.data?.size || 'unknown');
    
    if (!response.data || response.data.size === 0) {
      throw new Error('الملف فارغ أو لم يتم استلامه بشكل صحيح');
    }
    
    // Create blob from response data
    const blob = new Blob([response.data], { type: 'application/octet-stream' });
    console.log('Blob created:', blob);
    
    const url = window.URL.createObjectURL(blob);
    console.log('Object URL created:', url);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `backup_${id}.sql`);
    link.style.display = 'none';
    document.body.appendChild(link);
    
    console.log('Triggering download...');
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      console.log('Cleanup completed');
    }, 100);
    
  } catch (error) {
    console.error('Download error:', error);
    console.error('Error details:', error.response || error.message);
    throw error;
  }
};

// ==================== Activity Logs ====================
export const getActivityLogs = (params) => apiClient.get('/activity-logs', { params }).then(res => res.data);
export const deleteActivityLog = (id) => apiClient.delete(`/activity-logs/${id}`).then(res => res.data);
export const trackPageVisit = (data) => apiClient.post('/activity-logs/page-visit', data).then(res => res.data);

// ==================== Feature Flags ====================
const featureFlagCache = new Map();
const FEATURE_FLAG_CACHE_TTL_MS = 60_000;

export const getFeatureFlags = () => apiClient.get('/feature-flags').then(res => res.data);
export const updateFeatureFlag = (id, isOpen) => apiClient.patch(`/feature-flags/${id}`, { is_open: isOpen }).then(res => res.data);
export const checkFeatureFlag = (name) => {
  const cached = featureFlagCache.get(name);
  const now = Date.now();
  if (cached && now - cached.time < FEATURE_FLAG_CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = apiClient
    .get(`/feature-flags/check/${encodeURIComponent(name)}`)
    .then((res) => res.data)
    .catch((error) => {
      featureFlagCache.delete(name);
      throw error;
    });

  featureFlagCache.set(name, { time: now, promise });
  return promise;
};

// ==================== Evaluation Templates ====================
export const getEvaluationTemplates = (params = {}) => apiClient.get('/evaluation-templates', { params }).then(res => res.data);
export const getEvaluationTemplate = (id) => apiClient.get(`/evaluation-templates/${id}`).then(res => res.data);
export const createEvaluationTemplate = (data) => apiClient.post('/evaluation-templates', data).then(res => res.data);
export const updateEvaluationTemplate = (id, data) => apiClient.put(`/evaluation-templates/${id}`, data).then(res => res.data);
export const deleteEvaluationTemplate = (id) => apiClient.delete(`/evaluation-templates/${id}`).then(res => res.data);
export const addTemplateItem = (templateId, data) => apiClient.post(`/evaluation-templates/${templateId}/items`, data).then(res => res.data);
export const updateTemplateItem = (itemId, data) => apiClient.put(`/evaluation-items/${itemId}`, data).then(res => res.data);
export const deleteTemplateItem = (itemId) => apiClient.delete(`/evaluation-items/${itemId}`).then(res => res.data);

// ==================== Evaluations ====================
export const getEvaluations = (params = {}) =>
  apiClient.get("/evaluations", { params }).then((res) => res.data);

export const createEvaluation = (data) =>
  apiClient.post("/evaluations", data).then((res) => res.data);

export const getEvaluation = (id) =>
  apiClient.get(`/evaluations/${id}`).then((res) => res.data);

export const updateEvaluation = (id, data) =>
  apiClient.put(`/evaluations/${id}`, data).then((res) => res.data);

export const deleteEvaluation = (id) =>
  apiClient.delete(`/evaluations/${id}`).then((res) => res.data);

// ==================== Student Evaluations (site managers) ====================
export const getStudentEvaluations = (params = {}) =>
  apiClient.get("/student-evaluations", { params }).then((res) => res.data);

export const createStudentEvaluation = (data) =>
  apiClient.post("/student-evaluations", data).then((res) => res.data);

export const getStudentEvaluationsByStudent = (studentId) =>
  apiClient.get(`/student-evaluations/student/${studentId}`).then((res) => res.data);

export const getMySiteStudents = () =>
  apiClient.get("/student-evaluations/my-site-students").then((res) => res.data);

// ==================== Training Assignments ====================
export const getTrainingAssignments = (params = {}) =>
  apiClient.get("/training-assignments", { params }).then((res) => res.data);

// ==================== Tasks (مشرف / معلم) ====================
export const getTasks = (params = {}) =>
  apiClient.get("/tasks", { params }).then((res) => res.data);

export const createTask = (data) =>
  apiClient.post("/tasks", data).then((res) => res.data);

export const updateTask = (id, data) =>
  apiClient.put(`/tasks/${id}`, data).then((res) => res.data);

export const deleteTask = (id) =>
  apiClient.delete(`/tasks/${id}`).then((res) => res.data);

export const getTask = (id) =>
  apiClient.get(`/tasks/${id}`).then((res) => res.data);

// ==================== Task Submissions ====================
export const getTaskSubmissions = (params = {}) =>
  apiClient.get("/task-submissions", { params }).then((res) => res.data);

export const gradeTaskSubmission = (id, data) =>
  apiClient.post(`/task-submissions/${id}/grade`, data).then((res) => res.data);

// ==================== Attendance ====================
export const getAttendances = (params = {}) =>
  apiClient.get("/attendances", { params }).then((res) => res.data);

export const approveAttendance = (id, data) =>
  apiClient.patch(`/attendances/${id}/approve`, data).then((res) => res.data);

// ==================== Training Logs (مراجعة المشرف/المعلم) ====================
export const getTrainingLogs = (params = {}) =>
  apiClient.get("/training-logs", { params }).then((res) => res.data);

export const reviewTrainingLog = (id, data) =>
  apiClient.post(`/training-logs/${id}/review`, data).then((res) => res.data);

// ==================== Notes ====================
export const getNotes = (params = {}) =>
  apiClient.get("/notes", { params }).then((res) => res.data);

export const createNote = (data) =>
  apiClient.post("/notes", data).then((res) => res.data);

export const updateNote = (id, data) =>
  apiClient.put(`/notes/${id}`, data).then((res) => res.data);

export const deleteNote = (id) =>
  apiClient.delete(`/notes/${id}`).then((res) => res.data);

// ==================== Weekly schedules ====================
export const getWeeklySchedules = (params = {}) =>
  apiClient.get("/weekly-schedules", { params }).then((res) => res.data);

// ==================== Activity Logs (للأنشطة الأخيرة) ====================
export const getRecentActivities = async (limit = 5) => {
    const response = await apiClient.get('/activity-logs', { params: { per_page: limit } });
    return response.data;
};

// ==================== Announcements (لآخر إعلان) ====================
export const getLatestAnnouncement = async () => {
    const response = await apiClient.get('/announcements', { params: { per_page: 1 } });
    // التأكد من وجود بيانات وإرجاع أول إعلان
    return response.data?.data?.[0] || null;
};

// ==================== Users ====================


export const getUser = async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return unwrapResource(response.data);
};

// ==================== Roles (كاملة) ====================

export const getRole = async (id) => {
    const response = await apiClient.get(`/roles/${id}`);
    return unwrapResource(response.data);
};

export const getPermission = async (id) => {
    const response = await apiClient.get(`/permissions/${id}`);
    return unwrapResource(response.data);
};

// ==================== Departments (كاملة) ====================

export const getDepartment = async (id) => {
    const response = await apiClient.get(`/departments/${id}`);
    return unwrapResource(response.data);
};

export const getCourse = async (id) => {
    const response = await apiClient.get(`/courses/${id}`);
    return unwrapResource(response.data);
};

export const getSection = async (id) => {
    const response = await apiClient.get(`/sections/${id}`);
    return unwrapResource(response.data);
};

export const getSectionEnrollments = async (sectionId) => {
    const response = await apiClient.get(`/sections/${sectionId}/enrollments`);
    return response.data;
};

export const getArchivePreview = async () => {
    const response = await apiClient.get('/archive/preview');
    return response.data;
};

export const archiveCurrentPeriod = async () => {
    const response = await apiClient.post('/archive/current-period');
    return response.data;
};

export const getArchivedPeriods = async () => {
    const response = await apiClient.get('/archive/periods');
    return response.data;
};

export const getArchivedPeriodDetails = async ({ academic_year, semester, archived_period }) => {
    const response = await apiClient.get('/archive/period-details', {
        params: { academic_year, semester, archived_period },
    });
    return response.data;
};

export const getEnrollment = async (id) => {
    const response = await apiClient.get(`/enrollments/${id}`);
    return unwrapResource(response.data);
};

export const getTrainingSite = async (id) => {
    const response = await apiClient.get(`/training-sites/${id}`);
    return unwrapResource(response.data);
};


export const getTrainingPeriod = async (id) => {
    const response = await apiClient.get(`/training-periods/${id}`);
    return unwrapResource(response.data);
};

export const getAnnouncement = async (id) => {
    const response = await apiClient.get(`/announcements/${id}`);
    return unwrapResource(response.data);
};

// ==================== Student specific ====================
export const getStudentDashboardSummary = async (config = {}) => {
  const response = await apiClient.get('/student/dashboard-summary', config);
  return response.data;
};

export const getStudentTrainingRequests = async (config = {}) => {
  const response = await apiClient.get('/student/training-requests', config);
  return response.data;
};

export const createStudentTrainingRequest = async (data) => {
    const response = await apiClient.post('/student/training-requests', data);
    return response.data;
};

export const updateStudentTrainingRequest = async (id, data) => {
    const response = await apiClient.put(`/student/training-requests/${id}`, data);
    return response.data;
};

export const deleteStudentTrainingRequest = async (id) => {
    const response = await apiClient.delete(`/student/training-requests/${id}`);
    return response.data;
};

export const getStudentSchedule = async () => {
    const response = await apiClient.get('/student/schedule');
    return response.data;
};

export const getStudentTrainingProgram = async (config = {}) => {
    const response = await apiClient.get('/student/training-program', config);
    return response.data;
};

export const saveStudentTrainingProgram = async (data) => {
    const response = await apiClient.post('/student/training-program', data);
    return response.data;
};

export const submitFormToSupervisor = async (data) => {
    const response = await apiClient.post('/student/forms/submit', data);
    return response.data;
};

export const getStudentTrainingProgramById = async (studentId) => {
    const response = await apiClient.get(`/students/${studentId}/training-program`);
    return response.data;
};

// ==================== Coordinator Training Programs ====================
export const getCoordinatorTrainingPrograms = (params) => apiClient.get('/coordinator/training-programs', { params }).then(res => res.data);
export const updateTrainingProgramStatus = (id, data) => apiClient.patch(`/coordinator/training-programs/${id}/status`, data).then(res => res.data);

export const getStudentTrainingLogs = async (config = {}) => {
    const response = await apiClient.get('/student/training-logs', config);
    return response.data;
};

export const createStudentTrainingLog = async (data) => {
    const response = await apiClient.post('/student/training-logs', data);
    return response.data;
};

export const updateStudentTrainingLog = async (id, data) => {
    const response = await apiClient.put(`/student/training-logs/${id}`, data);
    return response.data;
};

export const submitStudentTrainingLog = async (id) => {
    const response = await apiClient.post(`/student/training-logs/${id}/submit`);
    return response.data;
};

export const getStudentPortfolio = async (config = {}) => {
    const response = await apiClient.get('/my-portfolio', config);
    return response.data;
};

export const addPortfolioEntry = async (data) => {
  const response = await apiClient.post("/student/portfolio/entries", data);
  return response.data;
};

export const updatePortfolioEntry = async (id, data) => {
    const response = await apiClient.put(`/student/portfolio/entries/${id}`, data);
    return response.data;
};

export const uploadPortfolioFile = async (entryId, pdfBlob, filename) => {
    const fd = new FormData();
    fd.append('file', pdfBlob, filename);
    fd.append('_method', 'PUT');
    const response = await apiClient.post(`/student/portfolio/entries/${entryId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const deletePortfolioEntry = async (id) => {
    const response = await apiClient.delete(`/student/portfolio/entries/${id}`);
    return response.data;
};

export const getStudentTasks = async (config = {}) => {
    const response = await apiClient.get('/student/tasks', config);
    return response.data;
};

/** data: JSON object أو FormData (لرفع ملف) */
export const submitStudentTask = async (taskId, data) => {
  const response = await apiClient.post(`/student/tasks/${taskId}/submit`, data);
  return response.data;
};

/** data: JSON object أو FormData (لإعادة التسليم) */
export const updateStudentTaskSubmission = async (submissionId, data) => {
  const response = await apiClient.put(`/student/task-submissions/${submissionId}`, data);
  return response.data;
};

export const getStudentNotifications = async (config = {}) => {
  const response = await apiClient.get("/student/notifications", config);
  return response.data;
};

export const markNotificationAsRead = async (id) => {
    const response = await apiClient.patch(`/student/notifications/${id}/read`);
    return response.data;
};

// ==================== Student E-Forms ====================
export const getStudentEForms = async (params = {}) => {
  const response = await apiClient.get("/student/e-forms", { params });
  return response.data;
};

export const saveStudentEForm = async (data) => {
  const response = await apiClient.post("/student/e-forms", data);
  return response.data;
};

export const submitStudentEForm = async (id, data = {}) => {
  const response = await apiClient.post(`/student/e-forms/${id}/submit`, data);
  return response.data;
};

// ==================== School Manager specific ====================
export const getSchoolManagerMentorRequests = async (params = {}) => {
  const response = await apiClient.get('/school-manager/mentor-requests', { params });
  return response.data;
};

export const getSchoolManagerTeachers = async (params = {}) => {
  const response = await apiClient.get('/school-manager/teachers', { params });
  return response.data;
};

export const schoolManagerApproveRequest = async (id, data) => {
  const response = await apiClient.post(`/school-manager/mentor-requests/${id}/approve`, data);
  return response.data;
};

// ==================== Student Attendance ====================
export const getStudentAttendances = async (params = {}) => {
  const response = await apiClient.get("/student/attendance", { params });
  return response.data;
};

export const createAttendance = async (data) => {
  const response = await apiClient.post("/student/attendance", data);
  return response.data;
};

export const updateAttendance = async (id, data) => {
  const response = await apiClient.put(`/student/attendance/${id}`, data);
  return response.data;
};

export const deleteAttendance = async (id) => {
  const response = await apiClient.delete(`/student/attendance/${id}`);
  return response.data;
};

// ==================== System Notifications ====================
export const getNotifications = (params = {}) =>
  apiClient.get("/notifications", { params }).then((res) => res.data);

let unreadCountCache = null;
const UNREAD_COUNT_CACHE_TTL_MS = 5_000;

export const getUnreadNotificationsCount = () => {
  const now = Date.now();
  if (unreadCountCache && now - unreadCountCache.time < UNREAD_COUNT_CACHE_TTL_MS) {
    return unreadCountCache.promise;
  }

  const promise = apiClient
    .get("/notifications/unread-count")
    .then((res) => res.data)
    .catch((error) => {
      unreadCountCache = null;
      throw error;
    });

  unreadCountCache = { time: now, promise };
  return promise;
};

export const markSystemNotificationAsRead = (id) =>
  apiClient.patch(`/notifications/${id}/read`).then((res) => res.data);

export const markAllSystemNotificationsAsRead = () =>
  apiClient.post("/notifications/mark-all-read").then((res) => res.data);

// ==================== Official Letters ====================
export const getOfficialLetters = (params) =>
  apiClient.get("/official-letters", { params }).then((res) => res.data);

export const getOfficialLetter = (id) =>
  apiClient.get(`/official-letters/${id}`).then((res) => res.data);

export const createOfficialLetter = (data) =>
  apiClient.post("/official-letters", data).then((res) => res.data);

export const updateOfficialLetter = (id, data) =>
  apiClient.put(`/official-letters/${id}`, data).then((res) => res.data);

export const deleteOfficialLetter = (id) =>
  apiClient.delete(`/official-letters/${id}`).then((res) => res.data);

// ==================== Head of Department ====================
export const getHeadDepartmentDashboardStats = () => apiClient.get('/head-department/dashboard').then(res => res.data);
export const getHeadDepartmentStudents = (params) => apiClient.get('/head-department/students', { params }).then(res => res.data);
export const getHeadDepartmentStudentDetails = (studentId) => apiClient.get(`/head-department/students/${studentId}`).then(res => res.data);
export const getDistributionStatus = (params) => apiClient.get('/head-department/distribution-status', { params }).then(res => res.data);
export const getHeadDepartmentReports = (params) => apiClient.get('/head-department/reports', { params }).then(res => res.data);
export const modifyStudentAssignment = (studentId, data) => apiClient.post(`/head-department/students/${studentId}/modify-assignment`, data).then(res => res.data);
export const getRejectedCases = (params) => apiClient.get('/head-department/rejected-cases', { params }).then(res => res.data);
export const bulkEnrollStudents = (data) => apiClient.post('/head-department/bulk-enroll', data).then(res => res.data);
export const searchStudentsHeadDepartment = (query) => apiClient.get('/head-department/search-students', { params: { q: query } }).then(res => res.data);

export const approveOfficialLetter = (id, data = {}) =>
  apiClient.post(`/official-letters/${id}/approve`, data).then((res) => res.data);

export const receiveOfficialLetter = (id, data = {}) =>
  apiClient.post(`/official-letters/${id}/receive`, data).then((res) => res.data);

export const sendOfficialLetter = (id, data = {}) =>
  apiClient.post(`/official-letters/${id}/send`, data).then((res) => res.data);

// ==================== User Profile ====================
export const updateUserProfile = (data) => apiClient.put('/profile', data).then(res => res.data);
export const changePassword = (data) => apiClient.post('/change-password', data).then(res => res.data);
export const getStaffDirectory = () => apiClient.get('/staff-directory').then(res => res.data);
