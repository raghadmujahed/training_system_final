import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourse, createCourse, updateCourse } from "../../../services/api";
import { useDepartments } from "../../../hooks/useSharedData";
import { isRequired, isMinValue, isMaxValue, isInteger } from "../../../utils/validation";
import { hasFormChanged } from "../../../utils/formChanged";
import useAppToast from "../../../hooks/useAppToast";

export default function CourseForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: departments } = useDepartments();
  const originalRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", credit_hours: 3, training_hours: 1, type: "practical", department_id: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      getCourse(id).then(data => {
        const loaded = {
          code: data?.code ?? "",
          name: data?.name ?? "",
          description: data?.description ?? "",
          credit_hours: data?.credit_hours ?? 3,
          training_hours: data?.training_hours ?? 0,
          type: data?.type ?? "practical",
          department_id: data?.department_id ?? "",
        };
        originalRef.current = loaded;
        setForm(loaded);
      }).catch(() => {});
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
      if (!isInteger(value) || !isMinValue(numValue, 1) || !isMaxValue(numValue, 500)) {
        setErrors({ ...errors, training_hours: "عدد الساعات التدريبية يجب أن يكون عددًا صحيحًا أكبر من صفر ولا يتجاوز 500" });
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
    if (!isInteger(form.training_hours) || !isMinValue(trainingHours, 1) || !isMaxValue(trainingHours, 500)) {
      newErrors.training_hours = "عدد الساعات التدريبية يجب أن يكون عددًا صحيحًا أكبر من صفر ولا يتجاوز 500";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (id && !hasFormChanged(originalRef.current, form)) {
      toast.info("لم تقم بتغيير أي بيانات");
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      if (id) {
        const res = await updateCourse(id, form);
        if (res?.status === 'no_changes') { toast.info("لم تقم بتغيير أي بيانات"); return; }
        toast.success("تم تحديث البيانات بنجاح");
      } else {
        await createCourse(form);
        toast.success("تم إضافة المساق بنجاح");
      }
      navigate("/admin/courses");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.error(err.response?.data?.message || "حدث خطأ أثناء حفظ المساق");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="form">
      <h1>{id ? "تعديل مساق" : "إضافة مساق"}</h1>
      <div className="form-group">
        <label>الكود *</label>
        <input 
          type="text" 
          name="code" 
          value={form.code} 
          onChange={handleChange} 
          onBlur={handleChange}
          className={errors.code ? 'border-red-500' : ''}
          required 
        />
        {errors.code && <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.code) ? errors.code[0] : errors.code}</p>}
      </div>
      <div className="form-group">
        <label>الاسم *</label>
        <input 
          type="text" 
          name="name" 
          value={form.name} 
          onChange={handleChange} 
          onBlur={handleChange}
          className={errors.name ? 'border-red-500' : ''}
          required 
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</p>}
      </div>
      <div className="form-group">
        <label>القسم *</label>
        <select 
          name="department_id" 
          value={form.department_id} 
          onChange={handleChange} 
          onBlur={handleChange}
          className={errors.department_id ? 'border-red-500' : ''}
          required
        >
          <option value="">اختر القسم</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {errors.department_id && <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.department_id) ? errors.department_id[0] : errors.department_id}</p>}
      </div>
      <div className="form-group">
        <label>الوصف</label>
        <textarea 
          name="description" 
          value={form.description} 
          onChange={handleChange} 
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.description) ? errors.description[0] : errors.description}</p>}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>الساعات الجامعية *</label>
          <input 
            type="number" 
            name="credit_hours" 
            value={form.credit_hours} 
            onChange={handleChange} 
            onBlur={handleChange}
            className={errors.credit_hours ? 'border-red-500' : ''}
            min="1" 
            max="6" 
            required 
          />
          {errors.credit_hours && <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.credit_hours) ? errors.credit_hours[0] : errors.credit_hours}</p>}
        </div>
        <div className="form-group">
          <label>الساعات التدريبية *</label>
          <input
            type="number"
            name="training_hours"
            value={form.training_hours}
            onChange={handleChange}
            onBlur={handleChange}
            className={errors.training_hours ? 'border-red-500' : ''}
            min="1"
            max="500"
            required
          />
          {errors.training_hours && <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.training_hours) ? errors.training_hours[0] : errors.training_hours}</p>}
        </div>
        <div className="form-group">
          <label>النوع *</label>
          <select 
            name="type" 
            value={form.type} 
            onChange={handleChange} 
            onBlur={handleChange}
            className={errors.type ? 'border-red-500' : ''}
            required
          >
            <option value="practical">عملي</option><option value="theoretical">نظري</option><option value="both">نظري وعملي</option>
          </select>
          {errors.type && <p className="mt-1 text-sm text-red-600">{Array.isArray(errors.type) ? errors.type[0] : errors.type}</p>}
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button type="button" onClick={() => navigate("/admin/courses")} className="btn-secondary">إلغاء</button>
      </div>
    </form>
  );
}