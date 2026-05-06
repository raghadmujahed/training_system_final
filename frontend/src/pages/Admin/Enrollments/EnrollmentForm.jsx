import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEnrollment, createEnrollment, updateEnrollment, getSections, getUsers } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";

export default function EnrollmentForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({
    user_id: "",
    section_id: "",
    academic_year: new Date().getFullYear(),
    semester: "first",
    status: "active",
    final_grade: "",
  });
  const [errors, setErrors] = useState({});
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentDisplay, setSelectedStudentDisplay] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sectionsData = await getSections();
        setSections(sectionsData.data || []);

        if (id) {
          const enrollmentData = await getEnrollment(id);
          setForm({
            user_id: enrollmentData.user_id,
            section_id: enrollmentData.section_id,
            academic_year: enrollmentData.academic_year,
            semester: enrollmentData.semester,
            status: enrollmentData.status,
            final_grade: enrollmentData.final_grade || "",
          });
          // عرض اسم الطالب عند التعديل
          if (enrollmentData.user_id) {
            try {
              const usersRes = await getUsers({ role: 'student', search: String(enrollmentData.user_id), per_page: 1 });
              const found = (usersRes.data || []).find(u => u.id === enrollmentData.user_id);
              if (found) setSelectedStudentDisplay(`${found.name} (${found.university_id})`);
            } catch {
              /* optional: student label if API fails */
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [id]);

  // البحث عن طالب بالاسم أو الرقم الجامعي
  const handleStudentSearch = (value) => {
    setStudentSearch(value);
    setSelectedStudentDisplay("");
    setForm(prev => ({ ...prev, user_id: "" }));
    setShowDropdown(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getUsers({ role: 'student', search: value.trim(), per_page: 20 });
        setSearchResults(res.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const selectStudent = (student) => {
    setForm(prev => ({ ...prev, user_id: student.id }));
    setSelectedStudentDisplay(`${student.name} (${student.university_id})`);
    setStudentSearch("");
    setShowDropdown(false);
    if (errors.user_id) setErrors({ ...errors, user_id: null });
  };

  const clearStudentSelection = () => {
    setForm(prev => ({ ...prev, user_id: "" }));
    setStudentSearch("");
    setSelectedStudentDisplay("");
    setShowDropdown(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
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
      navigate("/admin/enrollments");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.apiError(err, "حدث خطأ أثناء حفظ التسجيل");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enrollment-form">
      <div className="page-header">
        <h1>{id ? "تعديل تسجيل" : "تسجيل طالب في شعبة"}</h1>
        <button onClick={() => navigate("/admin/enrollments")} className="btn-secondary">رجوع</button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <div className="form-group" style={{ position: 'relative' }}>
            <label>الطالب *</label>
            <input
              type="text"
              placeholder={selectedStudentDisplay ? "" : "ابحث بالاسم أو الرقم الجامعي..."}
              value={selectedStudentDisplay || studentSearch}
              onChange={(e) => handleStudentSearch(e.target.value)}
              onFocus={() => {
                if (selectedStudentDisplay) {
                  setStudentSearch(selectedStudentDisplay);
                  setSelectedStudentDisplay("");
                }
                setShowDropdown(true);
              }}
              style={{ width: "100%", paddingRight: form.user_id ? 35 : 10 }}
              required={!form.user_id}
            />
            {form.user_id && (
              <button type="button" onClick={clearStudentSelection} style={{ position: 'absolute', left: 10, top: '32px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
            )}
            {searching && <p style={{ color: '#666', fontSize: '0.85rem' }}>جاري البحث...</p>}
            {showDropdown && studentSearch && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: 4, maxHeight: 200, overflowY: 'auto', zIndex: 100, marginTop: 4 }}>
                {searchResults.map(student => (
                  <div key={student.id} onClick={() => selectStudent(student)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }} onMouseEnter={e => e.target.style.backgroundColor = '#f5f5f5'} onMouseLeave={e => e.target.style.backgroundColor = 'white'}>
                    <div style={{ fontWeight: 500 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>الرقم الجامعي: {student.university_id}</div>
                  </div>
                ))}
              </div>
            )}
            {!searching && showDropdown && studentSearch && searchResults.length === 0 && (
              <p style={{ color: '#999', fontSize: '0.85rem' }}>لا توجد نتائج</p>
            )}
            <input type="hidden" name="user_id" value={form.user_id} />
            {errors.user_id && <span className="error">{errors.user_id[0]}</span>}
          </div>

          <div className="form-group">
            <label>الشعبة *</label>
            <select name="section_id" value={form.section_id} onChange={handleChange} required>
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
            <label>السنة الأكاديمية *</label>
            <input type="number" name="academic_year" value={form.academic_year} onChange={handleChange} required />
            {errors.academic_year && <span className="error">{errors.academic_year[0]}</span>}
          </div>

          <div className="form-group">
            <label>الفصل الدراسي *</label>
            <select name="semester" value={form.semester} onChange={handleChange}>
              <option value="first">الفصل الأول</option>
              <option value="second">الفصل الثاني</option>
              <option value="summer">الفصل الصيفي</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>الحالة</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">نشط</option>
              <option value="dropped">منسحب</option>
              <option value="completed">مكتمل</option>
            </select>
          </div>

          <div className="form-group">
            <label>الدرجة النهائية</label>
            <input type="number" step="0.01" name="final_grade" value={form.final_grade} onChange={handleChange} placeholder="0-100" />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "جاري الحفظ..." : (id ? "تحديث" : "تسجيل")}
          </button>
          <button type="button" onClick={() => navigate("/admin/enrollments")} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  );
}