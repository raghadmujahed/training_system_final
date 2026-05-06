import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser, createUser, updateUser } from "../../../services/api";
import { useTrainingSites, useRoles } from "../../../hooks/useSharedData";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";

export default function AddCounselor() {
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
  const adviserRoleId = roles.find((role) => role.name === "adviser")?.id;

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
            training_site_id: userData.training_site_id || "",
            role_id: userData.role_id || "",
            status: userData.status || "active",
          });
        } catch (err) { console.error(err); }
      };
      fetchUser();
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setBulkResults({ success: [], errors: [] });
  };

  const processExcel = async () => {
    if (!file) { toast.warning("الرجاء اختيار ملف Excel أولاً"); return; }
    if (!adviserRoleId) { toast.error("تعذر تحديد دور المرشد التربوي من قاعدة البيانات"); return; }
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

        // بناء خريطة اسم موقع التدريب -> ID (مع تجاهل حالة الأحرف)
        const siteMap = {};
        trainingSites.forEach(site => {
          const normalized = site.name.trim();
          siteMap[normalized] = site.id;
          siteMap[normalized.toLowerCase()] = site.id;
        });

        const counselors = cleanRows.map(row => {
          let siteName = (row["مكان العمل"] || row["institution_name"] || row["المدرسة"] || "").trim();
          let trainingSiteId = siteMap[siteName];
          if (!trainingSiteId) trainingSiteId = siteMap[siteName.toLowerCase()];

          return {
            name: row["الاسم الكامل"] || row["name"] || "",
            email: row["البريد الإلكتروني"] || row["email"] || "",
            phone: row["رقم الهاتف"] || row["phone"] || "",
            password: row["كلمة المرور"] || row["password"] || "12345678",
            password_confirmation: row["كلمة المرور"] || row["password"] || "12345678",
            training_site_id: trainingSiteId,
            role_id: adviserRoleId,
            status: "active",
          };
        });

        const validCounselors = [];
        const invalidCounselors = [];

        counselors.forEach((counselor, idx) => {
          const missing = [];
          if (!counselor.training_site_id) missing.push("مكان العمل (غير موجود أو غير مطابق)");
          if (!counselor.email) missing.push("البريد الإلكتروني");

          if (missing.length === 0) {
            validCounselors.push(counselor);
          } else {
            invalidCounselors.push({
              row: idx + 2,
              email: counselor.email || "غير معروف",
              missing,
            });
          }
        });

        if (invalidCounselors.length > 0) {
          toast.warning(`${invalidCounselors.length} صف يحتوي بيانات ناقصة وتم تجاهله`);
        }

        if (validCounselors.length === 0) {
          setBulkLoading(false);
          return;
        }

        const successList = [];
        const errorList = [];

        for (const counselor of validCounselors) {
          try {
            const response = await createUser(counselor);
            successList.push({ email: counselor.email, id: response.data?.id });
          } catch (err) {
            const msg = err.response?.data?.message || err.message;
            errorList.push({ email: counselor.email, error: msg });
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
    setLoading(true);
    setErrors({});

    try {
      if (!adviserRoleId) {
        toast.error("تعذر تحديد دور المرشد التربوي من قاعدة البيانات");
        setLoading(false);
        return;
      }
      const payload = { ...form, role_id: adviserRoleId };

      if (id) {
        await updateUser(id, payload);
        toast.success("تم تحديث المرشد بنجاح");
        setTimeout(() => navigate("/admin/users"), 1500);
      } else {
        await createUser(payload);
        toast.success("تمت إضافة المرشد بنجاح");
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
          <h1>تعديل مرشد</h1>
          <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>الاسم الكامل *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
            {errors.name && <span className="error">{errors.name[0]}</span>}
          </div>
          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
            {errors.email && <span className="error">{errors.email[0]}</span>}
          </div>
          <div className="form-group">
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
            {errors.phone && <span className="error">{errors.phone[0]}</span>}
          </div>
          <div className="form-group">
            <label>مكان العمل *</label>
            <select name="training_site_id" value={form.training_site_id} onChange={handleChange} required>
              <option value="">اختر مكان العمل</option>
              {trainingSites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
            {errors.training_site_id && <span className="error">{errors.training_site_id[0]}</span>}
          </div>
          <div className="form-group">
            <label>كلمة المرور (اتركها فارغة إذا لم ترد التغيير)</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} />
            {errors.password && <span className="error">{errors.password[0]}</span>}
          </div>
          <div className="form-group">
            <label>تأكيد كلمة المرور</label>
            <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} />
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
        <h1>إضافة مرشد جديد</h1>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "single" ? "tab-active" : "tab"}
          onClick={() => setActiveTab("single")}
        >
          إضافة مرشد واحد
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
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
            {errors.name && <span className="error">{errors.name[0]}</span>}
          </div>
          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
            {errors.email && <span className="error">{errors.email[0]}</span>}
          </div>
          <div className="form-group">
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
            {errors.phone && <span className="error">{errors.phone[0]}</span>}
          </div>
          <div className="form-group">
            <label>مكان العمل *</label>
            <select name="training_site_id" value={form.training_site_id} onChange={handleChange} required>
              <option value="">اختر مكان العمل</option>
              {trainingSites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
            {errors.training_site_id && <span className="error">{errors.training_site_id[0]}</span>}
          </div>
          <div className="form-group">
            <label>كلمة المرور *</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
            {errors.password && <span className="error">{errors.password[0]}</span>}
          </div>
          <div className="form-group">
            <label>تأكيد كلمة المرور *</label>
            <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} required />
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
            <li><strong>القسم</strong> (اختياري)</li>
            <li><strong>كلمة المرور</strong> (اختياري، افتراضي 12345678)</li>
          </ul>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          <button onClick={processExcel} disabled={bulkLoading} className="btn-primary">
            {bulkLoading ? "جاري الرفع..." : "رفع والإضافة"}
          </button>

          {bulkResults.success.length > 0 && (
            <div className="success-box">✅ تمت إضافة {bulkResults.success.length} مرشد بنجاح</div>
          )}
          {bulkResults.errors.length > 0 && (
            <div className="error-box">
              ❌ فشلت إضافة {bulkResults.errors.length} مرشد
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
