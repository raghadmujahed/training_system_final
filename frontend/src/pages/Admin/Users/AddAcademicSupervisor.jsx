import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser, createUser, updateUser } from "../../../services/api";
import { useDepartments, useRoles } from "../../../hooks/useSharedData";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";
import { isValidMobilePhone, getMobilePhoneErrorMessage, isValidEmail, getEmailErrorMessage, isValidPassword, getPasswordErrorMessage } from "../../../utils/validation";

export default function AddAcademicSupervisor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("single");
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { data: departments } = useDepartments();
  const { data: roles } = useRoles({ per_page: 200 });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    department_id: "",
    role_id: "",
    status: "active",
  });
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState({ success: [], errors: [] });
  const isEditMode = !!id;
  const academicSupervisorRoleId = roles.find((role) => role.name === "academic_supervisor")?.id;


  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        try {
          const userData = await getUser(id);
          setForm({
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            password: "",
            password_confirmation: "",
            department_id: userData.department_id || "",
            role_id: userData.role_id || "",
            status: userData.status || "active",
          });
        } catch (err) {
          console.error(err);
        }
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
        if (value && !isValidMobilePhone(value)) {
          error = getMobilePhoneErrorMessage();
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

    if (form.phone && !isValidMobilePhone(form.phone)) {
      newErrors.phone = getMobilePhoneErrorMessage();
    }

    if (!form.department_id) {
      newErrors.department_id = "القسم مطلوب";
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
    if (!academicSupervisorRoleId) { toast.error("تعذر تحديد دور المشرف الأكاديمي من قاعدة البيانات"); return; }
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

        const departmentMap = {};
        departments.forEach(dept => {
          const normalized = dept.name.trim();
          departmentMap[normalized] = dept.id;
          departmentMap[normalized.toLowerCase()] = dept.id;
        });
        
        // Add Arabic to English mapping
        const arabicToEnglish = {
          "علم النفس": "psychology",
          "التربية": "usool_tarbiah", 
          "أصول التربية": "usool_tarbiah",
          "الإدارة": "administration",
          "إدارة": "administration"
        };
        
        // Add Arabic mappings to departmentMap
        Object.keys(arabicToEnglish).forEach(arabicName => {
          const englishName = arabicToEnglish[arabicName];
          if (departmentMap[englishName]) {
            departmentMap[arabicName] = departmentMap[englishName];
            departmentMap[arabicName.toLowerCase()] = departmentMap[englishName];
          }
        });

        const supervisors = cleanRows.map(row => {
          let deptName = (row["القسم"] || row["department"] || "").trim();
          let departmentId = departmentMap[deptName];
          if (!departmentId) departmentId = departmentMap[deptName.toLowerCase()];

          return {
            name: row["الاسم الكامل"] || row["name"] || "",
            email: row["البريد الإلكتروني"] || row["email"] || "",
            phone: row["رقم الهاتف"] || row["phone"] || "",
            password: row["كلمة المرور"] || row["password"] || "12345678",
            password_confirmation: row["كلمة المرور"] || row["password"] || "12345678",
            department_id: departmentId,
            role_id: academicSupervisorRoleId,
            status: "active",
          };
        });

        const validSupervisors = [];
        const invalidSupervisors = [];

        supervisors.forEach((sup, idx) => {
          const missing = [];
          if (!sup.name) missing.push("الاسم الكامل");
          if (!sup.email) missing.push("البريد الإلكتروني");
          if (!sup.department_id) missing.push("القسم (غير موجود أو غير مطابق)");

          if (missing.length === 0) {
            validSupervisors.push(sup);
          } else {
            invalidSupervisors.push({
              row: idx + 2,
              email: sup.email || "غير معروف",
              missing,
            });
          }
        });

        if (invalidSupervisors.length > 0) {
          toast.warning(`${invalidSupervisors.length} صف يحتوي بيانات ناقصة وتم تجاهله`);
        }

        if (validSupervisors.length === 0) {
          setBulkLoading(false);
          return;
        }

        const successList = [];
        const errorList = [];
        const BATCH_SIZE = 50; // Process 50 supervisors at a time

        // Process in batches for better performance
        for (let i = 0; i < validSupervisors.length; i += BATCH_SIZE) {
          const batch = validSupervisors.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(async (supervisor) => {
            try {
              const response = await createUser(supervisor);
              return { success: true, email: supervisor.email, id: response.data?.id };
            } catch (err) {
              const msg = err.response?.data?.message || err.message;
              return { success: false, email: supervisor.email, error: msg };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach(result => {
            if (result.success) {
              successList.push({ email: result.email, id: result.id });
            } else {
              errorList.push({ email: result.email, error: result.error });
            }
          });
          
          // Update progress
          toast.info(`تم معالجة ${Math.min(i + BATCH_SIZE, validSupervisors.length)} من ${validSupervisors.length} مشرف أكاديمي...`);
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

    try {
      if (!academicSupervisorRoleId) {
        toast.error("تعذر تحديد دور المشرف الأكاديمي من قاعدة البيانات");
        setLoading(false);
        return;
      }

      if (!validateForm()) {
        setLoading(false);
        toast.error("يرجى تصحيح الأخطاء قبل المتابعة");
        return;
      }

      const payload = { ...form, role_id: academicSupervisorRoleId };

      if (id) {
        await updateUser(id, payload);
        toast.success("تم تحديث المشرف الأكاديمي بنجاح");
        setTimeout(() => navigate("/admin/users"), 1500);
      } else {
        await createUser(payload);
        toast.success("تمت إضافة المشرف الأكاديمي بنجاح");
        setForm({
          name: "", email: "", phone: "", password: "", password_confirmation: "",
          department_id: "", role_id: "", status: "active",
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
          <h1>تعديل مشرف أكاديمي</h1>
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
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} onBlur={handleChange} className={errors.phone ? 'border-red-500' : ''} />
            {errors.phone && <span className="error">{Array.isArray(errors.phone) ? errors.phone[0] : errors.phone}</span>}
          </div>
          <div className="form-group">
            <label>القسم *</label>
            <select name="department_id" value={form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.department_id ? 'border-red-500' : ''} required>
              <option value="">اختر القسم</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            {errors.department_id && <span className="error">{Array.isArray(errors.department_id) ? errors.department_id[0] : errors.department_id}</span>}
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
        <h1>إضافة مشرف أكاديمي جديد</h1>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "single" ? "tab-active" : "tab"}
          onClick={() => setActiveTab("single")}
        >
          إضافة مشرف واحد
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
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} onBlur={handleChange} className={errors.phone ? 'border-red-500' : ''} />
            {errors.phone && <span className="error">{Array.isArray(errors.phone) ? errors.phone[0] : errors.phone}</span>}
          </div>
          <div className="form-group">
            <label>القسم *</label>
            <select name="department_id" value={form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.department_id ? 'border-red-500' : ''} required>
              <option value="">اختر القسم</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            {errors.department_id && <span className="error">{Array.isArray(errors.department_id) ? errors.department_id[0] : errors.department_id}</span>}
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
            <li><strong>القسم</strong> (مطلوب، يجب أن يطابق اسم القسم في قاعدة البيانات)</li>
            <li><strong>كلمة المرور</strong> (اختياري، افتراضي 12345678)</li>
          </ul>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          <button onClick={processExcel} disabled={bulkLoading} className="btn-primary">
            {bulkLoading ? "جاري الرفع..." : "رفع والإضافة"}
          </button>

          {bulkResults.success.length > 0 && (
            <div className="success-box">✅ تمت إضافة {bulkResults.success.length} مشرف أكاديمي بنجاح</div>
          )}
          {bulkResults.errors.length > 0 && (
            <div className="error-box">
              ❌ فشلت إضافة {bulkResults.errors.length} مشرف أكاديمي
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
