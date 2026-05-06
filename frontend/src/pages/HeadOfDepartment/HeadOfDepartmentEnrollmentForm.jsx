import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getEnrollment, createEnrollment, updateEnrollment, getSections, getStudents, bulkEnrollStudents, searchStudentsHeadDepartment } from "../../services/api";
import { Upload, FileSpreadsheet, Search, X } from "lucide-react";
import useAppToast from "../../hooks/useAppToast";

export default function HeadOfDepartmentEnrollmentForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSectionId = searchParams.get('section_id') || "";
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    user_id: "",
    section_id: "",
    academic_year: new Date().getFullYear(),
    semester: "first",
    status: "active",
  });
  const [bulkForm, setBulkForm] = useState({
    section_id: "",
    academic_year: new Date().getFullYear(),
    semester: "first",
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [errors, setErrors] = useState({});
  const [bulkError, setBulkError] = useState(null);
  const [bulkSuccess, setBulkSuccess] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  
  // Student search state
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentDisplay, setSelectedStudentDisplay] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sectionsData = await getSections();
        const sectionsList = sectionsData.data?.data || sectionsData.data || [];
        setSections(sectionsList);

        const studentsData = await getStudents();
        setStudents(studentsData.data?.data || studentsData.data || []);

        // If section_id is provided in URL, auto-fill section and its academic_year/semester
        if (!id && preselectedSectionId) {
          const preselected = sectionsList.find(s => String(s.id) === String(preselectedSectionId));
          if (preselected) {
            setForm(prev => ({
              ...prev,
              section_id: preselected.id,
              academic_year: preselected.academic_year || new Date().getFullYear(),
              semester: preselected.semester || "first",
            }));
            setBulkForm(prev => ({
              ...prev,
              section_id: preselected.id,
              academic_year: preselected.academic_year || new Date().getFullYear(),
              semester: preselected.semester || "first",
            }));
          }
        }

        if (id) {
          const enrollmentData = await getEnrollment(id);
          setForm({
            user_id: enrollmentData.user_id,
            section_id: enrollmentData.section_id,
            academic_year: enrollmentData.academic_year,
            semester: enrollmentData.semester,
            status: enrollmentData.status,
          });
          // Set the student display text for editing
          const allStudents = studentsData.data?.data || studentsData.data || [];
          const student = allStudents.find(s => s.id === enrollmentData.user_id);
          if (student) {
            setSelectedStudentDisplay(`${student.name} (${student.university_id})`);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const updatedForm = { ...form, [e.target.name]: e.target.value };
    // When section changes, auto-update academic_year and semester from section data
    if (e.target.name === 'section_id' && e.target.value) {
      const selected = sections.find(s => String(s.id) === String(e.target.value));
      if (selected) {
        updatedForm.academic_year = selected.academic_year || new Date().getFullYear();
        updatedForm.semester = selected.semester || "first";
      }
    }
    setForm(updatedForm);
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const handleStudentSearch = async (e) => {
    const value = e.target.value;
    setStudentSearch(value);
    setSelectedStudentDisplay("");
    setForm({ ...form, user_id: "" });
    setShowStudentDropdown(true);
    
    if (value.trim().length >= 2) {
      setSearching(true);
      try {
        const response = await searchStudentsHeadDepartment(value);
        setSearchResults(response.data || []);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const selectStudent = (student) => {
    setForm({ ...form, user_id: student.id });
    setSelectedStudentDisplay(`${student.name} (${student.university_id})`);
    setStudentSearch("");
    setShowStudentDropdown(false);
    if (errors.user_id) setErrors({ ...errors, user_id: null });
  };

  const clearStudentSelection = () => {
    setForm({ ...form, user_id: "" });
    setStudentSearch("");
    setSelectedStudentDisplay("");
    setShowStudentDropdown(false);
  };

  // Use search results instead of filtering all students
  const filteredStudents = searchResults;

  const handleBulkChange = (e) => {
    const updatedBulkForm = { ...bulkForm, [e.target.name]: e.target.value };
    // When section changes, auto-update academic_year and semester from section data
    if (e.target.name === 'section_id' && e.target.value) {
      const selected = sections.find(s => String(s.id) === String(e.target.value));
      if (selected) {
        updatedBulkForm.academic_year = selected.academic_year || new Date().getFullYear();
        updatedBulkForm.semester = selected.semester || "first";
      }
    }
    setBulkForm(updatedBulkForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (id) {
        await updateEnrollment(id, form);
      } else {
        await createEnrollment(form);
      }
      toast.success(id ? "تم تحديث التسجيل بنجاح" : "تم تسجيل الطالب بنجاح");
      if (id) {
        navigate("/head-department/reports");
      } else {
        // Reset form for adding another student
        setForm({
          user_id: "",
          section_id: form.section_id,
          academic_year: form.academic_year,
          semester: form.semester,
          status: "active",
        });
        setSelectedStudentDisplay("");
        setStudentSearch("");
      }
    } catch (err) {
      toast.apiError(err, "حدث خطأ أثناء حفظ التسجيل");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      const rows = data.split('\n').map(row => row.trim()).filter(row => row);
      
      // Assuming first column contains university IDs
      const studentIds = rows.slice(1).map(row => {
        const columns = row.split(',');
        return columns[0].trim();
      }).filter(id => id);

      // Find students by university ID
      const foundStudents = students.filter(student => 
        studentIds.includes(student.university_id?.toString())
      ).map(student => student.id);

      setSelectedStudents(foundStudents);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);

    try {
      if (selectedStudents.length === 0) {
        setBulkError("يرجى اختيار طلاب لل تسجيل");
        setBulkLoading(false);
        return;
      }

      const result = await bulkEnrollStudents({
        section_id: bulkForm.section_id,
        students: selectedStudents,
        academic_year: bulkForm.academic_year,
        semester: bulkForm.semester,
      });

      setBulkSuccess(`تم تسجيل ${result.success_count} طالب بنجاح. فشل ${result.failed_count}.`);
      setSelectedStudents([]);
    } catch (err) {
      setBulkError(err.response?.data?.message || "فشل في التسجيل الجماعي");
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  return (
    <div className="enrollment-form">
      <div className="page-header">
        <h1>{id ? "تعديل تسجيل" : "تسجيل الطلاب"}</h1>
        <button onClick={() => navigate("/head-department/reports")} className="btn-secondary">رجوع</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button 
          type="button" 
          onClick={() => setShowBulk(!showBulk)}
          className={showBulk ? "btn-primary" : "btn-secondary"}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <FileSpreadsheet size={16} />
          {showBulk ? "تسجيل فردي" : "تسجيل جماعي (Excel)"}
        </button>
      </div>

      {!showBulk ? (
        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="hod-enroll-student-search">الطالب *</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input
                  id="hod-enroll-student-search"
                  name="student_search"
                  type="text"
                  autoComplete="off"
                  placeholder={selectedStudentDisplay ? "" : "ابحث بالاسم أو الرقم الجامعي..."}
                  value={selectedStudentDisplay || studentSearch}
                  onChange={handleStudentSearch}
                  onFocus={() => {
                    if (selectedStudentDisplay) {
                      setStudentSearch(selectedStudentDisplay);
                      setSelectedStudentDisplay("");
                    }
                    setShowStudentDropdown(true);
                  }}
                  style={{ paddingLeft: 35, paddingRight: form.user_id ? 35 : 10 }}
                  required={!form.user_id}
                />
                {form.user_id && (
                  <button
                    type="button"
                    onClick={clearStudentSelection}
                    style={{ 
                      position: 'absolute', 
                      right: 10, 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <X size={16} style={{ color: '#666' }} />
                  </button>
                )}
              </div>
              
              {/* Dropdown results */}
              {showStudentDropdown && studentSearch && filteredStudents.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 100,
                  marginTop: 4
                }}>
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => selectStudent(student)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: 14
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: 500 }}>{student.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>الرقم الجامعي: {student.university_id}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Show loading indicator */}
              {searching && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: 12,
                  zIndex: 100,
                  marginTop: 4,
                  fontSize: 14,
                  color: '#666',
                  textAlign: 'center'
                }}>
                  جاري البحث...
                </div>
              )}

              {/* Show message if no results */}
              {!searching && showStudentDropdown && studentSearch && studentSearch.length >= 2 && filteredStudents.length === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: 12,
                  zIndex: 100,
                  marginTop: 4,
                  fontSize: 14,
                  color: '#666'
                }}>
                  لا يوجد طلاب مطابقين للبحث
                </div>
              )}
              
              {/* Hidden input for form submission */}
              <input type="hidden" id="hod-enroll-user-id" name="user_id" value={form.user_id} />
              {errors.user_id && <span className="error">{errors.user_id[0]}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="hod-enroll-section">الشعبة *</label>
              <select id="hod-enroll-section" name="section_id" value={form.section_id} onChange={handleChange} required>
                <option value="">اختر الشعبة</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name} - {section.course?.name} ({section.academic_year})
                  </option>
                ))}
              </select>
              {errors.section_id && <span className="error">{errors.section_id[0]}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="hod-enroll-academic-year">السنة الأكاديمية *</label>
              <input id="hod-enroll-academic-year" type="number" name="academic_year" value={form.academic_year} onChange={handleChange} required />
              {errors.academic_year && <span className="error">{errors.academic_year[0]}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="hod-enroll-semester">الفصل الدراسي *</label>
              <select id="hod-enroll-semester" name="semester" value={form.semester} onChange={handleChange}>
                <option value="first">الفصل الأول</option>
                <option value="second">الفصل الثاني</option>
                <option value="summer">الفصل الصيفي</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hod-enroll-status">الحالة</label>
            <select id="hod-enroll-status" name="status" value={form.status} onChange={handleChange}>
              <option value="active">نشط</option>
              <option value="dropped">منسحب</option>
              <option value="completed">مكتمل</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "جاري الحفظ..." : (id ? "تحديث" : "تسجيل")}
            </button>
            <button type="button" onClick={() => navigate("/head-department/reports")} className="btn-secondary">إلغاء</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="form">
          <div className="section-card" style={{ marginBottom: 16 }}>
            <h3>رفع ملف Excel</h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
              يجب أن يحتوي الملف على عمود يحتوي على الرقم الجامعي للطلاب
            </p>
            <div className="form-group">
              <label htmlFor="hod-enroll-bulk-file">اختر ملف CSV/Excel</label>
              <input
                id="hod-enroll-bulk-file"
                name="bulk_upload_file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              />
            </div>
            {selectedStudents.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: '#e7f3ff', borderRadius: 4 }}>
                <strong>تم اختيار {selectedStudents.length} طالب</strong>
              </div>
            )}
          </div>

          <div className="section-card" style={{ marginBottom: 16 }}>
            <h3>اختيار الطلاب يدوياً</h3>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
              {students.map(student => (
                <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 4, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id={`hod-enroll-bulk-student-${student.id}`}
                    name={`bulk_student_${student.id}`}
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span>{student.name} ({student.university_id})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="hod-enroll-bulk-section">الشعبة *</label>
              <select id="hod-enroll-bulk-section" name="section_id" value={bulkForm.section_id} onChange={handleBulkChange} required>
                <option value="">اختر الشعبة</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name} - {section.course?.name} ({section.academic_year})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="hod-enroll-bulk-academic-year">السنة الأكاديمية *</label>
              <input id="hod-enroll-bulk-academic-year" type="number" name="academic_year" value={bulkForm.academic_year} onChange={handleBulkChange} required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hod-enroll-bulk-semester">الفصل الدراسي *</label>
            <select id="hod-enroll-bulk-semester" name="semester" value={bulkForm.semester} onChange={handleBulkChange}>
              <option value="first">الفصل الأول</option>
              <option value="second">الفصل الثاني</option>
              <option value="summer">الفصل الصيفي</option>
            </select>
          </div>

          {bulkSuccess && (
            <div style={{ marginBottom: 12, padding: 12, backgroundColor: '#d4edda', color: '#155724', borderRadius: 4 }}>
              {bulkSuccess}
            </div>
          )}

          {bulkError && (
            <div style={{ marginBottom: 12, padding: 12, backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 4 }}>
              {bulkError}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={bulkLoading || selectedStudents.length === 0}>
              {bulkLoading ? "جاري التسجيل..." : `تسجيل ${selectedStudents.length} طالب`}
            </button>
            <button type="button" onClick={() => navigate("/head-department/reports")} className="btn-secondary">إلغاء</button>
          </div>
        </form>
      )}
    </div>
  );
}
