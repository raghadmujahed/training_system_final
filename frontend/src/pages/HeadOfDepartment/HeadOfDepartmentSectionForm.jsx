import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSection, createSection, updateSection, searchSupervisors } from "../../services/api";
import { useCourses } from "../../hooks/useSharedData";

export default function HeadOfDepartmentSectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { data: courses } = useCourses();
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [selectedSupervisorDisplay, setSelectedSupervisorDisplay] = useState("");
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    academic_year: new Date().getFullYear(),
    academic_supervisor_id: "",
    semester: "first",
    course_id: "",
    capacity: 30,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const sectionData = await getSection(id);
          setForm({
            name: sectionData.name,
            academic_year: sectionData.academic_year,
            academic_supervisor_id: sectionData.academic_supervisor_id || "",
            semester: sectionData.semester,
            course_id: sectionData.course_id,
            capacity: sectionData.capacity || 30,
          });
          // Set display name if supervisor exists
          if (sectionData.academic_supervisor_id && sectionData.supervisor) {
            setSelectedSupervisorDisplay(sectionData.supervisor.name);
            setSupervisorSearch(sectionData.supervisor.name);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [id]);

  // Search supervisors when typing
  useEffect(() => {
    const search = async () => {
      if (supervisorSearch.length < 1) {
        setSupervisors([]);
        return;
      }
      if (supervisorSearch === selectedSupervisorDisplay) {
        return;
      }

      try {
        setSupervisorLoading(true);
        const response = await searchSupervisors(supervisorSearch);
        setSupervisors(response.data || []);
        setShowSupervisorDropdown(true);
      } catch (error) {
        console.error("Error searching supervisors:", error);
        console.error("Error response:", error.response);
      } finally {
        setSupervisorLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [supervisorSearch, selectedSupervisorDisplay]);

  const handleSupervisorSelect = (supervisor) => {
    setForm({ ...form, academic_supervisor_id: supervisor.id });
    setSelectedSupervisorDisplay(supervisor.name);
    setSupervisorSearch(supervisor.name);
    setShowSupervisorDropdown(false);
    if (errors.academic_supervisor_id) {
      setErrors({ ...errors, academic_supervisor_id: null });
    }
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
      // Convert empty strings to null
      const submitData = {
        ...form,
        academic_supervisor_id: form.academic_supervisor_id || null,
      };
      
      if (id) {
        await updateSection(id, submitData);
      } else {
        await createSection(submitData);
      }
      navigate("/head-department/reports");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || "حدث خطأ أثناء حفظ الشعبة");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-form">
      <div className="page-header">
        <h1>{id ? "تعديل شعبة" : "إضافة شعبة جديدة"}</h1>
        <button onClick={() => navigate("/head-department/reports")} className="btn-secondary">رجوع</button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hod-sf-name">اسم الشعبة *</label>
            <input id="hod-sf-name" type="text" name="name" value={form.name} onChange={handleChange} required />
            {errors.name && <span className="error">{errors.name[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hod-sf-capacity">السعة *</label>
            <input id="hod-sf-capacity" type="number" name="capacity" value={form.capacity} onChange={handleChange} min="1" required />
            {errors.capacity && <span className="error">{errors.capacity[0]}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hod-sf-academic-year">السنة الأكاديمية *</label>
            <input id="hod-sf-academic-year" type="number" name="academic_year" value={form.academic_year} onChange={handleChange} required />
            {errors.academic_year && <span className="error">{errors.academic_year[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hod-sf-semester">الفصل الدراسي *</label>
            <select id="hod-sf-semester" name="semester" value={form.semester} onChange={handleChange}>
              <option value="first">الفصل الأول</option>
              <option value="second">الفصل الثاني</option>
              <option value="summer">الفصل الصيفي</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hod-sf-course-id">المساق *</label>
            <select id="hod-sf-course-id" name="course_id" value={form.course_id} onChange={handleChange} required>
              <option value="">اختر المساق</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name} ({course.code})</option>
              ))}
            </select>
            {errors.course_id && <span className="error">{errors.course_id[0]}</span>}
          </div>

          <div className="form-group relative">
            <label htmlFor="hod-sf-supervisor-search">المشرف الأكاديمي</label>
            <input
              id="hod-sf-supervisor-search"
              type="text"
              name="supervisor_search"
              autoComplete="off"
              placeholder="ابحث عن المشرف الأكاديمي..."
              value={supervisorSearch}
              onChange={(e) => {
                setSupervisorSearch(e.target.value);
                if (!e.target.value) {
                  setForm({ ...form, academic_supervisor_id: "" });
                  setSelectedSupervisorDisplay("");
                }
              }}
              onFocus={() => {
                if (supervisors.length > 0) setShowSupervisorDropdown(true);
              }}
              className="w-full"
            />
            <input
              type="hidden"
              id="hod-sf-academic-supervisor-id"
              name="academic_supervisor_id"
              value={form.academic_supervisor_id}
            />
            
            {supervisorLoading && (
              <div className="text-[12px] text-[#666] mt-1">
                جاري البحث...
              </div>
            )}
            
            {showSupervisorDropdown && supervisors.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded max-h-[200px] overflow-y-auto z-[1000] shadow-[0_4px_8px_rgba(0,0,0,0.1)]"
              >
                {supervisors.map((supervisor) => (
                  <div
                    key={supervisor.id}
                    onClick={() => handleSupervisorSelect(supervisor)}
                    className="py-[10px] px-3 cursor-pointer border-b border-[#f0f0f0] text-[14px]"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                    }}
                  >
                    <div className="font-medium">{supervisor.name}</div>
                    {supervisor.email && (
                      <div className="text-[12px] text-[#666]">
                        {supervisor.email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {showSupervisorDropdown && supervisorSearch.length >= 1 && supervisors.length === 0 && !supervisorLoading && (
              <div
                className="absolute top-full left-0 right-0 bg-white border border-[#ddd] rounded py-[10px] px-3 text-[14px] text-[#666] z-[1000]"
              >
                لم يتم العثور على مشرفين
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "جاري الحفظ..." : (id ? "تحديث" : "إضافة")}
          </button>
          <button type="button" onClick={() => navigate("/head-department/reports")} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
