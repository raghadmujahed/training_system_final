import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourse, createCourse, updateCourse, getDepartments } from "../../../services/api";

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", description: "", credit_hours: 3, training_hours: 0, type: "practical", department_id: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getDepartments().then(res => {
      const depts = res.data || res || [];
      setDepartments(depts);
    }).catch(() => {});
  }, []);

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
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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