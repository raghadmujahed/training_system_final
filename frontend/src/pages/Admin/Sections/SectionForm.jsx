import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSection, createSection, updateSection, getUsers, getActiveTrainingPeriod } from "../../../services/api";
import { useCourses, useRoles } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";
import { apiCache } from "../../../services/apiCache";

export default function SectionForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { data: courses } = useCourses();
  const { data: allRoles } = useRoles();
  const supervisorRoleId = allRoles.find((r) => r.name === "academic_supervisor")?.id;
  const [supervisors, setSupervisors] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [form, setForm] = useState({
    name: "",
    academic_year: new Date().getFullYear(),
    academic_supervisor_id: "",
    semester: "first",
    course_id: "",
    department_id: "",
  });
  const [errors, setErrors] = useState({});

  // جلب الفترة التدريبية النشطة عند إنشاء شعبة جديدة
  useEffect(() => {
    if (id) return; // عند التعديل لا نحتاج لتغيير السنة والفصل
    getActiveTrainingPeriod()
      .then(res => {
        const period = res?.data;
        if (period) {
          setActivePeriod(period);
          setForm(prev => ({
            ...prev,
            academic_year: period.academic_year || prev.academic_year,
            semester: period.semester || prev.semester,
          }));
        }
      })
      .catch(() => {
        // لا يوجد فترة نشطة - سيظهر خطأ من الخادم عند الإرسال
      });
  }, [id]);

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
        department_id: sectionData.course?.department_id || "",
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
    // عند تغيير المساق: إعادة تعيين المشرف وتحديث department_id
    if (name === 'course_id') {
      const selectedCourse = courses.find(c => String(c.id) === String(value));
      setForm(prev => ({
        ...prev,
        course_id: value,
        academic_supervisor_id: '',
        department_id: selectedCourse?.department_id || '',
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    // Clear error when user changes a field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
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

    // Academic supervisor is now required
    if (!form.academic_supervisor_id) {
      newErrors.academic_supervisor_id = "يجب اختيار مشرف أكاديمي للشعبة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) return;

    if (!validateForm()) {
      toast.error("يرجى تصحيح الأخطاء في النموذج");
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      if (id) {
        await updateSection(id, form);
        toast.success("تم تحديث الشعبة بنجاح");
      } else {
        await createSection(form);
        toast.success("تم إضافة الشعبة بنجاح");
      }
      // Invalidate sections cache to refresh the list
      apiCache.invalidate("sections:list");
      navigate("/admin/sections");
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 422 && data?.errors) {
        setErrors(data.errors);
        // Surface the training_period error as a toast if present
        const periodErr = data.errors?.training_period?.[0] || data.errors?.training_period;
        if (periodErr) {
          toast.error(Array.isArray(periodErr) ? periodErr[0] : periodErr);
        } else {
          toast.error(data.message || "يرجى التحقق من البيانات المدخلة");
        }
      } else if (status === 403) {
        toast.error(data?.message || "لا تملك صلاحية تنفيذ هذه العملية");
      } else if (status === 500) {
        toast.error("حدث خطأ في الخادم، يرجى المحاولة لاحقًا أو التواصل مع مسؤول النظام");
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

        {/* Active training period banner */}
        {!id && (
          activePeriod ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
              <strong>الفترة التدريبية النشطة:</strong> {activePeriod.name} &nbsp;|&nbsp;
              السنة: {activePeriod.academic_year} &nbsp;|&nbsp;
              الفصل: {activePeriod.semester === 'first' ? 'الفصل الأول' : activePeriod.semester === 'second' ? 'الفصل الثاني' : 'الفصل الصيفي'}
              <span className="block text-xs text-blue-600 mt-1">سيتم ربط الشعبة تلقائياً بهذه الفترة.</span>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm text-yellow-800">
              ⚠️ لا توجد فترة تدريبية نشطة حالياً. يرجى تفعيل فترة تدريبية قبل إضافة شعبة.
            </div>
          )
        )}

        {/* training_period error */}
        {errors.training_period && (
          <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 rounded border border-red-200">
            {Array.isArray(errors.training_period) ? errors.training_period[0] : errors.training_period}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>اسم الشعبة *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleChange} className={errors.name ? 'border-red-500' : ''} required />
            {errors.name && <div className="text-red-500 text-sm mt-1">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</div>}
          </div>

          <div className="form-group">
            <label>السنة الأكاديمية {!id && <span className="text-text-soft text-xs">(من الفترة النشطة)</span>}</label>
            <input
              type="number"
              name="academic_year"
              value={form.academic_year}
              onChange={handleChange}
              className={`${errors.academic_year ? 'border-red-500' : ''} ${!id && activePeriod ? 'bg-gray-50' : ''}`}
              readOnly={!id && !!activePeriod}
              required
            />
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
            <label>الفصل الدراسي {!id && <span className="text-text-soft text-xs">(من الفترة النشطة)</span>}</label>
            {!id && activePeriod ? (
              <input
                type="text"
                value={form.semester === 'first' ? 'الفصل الأول' : form.semester === 'second' ? 'الفصل الثاني' : 'الفصل الصيفي'}
                readOnly
                className="bg-gray-50"
              />
            ) : (
              <select name="semester" value={form.semester} onChange={handleChange} onBlur={handleChange} className={errors.semester ? 'border-red-500' : ''} required>
                <option value="first">الفصل الأول</option>
                <option value="second">الفصل الثاني</option>
                <option value="summer">الفصل الصيفي</option>
              </select>
            )}
            {errors.semester && <div className="text-red-500 text-sm mt-1">{Array.isArray(errors.semester) ? errors.semester[0] : errors.semester}</div>}
          </div>
        </div>

        <div className="form-group">
          <label>المشرف الأكاديمي *</label>
          {!form.course_id ? (
            <>
              <select name="academic_supervisor_id" value="" disabled className="bg-gray-100">
                <option value="">اختر المساق أولاً</option>
              </select>
              <p className="text-text-soft text-[0.9rem] my-1">اختر المساق أولاً لعرض المشرفين التابعين لقسمه</p>
            </>
          ) : supervisors.length === 0 ? (
            <>
              <select name="academic_supervisor_id" value="" disabled className="bg-gray-100 border-red-300">
                <option value="">لا يوجد مشرفين</option>
              </select>
              <p className="text-red-500 text-sm mt-1">لا يوجد مشرفين أكاديميين متاحين في هذا القسم</p>
            </>
          ) : (
            <>
              <select
                name="academic_supervisor_id"
                value={form.academic_supervisor_id}
                onChange={handleChange}
                onBlur={handleChange}
                className={errors.academic_supervisor_id ? 'border-red-500' : ''}
                required
              >
                <option value="">اختر المشرف الأكاديمي</option>
                {supervisors.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
              {errors.academic_supervisor_id && (
                <div className="text-red-500 text-sm mt-1">
                  {Array.isArray(errors.academic_supervisor_id) ? errors.academic_supervisor_id[0] : errors.academic_supervisor_id}
                </div>
              )}
            </>
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