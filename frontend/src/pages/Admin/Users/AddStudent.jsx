import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser, createUser, updateUser } from "../../../services/api";
import { useDepartments } from "../../../hooks/useSharedData";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";
import MajorSelect from "../../../components/common/MajorSelect";
import { getMajorsForDepartment, isValidMajor, resolveMajor } from "../../../constants/academicMajors";
import {
  isValidEmail,
  isValidStudentEmail,
  getStudentEmailErrorMessage,
  isValidPassword,
  getPasswordErrorMessage,
  isValidUniversityId,
  getUniversityIdErrorMessage,
  trimInput,
} from "../../../utils/validation";

export default function AddStudent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("single");
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { data: departments } = useDepartments();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    university_id: "",
    major: "",
    department_id: "",
    role_id: 2,
    status: "active",
  });
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState({ success: [], errors: [] });
  const isEditMode = !!id;

  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        try {
          const userData = await getUser(id);
          setForm({
            name: userData.name || "",
            email: userData.email || "",
            password: "",
            password_confirmation: "",
            university_id: userData.university_id || "",
            department_id: userData.department_id || "",
            major: resolveMajor(userData.major, userData.department_id, departments),
            role_id: userData.role_id || 2,
            status: userData.status || "active",
          });
        } catch (err) {
          console.error(err);
        }
      };
      fetchUser();
    }
  }, [id, departments]);

  const availableMajors = getMajorsForDepartment(form.department_id, departments);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "department_id") {
      const majors = getMajorsForDepartment(value, departments);
      setForm((prev) => ({
        ...prev,
        department_id: value,
        major: majors.includes(prev.major) ? prev.major : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) setErrors({ ...errors, [name]: null });
    if (name === "department_id" && errors.major) {
      setErrors((prev) => ({ ...prev, major: null }));
    }
    validateField(name, value);
  };

  const validateField = (fieldName, value) => {
    let error = null;

    switch (fieldName) {
      case "email":
        if (value && !isValidEmail(value)) {
          error = "صيغة البريد الإلكتروني غير صحيحة";
        } else if (value && !isValidStudentEmail(value)) {
          error = getStudentEmailErrorMessage();
        }
        break;
      case "university_id":
        if (value && !isValidUniversityId(value)) {
          error = getUniversityIdErrorMessage();
        }
        break;
      case "password":
        if (value && !isEditMode && !isValidPassword(value)) {
          error = getPasswordErrorMessage();
        }
        break;
      case "password_confirmation":
        if (value && form.password && value !== form.password) {
          error = "كلمتا المرور غير متطابقتين";
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

    // Required fields
    if (!form.name.trim()) {
      newErrors.name = "الاسم مطلوب";
    }

    if (!form.email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!isValidEmail(form.email)) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    } else if (!isValidStudentEmail(form.email)) {
      newErrors.email = getStudentEmailErrorMessage();
    }

    if (!form.university_id.trim()) {
      newErrors.university_id = "الرقم الجامعي مطلوب";
    } else if (!isValidUniversityId(form.university_id)) {
      newErrors.university_id = getUniversityIdErrorMessage();
    }

    if (!form.department_id) {
      newErrors.department_id = "القسم مطلوب";
    }

    if (!form.department_id) {
      // department_id error already set
    } else if (!availableMajors.length) {
      newErrors.major = "لا تتوفر تخصصات لهذا القسم";
    } else if (!form.major.trim()) {
      newErrors.major = "التخصص مطلوب";
    } else if (!isValidMajor(form.major, form.department_id, departments)) {
      newErrors.major = "اختر تخصصاً مناسباً للقسم المختار";
    }

    // Password validation for new students
    if (!isEditMode) {
      if (!form.password) {
        newErrors.password = "كلمة المرور مطلوبة";
      } else if (!isValidPassword(form.password)) {
        newErrors.password = getPasswordErrorMessage();
      }

      if (!form.password_confirmation) {
        newErrors.password_confirmation = "تأكيد كلمة المرور مطلوب";
      } else if (form.password !== form.password_confirmation) {
        newErrors.password_confirmation = "كلمتا المرور غير متطابقتين";
      }
    } else {
      // For edit mode, only validate if password is provided
      if (form.password && !isValidPassword(form.password)) {
        newErrors.password = getPasswordErrorMessage();
      }
      if (form.password && form.password !== form.password_confirmation) {
        newErrors.password_confirmation = "كلمتا المرور غير متطابقتين";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrors({});

    // Frontend validation
    if (!validateForm()) {
      setLoading(false);
      toast.error("يرجى تصحيح الأخطاء قبل المتابعة");
      return;
    }

    const formToSend = {
      ...form,
      university_id: String(form.university_id || ""),
      name: trimInput(form.name),
      email: trimInput(form.email),
      major: trimInput(form.major),
    };

    // Remove password_confirmation — not accepted by update endpoint
    delete formToSend.password_confirmation;

    // Remove empty password so backend doesn't try to hash it
    if (!formToSend.password) delete formToSend.password;


    try {
      if (id) {
        await updateUser(id, formToSend);
        toast.success("تم تحديث الطالب بنجاح");
      } else {
        await createUser(formToSend);
        toast.success("تمت إضافة الطالب بنجاح");
        setForm({ name: "", email: "", password: "", password_confirmation: "", university_id: "", major: "", department_id: "", role_id: 2, status: "active" });
      }
      setTimeout(() => navigate("/admin/users"), 1500);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        toast.error("فشل الحفظ: " + Object.values(err.response.data.errors).flat().join(", "));
      } else {
        toast.apiError(err, "حدث خطأ غير متوقع أثناء حفظ المستخدم");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setBulkResults({ success: [], errors: [] });
  };

  const processExcel = async () => {
    if (!file) { toast.warning("الرجاء اختيار ملف Excel أولاً"); return; }
    setBulkLoading(true);
    setBulkResults({ success: [], errors: [] });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (rows.length === 0) { toast.warning("الملف فارغ"); setBulkLoading(false); return; }

        const departmentMap = {};
        departments.forEach(dept => { 
          departmentMap[dept.name.trim()] = dept.id; 
          departmentMap[dept.name.trim().toLowerCase()] = dept.id; 
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
        
        const students = rows.map((row) => {
          const clean = {};
          Object.keys(row).forEach(key => { clean[key.trim()] = row[key]; });
          const deptName = String(clean["القسم"] || clean["قسم"] || clean["department"] || "").trim();
          const deptId = departmentMap[deptName] || departmentMap[deptName.toLowerCase()] || "";

          return {
            name: clean["الاسم الكامل"] || clean["الاسم"] || clean["name"] || "",
            email: clean["البريد الإلكتروني"] || clean["البريد"] || clean["email"] || "",
            password: clean["كلمة المرور"] || clean["password"] || "12345678",
            password_confirmation: clean["كلمة المرور"] || clean["password"] || "12345678",
            university_id: String(clean["الرقم الجامعي"] || clean["university_id"] || ""),
            department_id: deptId,
            major: resolveMajor(clean["التخصص"] || clean["major"] || "", deptId, departments),
            role_id: 2,
            status: "active",
          };
        });

        const validStudents = [], invalidStudents = [];
        students.forEach((s, idx) => {
          const missing = [];
          if (!s.name) missing.push("الاسم");
          if (!s.email) missing.push("البريد");
          if (!s.university_id) missing.push("الرقم الجامعي");
          if (!s.department_id || s.department_id === "") missing.push("القسم");
          if (!s.major) missing.push("التخصص");
          missing.length === 0 ? validStudents.push(s) : invalidStudents.push({ row: idx + 2, email: s.email || "غير معروف", missing });
        });

        if (invalidStudents.length > 0) {
          toast.warning(`${invalidStudents.length} صف يحتوي بيانات ناقصة وتم تجاهله`);
        }
        if (validStudents.length === 0) { setBulkLoading(false); return; }

        const successList = [], errorList = [];
        const BATCH_SIZE = 50; // Process 50 students at a time
        
        // Process in batches for better performance
        for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
          const batch = validStudents.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(async (student) => {
            try {
              await createUser(student);
              return { success: true, email: student.email };
            } catch (err) {
              return { success: false, email: student.email, error: err.response?.data?.message || err.message };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach(result => {
            if (result.success) {
              successList.push({ email: result.email });
            } else {
              errorList.push({ email: result.email, error: result.error });
            }
          });
          
          // Update progress
          const processedCount = Math.min(i + BATCH_SIZE, validStudents.length);
          toast.info(`تم معالجة ${processedCount} من ${validStudents.length} طالب...`);
        }
        
        setBulkResults({ success: successList, errors: errorList });
        if (successList.length) setFile(null);
      } catch (err) { toast.apiError(err, "خطأ في معالجة الملف"); }
      finally { setBulkLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isEditMode) {
    return (
      <div className="user-form">
        <div className="page-header">
          <h1>تعديل طالب</h1>
          <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group"><label>الاسم الكامل *</label><input type="text" id="name" name="name" value={form.name} onChange={handleChange} onBlur={handleChange} className={errors.name ? 'border-red-500' : ''} required />{errors.name && <span className="error">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</span>}</div>
          <div className="form-group"><label>البريد الإلكتروني *</label><input type="email" id="email" name="email" value={form.email} onChange={handleChange} onBlur={handleChange} className={errors.email ? 'border-red-500' : ''} required placeholder="يجب أن ينتهي بـ @students.hebron.edu" />{errors.email && <span className="error">{Array.isArray(errors.email) ? errors.email[0] : errors.email}</span>}</div>
          <div className="form-group"><label>الرقم الجامعي *</label><input type="text" id="university_id" name="university_id" value={form.university_id} onChange={handleChange} onBlur={handleChange} className={errors.university_id ? 'border-red-500' : ''} required placeholder="أرقام فقط (6-20 رقم)" />{errors.university_id && <span className="error">{Array.isArray(errors.university_id) ? errors.university_id[0] : errors.university_id}</span>}</div>
          <div className="form-group"><label>القسم</label><select id="department_id" name="department_id" value={form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.department_id ? 'border-red-500' : ''}><option value="">اختر القسم</option>{departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select>{errors.department_id && <span className="error">{Array.isArray(errors.department_id) ? errors.department_id[0] : errors.department_id}</span>}</div>
          <div className="form-group"><label>التخصص *</label><MajorSelect value={form.major} majors={availableMajors} disabled={!form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.major ? "border-red-500" : ""} required />{errors.major && <span className="error">{Array.isArray(errors.major) ? errors.major[0] : errors.major}</span>}</div>
          <div className="form-group"><label>كلمة المرور (اتركها فارغة إذا لم ترد التغيير)</label><input type="password" id="password" name="password" value={form.password} onChange={handleChange} onBlur={handleChange} className={errors.password ? 'border-red-500' : ''} placeholder="8 أحرف على الأقل" />{errors.password && <span className="error">{Array.isArray(errors.password) ? errors.password[0] : errors.password}</span>}</div>
          <div className="form-group"><label>تأكيد كلمة المرور</label><input type="password" id="password_confirmation" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} onBlur={handleChange} className={errors.password_confirmation ? 'border-red-500' : ''} />{errors.password_confirmation && <span className="error">{Array.isArray(errors.password_confirmation) ? errors.password_confirmation[0] : errors.password_confirmation}</span>}</div>
          <div className="form-actions"><button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : "تحديث"}</button><button type="button" onClick={() => navigate("/admin/users")}>إلغاء</button></div>
        </form>
      </div>
    );
  }

  return (
    <div className="user-form">
      <div className="page-header">
        <h1>إضافة طالب جديد</h1>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
      </div>
      <div className="tabs">
        <button className={activeTab === "single" ? "tab-active" : "tab"} onClick={() => setActiveTab("single")}>إضافة طالب واحد</button>
        <button className={activeTab === "bulk" ? "tab-active" : "tab"} onClick={() => setActiveTab("bulk")}>رفع مجموعة من ملف Excel</button>
      </div>
      {activeTab === "single" && (
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group"><label>الاسم الكامل *</label><input type="text" id="name" name="name" value={form.name} onChange={handleChange} onBlur={handleChange} className={errors.name ? 'border-red-500' : ''} required />{errors.name && <span className="error">{Array.isArray(errors.name) ? errors.name[0] : errors.name}</span>}</div>
          <div className="form-group"><label>البريد الإلكتروني *</label><input type="email" id="email" name="email" value={form.email} onChange={handleChange} onBlur={handleChange} className={errors.email ? 'border-red-500' : ''} required placeholder="يجب أن ينتهي بـ @students.hebron.edu" />{errors.email && <span className="error">{Array.isArray(errors.email) ? errors.email[0] : errors.email}</span>}</div>
          <div className="form-group"><label>الرقم الجامعي *</label><input type="text" id="university_id" name="university_id" value={form.university_id} onChange={handleChange} onBlur={handleChange} className={errors.university_id ? 'border-red-500' : ''} required placeholder="أرقام فقط (6-20 رقم)" />{errors.university_id && <span className="error">{Array.isArray(errors.university_id) ? errors.university_id[0] : errors.university_id}</span>}</div>
          <div className="form-group"><label>القسم *</label><select id="department_id" name="department_id" value={form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.department_id ? 'border-red-500' : ''} required><option value="">اختر القسم</option>{departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select>{errors.department_id && <span className="error">{Array.isArray(errors.department_id) ? errors.department_id[0] : errors.department_id}</span>}</div>
          <div className="form-group"><label>التخصص *</label><MajorSelect value={form.major} majors={availableMajors} disabled={!form.department_id} onChange={handleChange} onBlur={handleChange} className={errors.major ? "border-red-500" : ""} required />{errors.major && <span className="error">{Array.isArray(errors.major) ? errors.major[0] : errors.major}</span>}</div>
          <div className="form-group"><label>كلمة المرور *</label><input type="password" id="password" name="password" value={form.password} onChange={handleChange} onBlur={handleChange} className={errors.password ? 'border-red-500' : ''} required placeholder="8 أحرف على الأقل" />{errors.password && <span className="error">{Array.isArray(errors.password) ? errors.password[0] : errors.password}</span>}</div>
          <div className="form-group"><label>تأكيد كلمة المرور *</label><input type="password" id="password_confirmation" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} onBlur={handleChange} className={errors.password_confirmation ? 'border-red-500' : ''} required />{errors.password_confirmation && <span className="error">{Array.isArray(errors.password_confirmation) ? errors.password_confirmation[0] : errors.password_confirmation}</span>}</div>
          <div className="form-actions"><button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : "إضافة"}</button><button type="button" onClick={() => navigate("/admin/users")}>إلغاء</button></div>
        </form>
      )}
      {activeTab === "bulk" && (
        <div className="bulk-section">
          <p>قم بتحميل ملف Excel يحتوي على الأعمدة التالية:</p>
          <ul>
            <li><strong>الاسم الكامل</strong> (مطلوب)</li>
            <li><strong>البريد الإلكتروني</strong> (مطلوب)</li>
            <li><strong>الرقم الجامعي</strong> (مطلوب)</li>
            <li><strong>القسم</strong> (مطلوب)</li>
            <li><strong>التخصص</strong> (مطلوب — حسب القسم: أساليب تدريس / مرحلة أساسية أو علم نفس)</li>
            <li><strong>كلمة المرور</strong> (اختياري، افتراضي 12345678)</li>
          </ul>
          <input type="file" id="bulk-file" name="bulk_file" accept=".xlsx, .xls" onChange={handleFileChange} />
          <button onClick={processExcel} disabled={bulkLoading} className="btn-primary">{bulkLoading ? "جاري الرفع..." : "رفع والإضافة"}</button>
          {bulkResults.success.length > 0 && <div className="success-box">✅ تمت إضافة {bulkResults.success.length} طالب بنجاح</div>}
          {bulkResults.errors.length > 0 && <div className="error-box">❌ فشلت إضافة {bulkResults.errors.length} طالب<ul>{bulkResults.errors.map((e, idx) => <li key={idx}><strong>{e.email}</strong> : {e.error}</li>)}</ul></div>}
        </div>
      )}
    </div>
  );
}
