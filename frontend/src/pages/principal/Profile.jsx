import { useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  updateUser,
  updateTrainingSite,
} from "../../services/api";
import { readStoredUser, writeStoredUser } from "../../utils/session";
import { ProfileAvatarEditor } from "../../components/common";
import { siteLabels } from "../../utils/roles";
import useAppToast from "../../hooks/useAppToast";
import {
  User,
  School,
  MapPin,
  Phone,
  Mail,
  Building2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const empty = (v) => (v && v !== "—" ? String(v).trim() : "");

const DIRECTORATES = [
  { value: "وسط", label: "وسط" },
  { value: "شمال", label: "شمال" },
  { value: "جنوب", label: "جنوب" },
  { value: "يطا", label: "يطا" },
];

const SCHOOL_TYPES = [
  { value: "public", label: "مدرسة حكومية" },
  { value: "private", label: "مدرسة خاصة" },
];

/** لحساب التغييرات فقط على الحقول القابلة للتعديل (لا يشمل البريد المعروض للقراءة فقط) */
function editableProfileSnapshot(p) {
  return {
    principalName: String(p.principalName ?? "").trim(),
    phone: String(p.phone ?? "").trim(),
    schoolName: String(p.schoolName ?? "").trim(),
    directorate: p.directorate || "وسط",
    schoolType: p.schoolType === "private" ? "private" : "public",
    address: String(p.address ?? "").trim(),
  };
}

const Profile = ({ siteType: propSiteType = "school" }) => {
  const [userId, setUserId] = useState(null);
  const [trainingSiteId, setTrainingSiteId] = useState(null);
  const [siteType, setSiteType] = useState(propSiteType);
  const [labels, setLabels] = useState(siteLabels(propSiteType));

  const [profileData, setProfileData] = useState({
    principalName: "",
    schoolName: "",
    directorate: "وسط",
    schoolType: "public",
    phone: "",
    email: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const toast = useAppToast();
  const [saving, setSaving] = useState(false);
  const [baselineProfile, setBaselineProfile] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const onUserUpdated = () => {
      const u = readStoredUser();
      setProfileAvatarUrl(u.avatar_url ?? null);
    };
    window.addEventListener("user-updated", onUserUpdated);
    return () => window.removeEventListener("user-updated", onUserUpdated);
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userRes = await getCurrentUser();
      const user = userRes?.data || userRes || {};
      const trainingSite = user.training_site?.data || user.training_site || {};

      // Use prop siteType or determine from user role/training site
      const currentSiteType = propSiteType || (user.role?.name === 'psychology_center_manager' ? 'health_center' : 
                            (trainingSite.site_type || 'school'));
      
      setSiteType(currentSiteType);
      setLabels(siteLabels(currentSiteType));

      setUserId(user.id ?? null);
      setTrainingSiteId(user.training_site_id ?? trainingSite.id ?? null);

      const snapshot = {
        principalName: empty(user.name) || "",
        schoolName: empty(trainingSite.name) || "",
        directorate: trainingSite.directorate || "وسط",
        schoolType: trainingSite.school_type === "private" ? "private" : "public",
        phone: empty(user.phone) || "",
        email: empty(user.email) || "",
        address: empty(trainingSite.location) || "",
      };
      setProfileData(snapshot);
      setBaselineProfile(editableProfileSnapshot(snapshot));
      setProfileAvatarUrl(user.avatar_url ?? null);
    } catch (error) {
      console.error("Failed to load principal profile:", error);
      toast.error("تعذر تحميل البيانات الشخصية.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const profileDirty = useMemo(() => {
    if (!baselineProfile) return false;
    return (
      JSON.stringify(editableProfileSnapshot(profileData)) !== JSON.stringify(baselineProfile)
    );
  }, [profileData, baselineProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      toast.error("تعذر تحديد المستخدم الحالي.");
      return;
    }

    if (!profileDirty) {
      toast.info("لا توجد تغييرات لحفظها.");
      return;
    }

    setSaving(true);

    try {
      await updateUser(userId, {
        name: profileData.principalName.trim(),
        phone: profileData.phone.trim() || null,
      });

      if (trainingSiteId) {
        await updateTrainingSite(trainingSiteId, {
          name: profileData.schoolName.trim(),
          location: profileData.address.trim() || null,
          directorate: profileData.directorate,
          school_type: profileData.schoolType,
        });
      }

      const refreshed = await getCurrentUser();
      const payload = refreshed?.data || refreshed;
      if (payload && typeof payload === "object") {
        writeStoredUser(payload);
      }

      toast.success("تم حفظ التعديلات بنجاح.");
      await fetchProfile();
    } catch (error) {
      toast.apiError(error, "تعذر حفظ التعديلات.");
    } finally {
      setSaving(false);
    }
  };

  const noTrainingSite = !trainingSiteId;

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل البيانات الشخصية..." />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <User size={26} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">{"الملف الشخصي"}</h1>
            <p className="hero-subtitle">
              {"تعديل بيانات "}{labels.managerLabel}{" وبيانات "}{labels.siteName}{" ثم الضغط على حفظ"}
            </p>
          </div>
        </div>
      </div>

      {noTrainingSite && (
        <div className="flex items-center gap-[0.375rem] py-3 px-4 bg-[#fef3c7] text-[#d97706] rounded-xl text-[0.9rem] font-semibold mb-4">
          <AlertTriangle size={18} /> {"لم يُربط حسابك بموقع تدريب بعد؛ يمكنك تعديل بياناتك الشخصية فقط حتى يقوم المسؤول بالربط."}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(480px,1fr))] gap-6">
          {/* Personal Info Card */}
          <div className="section-card p-6 rounded-2xl border border-[#e2e8f0]">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white bg-gradient-to-br from-[#3b82f6] to-[#2563eb]">
                <User size={20} />
              </div>
              <div>
                <h4 className="m-0 mb-1 text-[1.1rem] font-bold">{"بيانات "}{labels.managerLabel}</h4>
                <p className="m-0 text-[0.8rem] text-[var(--text-faint)]">{"المعلومات الشخصية لـ"}{labels.managerLabel}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="pb-4 border-b border-[#e2e8f0]">
                <ProfileAvatarEditor
                  displayName={profileData.principalName || profileData.email || "المستخدم"}
                  avatarUrl={profileAvatarUrl}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-[0.85rem] font-semibold text-[#475569] mb-[0.375rem]">
                  {"اسم "}{labels.managerLabel}
                </label>
                <div className="relative">
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="text" name="principalName" value={profileData.principalName} onChange={handleChange} required disabled={saving}
                    className="w-full py-[0.625rem] rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none transition-[border-color] duration-200 focus:border-[#3b82f6]"
                    style={{ paddingLeft: '12px', paddingRight: '40px' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[0.85rem] font-semibold text-[#475569] mb-[0.375rem]">
                  {"البريد الإلكتروني"}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    readOnly
                    disabled
                    aria-readonly="true"
                    className="w-full py-[0.625rem] rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f1f5f9] text-[#64748b] cursor-not-allowed outline-none"
                    style={{ paddingLeft: "12px", paddingRight: "40px" }}
                  />
                </div>
                <p className="mt-1.5 text-[0.75rem] text-[#64748b] leading-relaxed">
                  {"يتم تعديل البريد الإلكتروني من لوحة مسؤول النظام فقط."}
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[0.85rem] font-semibold text-[#475569] mb-[0.375rem]">
                  {"رقم الهاتف"}
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="text" name="phone" value={profileData.phone} onChange={handleChange} disabled={saving}
                    className="w-full py-[0.625rem] rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none transition-[border-color] duration-200 focus:border-[#3b82f6]"
                    style={{ paddingLeft: '12px', paddingRight: '40px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Site Info Card */}
          <div className="section-card p-6 rounded-2xl border border-[#e2e8f0]">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white bg-gradient-to-br from-[#10b981] to-[#059669]">
                <School size={20} />
              </div>
              <div>
                <h4 className="m-0 mb-1 text-[1.1rem] font-bold">{"بيانات "}{labels.siteName}</h4>
                <p className="m-0 text-[0.8rem] text-[var(--text-faint)]">{"معلومات "}{labels.siteName}{" التدريبي"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* School Name */}
              <div>
                <label className="block text-[0.85rem] font-semibold text-[#475569] mb-[0.375rem]">
                  {"اسم "}{labels.siteName}
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="text" name="schoolName" value={profileData.schoolName} onChange={handleChange}
                    disabled={saving || noTrainingSite} placeholder={noTrainingSite ? "غير متاح بدون ربط موقع" : ""}
                    className="w-full py-[0.625rem] rounded-[10px] border border-[#e2e8f0] text-[0.9rem] outline-none transition-[border-color] duration-200 focus:border-[#10b981]"
                    style={{ background: noTrainingSite ? "#f1f5f9" : "#f8fafc", paddingLeft: '12px', paddingRight: '40px' }}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[0.85rem] font-semibold text-[#475569] mb-[0.375rem]">
                  {"العنوان / الموقع"}
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="text" name="address" value={profileData.address} onChange={handleChange}
                    disabled={saving || noTrainingSite}
                    className="w-full py-[0.625rem] rounded-[10px] border border-[#e2e8f0] text-[0.9rem] outline-none transition-[border-color] duration-200 focus:border-[#10b981]"
                    style={{ background: noTrainingSite ? "#f1f5f9" : "#f8fafc", paddingLeft: '12px', paddingRight: '40px' }}
                  />
                </div>
              </div>

              {/* Directorate */}
              <div>
                <label className="block text-[0.85rem] font-semibold text-[#475569] mb-[0.375rem]">
                  {"المديرية (منطقة)"}
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <select name="directorate" value={profileData.directorate} onChange={handleChange}
                    disabled={saving || noTrainingSite}
                    className="w-full py-[0.625rem] rounded-[10px] border border-[#e2e8f0] text-[0.9rem] outline-none appearance-auto"
                    style={{ background: noTrainingSite ? "#f1f5f9" : "#f8fafc", paddingLeft: '12px', paddingRight: '40px' }}
                  >
                    {DIRECTORATES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* School Type */}
              {siteType === "school" && (
                <div>
                  <label className="block text-[0.85rem] font-semibold text-[#475569] mb-[0.375rem]">
                    {"نوع المدرسة"}
                  </label>
                  <div className="relative">
                    <GraduationCap size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <select name="schoolType" value={profileData.schoolType} onChange={handleChange}
                      disabled={saving || noTrainingSite}
                      className="w-full py-[0.625rem] rounded-[10px] border border-[#e2e8f0] text-[0.9rem] outline-none appearance-auto"
                      style={{ background: noTrainingSite ? "#f1f5f9" : "#f8fafc", paddingLeft: '12px', paddingRight: '40px' }}
                    >
                      {SCHOOL_TYPES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-4">
          <button type="submit" disabled={saving || loading || !profileDirty}
            className="inline-flex items-center gap-2 py-3 px-6 text-white border-none rounded-[10px] text-[0.95rem] font-semibold transition-[transform,box-shadow] duration-200"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", cursor: saving || loading || !profileDirty ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
