import { useState } from "react";
import { changePassword } from "../../services/api";
import { PageHeader, PasswordInput, AppButton, AppAlert, AppCard } from "../../components/common";
import useAppToast from "../../hooks/useAppToast";

export default function ChangePassword() {
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!form.current_password) {
      errors.current_password = "كلمة المرور الحالية مطلوبة";
    }
    
    if (!form.new_password) {
      errors.new_password = "كلمة المرور الجديدة مطلوبة";
    } else if (form.new_password.length < 8) {
      errors.new_password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }
    
    if (!form.new_password_confirmation) {
      errors.new_password_confirmation = "تأكيد كلمة المرور مطلوب";
    } else if (form.new_password !== form.new_password_confirmation) {
      errors.new_password_confirmation = "كلمتا المرور غير متطابقتين";
    }
    
    if (form.new_password === form.current_password && form.new_password) {
      errors.new_password = "كلمة المرور الجديدة يجب أن تختلف عن الحالية";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
        new_password_confirmation: form.new_password_confirmation,
      });

      setSuccess(true);
      toast.success("تم تغيير كلمة المرور بنجاح");
      
      // Clear form
      setForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "فشل في تغيير كلمة المرور";
      const mappedErrors = {};

      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        if (backendErrors.current_password) mappedErrors.current_password = backendErrors.current_password[0];
        if (backendErrors.new_password) mappedErrors.new_password = backendErrors.new_password[0];
        if (backendErrors.new_password_confirmation) mappedErrors.new_password_confirmation = backendErrors.new_password_confirmation[0];
      } else if (errorMessage === "كلمة المرور الحالية غير صحيحة") {
        mappedErrors.current_password = errorMessage;
      } else if (errorMessage === "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية") {
        mappedErrors.new_password = errorMessage;
      }

      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(mappedErrors);
      } else {
        setError(errorMessage);
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="تغيير كلمة المرور"
        subtitle="قم بإدخال كلمة المرور الحالية ثم الجديدة"
      />

      <AppCard className="max-w-2xl">
        {success && (
          <div className="mb-6">
            <AppAlert variant="success">
              تم تغيير كلمة المرور بنجاح. سيتم تطبيق التغيير في تسجيل الدخول القادم.
            </AppAlert>
          </div>
        )}

        {error && !fieldErrors.current_password && !fieldErrors.new_password && (
          <div className="mb-6">
            <AppAlert variant="error" dismissible onDismiss={() => setError(null)}>
              {error}
            </AppAlert>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <PasswordInput
            label="كلمة المرور الحالية"
            name="current_password"
            value={form.current_password}
            onChange={handleChange}
            placeholder="أدخل كلمة المرور الحالية"
            error={fieldErrors.current_password}
            required
            disabled={loading}
          />

          <PasswordInput
            label="كلمة المرور الجديدة"
            name="new_password"
            value={form.new_password}
            onChange={handleChange}
            placeholder="أدخل كلمة المرور الجديدة (8 أحرف على الأقل)"
            error={fieldErrors.new_password}
            required
            disabled={loading}
          />

          <PasswordInput
            label="تأكيد كلمة المرور الجديدة"
            name="new_password_confirmation"
            value={form.new_password_confirmation}
            onChange={handleChange}
            placeholder="أعد إدخال كلمة المرور الجديدة"
            error={fieldErrors.new_password_confirmation}
            required
            disabled={loading}
          />

          <div className="flex items-center gap-4 mt-6">
            <AppButton
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              تحديث كلمة المرور
            </AppButton>
            
            <AppButton
              type="button"
              variant="outline"
              onClick={() => {
                setForm({
                  current_password: "",
                  new_password: "",
                  new_password_confirmation: "",
                });
                setFieldErrors({});
                setError(null);
              }}
              disabled={loading}
            >
              إلغاء
            </AppButton>
          </div>
        </form>
      </AppCard>
    </>
  );
}