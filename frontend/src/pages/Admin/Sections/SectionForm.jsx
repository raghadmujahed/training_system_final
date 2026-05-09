import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSection, createSection, updateSection, getUsers } from "../../../services/api";
import { useCourses, useRoles } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";

export default function SectionForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { data: courses } = useCourses();
  const { data: allRoles } = useRoles();
  const supervisorRoleId = allRoles.find((r) => r.name === "academic_supervisor")?.id;
  const [supervisors, setSupervisors] = useState([]);
  const [form, setForm] = useState({
    name: "",
    academic_year: new Date().getFullYear(),
    academic_supervisor_id: "",
    semester: "first",
    course_id: "",
  });
  const [errors, setErrors] = useState({});

  // جلب بيانات الشعبة عند التعديل
  useEffect(() => {
    if (!id) return;
    getSection(id).then(sectionData => {
      setForm({
        name: sectionData.name,
        academic_year: sectionData.academic_year,
        academic_supervisor_id: sectionData.academic_supervisor_id || "",
        semester: sectionData.semester,
        course_id: sectionData.course_id,
      });
    }).catch(() => {});
  }, [id]);

  // فلترة المشرفين حسب قسم المساق المختار
  useEffect(() => {
    if (!form.course_id || !supervisorRoleId) {
      setSupervisors([]);
      return;
    }
    const selectedCourse = courses.find(c => String(c.id) === String(form.course_id));
    const deptId = selectedCourse?.department_id;
    if (!deptId) {
      setSupervisors([]);
      return;
    }
    getUsers({ role_id: supervisorRoleId, department_id: deptId, per_page: 200 })
      .then(usersData => setSupervisors(usersData.data || []))
      .catch(() => setSupervisors([]));
  }, [form.course_id, courses, supervisorRoleId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      // عند تغيير المساق، إعادة تعيين المشرف لأن المشرفين يتغيرون حسب القسم
      ...(name === 'course_id' ? { academic_supervisor_id: '' } : {}),
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name || !form.name.trim()) {
      newErrors.name = "اسم الشعبة مطلوب";
    }
    
    if (!form.course_id) {
      newErrors.course_id = "المساق مطلوب";
    }
    
    const academicYear = Number(form.academic_year);
    if (!form.academic_year || academicYear < 2000 || academicYear > 2100) {
      newErrors.academic_year = "العام الدراسي يجب أن يكون سنة صحيحة بين 2000 و 2100";
    }
    
    if (!form.semester) {
      newErrors.semester = "الفصل الدراسي مطلوب";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setErrors({});
    try {onBlu={handlChange} className={errors.name ? 'border-red-500' : ''} re
            {errors.name && <div className="text-red-500 text-sm mt-1">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</div>}
      if (id) {
        await updateSection(id, form);
      } else {
        await createSection(form);
      }
      navigate("/admin/sections");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.apiError(err, "حدث خطأ أثناء حفظ الشعبة");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-form">
      <div className="page-header">
        <h1>{id ? "تعديل شعبة" : "إضافة شعبة جديدة"}</h1>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">رجوع</button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <div className="form-group">
            <label>اسم الشعبة *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleChange} className={errors.name ? 'border-red-500' : ''} required />
            {errors.name && <div className="text-red-500 text-sm mt-1">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</div>}
          </div>

          <div className="form-group">
            <label>السنة الأكاديمية *</label>
            <input type="number" name="academic_year" value={form.academic_year} onChange={handleChange} onBlur={handleChange} className={errors.academic_year ? 'border-red-500' : ''} required />
            {errors.academic_year && <div className="text-red-500 text-sm mt-1">{Array.isArray(errors.academic_year) ? errors.academic_year[0] : errors.academic_year}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>المساق *</label>
            <select name="course_id" value={form.course_id} onChange={handleChange} onBlur={handleChange} className={errors.course_id ? 'border-red-500' : ''} required>
              <option value="">اختر المساق</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name} ({course.code})</option>
              ))}
            </select>
            {errors.course_id && <div className="text-red-500 text-sm mt-1">{Array.isArray(errors.course_id) ? errors.course_id[0] : errors.course_id}</div>}
          </div>

          <div className="form-group">
            <label>الفصل الدراسي *</label>
            <select name="semester" value={form.semester} onChange={handleChange} onBlur={handleChange} className={errors.semester ? 'border-red-500' : ''} required>
              <option value="first">الفصل الأول</option>
              <option value="second">الفصل الثاني</option>
              <option value="summer">الفصل الصيفي</option>
            </select>
            {errors.semester && <div className="text-red-500 text-sm mt-1">{Array.isArray(errors.semester) ? errors.semester[0] : errors.semester}</div>}
          </div>
        </div>

        <div className="form-group">
          <label>المشرف الأكاديمي</label>
          {!form.course_id ? (
            <p className="text-text-soft text-[0.9rem] my-1">اختر المساق أولاً لعرض المشرفين التابعين لقسمه</p>
          ) : supervisors.length === 0 ? (
            <p className="text-text-soft text-[0.9rem] my-1">لا يوجد مشرفين أكاديميين في هذا القسم</p>
          ) : (
            <select name="academic_supervisor_id" value={form.academic_supervisor_id} onChange={handleChange}>
              <option value="">اختر المشرف</option>
              {supervisors.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "جاري الحفظ..." : (id ? "تحديث" : "إضافة")}
          </button>
          <button type="button" onClick={() => navigate("/admin/sections")} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  );
}