import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourse, createCourse, updateCourse } from "../../services/api";
import useAppToast from "../../hooks/useAppToast";
import { hasFormChanged } from "../../utils/formChanged";

export default function HeadOfDepartmentCourseForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const originalRef = useRef(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", credit_hours: 3, training_hours: 0, type: "practical" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      getCourse(id)
        .then(data => {
          const loaded = {
            code: data?.code ?? "",
            name: data?.name ?? "",
            description: data?.description ?? "",
            credit_hours: data?.credit_hours ?? 3,
            training_hours: data?.training_hours ?? 0,
            type: data?.type ?? "practical",
          };
          originalRef.current = loaded;
          setForm(loaded);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (id && !hasFormChanged(originalRef.current, form)) {
      toast.info("لم تقم بتغيير أي بيانات");
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      if (id) {
        await updateCourse(id, form);
      } else {
        await createCourse(form);
      }
      toast.success(id ? "تم تحديث المساق بنجاح" : "تم إضافة المساق بنجاح");
      navigate("/head-department/courses");
    } catch (err) {
      console.error("Course save error:", err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
      toast.apiError(err, "حدث خطأ أثناء حفظ المساق");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-form">
      <div className="page-header">
        <h1>{id ? "تعديل مساق" : "إضافة مساق جديد"}</h1>
        <button onClick={() => navigate("/head-department/courses")} className="btn-secondary">رجوع</button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="hod-course-code">الكود *</label>
          <input id="hod-course-code" type="text" name="code" value={form.code} onChange={handleChange} required />
          {errors.code && <span className="error">{errors.code[0]}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="hod-course-name">الاسم *</label>
          <input id="hod-course-name" type="text" name="name" value={form.name} onChange={handleChange} required />
          {errors.name && <span className="error">{errors.name[0]}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="hod-course-description">الوصف</label>
          <textarea id="hod-course-description" name="description" value={form.description} onChange={handleChange} rows="4" />
          {errors.description && <span className="error">{errors.description[0]}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hod-course-credit-hours">الساعات الجامعية *</label>
            <input id="hod-course-credit-hours" type="number" name="credit_hours" value={form.credit_hours} onChange={handleChange} min="1" max="6" required />
            {errors.credit_hours && <span className="error">{errors.credit_hours[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hod-course-training-hours">الساعات التدريبية *</label>
            <input id="hod-course-training-hours" type="number" name="training_hours" value={form.training_hours} onChange={handleChange} min="0" max="500" required />
            {errors.training_hours && <span className="error">{errors.training_hours[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hod-course-type">النوع *</label>
            <select id="hod-course-type" name="type" value={form.type} onChange={handleChange} required>
              <option value="practical">عملي</option>
              <option value="theoretical">نظري</option>
              <option value="both">نظري وعملي</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "جاري الحفظ..." : (id ? "تحديث" : "إضافة")}
          </button>
          <button type="button" onClick={() => navigate("/head-department/courses")} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
