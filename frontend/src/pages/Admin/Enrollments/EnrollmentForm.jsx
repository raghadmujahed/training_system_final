import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEnrollment, createEnrollment, updateEnrollment, getSections, getUsers } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";

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

  const validateForm = () => {
    const newErrors = {};
    
    if (!validateForm()) {
      return;
    }
    
    
    if (!form.user_id) {
      newErrors.user_id = "الطالب مطلوب";
    }
    
    if (!form.section_id) {
      newErrors.section_id = "الشعبة مطلوبة";
    }
    
    const academicYear = Number(form.academic_year);
    if (!form.academic_year || academicYear < 2000 || academicYear > 2100) {
      newErrors.academic_year = "العام الدراسي يجب أن يكون سنة صحيحة بين 2000 و 2100";
    }
    
    if (!form.semester) {
      newErrors.semester = "الفصل الدراسي مطلوب";
    }
    
    if (form.final_grade !== "" && (form.final_grade < 0 || form.final_grade > 100)) {
      newErrors.final_grade = "الدرجة النهائية يجب أن تكون بين 0 و 100";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      <PageHeader title={id ? "تعديل تسجيل" : "تسجيل طالب في شعبة"} />

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block mb-1 text-text-soft text-[0.9rem]">الطالب *</label>
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
              className="w-full"
              style={{ paddingRight: form.user_id ? 35 : 10 }}
              required={!form.user_id}
            />
            {form.user_id && (
              <button type="button" onClick={clearStudentSelection} className="absolute left-2.5 top-[34px] bg-transparent border-none cursor-pointer p-0">✕</button>
            )}
            {searching && <p className="text-text-soft text-[0.85rem]">جاري البحث...</p>}
            {showDropdown && studentSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded z-[100] mt-1 max-h-[200px] overflow-y-auto">
                {searchResults.map(student => (
                  <div key={student.id} onClick={() => selectStudent(student)} className="px-3 py-2 cursor-pointer border-b border-[#f0f0f0] hover:bg-[#f5f5f5]">
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-text-soft">الرقم الجامعي: {student.university_id}</div>
                  </div>
                ))}
              </div>
            )}
            {!searching && showDropdown && studentSearch && searchResults.length === 0 && (
              <p className="text-text-faint text-[0.85rem]">لا توجد نتائج</p>
            )}
            <input type="hidden" name="user_id" value={form.user_id} />
            {errors.user_id && <span className="text-danger text-[0.8rem]">{errors.user_id[0]}</span>}
          </div>

          <div>
            <label className="block mb-1 text-text-soft text-[0.9rem]">الشعبة *</label>
            <select name="section_id" value={form.section_id} onChange={handleChange} required>
              <option value="">اختر الشعبة</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name} - {section.course?.name} ({section.academic_year})
                </option>
              ))}
            </select>
            {errors.section_id && <span className="text-danger text-[0.8rem]">{errors.section_id[0]}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-text-soft text-[0.9rem]">السنة الأكاديمية *</label>
            <input type="number" name="academic_year" value={form.academic_year} onChange={handleChange} required />
            {errors.academic_year && <span className="text-danger text-[0.8rem]">{errors.academic_year[0]}</span>}
          </div>

          <div>
            <label className="block mb-1 text-text-soft text-[0.9rem]">الفصل الدراسي *</label>
            <select name="semester" value={form.semester} onChange={handleChange}>
              <option value="first">الفصل الأول</option>
              <option value="second">الفصل الثاني</option>
              <option value="summer">الفصل الصيفي</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-text-soft text-[0.9rem]">الحالة</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">نشط</option>
              <option value="dropped">منسحب</option>
              <option value="completed">مكتمل</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-text-soft text-[0.9rem]">الدرجة النهائية</label>
            <input type="number" step="0.01" name="final_grade" value={form.final_grade} onChange={handleChange} placeholder="0-100" />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "جاري الحفظ..." : (id ? "تحديث" : "تسجيل")}
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate("/admin/enrollments")}>إلغاء</Button>
        </div>
      </form>
    </div>
  );
}