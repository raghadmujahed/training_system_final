import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTrainingSite, createTrainingSite, updateTrainingSite } from "../../../services/api";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";
import { isRequired, isMinValue, isValidEmail, isValidPhone } from "../../../utils/validation";

export default function TrainingSiteForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    mobile: "",
    description: "",
    directorate: "وسط",
    capacity: 10,
    site_type: "school",
    governing_body: "directorate_of_education",
    school_type: "public",
    gender_classification: "",
    school_level: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // تحميل البيانات إذا كان تعديل
  useEffect(() => {
    if (id) {
      getTrainingSite(id).then((data) => {
        // API response might be nested, extract the actual data
        const siteData = data.data || data;
        setForm({
          name: siteData.name || "",
          location: siteData.location || "",
          phone: siteData.phone || "",
          email: siteData.email || "",
          mobile: siteData.mobile || "",
          description: siteData.description || "",
          directorate: siteData.directorate || "وسط",
          capacity: siteData.capacity || 10,
          site_type: siteData.site_type || "school",
          governing_body: siteData.governing_body || "directorate_of_education",
          school_type: siteData.school_type || "public",
          gender_classification: siteData.gender_classification || "",
          school_level: siteData.school_level || "",
          is_active: siteData.is_active !== undefined ? siteData.is_active : true,
        });
      });
    }
  }, [id]);

  // الإضافة / التعديل الفردي
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: null });
    }
    
    // Real-time validation for specific fields
    if (name === 'email' && value && !isValidEmail(value)) {
      setFieldErrors({ ...fieldErrors, email: "صيغة البريد الإلكتروني غير صحيحة" });
    }
    if (name === 'phone' && value && !isValidPhone(value)) {
      setFieldErrors({ ...fieldErrors, phone: "رقم الهاتف يجب أن يكون مكونًا من 10 أرقام ويبدأ بـ 056 أو 059" });
    }
    if (name === 'mobile' && value && !isValidPhone(value)) {
      setFieldErrors({ ...fieldErrors, mobile: "رقم المحمول يجب أن يكون مكونًا من 10 أرقام ويبدأ بـ 056 أو 059" });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!isRequired(form.name)) {
      errors.name = "اسم الموقع مطلوب";
    }
    
    if (!isRequired(form.directorate)) {
      errors.directorate = "المديرية مطلوبة";
    }
    
    const capacity = Number(form.capacity);
    if (!isMinValue(capacity, 1)) {
      errors.capacity = "السعة يجب أن تكون 1 على الأقل";
    }
    
    if (form.email && !isValidEmail(form.email)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
    
    if (form.phone && !isValidPhone(form.phone)) {
      errors.phone = "رقم الهاتف يجب أن يكون مكونًا من 10 أرقام ويبدأ بـ 056 أو 059";
    }
    
    if (form.mobile && !isValidPhone(form.mobile)) {
      errors.mobile = "رقم المحمول يجب أن يكون مكونًا من 10 أرقام ويبدأ بـ 056 أو 059";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      if (id) await updateTrainingSite(id, form);
      else await createTrainingSite(form);
      navigate("/admin/training-sites");
    } catch (err) {
      console.error(err);
      toast.apiError(err, "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  // معالجة رفع ملف Excel
  const handleFileChange = (e) => setBulkFile(e.target.files[0]);

  // دالة مساعدة لتحويل القيم إلى الأنواع الصحيحة
  const normalizeValue = (value, type) => {
    if (value === undefined || value === null) {
      if (type === "number") return 0;
      if (type === "boolean") return false;
      return "";
    }
    switch (type) {
      case "string":
        return String(value).trim();
      case "number": {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      }
      case "boolean": {
        if (typeof value === "boolean") return value;
        const str = String(value).toLowerCase();
        return str === "نعم" || str === "yes" || str === "true" || str === "1";
      }
      default:
        return value;
    }
  };

  const processBulkUpload = async () => {
    if (!bulkFile) { toast.warning("اختر ملف Excel أولاً"); return; }
    setBulkLoading(true);
    setBulkResults(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const sites = rows.map((row) => ({
          name: normalizeValue(row["الاسم"] || row["name"], "string"),
          location: normalizeValue(row["الموقع"] || row["location"], "string"),
          phone: normalizeValue(row["الهاتف"] || row["phone"], "string"),
          email: normalizeValue(row["البريد"] || row["email"], "string"),
          mobile: normalizeValue(row["المحمول"] || row["mobile"], "string"),
          description: normalizeValue(row["الوصف"] || row["description"], "string"),
          directorate: normalizeValue(row["المديرية"] || row["directorate"], "string") || "وسط",
          capacity: normalizeValue(row["السعة"] || row["capacity"], "number") || 10,
          site_type: (() => {
            const val = normalizeValue(row["نوع الموقع"] || row["site_type"], "string");
            return val === "مركز صحي" ? "health_center" : "school";
          })(),
          governing_body: (() => {
            const val = normalizeValue(row["الجهة المسؤولة"] || row["governing_body"], "string");
            return val === "وزارة الصحة" ? "ministry_of_health" : "directorate_of_education";
          })(),
          school_type: normalizeValue(row["نوع المدرسة"] || row["school_type"], "string") || "public",
          gender_classification: normalizeValue(row["التصنيف"] || row["gender_classification"], "string"),
          school_level: normalizeValue(row["المرحلة"] || row["school_level"], "string"),
          is_active: normalizeValue(row["نشط"] || row["is_active"], "boolean"),
        })).filter(s => s.name !== "");

        if (sites.length === 0) throw new Error("لا توجد بيانات صالحة (الاسم مطلوب)");

        const successList = [];
        const errorList = [];
        for (const site of sites) {
          try {
            await createTrainingSite(site);
            successList.push(site.name);
          } catch (err) {
            let errorMsg = err.response?.data?.message || err.message;
            if (errorMsg.includes("phone")) errorMsg += " (تأكد أن الهاتف نص وليس رقماً)";
            errorList.push({ name: site.name, error: errorMsg });
          }
        }
        setBulkResults({ success: successList, errors: errorList });
        if (successList.length) toast.success(`تمت إضافة ${successList.length} موقع بنجاح`);
        if (errorList.length) console.error("أخطاء الرفع:", errorList);
      } catch (err) {
        toast.apiError(err, "خطأ في معالجة الملف");
      } finally {
        setBulkLoading(false);
        setBulkFile(null);
        document.getElementById("bulk-file-input").value = "";
      }
    };
    reader.readAsArrayBuffer(bulkFile);
  };

  return (
    <div>
      <PageHeader title={id ? "تعديل موقع تدريب" : "إضافة مواقع تدريب (فردي / جماعي)"} />

      {/* نموذج الإضافة الفردية */}
      <form onSubmit={handleSubmit} className="form border border-[#ccc] p-4 rounded-lg mb-8">
        <h3 className="font-bold text-text mb-3">إضافة فردية</h3>
        <div className="form-group">
          <label>الاسم *</label>
          <input 
            type="text" 
            name="name"
            value={form.name} 
            onChange={handleChange}
            onBlur={handleChange}
            className={fieldErrors.name ? 'border-red-500' : ''}
            required 
          />
          {fieldErrors.name && <div className="text-red-500 text-sm mt-1">{fieldErrors.name}</div>}
        </div>
        <div className="form-group">
          <label>الموقع</label>
          <input 
            type="text" 
            name="location"
            value={form.location} 
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>الهاتف</label>
          <input 
            type="text" 
            name="phone"
            value={form.phone} 
            onChange={handleChange}
            onBlur={handleChange}
            className={fieldErrors.phone ? 'border-red-500' : ''}
          />
          {fieldErrors.phone && <div className="text-red-500 text-sm mt-1">{fieldErrors.phone}</div>}
        </div>
        <div className="form-group">
          <label>البريد الإلكتروني (بريد المدير)</label>
          <input 
            type="email" 
            name="email"
            value={form.email} 
            onChange={handleChange}
            onBlur={handleChange}
            className={fieldErrors.email ? 'border-red-500' : ''}
          />
          {fieldErrors.email && <div className="text-red-500 text-sm mt-1">{fieldErrors.email}</div>}
        </div>
        <div className="form-group">
          <label>رقم المحمول</label>
          <input 
            type="text" 
            name="mobile"
            value={form.mobile} 
            onChange={handleChange}
            onBlur={handleChange}
            className={fieldErrors.mobile ? 'border-red-500' : ''}
          />
          {fieldErrors.mobile && <div className="text-red-500 text-sm mt-1">{fieldErrors.mobile}</div>}
        </div>
        <div className="form-group">
          <label>الوصف</label>
          <textarea 
            name="description"
            value={form.description} 
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>المديرية *</label>
          <select 
            name="directorate"
            value={form.directorate} 
            onChange={handleChange}
            onBlur={handleChange}
            className={fieldErrors.directorate ? 'border-red-500' : ''}
            required
          >
            <option value="وسط">وسط</option>
            <option value="شمال">شمال</option>
            <option value="جنوب">جنوب</option>
            <option value="يطا">يطا</option>
          </select>
          {fieldErrors.directorate && <div className="text-red-500 text-sm mt-1">{fieldErrors.directorate}</div>}
        </div>
        <div className="form-group">
          <label>السعة *</label>
          <input 
            type="number" 
            name="capacity"
            value={form.capacity} 
            onChange={handleChange}
            onBlur={handleChange}
            className={fieldErrors.capacity ? 'border-red-500' : ''}
            min="1"
            required
          />
          {fieldErrors.capacity && <div className="text-red-500 text-sm mt-1">{fieldErrors.capacity}</div>}
        </div>
        <div className="form-group">
          <label>نوع الموقع</label>
          <select value={form.site_type} onChange={(e) => setForm({ ...form, site_type: e.target.value })}>
            <option value="school">مدرسة</option>
            <option value="health_center">مركز صحي</option>
          </select>
        </div>
        <div className="form-group">
          <label>نوع المدرسة</label>
          <select value={form.school_type} onChange={(e) => setForm({ ...form, school_type: e.target.value })}>
            <option value="public">حكومية</option>
            <option value="private">خاصة</option>
          </select>
        </div>
        <div className="form-group">
          <label>تصنيف المدرسة</label>
          <select value={form.gender_classification} onChange={(e) => setForm({ ...form, gender_classification: e.target.value })}>
            <option value="">-- اختر --</option>
            <option value="boys">ذكور</option>
            <option value="girls">إناث</option>
            <option value="mixed">مختلطة</option>
          </select>
        </div>
        <div className="form-group">
          <label>مرحلة المدرسة</label>
          <select value={form.school_level} onChange={(e) => setForm({ ...form, school_level: e.target.value })}>
            <option value="">-- اختر --</option>
            <option value="lower">دنيا</option>
            <option value="upper">عليا</option>
          </select>
        </div>
        <div className="form-group">
          <label>الجهة المسؤولة</label>
          <select value={form.governing_body} onChange={(e) => setForm({ ...form, governing_body: e.target.value })}>
            <option value="directorate_of_education">مديرية التربية</option>
            <option value="ministry_of_health">وزارة الصحة</option>
          </select>
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            نشط
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : id ? "تحديث" : "إضافة موقع"}
        </button>
      </form>

      {/* قسم الإضافة الجماعية */}
      <fieldset className="border border-[#ccc] p-4 rounded-lg">
        <legend className="font-bold">إضافة جماعية عبر ملف Excel</legend>
        <p className="text-text-soft text-[0.88rem]">
          الأعمدة المطلوبة: <strong>الاسم</strong> (إجباري)، الموقع، الهاتف، البريد، المحمول، الوصف، المديرية، السعة، نوع الموقع (مدرسة/مركز صحي)، نوع المدرسة (public/private)، التصنيف (boys/girls/mixed)، المرحلة (lower/upper)، الجهة المسؤولة، نشط (نعم/لا).
        </p>
        <input type="file" id="bulk-file-input" accept=".xlsx, .xls" onChange={handleFileChange} className="my-2" />
        <Button variant="outline" onClick={processBulkUpload} disabled={bulkLoading}>
          {bulkLoading ? "جاري الرفع..." : "رفع وإضافة"}
        </Button>
        {bulkResults && (
          <div className="mt-4">
            <div className="text-success font-bold">✅ نجح: {bulkResults.success.length} موقع</div>
            {bulkResults.errors.length > 0 && (
              <div className="text-danger font-bold">
                ❌ فشل: {bulkResults.errors.map((e) => `${e.name} (${e.error})`).join("; ")}
              </div>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}   </div>
  );
}