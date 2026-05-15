import { useMemo, useState, useEffect } from "react";
import { updateUserProfile, changePassword } from "../../services/api";
import { readStoredUser, writeStoredUser } from "../../utils/session";
import { normalizeRole, ROLES, getRoleLabel } from "../../utils/roles";
import { PageHeader, AppInput, PasswordInput, AppButton, AppAlert, AppCard, ProfileAvatarEditor } from "../../components/common";
import { User, Mail, Phone, Lock, Shield, ChevronLeft, Hash, Building2, BookOpen } from "lucide-react";
import useAppToast from "../../hooks/useAppToast";

const normName = (v) => String(v ?? "").trim();
const normPhone = (v) => String(v ?? "").trim();

export default function Profile() {
  const [profileUser, setProfileUser] = useState(() => readStoredUser());

  useEffect(() => {
    const onUserUpdated = (e) => {
      setProfileUser(e.detail && typeof e.detail === "object" ? e.detail : readStoredUser());
    };
    window.addEventListener("user-updated", onUserUpdated);
    return () => window.removeEventListener("user-updated", onUserUpdated);
  }, []);

  const rawRole = profileUser?.role?.name || profileUser?.role || "";
  const isStudent = normalizeRole(rawRole) === ROLES.STUDENT;
  const isAdmin = normalizeRole(rawRole) === ROLES.ADMIN;
  const roleDisplay = getRoleLabel(rawRole);
  const departmentName =
    (typeof profileUser?.department === "object" && profileUser?.department?.name) || profileUser?.department?.name || "";
  const majorDisplay = profileUser?.major ? String(profileUser.major) : "";
  const universityDisplay = profileUser?.university_id ? String(profileUser.university_id) : "";

  const [form, setForm] = useState({
    name: profileUser.name || "",
    phone: profileUser.phone || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});

  const toast = useAppToast();
  const [baseline, setBaseline] = useState(() => ({
    name: normName(profileUser.name),
    phone: normPhone(profileUser.phone),
  }));

  const profileDirty = useMemo(() => {
    if (isStudent) {
      return normPhone(form.phone) !== baseline.phone;
    }
    return normName(form.name) !== baseline.name || normPhone(form.phone) !== baseline.phone;
  }, [isStudent, form.name, form.phone, baseline.name, baseline.phone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (profileFieldErrors[name]) {
      setProfileFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (passwordFieldErrors[name]) {
      setPasswordFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateProfileForm = () => {
    const errors = {};

    if (!isStudent && !form.name.trim()) {
      errors.name = "الاسم مطلوب";
    }

    if (form.phone && !/^(056|059)\d{7}$/.test(form.phone)) {
      errors.phone = "رقم الهاتف يجب أن يكون مكون من 10 أرقام ويبدأ بـ 056 أو 059";
    }
    
    setProfileFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profileDirty) {
      toast.info("لا توجد تغييرات لحفظها.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!validateProfileForm()) {
      setLoading(false);
      return;
    }

    try {
      const payload = isStudent
        ? { phone: form.phone }
        : { name: form.name.trim(), phone: form.phone };

      await updateUserProfile(payload);

      const updatedUser = {
        ...profileUser,
        name: isStudent ? profileUser.name : form.name.trim(),
        phone: form.phone,
      };
      writeStoredUser(updatedUser);

      setBaseline({
        name: normName(updatedUser.name),
        phone: normPhone(updatedUser.phone),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "فشل في تحديث البيانات";
      setError(errorMessage);
      
      // Handle validation errors from backend
      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        const mappedErrors = {};
        
        if (backendErrors.name) mappedErrors.name = backendErrors.name[0];
        if (backendErrors.phone) mappedErrors.phone = backendErrors.phone[0];
        
        setProfileFieldErrors(mappedErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordForm.current_password) {
      errors.current_password = "كلمة المرور الحالية مطلوبة";
    }
    
    if (!passwordForm.new_password) {
      errors.new_password = "كلمة المرور الجديدة مطلوبة";
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }
    
    if (!passwordForm.new_password_confirmation) {
      errors.new_password_confirmation = "تأكيد كلمة المرور مطلوب";
    } else if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      errors.new_password_confirmation = "كلمتا المرور غير متطابقتين";
    }
    
    setPasswordFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!validatePasswordForm()) {
      setPasswordLoading(false);
      return;
    }

    try {
      await changePassword(passwordForm);
      
      setPasswordSuccess(true);
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setTimeout(() => setPasswordSuccess(false), 3000);
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
        setPasswordFieldErrors(mappedErrors);
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base ${
        isActive
          ? "bg-gradient-to-r from-[#142a42] to-[#1e3a5f] text-white shadow-lg"
          : "bg-white text-[#142a42] hover:bg-gray-50 border border-gray-200"
      }`}
    >
      <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{id === "profile" ? "البيانات" : "الأمان"}</span>
    </button>
  );

  const ProfileInfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#142a42]/10 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="sm:w-5 sm:h-5 text-[#142a42]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-[#142a42] text-sm sm:text-base truncate">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="الملف الشخصي"
        subtitle="إدارة بياناتك الشخصية وإعدادات الأمان"
      />

      <div className="max-w-4xl">
        {/* Tabs Navigation */}
        <div className="flex gap-3 mb-6">
          <TabButton
            id="profile"
            label="البيانات الشخصية"
            icon={User}
            isActive={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
          <TabButton
            id="password"
            label="تغيير كلمة المرور"
            icon={Shield}
            isActive={activeTab === "password"}
            onClick={() => setActiveTab("password")}
          />
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <AppCard>
            {/* User Info Summary */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-4">
                <ProfileAvatarEditor displayName={profileUser.name} avatarUrl={profileUser.avatar_url} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-[#142a42]">{profileUser.name}</h3>
                  <p className="text-sm text-gray-500">
                    صفة المستخدم: {roleDisplay}
                  </p>
                </div>
              </div>

              {!isAdmin && (
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  البيانات التالية للعرض فقط، ولا يمكن تعديلها من الملف الشخصي. لتحديثها، يرجى التواصل مع مسؤول
                  النظام.
                </p>
              )}

              <div className={`grid gap-4 ${isAdmin ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3"}`}>
                {!isAdmin && (
                  <>
                    <ProfileInfoItem icon={Hash} label="الرقم الجامعي / الموظف" value={universityDisplay || "—"} />
                    <ProfileInfoItem icon={Building2} label="القسم" value={departmentName || "—"} />
                    <ProfileInfoItem icon={BookOpen} label="التخصص" value={majorDisplay || "—"} />
                  </>
                )}
                <ProfileInfoItem icon={Mail} label="البريد الإلكتروني" value={profileUser.email} />
                <ProfileInfoItem icon={Phone} label="رقم الهاتف" value={profileUser.phone} />
              </div>
            </div>

            {/* Edit Form */}
            <h4 className="text-md font-bold text-[#142a42] mb-4 flex items-center gap-2">
              <ChevronLeft size={18} />
              تعديل البيانات الشخصية
            </h4>

            {isStudent && (
              <div className="mb-4">
                <AppAlert variant="info">
                  لا يمكن للطالب تعديل الاسم أو البريد الإلكتروني من الملف الشخصي. يمكن تحديث رقم الهاتف وكلمة
                  المرور فقط. لتعديل البريد، يرجى التواصل مع مسؤول النظام.
                </AppAlert>
              </div>
            )}

            {success && (
              <div className="mb-4">
                <AppAlert variant="success">
                  تم تحديث البيانات بنجاح
                </AppAlert>
              </div>
            )}

            {error && !profileFieldErrors.name && (
              <div className="mb-4">
                <AppAlert variant="error" dismissible onDismiss={() => setError(null)}>
                  {error}
                </AppAlert>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isStudent && (
                <div className="mb-4">
                  <AppInput
                    label="الاسم الكامل"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="أدخل اسمك الكامل"
                    error={profileFieldErrors.name}
                    required
                    disabled={loading}
                    leftIcon={<User size={18} />}
                  />
                </div>
              )}

              <AppInput
                label="رقم الهاتف المحمول"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="مثال: 0561234567"
                error={profileFieldErrors.phone}
                disabled={loading}
                leftIcon={<Phone size={18} />}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-6">
                <AppButton
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading || !profileDirty}
                  className="w-full sm:w-auto"
                >
                  حفظ التعديلات
                </AppButton>
                
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm({
                      name: baseline.name,
                      phone: baseline.phone,
                    });
                    setProfileFieldErrors({});
                    setError(null);
                  }}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </AppButton>
              </div>
            </form>
          </AppCard>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <AppCard>
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                  <Lock size={24} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#142a42]">تغيير كلمة المرور</h3>
                  <p className="text-sm text-gray-500">قم بتحديث كلمة المرور الخاصة بك للحفاظ على أمان حسابك</p>
                </div>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mb-4">
                <AppAlert variant="success">
                  تم تغيير كلمة المرور بنجاح
                </AppAlert>
              </div>
            )}

            {passwordError && !passwordFieldErrors.current_password && !passwordFieldErrors.new_password && (
              <div className="mb-4">
                <AppAlert variant="error" dismissible onDismiss={() => setPasswordError(null)}>
                  {passwordError}
                </AppAlert>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="max-w-md">
              <PasswordInput
                label="كلمة المرور الحالية"
                name="current_password"
                value={passwordForm.current_password}
                onChange={handlePasswordChange}
                placeholder="أدخل كلمة المرور الحالية"
                error={passwordFieldErrors.current_password}
                required
                disabled={passwordLoading}
              />

              <PasswordInput
                label="كلمة المرور الجديدة"
                name="new_password"
                value={passwordForm.new_password}
                onChange={handlePasswordChange}
                placeholder="أدخل كلمة المرور الجديدة (8 أحرف على الأقل)"
                error={passwordFieldErrors.new_password}
                required
                disabled={passwordLoading}
              />

              <PasswordInput
                label="تأكيد كلمة المرور الجديدة"
                name="new_password_confirmation"
                value={passwordForm.new_password_confirmation}
                onChange={handlePasswordChange}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                error={passwordFieldErrors.new_password_confirmation}
                required
                disabled={passwordLoading}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-6">
                <AppButton
                  type="submit"
                  variant="primary"
                  loading={passwordLoading}
                  disabled={passwordLoading}
                  className="w-full sm:w-auto"
                >
                  تغيير كلمة المرور
                </AppButton>
                
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordForm({
                      current_password: "",
                      new_password: "",
                      new_password_confirmation: "",
                    });
                    setPasswordFieldErrors({});
                    setPasswordError(null);
                  }}
                  disabled={passwordLoading}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </AppButton>
              </div>
            </form>
          </AppCard>
        )}
      </div>
    </>
  );
}
