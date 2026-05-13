import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTrainingPeriod, createTrainingPeriod, updateTrainingPeriod } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";
import { hasFormChanged } from "../../../utils/formChanged";

export default function TrainingPeriodForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const originalRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_active: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      getTrainingPeriod(id).then((data) => {
        const loaded = {
          name: data.name || "",
          start_date: data.start_date || "",
          end_date: data.end_date || "",
          is_active: data.is_active ?? false,
        };
        originalRef.current = loaded;
        setForm(loaded);
      }).catch(console.error);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors({ ...errors, [name]: null });
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
        const res = await updateTrainingPeriod(id, form);
        if (res?.status === 'no_changes') { toast.info("لم تقم بتغيير أي بيانات"); return; }
        toast.success("تم تحديث البيانات بنجاح");
      } else {
        await createTrainingPeriod(form);
      }
      navigate("/admin/training-periods");
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      else toast.apiError(err, "حدث خطأ أثناء حفظ الفترة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="training-period-form">
      <div className="page-header">
        <h1>{id ? "تعديل فترة تدريبية" : "إضافة فترة تدريبية جديدة"}</h1>
        <button onClick={() => navigate("/admin/training-periods")} className="btn-secondary">رجوع</button>
      </div>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>اسم الفترة *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required />
          {errors.name && <span className="error">{errors.name[0]}</span>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>تاريخ البداية *</label>
            <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
            {errors.start_date && <span className="error">{errors.start_date[0]}</span>}
          </div>
          <div className="form-group">
            <label>تاريخ النهاية *</label>
            <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required />
            {errors.end_date && <span className="error">{errors.end_date[0]}</span>}
          </div>
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
            تفعيل هذه الفترة (سيتم إلغاء تفعيل الفترات الأخرى تلقائياً)
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "جاري الحفظ..." : (id ? "تحديث" : "إضافة")}
          </button>
          <button type="button" onClick={() => navigate("/admin/training-periods")} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
