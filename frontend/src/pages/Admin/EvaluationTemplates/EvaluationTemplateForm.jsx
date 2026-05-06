import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getEvaluationTemplate,
  createEvaluationTemplate,
  updateEvaluationTemplate,
  addTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
} from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";

export default function EvaluationTemplateForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    form_type: "evaluation",
    description: "",
    target_role: "",
    department_key: "",
  });
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  // تحميل القالب إذا كنا في وضع التعديل
  useEffect(() => {
    if (id) {
      const fetchTemplate = async () => {
        try {
          const data = await getEvaluationTemplate(id);
          // التأكد من وجود البيانات
          setForm({
            name: data.name || "",
            form_type: data.form_type || "evaluation",
            description: data.description || "",
            target_role: data.target_role || "",
            department_key: data.department_key || "",
          });
          // التأكد من أن items هي مصفوفة
          setItems(data.items || []);
        } catch (err) {
          console.error(err);
          toast.error("حدث خطأ أثناء تحميل القالب");
        }
      };
      fetchTemplate();
    }
  }, [id]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // إضافة بند جديد مؤقت
  const addItem = () => {
    setItems([
      ...items,
      {
        id: null,
        title: "",
        field_type: "score",
        options: "",
        is_required: true,
        max_score: 5,
        _isNew: true,
      },
    ]);
  };

  // تحديث بند موجود (سواء جديد أم قديم)
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // حذف بند
  const deleteItem = async (index) => {
    const item = items[index];
    if (item.id && !item._isNew) {
      if (window.confirm("هل أنت متأكد من حذف هذا البند؟")) {
        try {
          await deleteTemplateItem(item.id);
          setItems(items.filter((_, i) => i !== index));
        } catch (err) {
          toast.error("فشل حذف البند");
        }
      }
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // حفظ القالب وجميع بنوده
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSubmitError("");

    try {
      let templateId = id;

      // 1. إنشاء أو تحديث القالب الأساسي
      if (!id) {
        const newTemplate = await createEvaluationTemplate(form);
        templateId = newTemplate.id;
      } else {
        await updateEvaluationTemplate(id, form);
        templateId = id;
      }

      // 2. معالجة البنود: إضافة الجديد وتحديث الموجود
      for (const item of items) {
        const normalizedOptions = normalizeItemOptions(item);
        if (item._isNew) {
          // إضافة بند جديد
          await addTemplateItem(templateId, {
            title: item.title,
            field_type: item.field_type,
            options: normalizedOptions,
            is_required: item.is_required ? 1 : 0,
            max_score: item.max_score,
          });
        } else if (item.id) {
          // تحديث بند موجود (في حال تغيرت بياناته)
          await updateTemplateItem(item.id, {
            title: item.title,
            field_type: item.field_type,
            options: normalizedOptions,
            is_required: item.is_required ? 1 : 0,
            max_score: item.max_score,
          });
        }
      }

      navigate("/admin/evaluation-templates");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        const firstError = Object.values(err.response.data.errors)?.[0]?.[0];
        setSubmitError(firstError || "تحقق من الحقول المطلوبة.");
      } else {
        const msg = err.response?.data?.message || err.message || "حدث خطأ أثناء حفظ القالب";
        setSubmitError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="evaluation-template-form">
      <div className="page-header">
        <h1>{id ? "تعديل قالب تقييم" : "إضافة قالب تقييم جديد"}</h1>
        <button onClick={() => navigate("/admin/evaluation-templates")} className="btn-secondary">
          رجوع
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {submitError && (
          <div className="error" style={{ marginBottom: "12px", display: "block" }}>
            {submitError}
          </div>
        )}
        <div className="form-group">
          <label>اسم القالب *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleFormChange}
            required
          />
          {errors.name && <span className="error">{errors.name[0]}</span>}
        </div>

        <div className="form-group">
          <label>نوع القالب *</label>
          <select name="form_type" value={form.form_type} onChange={handleFormChange}>
            <option value="evaluation">تقييم (Evaluation)</option>
            <option value="student_form">نموذج طالب (Student Form)</option>
          </select>
          {errors.form_type && <span className="error">{errors.form_type[0]}</span>}
        </div>

        <div className="form-group">
          <label>الوصف</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleFormChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>الدور المستهدف</label>
          <select name="target_role" value={form.target_role} onChange={handleFormChange}>
            <option value="">عام (كل الأدوار)</option>
            <option value="teacher">المعلم المرشد</option>
            <option value="academic_supervisor">المشرف الأكاديمي</option>
            <option value="psychologist">الأخصائي النفسي</option>
            <option value="school_manager">مدير المدرسة</option>
          </select>
          {errors.target_role && <span className="error">{errors.target_role[0]}</span>}
        </div>

        <div className="form-group">
          <label>القسم المستهدف</label>
          <select name="department_key" value={form.department_key} onChange={handleFormChange}>
            <option value="">عام (كل الأقسام)</option>
            <option value="psychology">علم النفس</option>
            <option value="usool_tarbiah">أصول التربية</option>
          </select>
          {errors.department_key && <span className="error">{errors.department_key[0]}</span>}
        </div>

        <hr />
        <h3>بنود التقييم</h3>
        <button type="button" onClick={addItem} className="btn-sm" style={{ marginBottom: "1rem" }}>
          + إضافة بند جديد
        </button>

        {items.length === 0 && <p>لا توجد بنود بعد. أضف بنداً باستخدام الزر أعلاه.</p>}

        {items.map((item, idx) => (
          <div
            key={idx}
            className="item-card"
            style={{
              border: "1px solid #ccc",
              padding: "1rem",
              marginBottom: "1rem",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>عنوان البند *</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>نوع الحقل</label>
                <select
                  value={item.field_type}
                  onChange={(e) => updateItem(idx, "field_type", e.target.value)}
                >
                  <option value="score">درجة (Score)</option>
                  <option value="text">نص قصير (Text)</option>
                  <option value="textarea">نص طويل (Textarea)</option>
                  <option value="radio">اختيار من متعدد (Radio)</option>
                  <option value="checkbox">خيارات متعددة (Checkbox)</option>
                  <option value="date">تاريخ (Date)</option>
                  <option value="file">ملف (File)</option>
                </select>
              </div>
            </div>

            {(item.field_type === "radio" || item.field_type === "checkbox") && (
              <div className="form-group">
                <label>الخيارات (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  value={item.options || ""}
                  onChange={(e) => updateItem(idx, "options", e.target.value)}
                  placeholder="مثال: ممتاز, جيد, مقبول"
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>الحد الأقصى للدرجة (إن كان نوع Score)</label>
                <input
                  type="number"
                  value={item.max_score || 0}
                  onChange={(e) => updateItem(idx, "max_score", parseInt(e.target.value) || 0)}
                  disabled={item.field_type !== "score"}
                />
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.is_required}
                    onChange={(e) => updateItem(idx, "is_required", e.target.checked)}
                  />
                  حقل مطلوب
                </label>
              </div>
            </div>

            <button type="button" onClick={() => deleteItem(idx)} className="btn-sm danger">
              حذف هذا البند
            </button>
          </div>
        ))}

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? "جاري الحفظ..." : id ? "تحديث القالب" : "إنشاء القالب"}
          </button>
        </div>
      </form>
    </div>
  );
}

function normalizeItemOptions(item) {
  if (item.field_type !== "radio" && item.field_type !== "checkbox") {
    return null;
  }
  if (Array.isArray(item.options)) {
    return item.options.filter(Boolean);
  }
  return String(item.options || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
