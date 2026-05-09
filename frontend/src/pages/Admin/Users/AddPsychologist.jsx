import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser, createUser, updateUser } from "../../../services/api";
import { useDepartments, useTrainingSites, useRoles } from "../../../hooks/useSharedData";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";
import { isValidPhone, getPhoneErrorMessage, isValidEmail, getEmailErrorMessage, isValidPassword, getPasswordErrorMessage } from "../../../utils/validation";

export default function AddPsychologist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("single");
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { data: departments } = useDepartments();
  const { data: allSites } = useTrainingSites({ per_page: 200 });
  const trainingSites = allSites.filter((s) => s.site_type === "health_center" || s.site_type === "clinic");
  const { data: roles } = useRoles({ per_page: 200 });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    department_id: "",
    training_site_id: "",
    role_id: "",
    status: "active",
  });
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState({ success: [], errors: [] });
  const isEditMode = !!id;
  const psychologistRoleId = roles.find((role) => role.name === "psychologist")?.id;

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
            training_site_id: userData.training_site_id || "",
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
      newErrors.training_site_id = "مكان العمل / المركز مطلوب";
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
    if (!psychologistRoleId) { toast.error("تعذر تحديد دور الأخصائي النفسي من قاعدة البيانات"); return; }
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

        const cleanRows = rows.map((row) => {
          const clean = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim();
            clean[cleanKey] = row[key];
          });
          return clean;
        });

        const departmentMap = {};
        departments.forEach((dept) => {
          const normalized = dept.name.trim();
          departmentMap[normalized] = dept.id;
          departmentMap[normalized.toLowerCase()] = dept.id;
        });

        const siteMap = {};
        trainingSites.forEach((site) => {
          const normalized = site.name.trim();
          siteMap[normalized] = site.id;
          siteMap[normalized.toLowerCase()] = site.id;
        });

        const arabicToEnglish = {
          "علم النفس": "psychology",
          التربية: "usool_tarbiah",
          "أصول التربية": "usool_tarbiah",
          الإدارة: "administration",
          إدارة: "administration",
        };

        Object.keys(arabicToEnglish).forEach((arabicName) => {
          const englishName = arabicToEnglish[arabicName];
          if (departmentMap[englishName]) {
            departmentMap[arabicName] = departmentMap[englishName];
            departmentMap[arabicName.toLowerCase()] = departmentMap[englishName];
          }
        });

        const psychologists = cleanRows.map((row) => {
          let deptName = (row["القسم"] || row["department"] || "").trim();
          let departmentId = departmentMap[deptName];
          if (!departmentId) departmentId = departmentMap[deptName.toLowerCase()];
          const siteName = (row["مكان العمل"] || row["المركز"] || row["training_site"] || "").trim();
          const trainingSiteId = siteMap[siteName] || siteMap[siteName.toLowerCase()] || "";

          return {
            name: row["الاسم الكامل"] || row["name"] || "",
            email: row["البريد الإلكتروني"] || row["email"] || "",
            phone: row["رقم الهاتف"] || row["phone"] || "",
            password: row["كلمة المرور"] || row["password"] || "12345678",
            password_confirmation: row["كلمة المرور"] || row["password"] || "12345678",
            department_id: departmentId,
            training_site_id: trainingSiteId,
            role_id: psychologistRoleId,
            status: "active",
          };
        });

        const validPsychologists = [];
        const invalidPsychologists = [];

        psychologists.forEach((psych, idx) => {
          const missing = [];
          if (!psych.name) missing.push("الاسم الكامل");
          if (!psych.email) missing.push("البريد الإلكتروني");
          if (!psych.training_site_id) missing.push("مكان العمل / المركز");

          if (missing.length === 0) {
            validPsychologists.push(psych);
          } else {
            invalidPsychologists.push({
              row: idx + 2,
              email: psych.email || "غير معروف",
              missing,
            });
          }
        });

        if (invalidPsychologists.length > 0) {
          toast.warning(`${invalidPsychologists.length} صف يحتوي بيانات ناقصة وتم تجاهله`);
        }

        if (validPsychologists.length === 0) {
          setBulkLoading(false);
          return;
        }

        const successList = [];
        const errorList = [];

        for (const row of validPsychologists) {
          try {
            const psych = {
              ...row,
              training_site_id: row.training_site_id ? Number(row.training_site_id) : null,
            };
            const response = await createUser(psych);
            successList.push({ email: psych.email, id: response.data?.id });
          } catch (err) {
            const msg = err.response?.data?.message || err.message;
            errorList.push({ email: row.email, error: msg });
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

    try {
      if (!psychologistRoleId) {
        toast.error("تعذر تحديد دور الأخصائي النفسي من قاعدة البيانات");
        setLoading(false);
        return;
      }

      if (!validateForm()) {
        setLoading(false);
        toast.error("يرجى تصحيح الأخطاء قبل المتابعة");
        return;
      }

      const payload = {
        ...form,
        role_id: psychologistRoleId,
        training_site_id: form.training_site_id ? Number(form.training_site_id) : null,
      };

      if (id) {
        await updateUser(id, payload);
        toast.success("تم تحديث الأخصائي النفسي بنجاح");
        setTimeout(() => navigate("/admin/users"), 1500);
      } else {
        await createUser(payload);
        toast.success("تمت إضافة الأخصائي النفسي بنجاح");
        setForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          password_confirmation: "",
          department_id: "",
          training_site_id: "",
          role_id: "",
          status: "active",
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

  const siteSelect = (required) => (
    <div className="form-group">
      <label>مكان العمل / المركز الصحي{required ? " *" : ""}</label>
      <select
        name="training_site_id"
        value={form.training_site_id}
        onChange={handleChange}
        onBlur={handleChange}
        className={errors.training_site_id ? 'border-red-500' : ''}
        required={required}
      >
        <option value="">اختر المركز الصحي</option>
        {trainingSites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
      {errors.training_site_id && <span className="error">{Array.isArray(errors.training_site_id) ? errors.training_site_id[0] : errors.training_site_id}</span>}
    </div>
  );

  if (isEditMode) {
    return (
      <div className="user-form">
        <div className="page-header">
          <h1>تعديل أخصائي نفسي</h1>
          <button onClick={() => navigate("/admin/users")} className="btn-secondary">
            رجوع
          </button>
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
            <label>القسم (اختياري)</label>
            <select name="department_id" value={form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.department_id ? 'border-red-500' : ''}>
              <option value="">اختر القسم</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.department_id && <span className="error">{Array.isArray(errors.department_id) ? errors.department_id[0] : errors.department_id}</span>}
          </div>
          {siteSelect(false)}
          <div className="form-group">
            <label>كلمة المرور (اتركها فارغة إذا لم ترد التغيير)</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} onBlur={handleChange} className={errors.password ? 'border-red-500' : ''} />
            {errors.password && <span className="error">{Array.isArray(errors.password) ? errors.password[0] : errors.password}</span>}
          </div>
          <div className="form-group">
            <label>تأكيد كلمة المرور</label>
            <input
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              onBlur={handleChange}
              className={errors.password_confirmation ? 'border-red-500' : ''}
            />
            {errors.password_confirmation && <span className="error">{Array.isArray(errors.password_confirmation) ? errors.password_confirmation[0] : errors.password_confirmation}</span>}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "تحديث"}
            </button>
            <button type="button" onClick={() => navigate("/admin/users")}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="user-form">
      <div className="page-header">
        <h1>إضافة أخصائي نفسي جديد</h1>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary">
          رجوع
        </button>
      </div>

      <div className="tabs">
        <button className={activeTab === "single" ? "tab-active" : "tab"} onClick={() => setActiveTab("single")}>
          إضافة أخصائي واحد
        </button>
        <button className={activeTab === "bulk" ? "tab-active" : "tab"} onClick={() => setActiveTab("bulk")}>
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
            <label>القسم (اختياري)</label>
            <select name="department_id" value={form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.department_id ? 'border-red-500' : ''}>
              <option value="">اختر القسم</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.department_id && <span className="error">{Array.isArray(errors.department_id) ? errors.department_id[0] : errors.department_id}</span>}
          </div>
          {siteSelect(true)}
          <div className="form-group">
            <label>كلمة المرور *</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} onBlur={handleChange} className={errors.password ? 'border-red-500' : ''} required />
            {errors.password && <span className="error">{Array.isArray(errors.password) ? errors.password[0] : errors.password}</span>}
          </div>
          <div className="form-group">
            <label>تأكيد كلمة المرور *</label>
            <input
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              onBlur={handleChange}
              className={errors.password_confirmation ? 'border-red-500' : ''}
              required
            />
            {errors.password_confirmation && <span className="error">{Array.isArray(errors.password_confirmation) ? errors.password_confirmation[0] : errors.password_confirmation}</span>}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "إضافة"}
            </button>
            <button type="button" onClick={() => navigate("/admin/users")}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      {activeTab === "bulk" && (
        <div className="bulk-section">
          <p>قم بتحميل ملف Excel يحتوي على الأعمدة التالية:</p>
          <ul>
            <li>
              <strong>الاسم الكامل</strong> (مطلوب)
            </li>
            <li>
              <strong>البريد الإلكتروني</strong> (مطلوب)
            </li>
            <li>
              <strong>رقم الهاتف</strong> (اختياري)
            </li>
            <li>
              <strong>القسم</strong> (اختياري)
            </li>
            <li>
              <strong>مكان العمل / المركز</strong> (مطلوب)
            </li>
            <li>
              <strong>كلمة المرور</strong> (اختياري، افتراضي 12345678)
            </li>
          </ul>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          <button onClick={processExcel} disabled={bulkLoading} className="btn-primary">
            {bulkLoading ? "جاري الرفع..." : "رفع والإضافة"}
          </button>

          {bulkResults.success.length > 0 && (
            <div className="success-box">✅ تمت إضافة {bulkResults.success.length} أخصائي نفسي بنجاح</div>
          )}
          {bulkResults.errors.length > 0 && (
            <div className="error-box">
              ❌ فشلت إضافة {bulkResults.errors.length} أخصائي نفسي
              <ul>
                {bulkResults.errors.map((e, idx) => (
                  <li key={idx}>
                    <strong>{e.email}</strong> : {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
