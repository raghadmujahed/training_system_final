import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser, createUser, updateUser } from "../../../services/api";
import { useTrainingSites, useRoles } from "../../../hooks/useSharedData";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";
import { isValidPhone, getPhoneErrorMessage, isValidEmail, getEmailErrorMessage, isValidPassword, getPasswordErrorMessage } from "../../../utils/validation";

export default function AddSchoolManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("single");
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { data: trainingSites } = useTrainingSites({ per_page: 200 });
  const { data: roles } = useRoles({ per_page: 200 });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    training_site_id: "",
    role_id: "",
    status: "active",
  });
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState({ success: [], errors: [] });
  const isEditMode = !!id;
  const schoolManagerRoleId = roles.find((role) => role.name === "school_manager")?.id;

  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        try {
          const userData = await getUser(id);
          setForm({ name: userData.name || "", email: userData.email || "", password: "", password_confirmation: "", phone: userData.phone || "", training_site_id: userData.training_site_id || "", role_id: userData.role_id || "", status: userData.status || "active" });
        } catch (err) { console.error(err); }
      };
      fetchUser();
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    validateField(e.target.name, e.target.value);
  };

  const validateField = (fieldName, value) => {
    let error = null;

    switch (fieldName) {
      case "email":
        if (value && !isValidEmail(value)) {
          error = getEmailErrorMessage();
        }
        break;
      case "phone":
        if (value && !isValidPhone(value)) {
          error = getPhoneErrorMessage();
        }
        break;
      case "password":
        if (value && !isEditMode && !isValidPassword(value)) {
          error = getPasswordErrorMessage();
        }
        break;
      case "password_confirmation":
        if (value && form.password && value !== form.password) {
          error = "تأكيد كلمة المرور غير مطابق";
        }
        break;
      default:
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "الاسم مطلوب";
    }

    if (!form.email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!isValidEmail(form.email)) {
      newErrors.email = getEmailErrorMessage();
    }

    if (form.phone && !isValidPhone(form.phone)) {
      newErrors.phone = getPhoneErrorMessage();
    }

    if (!form.training_site_id) {
      newErrors.training_site_id = "مكان التدريب مطلوب";
    }

    if (!isEditMode) {
      if (!form.password) {
        newErrors.password = "كلمة المرور مطلوبة";
      } else if (!isValidPassword(form.password)) {
        newErrors.password = getPasswordErrorMessage();
      }

      if (!form.password_confirmation) {
        newErrors.password_confirmation = "تأكيد كلمة المرور مطلوب";
      } else if (form.password !== form.password_confirmation) {
        newErrors.password_confirmation = "تأكيد كلمة المرور غير مطابق";
      }
    } else {
      if (form.password && !isValidPassword(form.password)) {
        newErrors.password = getPasswordErrorMessage();
      }
      if (form.password && form.password !== form.password_confirmation) {
        newErrors.password_confirmation = "تأكيد كلمة المرور غير مطابق";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setBulkResults({ success: [], errors: [] });
  };

  const processExcel = async () => {
    if (!file) { toast.warning("الرجاء اختيار ملف Excel أولاً"); return; }
    if (!schoolManagerRoleId) { toast.error("تعذر تحديد دور مدير المدرسة من قاعدة البيانات"); return; }
    setBulkLoading(true);
    setBulkResults({ success: [], errors: [] });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target.result;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        let rows = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) { toast.warning("الملف فارغ أو لا يحتوي على بيانات"); setBulkLoading(false); return; }

        const cleanRows = rows.map(row => {
          const clean = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            clean[cleanKey] = row[key];
          });
          return clean;
        });

        const siteMap = {};
        trainingSites.forEach(site => {
          const normalized = site.name.trim();
          siteMap[normalized] = site.id;
          siteMap[normalized.toLowerCase()] = site.id;
        });

        const managers = cleanRows.map(row => {
          let siteName = (row["اسم المدرسة"] || row["school_name"] || row["المدرسة"] || "").trim();
          let trainingSiteId = siteMap[siteName];
          if (!trainingSiteId) trainingSiteId = siteMap[siteName.toLowerCase()];

          return {
            name: row["الاسم الكامل"] || row["name"] || "",
            email: row["البريد الإلكتروني"] || row["email"] || "",
            phone: (row["رقم الهاتف"] || row["phone"] || "").toString(),
            password: row["كلمة المرور"] || row["password"] || "12345678",
            password_confirmation: row["كلمة المرور"] || row["password"] || "12345678",
            training_site_id: trainingSiteId,
            role_id: schoolManagerRoleId,
            status: "active",
          };
        });

        const validManagers = [];
        const invalidManagers = [];

        managers.forEach((manager, idx) => {
          const missing = [];
          if (!manager.name) missing.push("الاسم الكامل");
          if (!manager.email) missing.push("البريد الإلكتروني");
          if (!manager.training_site_id) missing.push("اسم المدرسة (غير موجود أو غير مطابق)");

          if (missing.length === 0) {
            validManagers.push(manager);
          } else {
            invalidManagers.push({
              row: idx + 2,
              email: manager.email || "غير معروف",
              missing,
            });
          }
        });

        if (invalidManagers.length > 0) {
          toast.warning(`${invalidManagers.length} صف يحتوي بيانات ناقصة وتم تجاهله`);
        }

        if (validManagers.length === 0) {
          setBulkLoading(false);
          return;
        }

        const successList = [];
        const errorList = [];

        for (const manager of validManagers) {
          try {
            const managerData = { ...manager, training_site_id: manager.training_site_id ? Number(manager.training_site_id) : null };
            const response = await createUser(managerData);
            successList.push({ email: manager.email, id: response.data?.id });
          } catch (err) {
            const msg = err.response?.data?.message || err.message;
            errorList.push({ email: manager.email, error: msg });
          }
        }

        setBulkResults({ success: successList, errors: errorList });
        if (successList.length) setFile(null);
      } catch (err) {
        console.error(err);
        toast.apiError(err, "خطأ في معالجة الملف");
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrors({});

    if (!schoolManagerRoleId) {
      toast.error("تعذر تحديد دور مدير المدرسة من قاعدة البيانات");
      setLoading(false);
      return;
    }

    if (!validateForm()) {
      setLoading(false);
      toast.error("يرجى تصحيح الأخطاء قبل المتابعة");
      return;
    }

    const formToSend = { ...form, role_id: schoolManagerRoleId, training_site_id: form.training_site_id ? Number(form.training_site_id) : null };

    try {
      if (id) {
        await updateUser(id, formToSend);
        toast.success("تم تحديث مدير المدرسة بنجاح");
        setTimeout(() => navigate("/admin/users"), 1500);
      } else {
        await createUser(formToSend);
        toast.success("تمت إضافة مدير المدرسة بنجاح");
        setForm({
          name: "", email: "", phone: "", password: "", password_confirmation: "",
          training_site_id: "", role_id: "", status: "active",
        });
        setTimeout(() => navigate("/admin/users"), 1500);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        toast.error("فشل الحفظ: " + Object.values(err.response.data.errors).flat().join(", "));
      } else {
        toast.apiError(err, "حدث خطأ غير متوقع");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isEditMode) {
    return (
      <div className="user-form">
        <div className="page-header">
          <h1>تعديل مدير المدرسة</h1>
          <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>الاسم الكامل *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleChange} className={errors.name ? 'border-red-500' : ''} required />
            {errors.name && <span className="error">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</span>}
          </div>
          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} onBlur={handleChange} className={errors.email ? 'border-red-500' : ''} required />
            {errors.email && <span className="error">{Array.isArray(errors.email) ? errors.email[0] : errors.email}</span>}
          </div>
          <div className="form-group">
            <label>مكان التدريب (المدرسة) *</label>
            <select name="training_site_id" value={form.training_site_id} onChange={handleChange} onBlur={handleChange} className={errors.training_site_id ? 'border-red-500' : ''} required>
              <option value="">اختر المدرسة</option>
              {trainingSites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.training_site_id && <span className="error">{Array.isArray(errors.training_site_id) ? errors.training_site_id[0] : errors.training_site_id}</span>}
          </div>
          <div className="form-group">
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} onBlur={handleChange} className={errors.phone ? 'border-red-500' : ''} />
            {errors.phone && <span className="error">{Array.isArray(errors.phone) ? errors.phone[0] : errors.phone}</span>}
          </div>
          <div className="form-group">
            <label>كلمة المرور (اتركها فارغة إذا لم ترد التغيير)</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} onBlur={handleChange} className={errors.password ? 'border-red-500' : ''} />
            {errors.password && <span className="error">{Array.isArray(errors.password) ? errors.password[0] : errors.password}</span>}
          </div>
          <div className="form-group">
            <label>تأكيد كلمة المرور</label>
            <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} onBlur={handleChange} className={errors.password_confirmation ? 'border-red-500' : ''} />
            {errors.password_confirmation && <span className="error">{Array.isArray(errors.password_confirmation) ? errors.password_confirmation[0] : errors.password_confirmation}</span>}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : "تحديث"}</button>
            <button type="button" onClick={() => navigate("/admin/users")}>إلغاء</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="user-form">
      <div className="page-header">
        <h1>إضافة مدير مدرسة جديد</h1>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "single" ? "tab-active" : "tab"}
          onClick={() => setActiveTab("single")}
        >
          إضافة مدير واحد
        </button>
        <button
          className={activeTab === "bulk" ? "tab-active" : "tab"}
          onClick={() => setActiveTab("bulk")}
        >
          رفع مجموعة من ملف Excel
        </button>
      </div>

      {activeTab === "single" && (
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>الاسم الكامل *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleChange} className={errors.name ? 'border-red-500' : ''} required />
            {errors.name && <span className="error">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</span>}
          </div>
          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} onBlur={handleChange} className={errors.email ? 'border-red-500' : ''} required />
            {errors.email && <span className="error">{Array.isArray(errors.email) ? errors.email[0] : errors.email}</span>}
          </div>
          <div className="form-group">
            <label>مكان التدريب (المدرسة) *</label>
            <select name="training_site_id" value={form.training_site_id} onChange={handleChange} onBlur={handleChange} className={errors.training_site_id ? 'border-red-500' : ''} required>
              <option value="">اختر المدرسة</option>
              {trainingSites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.training_site_id && <span className="error">{Array.isArray(errors.training_site_id) ? errors.training_site_id[0] : errors.training_site_id}</span>}
          </div>
          <div className="form-group">
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} onBlur={handleChange} className={errors.phone ? 'border-red-500' : ''} />
            {errors.phone && <span className="error">{Array.isArray(errors.phone) ? errors.phone[0] : errors.phone}</span>}
          </div>
          <div className="form-group">
            <label>كلمة المرور *</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} onBlur={handleChange} className={errors.password ? 'border-red-500' : ''} required />
            {errors.password && <span className="error">{Array.isArray(errors.password) ? errors.password[0] : errors.password}</span>}
          </div>
          <div className="form-group">
            <label>تأكيد كلمة المرور *</label>
            <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} onBlur={handleChange} className={errors.password_confirmation ? 'border-red-500' : ''} required />
            {errors.password_confirmation && <span className="error">{Array.isArray(errors.password_confirmation) ? errors.password_confirmation[0] : errors.password_confirmation}</span>}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : "إضافة"}</button>
            <button type="button" onClick={() => navigate("/admin/users")}>إلغاء</button>
          </div>
        </form>
      )}

      {activeTab === "bulk" && (
        <div className="bulk-section">
          <p>قم بتحميل ملف Excel يحتوي على الأعمدة التالية:</p>
          <ul>
            <li><strong>الاسم الكامل</strong> (مطلوب)</li>
            <li><strong>البريد الإلكتروني</strong> (مطلوب)</li>
            <li><strong>رقم الهاتف</strong> (اختياري)</li>
            <li><strong>اسم المدرسة</strong> (مطلوب، يجب أن يطابق اسم موقع تدريب مسجل)</li>
            <li><strong>كلمة المرور</strong> (اختياري، افتراضي 12345678)</li>
          </ul>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          <button onClick={processExcel} disabled={bulkLoading} className="btn-primary">
            {bulkLoading ? "جاري الرفع..." : "رفع والإضافة"}
          </button>

          {bulkResults.success.length > 0 && (
            <div className="success-box">✅ تمت إضافة {bulkResults.success.length} مدير مدرسة بنجاح</div>
          )}
          {bulkResults.errors.length > 0 && (
            <div className="error-box">
              ❌ فشلت إضافة {bulkResults.errors.length} مدير مدرسة
              <ul>
                {bulkResults.errors.map((e, idx) => (
                  <li key={idx}><strong>{e.email}</strong> : {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
