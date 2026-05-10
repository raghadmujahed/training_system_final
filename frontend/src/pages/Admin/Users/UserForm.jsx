import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser, createUser, updateUser } from "../../../services/api";
import { useRoles, useDepartments } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";
import {
  isValidPhone,
  getPhoneErrorMessage,
  isValidEmail,
  isValidStudentEmail,
  isValidUniversityInternalEmail,
  isValidSchoolFieldEmail,
  getStudentEmailErrorMessage,
  getUniversityInternalEmailErrorMessage,
  getSchoolFieldEmailErrorMessage,
  isValidPassword,
  getPasswordErrorMessage,
  isValidUniversityId,
  getUniversityIdErrorMessage,
  isDigitsOnly,
  getDigitsOnlyErrorMessage,
  trimInput,
} from "../../../utils/validation";

export default function UserForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { data: roles } = useRoles();
  const { data: departments } = useDepartments();
  const [form, setForm] = useState({
    university_id: "",
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role_id: "",
    department_id: "",
    phone: "",
    status: "active",
  });
  const [errors, setErrors] = useState({});

  // إذا كان id موجودًا، نحضر بيانات المستخدم للتعديل
  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        try {
          const userData = await getUser(id);
          setForm({
            university_id: userData.university_id || "",
            name: userData.name,
            email: userData.email,
            password: "",
            password_confirmation: "",
            role_id: userData.role_id || "",
            department_id: userData.department_id || "",
            phone: userData.phone || "",
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
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // إزالة الخطأ عند التعديل
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
    // Real-time validation for specific fields
    validateField(name, value);
  };

  const validateField = (fieldName, value) => {
    const selectedRole = roles.find((r) => r.id === form.role_id);
    const isStudent = selectedRole?.name === "student";
    const isUniversityInternal = ['training_coordinator', 'head_of_department', 'admin', 'academic_supervisor'].includes(selectedRole?.name);
    const isSchoolField = ['school_manager', 'teacher', 'adviser'].includes(selectedRole?.name);
    const isUndecidedDomain = ['psychologist', 'psychology_center_manager', 'education_directorate', 'health_directorate'].includes(selectedRole?.name);

    let error = null;

    switch (fieldName) {
      case "email":
        if (value && !isValidEmail(value)) {
          error = "صيغة البريد الإلكتروني غير صحيحة";
        } else if (isStudent && value && !isValidStudentEmail(value)) {
          error = getStudentEmailErrorMessage();
        } else if (isUniversityInternal && value && !isValidUniversityInternalEmail(value)) {
          error = getUniversityInternalEmailErrorMessage();
        } else if (isSchoolField && value && !isValidSchoolFieldEmail(value)) {
          error = getSchoolFieldEmailErrorMessage();
        }
        // For undecided domain roles, only basic email validation is applied
        break;
      case "phone":
        if (value && !isValidPhone(value)) {
          error = getPhoneErrorMessage();
        }
        break;
      case "university_id":
        if (isStudent && value) {
          if (!isDigitsOnly(value)) {
            error = getDigitsOnlyErrorMessage();
          } else if (!isValidUniversityId(value)) {
            error = getUniversityIdErrorMessage();
          }
        } else if (!isStudent && value) {
          error = "الرقم الجامعي مخصص للطلاب فقط";
        }
        break;
      case "password":
        if (value && !id && !isValidPassword(value)) {
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
    const selectedRole = roles.find((r) => r.id === form.role_id);
    const isStudent = selectedRole?.name === "student";
    const isUniversityInternal = ['training_coordinator', 'head_of_department', 'admin', 'academic_supervisor'].includes(selectedRole?.name);
    const isSchoolField = ['school_manager', 'teacher', 'adviser'].includes(selectedRole?.name);
    const isUndecidedDomain = ['psychologist', 'psychology_center_manager', 'education_directorate', 'health_directorate'].includes(selectedRole?.name);

    // Validate name
    if (!form.name.trim()) {
      newErrors.name = "الاسم مطلوب";
    }

    // Validate email
    if (!form.email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!isValidEmail(form.email)) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    } else if (isStudent && !isValidStudentEmail(form.email)) {
      newErrors.email = getStudentEmailErrorMessage();
    } else if (isUniversityInternal && !isValidUniversityInternalEmail(form.email)) {
      newErrors.email = getUniversityInternalEmailErrorMessage();
    } else if (isSchoolField && !isValidSchoolFieldEmail(form.email)) {
      newErrors.email = getSchoolFieldEmailErrorMessage();
    }
    // For undecided domain roles, only basic email validation is applied

    // Validate phone
    if (form.phone && !isValidPhone(form.phone)) {
      newErrors.phone = getPhoneErrorMessage();
    }

    // Validate university_id for students
    if (isStudent) {
      if (!form.university_id.trim()) {
        newErrors.university_id = "الرقم الجامعي مطلوب للطلاب";
      } else if (!isDigitsOnly(form.university_id)) {
        newErrors.university_id = getDigitsOnlyErrorMessage();
      } else if (!isValidUniversityId(form.university_id)) {
        newErrors.university_id = getUniversityIdErrorMessage();
      }
    } else {
      // For staff, university_id should be empty
      if (form.university_id.trim()) {
        newErrors.university_id = "الرقم الجامعي مخصص للطلاب فقط";
      }
    }

    // Validate role
    if (!form.role_id) {
      newErrors.role_id = "الدور مطلوب";
    }

    // Validate password for new users
    if (!id) {
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Frontend validation
    if (!validateForm()) {
      setLoading(false);
      toast.error("يرجى تصحيح الأخطاء قبل المتابعة");
      return;
    }

    try {
      // Trim text fields before sending
      const trimmedForm = {
        ...form,
        name: trimInput(form.name),
        email: trimInput(form.email),
        university_id: trimInput(form.university_id),
        phone: trimInput(form.phone),
      };

      if (id) {
        await updateUser(id, trimmedForm);
      } else {
        await createUser(trimmedForm);
      }
      toast.success(id ? "تم تحديث المستخدم بنجاح" : "تم إضافة المستخدم بنجاح");
      navigate("/admin/users");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.apiError(err, "حدث خطأ أثناء حفظ المستخدم");
      }
    } finally {
      setLoading(false);
    }
  };

  const getSelectedRole = () => {
    return roles.find((r) => r.id === form.role_id);
  };

  const isStudentRole = () => {
    return getSelectedRole()?.name === "student";
  };

  const isUniversityInternalRole = () => {
    return ['training_coordinator', 'head_of_department', 'admin', 'academic_supervisor'].includes(getSelectedRole()?.name);
  };

  const isSchoolFieldRole = () => {
    return ['school_manager', 'teacher', 'adviser'].includes(getSelectedRole()?.name);
  };

  const isUndecidedDomainRole = () => {
    return ['psychologist', 'psychology_center_manager', 'education_directorate', 'health_directorate'].includes(getSelectedRole()?.name);
  };

  const getEmailPlaceholder = () => {
    if (isStudentRole()) return 'studentname@students.hebron.edu';
    if (isUniversityInternalRole()) return 'username@hebron.edu';
    if (isSchoolFieldRole()) return 'username@hebron.edu.ps';
    if (isUndecidedDomainRole()) return 'example@email.com';
    return 'example@email.com';
  };

  return (
    <div className="user-form">
      <div className="page-header">
        <h1>{id ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</h1>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary">رجوع</button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <div className="form-group">
            <label>الاسم الكامل *</label>
            <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required />
            {errors.name && <span className="error">{errors.name[0]}</span>}
          </div>

          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              required 
              placeholder={getEmailPlaceholder()}
            />
            {errors.email && <span className="error">{errors.email[0]}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>الرقم الجامعي <span style={{ color: "#dc2626", display: isStudentRole() ? 'inline' : 'none' }}>*</span></label>
            <input
              type="text"
              id="university_id"
              name="university_id"
              value={form.university_id}
              onChange={handleChange}
              placeholder={isStudentRole() ? 'أرقام فقط (6-20 رقم)' : 'مخصص للطلاب فقط'}
              disabled={!isStudentRole() && getSelectedRole()}
              style={{
                backgroundColor: !isStudentRole() && getSelectedRole() ? '#f5f5f5' : 'white',
                cursor: !isStudentRole() && getSelectedRole() ? 'not-allowed' : 'text'
              }}
            />
            {errors.university_id && <span className="error">{errors.university_id}</span>}
          </div>

          <div className="form-group">
            <label>رقم الهاتف</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="مثال: 0561234567"
            />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>الدور *</label>
            <select id="role_id" name="role_id" value={form.role_id} onChange={handleChange} required>
              <option value="">اختر الدور</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            {errors.role_id && <span className="error">{errors.role_id[0]}</span>}
          </div>

          <div className="form-group">
            <label>القسم</label>
            <select id="department_id" name="department_id" value={form.department_id} onChange={handleChange}>
              <option value="">اختر القسم</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>كلمة المرور {!id && "*"}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required={!id}
              placeholder={!id ? "8 أحرف على الأقل" : ""}
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>تأكيد كلمة المرور {!id && "*"}</label>
            <input
              type="password"
              id="password_confirmation"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              required={!id}
              placeholder="أعد إدخال كلمة المرور"
            />
            {errors.password_confirmation && <span className="error">{errors.password_confirmation}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>الحالة</label>
          <select id="status" name="status" value={form.status} onChange={handleChange}>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="suspended">موقوف</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "جاري الحفظ..." : (id ? "تحديث" : "إضافة")}
          </button>
          <button type="button" onClick={() => navigate("/admin/users")} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
