import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getEnrollment, createEnrollment, updateEnrollment, getSections, bulkEnrollStudents, searchStudentsHeadDepartment } from "../../services/api";
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
  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSearchResults, setBulkSearchResults] = useState([]);
  const [bulkSearching, setBulkSearching] = useState(false);
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
          // Search for student display name using department-scoped endpoint
          if (enrollmentData.user?.name) {
            setSelectedStudentDisplay(`${enrollmentData.user.name} (${enrollmentData.user.university_id || ''})`);
          } else if (enrollmentData.user_id) {
            try {
              const res = await searchStudentsHeadDepartment(String(enrollmentData.user_id));
              const found = (res.data || [])[0];
              if (found) setSelectedStudentDisplay(`${found.name} (${found.university_id})`);
            } catch {}
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

  const handleBulkSearch = async (e) => {
    const value = e.target.value;
    setBulkSearch(value);
    if (value.trim().length >= 2) {
      setBulkSearching(true);
      try {
        const res = await searchStudentsHeadDepartment(value);
        setBulkSearchResults(res.data || []);
      } catch {
        setBulkSearchResults([]);
      } finally {
        setBulkSearching(false);
      }
    } else {
      setBulkSearchResults([]);
    }
  };

  const addBulkStudent = (student) => {
    if (!bulkStudents.find(s => s.id === student.id)) {
      setBulkStudents(prev => [...prev, student]);
      setSelectedStudents(prev => [...prev, student.id]);
    }
    setBulkSearch("");
    setBulkSearchResults([]);
  };

  const removeBulkStudent = (studentId) => {
    setBulkStudents(prev => prev.filter(s => s.id !== studentId));
    setSelectedStudents(prev => prev.filter(id => id !== studentId));
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
      // Resolve each university_id via search and add to bulk list
      Promise.all(studentIds.map(uid => searchStudentsHeadDepartment(uid)))
        .then(results => {
          const found = results.flatMap(r => r.data || []).filter(Boolean);
          const unique = found.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
          setBulkStudents(unique);
          setSelectedStudents(unique.map(s => s.id));
        })
        .catch(() => {});
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
      setBulkStudents([]);
    } catch (err) {
      setBulkError(err.response?.data?.message || "فشل في التسجيل الجماعي");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="enrollment-form">
      <div className="page-header">
        <h1>{id ? "تعديل تسجيل" : "تسجيل الطلاب"}</h1>
        <button onClick={() => navigate("/head-department/reports")} className="btn-secondary">رجوع</button>
      </div>

      <div className="mb-4">
        <button 
          type="button" 
          onClick={() => setShowBulk(!showBulk)}
          className={`${showBulk ? "btn-primary" : "btn-secondary"} flex items-center gap-2`}
        >
          <FileSpreadsheet size={16} />
          {showBulk ? "تسجيل فردي" : "تسجيل جماعي (Excel)"}
        </button>
      </div>

      {!showBulk ? (
        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="form-group relative">
              <label htmlFor="hod-enroll-student-search">الطالب *</label>
              <div className="relative">
                <Search size={16} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#666]" />
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
                  className="pl-[35px]"
                  style={{ paddingRight: form.user_id ? 35 : 10 }}
                  required={!form.user_id}
                />
                {form.user_id && (
                  <button
                    type="button"
                    onClick={clearStudentSelection}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 border-none cursor-pointer p-0 bg-transparent"
                  >
                    <X size={16} className="text-[#666]" />
                  </button>
                )}
              </div>
              
              {/* Dropdown results */}
              {showStudentDropdown && studentSearch && filteredStudents.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded max-h-[200px] overflow-y-auto z-[100] mt-1">
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => selectStudent(student)}
                      className="py-2 px-3 cursor-pointer border-b border-[#f0f0f0] text-sm"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-[#666]">الرقم الجامعي: {student.university_id}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Show loading indicator */}
              {searching && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded p-3 z-[100] mt-1 text-sm text-[#666] text-center">
                  جاري البحث...
                </div>
              )}

              {/* Show message if no results */}
              {!searching && showStudentDropdown && studentSearch && studentSearch.length >= 2 && filteredStudents.length === 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded p-3 z-[100] mt-1 text-sm text-[#666]">
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
          <div className="section-card mb-4">
            <h3>رفع ملف Excel</h3>
            <p className="text-sm text-[#666] mb-3">
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
                className="flex items-center gap-2"
              />
            </div>
            {selectedStudents.length > 0 && (
              <div className="mt-3 p-3 bg-[#e7f3ff] rounded">
                <strong>تم اختيار {selectedStudents.length} طالب</strong>
              </div>
            )}
          </div>

          <div className="section-card mb-4">
            <h3>إضافة طلاب يدوياً (بحث)</h3>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="ابحث عن طالب بالاسم أو الرقم الجامعي..."
                value={bulkSearch}
                onChange={handleBulkSearch}
                className="w-full p-2 border border-[#ddd] rounded"
              />
              {bulkSearching && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded p-2 z-[100]">
                  جاري البحث...
                </div>
              )}
              {bulkSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded max-h-[160px] overflow-y-auto z-[100]">
                  {bulkSearchResults.map(s => (
                    <div
                      key={s.id}
                      onClick={() => addBulkStudent(s)}
                      className="p-2 cursor-pointer hover:bg-[#f5f5f5]"
                    >
                      {s.name} ({s.university_id})
                    </div>
                  ))}
                </div>
              )}
            </div>
            {bulkStudents.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto border border-[#ddd] rounded p-2">
                {bulkStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-1">
                    <span>{student.name} ({student.university_id})</span>
                    <button
                      type="button"
                      onClick={() => removeBulkStudent(student.id)}
                      className="text-[#dc3545] text-xs"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            <div className="mb-3 p-3 bg-[#d4edda] text-[#155724] rounded">
              {bulkSuccess}
            </div>
          )}

          {bulkError && (
            <div className="mb-3 p-3 bg-[#f8d7da] text-[#721c24] rounded">
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
