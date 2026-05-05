import { useEffect, useState, useCallback } from "react";
import { getHeadDepartmentStudents, getHeadDepartmentStudentDetails, getCourses, getSections } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function HeadOfDepartmentStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    course_id: '',
    section_id: '',
    status: ''
  });
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);

  // Fetch courses on mount (backend filters by department for head_of_department)
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await getCourses({ per_page: 100 });
        setCourses(res.data || []);
      } catch (err) {
        console.error("Courses fetch error:", err);
      }
    };
    fetchCourses();
  }, []);

  // Fetch sections when course_id filter changes
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const params = { per_page: 100 };
        if (filters.course_id) params.course_id = filters.course_id;
        const res = await getSections(params);
        setSections(res.data || []);
      } catch (err) {
        console.error("Sections fetch error:", err);
      }
    };
    fetchSections();
  }, [filters.course_id]);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.course_id) params.course_id = filters.course_id;
      if (filters.section_id) params.section_id = filters.section_id;
      if (filters.status) params.status = filters.status;
      
      const response = await getHeadDepartmentStudents(params);
      setStudents(response.data?.data || response.data || []);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      setError(apiMsg || "فشل في جلب بيانات الطلاب");
      console.error("Students fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = async (studentId) => {
    try {
      const response = await getHeadDepartmentStudentDetails(studentId);
      setSelectedStudent(response.data?.data || response.data);
      setShowDetails(true);
    } catch (err) {
      setError("فشل في جلب تفاصيل الطالب");
      console.error("Student details error:", err);
    }
  };

  const getStudentStatus = (student) => {
    const enrollments = student.section_students || student.sectionStudents || [];
    if (enrollments.length === 0) {
      return { text: "غير مسجل", color: "#dc3545" };
    }
    
    const latestAssignment = enrollments[enrollments.length - 1];
    switch (latestAssignment.status) {
      case 'accepted':
        return { text: "مقبول", color: "#28a745" };
      case 'rejected':
        return { text: "مرفوض", color: "#dc3545" };
      case 'pending':
        return { text: "معلق", color: "#ffc107" };
      default:
        return { text: "غير محدد", color: "#6c757d" };
    }
  };

  const getTrainingPlaceName = (student) => {
    const site = student.training_site || student.trainingSite;
    return site ? site.name : "غير محدد";
  };

  const getSectionInfo = (student) => {
    const enrollments = student.section_students || student.sectionStudents || [];
    if (enrollments.length === 0) {
      return "غير مسجل";
    }
    
    const latestAssignment = enrollments[enrollments.length - 1];
    const section = latestAssignment.section || {};
    const course = section.course || {};
    return `${course.name || 'غير محدد'} - ${section.name || 'غير محدد'}`;
  };

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل بيانات الطلاب..." />
    );
  }

  if (error) {
    return (
      <div className="students-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={fetchStudents} className="btn-primary">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="head-department-students">
      <div className="page-header">
        <h1>قائمة الطلاب</h1>
        <p>عرض وإدارة بيانات طلاب القسم</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="hod-students-filter-course">المساق:</label>
            <select
              id="hod-students-filter-course"
              name="course_id"
              value={filters.course_id}
              onChange={(e) => setFilters({...filters, course_id: e.target.value, section_id: ''})}
            >
              <option value="">جميع المساقات</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="hod-students-filter-section">الشعبة:</label>
            <select
              id="hod-students-filter-section"
              name="section_id"
              value={filters.section_id}
              onChange={(e) => setFilters({...filters, section_id: e.target.value})}
            >
              <option value="">جميع الشعب</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}{section.course ? ` - ${section.course.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="hod-students-filter-status">الحالة:</label>
            <select
              id="hod-students-filter-status"
              name="status"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">جميع الحالات</option>
              <option value="accepted">مقبول</option>
              <option value="rejected">مرفوض</option>
              <option value="pending">معلق</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="students-table-container">
        <table className="students-table">
          <thead>
            <tr>
              <th>اسم الطالب</th>
              <th>الرقم الجامعي</th>
              <th>التخصص</th>
              <th>المساق والشعبة</th>
              <th>مكان التدريب</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const status = getStudentStatus(student);
              return (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.university_id}</td>
                  <td>{student.major || "غير محدد"}</td>
                  <td>{getSectionInfo(student)}</td>
                  <td>{getTrainingPlaceName(student)}</td>
                  <td>
                    <span 
                      className="status-badge" 
                      style={{ backgroundColor: status.color }}
                    >
                      {status.text}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-details"
                      onClick={() => handleStudentClick(student.id)}
                    >
                      تفاصيل
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {students.length === 0 && (
          <div className="no-data">
            <p>لا توجد بيانات طلاب متاحة</p>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showDetails && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>تفاصيل الطالب</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="student-details-grid">
                <div className="detail-item">
                  <span className="detail-label">الاسم:</span>
                  <span>{selectedStudent.name}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">الرقم الجامعي:</span>
                  <span>{selectedStudent.university_id}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">التخصص:</span>
                  <span>{selectedStudent.major || "غير محدد"}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">البريد الإلكتروني:</span>
                  <span>{selectedStudent.email}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">مكان التدريب:</span>
                  <span>{getTrainingPlaceName(selectedStudent)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">الحالة:</span>
                  <span className="status-badge" style={{ backgroundColor: getStudentStatus(selectedStudent).color }}>
                    {getStudentStatus(selectedStudent).text}
                  </span>
                </div>
              </div>
              
              {(selectedStudent.section_students || selectedStudent.sectionStudents)?.length > 0 && (
                <div className="section-assignments">
                  <h3>الشعب المسجل فيها:</h3>
                  {(selectedStudent.section_students || selectedStudent.sectionStudents).map((assignment, index) => (
                    <div key={index} className="assignment-item">
                      <div className="assignment-info">
                        <strong>{assignment.section?.course?.name}</strong> - {assignment.section?.name}
                      </div>
                      <div className="assignment-status">
                        الحالة: {assignment.status}
                        {assignment.notes && <span> | ملاحظات: {assignment.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .head-department-students {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: var(--primary);
          margin-bottom: 5px;
        }

        .page-header p {
          color: var(--text-muted);
          margin: 0;
        }

        .filters-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .filter-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .filter-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 14px;
        }

        .students-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .students-table {
          width: 100%;
          border-collapse: collapse;
        }

        .students-table th,
        .students-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }

        .students-table th {
          background: var(--primary-light);
          font-weight: 600;
        }

        .status-badge {
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .btn-details {
          background: var(--primary);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-details:hover {
          background: var(--primary-dark);
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-muted);
        }

        .modal-body {
          padding: 20px;
        }

        .student-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-item label,
        .detail-item .detail-label {
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 5px;
        }

        .detail-item span {
          color: var(--text-primary);
        }

        .section-assignments h3 {
          margin-bottom: 15px;
          color: var(--primary);
        }

        .assignment-item {
          background: var(--background);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
        }

        .assignment-info {
          font-weight: 500;
          margin-bottom: 5px;
        }

        .assignment-status {
          font-size: 14px;
          color: var(--text-muted);
        }

        .students-loading,
        .students-error {
          text-align: center;
          padding: 40px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
