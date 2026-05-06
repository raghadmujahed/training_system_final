import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser, createUser, updateUser } from "../../../services/api";
import { useRoles, useDepartments } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";

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
    setForm({ ...form, [e.target.name]: e.target.value });
    // إزالة الخطأ عند التعديل
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (id) {
        await updateUser(id, form);
      } else {
        await createUser(form);
      }
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
            <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required />
            {errors.email && <span className="error">{errors.email[0]}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>الرقم الجامعي</label>
            <input type="text" id="university_id" name="university_id" value={form.university_id} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>رقم الهاتف</label>
            <input type="text" id="phone" name="phone" value={form.phone} onChange={handleChange} />
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
            <input type="password" id="password" name="password" value={form.password} onChange={handleChange} required={!id} />
            {errors.password && <span className="error">{errors.password[0]}</span>}
          </div>

          <div className="form-group">
            <label>تأكيد كلمة المرور {!id && "*"}</label>
            <input type="password" id="password_confirmation" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} required={!id} />
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