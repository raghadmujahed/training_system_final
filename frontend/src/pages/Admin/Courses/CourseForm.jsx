import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourse, createCourse, updateCourse } from "../../../services/api";
import { useDepartments } from "../../../hooks/useSharedData";
import { isRequired, isMinValue, isMaxValue, isInteger } from "../../../utils/validation";

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: departments } = useDepartments();
  const [form, setForm] = useState({ code: "", name: "", description: "", credit_hours: 3, training_hours: 0, type: "practical", department_id: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      getCourse(id).then(data => setForm({
        code: data?.code ?? "",
        name: data?.name ?? "",
        description: data?.description ?? "",
        credit_hours: data?.credit_hours ?? 3,
        training_hours: data?.training_hours ?? 0,
        type: data?.type ?? "practical",
        department_id: data?.department_id ?? "",
      })).catch(() => {});
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
    
    // Real-time validation for numeric fields
    if (name === 'credit_hours' && value) {
      const numValue = Number(value);
      if (!isInteger(value) || !isMinValue(numValue, 1) || !isMaxValue(numValue, 6)) {
        setErrors({ ...errors, credit_hours: "عدد الساعات الجامعية يجب أن يكون عددًا صحيحًا بين 1 و 6" });
      }
    }
    if (name === 'training_hours' && value) {
      const numValue = Number(value);
      if (!isInteger(value) || !isMinValue(numValue, 0) || !isMaxValue(numValue, 500)) {
        setErrors({ ...errors, training_hours: "عدد الساعات التدريبية يجب أن يكون عددًا صحيحًا بين 0 و 500" });
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!isRequired(form.code)) {
      newErrors.code = "كود المساق مطلوب";
    }
    
    if (!isRequired(form.name)) {
      newErrors.name = "اسم المساق مطلوب";
    }
    
    if (!isRequired(form.department_id)) {
      newErrors.department_id = "القسم مطلوب";
    }
    
    const creditHours = Number(form.credit_hours);
    if (!isInteger(form.credit_hours) || !isMinValue(creditHours, 1) || !isMaxValue(creditHours, 6)) {
      newErrors.credit_hours = "عدد الساعات الجامعية يجب أن يكون عددًا صحيحًا بين 1 و 6";
    }
    
    const trainingHours = Number(form.training_hours);
    if (!isInteger(form.training_hours) || !isMinValue(trainingHours, 0) || !isMaxValue(trainingHours, 500)) {
      newErrors.training_hours = "عدد الساعات التدريبية يجب أن يكون عددًا صحيحًا بين 0 و 500";
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
    try {
      if (id) await updateCourse(id, form);
      else await createCourse(form);
      navigate("/admin/courses");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || "حدث خطأ أثناء حفظ المساق");
      }
    }
  };
  return (
    <form onSubmit={handleSubmit} className="form">
      <h1>{id ? "تعديل مساق" : "إضافة مساق"}</h1>
      <div className="form-group"><label>الكود *</label><input type="text" name="code" value={form.code} onChange={handleChange} required />{errors.code && <span className="error">{errors.code[0]}</span>}</div>
      <div className="form-group"><label>الاسم *</label><input type="text" name="name" value={form.name} onChange={handleChange} required />{errors.name && <span className="error">{errors.name[0]}</span>}</div>
      <div className="form-group"><label>القسم *</label>
        <select name="department_id" value={form.department_id} onChange={handleChange} required>
          <option value="">اختر القسم</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {errors.department_id && <span className="error">{errors.department_id[0]}</span>}
      </div>
      <div className="form-group"><label>الوصف</label><textarea name="description" value={form.description} onChange={handleChange} />{errors.description && <span className="error">{errors.description[0]}</span>}</div>
      <div className="form-row">
        <div className="form-group"><label>الساعات الجامعية *</label><input type="number" name="credit_hours" value={form.credit_hours} onChange={handleChange} min="1" max="6" required />{errors.credit_hours && <span className="error">{errors.credit_hours[0]}</span>}</div>
        <div className="form-group"><label>الساعات التدريبية *</label><input type="number" name="training_hours" value={form.training_hours} onChange={handleChange} min="0" max="500" required />{errors.training_hours && <span className="error">{errors.training_hours[0]}</span>}</div>
        <div className="form-group"><label>النوع *</label>
          <select name="type" value={form.type} onChange={handleChange} required>
            <option value="practical">عملي</option><option value="theoretical">نظري</option><option value="both">نظري وعملي</option>
          </select>
          {errors.type && <span className="error">{errors.type[0]}</span>}
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">حفظ</button>
        <button type="button" onClick={() => navigate("/admin/courses")} className="btn-secondary">إلغاء</button>
      </div>
    </form>
  );
}