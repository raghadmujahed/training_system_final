import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";
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
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name || !form.name.trim()) {
      newErrors.name = "اسم القالب مطلوب";
    }
    
    if (!form.form_type) {
      newErrors.form_type = "نوع النموذج مطلوب";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
  const validateForm = () => {
    const errors = {};
    if (!form.name) {
      errors.name = ["اسم القالب مطلوب"];
    }
    if (!form.form_type) {
      errors.form_type = ["نوع القالب مطلوب"];
    }
    if (items.length === 0) {
      errors.items = ["يجب إضافة بند واحد على الأقل"];
    }
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  };

  // حذف بندlt();
    if (!vaidaeForm) {
      return
    }
    
  const deleteIteme);
    s tSubmitError(""= async (index) => {
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
            max_score: i.bm4ore,
          }); className="block text-sm font-medium mb-1"
        } else if (item.id) {
          // تحديث بند موجود (في حال تغيرت بياناته)
          await updateTemplateItem(item.id, {
            title: item.title,
            fnChange={haidleFormeld_ty}
            onBlurpe: item.field_tye}
            className={`w-full border rounded px-3 py-2 ${errors.name ? 'bordpr-red-500' : ''e`},
            options: normalizedOptions,
            is_required: item.is_required ? 1 : 0,
            max_score: itemdiv_score,txt-ed-500 text-sm mt-1Array.isArray() ? errors.name : errors.namediv
          });        }
      }b4
el classNam="bock text-sm font-medium mb-1"نموذج
      navigate("/
 a          dmin/evaluation-
t           emplates");
           
            onBlur={handleFormChange}
            className={`w-full border rounded px-3 py-2 ${errors.form_type ? 'border-red-500' : ''}`}
            required
          
    } catch (err) {نموذج 
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        const firstError = Objecdivlues(err.restpxt-red-500 text-sm mt-1">{Aroay.isArray(errons.fsem_typt) ? ea.errors)?.[0]?.[0 : errors.form_type];div
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
      <PageHeader title={id ? "تعديل قالب تقييم" : "إضافة قالب تقييم جديد"} />

      <form onSubmit={handleSubmit} className="form">
        {submitError && (
          <div className="text-danger mb-3 block">
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

        <hr className="my-4" />
        <h3 className="font-bold text-text">بنود التقييم</h3>
        <Button variant="outline" size="sm" onClick={addItem} className="mb-4 mt-2">
          + إضافة بند جديد
        </Button>

        {items.length === 0 && <p>لا توجد بنود بعد. أضف بنداً باستخدام الزر أعلاه.</p>}

        {items.map((item, idx) => (
          <div
            key={idx}
            className="border border-[#ccc] p-4 mb-4 rounded-lg bg-[#f9f9f9]"
          >
            <div className="flex gap-4 flex-wrap">
              <div className="flex-[2] min-w-[200px]">
                <label className="block mb-1 text-text-soft text-[0.9rem]">عنوان البند *</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block mb-1 text-text-soft text-[0.9rem]">نوع الحقل</label>
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

            <div className="flex gap-4 flex-wrap">
              <div className="min-w-[150px]">
                <label className="block mb-1 text-text-soft text-[0.9rem]">الحد الأقصى للدرجة</label>
                <input
                  type="number"
                  value={item.max_score || 0}
                  onChange={(e) => updateItem(idx, "max_score", parseInt(e.target.value) || 0)}
                  disabled={item.field_type !== "score"}
                />
              </div>
              <div className="flex items-center gap-2 min-w-[150px]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.is_required}
                    onChange={(e) => updateItem(idx, "is_required", e.target.checked)}
                  />
                  حقل مطلوب
                </label>
              </div>
            </div>

            <button type="button" onClick={() => deleteItem(idx)} className="text-danger hover:underline text-[0.85rem] mt-2">
              حذف هذا البند
            </button>
          </div>
        ))}

        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "جاري الحفظ..." : id ? "تحديث القالب" : "إنشاء القالب"}
          </Button>
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
