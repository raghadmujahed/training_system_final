import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/api";
import myLogo from "../../assets/HU Logo.webp";
import { getStudentDashboardPath } from "../../utils/studentSection";
import { getDashboardPathByRole, normalizeRole, ROLES } from "../../utils/roles";
import { Eye, EyeOff } from "lucide-react";
import { isValidEmail, isValidPassword, getPasswordErrorMessage } from "../../utils/validation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    // Clear error when user types
    if (fieldErrors.email) {
      setFieldErrors({ ...fieldErrors, email: null });
    }
    // Real-time validation
    if (value && !isValidEmail(value)) {
      setFieldErrors({ ...fieldErrors, email: "صيغة البريد الإلكتروني غير صحيحة" });
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    // Clear error when user types
    if (fieldErrors.password) {
      setFieldErrors({ ...fieldErrors, password: null });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!email.trim()) {
      errors.email = "البريد الإلكتروني مطلوب";
    } else if (!isValidEmail(email)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
    
    if (!password) {
      errors.password = "كلمة المرور مطلوبة";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const response = await login({ email, password });

      const user = response?.user?.data ?? response?.user;
      const token = response.access_token;
      const userRole = normalizeRole(user?.role?.name);

      if (!token || token === "undefined" || token === "null") {
        throw new Error("لم يتم استلام رمز الدخول من الخادم");
      }

      // تخزين بيانات الجلسة محليًا بعد نجاح تسجيل الدخول.
      localStorage.setItem("access_token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // تخزين معرّفات الأقسام لاستخدامها في تحديد المسار
      const deptIds = response?.department_ids;
      if (deptIds) {
        localStorage.setItem("department_ids", JSON.stringify(deptIds));
        window.__PSYCHOLOGY_DEPT_ID = deptIds.psychology;
        window.__USOOL_TARBIAH_DEPT_ID = deptIds.usool_tarbiah;
      }

      if (userRole === ROLES.STUDENT) {
        navigate(getStudentDashboardPath(user));
      } else {
        navigate(getDashboardPathByRole(userRole));
      }

    } catch (err) {
      setError(err.response?.data?.message || err.message || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }; 

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-side">
          <div>
            <h1>جامعة الخليل</h1>
            <p>
              نظام إلكتروني لإدارة التدريب الميداني، يسهّل
              المتابعة، التقييم، والتواصل بين جميع الأطراف داخل بيئة أكاديمية
              منظمة.
            </p>
            <div className="auth-points">
              <div className="auth-point">متابعة التدريب الميداني بشكل منظم</div>
              <div className="auth-point">إدارة التقييمات والتقارير إلكترونيًا</div>
              <div className="auth-point">منصة موحدة للطلبة والمشرفين والإدارة</div>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-logo">
            <img src={myLogo} alt="شعار جامعة الخليل" className="auth-logo-img" />
          </div>
          <h2>تسجيل الدخول</h2>
          <p>أدخل بريدك الإلكتروني وكلمة المرور للدخول إلى النظام.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group-custom">
              <label className="form-label-custom"  htmlFor="email">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                id="email"
                className={`form-input-custom ${fieldErrors.email ? 'border-red-500' : ''}`}
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailChange}
                required
                placeholder="example@hebron.edu"
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom" htmlFor="password">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className="form-input-custom pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={20} className="text-[#142a42]" />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {error && (
              <div className="alert-custom alert-danger auth-form-alert" role="alert">
                {error}
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <div className="auth-extra">
            سيتم توجيهك إلى لوحة التحكم المناسبة حسب الدور المخول لك.
          </div>
        </div>
      </div>
    </div>
  );
}
