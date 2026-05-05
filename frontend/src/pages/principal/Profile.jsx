import { useEffect, useState } from "react";
import {
  getCurrentUser,
  updateUser,
  updateTrainingSite,
} from "../../services/api";
import { siteLabels } from "../../utils/roles";
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
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchProfile();
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

      setProfileData({
        principalName: empty(user.name) || "",
        schoolName: empty(trainingSite.name) || "",
        directorate: trainingSite.directorate || "وسط",
        schoolType: trainingSite.school_type === "private" ? "private" : "public",
        phone: empty(user.phone) || "",
        email: empty(user.email) || "",
        address: empty(trainingSite.location) || "",
      });
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to load principal profile:", error);
      setErrorMessage("تعذر تحميل البيانات الشخصية.");
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
    setSavedMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setErrorMessage("تعذر تحديد المستخدم الحالي.");
      return;
    }

    setSaving(true);
    setSavedMessage("");
    setErrorMessage("");

    try {
      await updateUser(userId, {
        name: profileData.principalName.trim(),
        email: profileData.email.trim(),
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
        localStorage.setItem("user", JSON.stringify(payload));
      }

      setSavedMessage("تم حفظ التعديلات بنجاح.");
      await fetchProfile();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        (error?.response?.data?.errors &&
          Object.values(error.response.data.errors).flat().join(" ")) ||
        "تعذر حفظ التعديلات.";
      setErrorMessage(msg);
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
          <div className="hero-icon" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)" }}>
            <User size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">{"الملف الشخصي"}</h1>
            <p className="hero-subtitle">
              {"تعديل بيانات "}{labels.managerLabel}{" وبيانات "}{labels.siteName}{" ثم الضغط على حفظ"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {savedMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#d1fae5", color: "#059669", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <CheckCircle2 size={18} /> {savedMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#fee2e2", color: "#dc2626", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}
      {noTrainingSite && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#fef3c7", color: "#d97706", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <AlertTriangle size={18} /> {"لم يُربط حسابك بموقع تدريب بعد؛ يمكنك تعديل بياناتك الشخصية فقط حتى يقوم المسؤول بالربط."}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "1.5rem" }}>
          {/* Personal Info Card */}
          <div className="section-card" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <User size={20} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"بيانات "}{labels.managerLabel}</h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"المعلومات الشخصية لـ"}{labels.managerLabel}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Name */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                  {"اسم "}{labels.managerLabel}
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="text" name="principalName" value={profileData.principalName} onChange={handleChange} required disabled={saving}
                    style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                  {"البريد الإلكتروني"}
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="email" name="email" value={profileData.email} onChange={handleChange} required disabled={saving}
                    style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                  {"رقم الهاتف"}
                </label>
                <div style={{ position: "relative" }}>
                  <Phone size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="text" name="phone" value={profileData.phone} onChange={handleChange} disabled={saving}
                    style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Site Info Card */}
          <div className="section-card" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <School size={20} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"بيانات "}{labels.siteName}</h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"معلومات "}{labels.siteName}{" التدريبي"}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* School Name */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                  {"اسم "}{labels.siteName}
                </label>
                <div style={{ position: "relative" }}>
                  <Building2 size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="text" name="schoolName" value={profileData.schoolName} onChange={handleChange}
                    disabled={saving || noTrainingSite} placeholder={noTrainingSite ? "غير متاح بدون ربط موقع" : ""}
                    style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: noTrainingSite ? "#f1f5f9" : "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={(e) => !noTrainingSite && (e.target.style.borderColor = "#10b981")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                  {"العنوان / الموقع"}
                </label>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="text" name="address" value={profileData.address} onChange={handleChange}
                    disabled={saving || noTrainingSite}
                    style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: noTrainingSite ? "#f1f5f9" : "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={(e) => !noTrainingSite && (e.target.style.borderColor = "#10b981")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
              </div>

              {/* Directorate */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                  {"المديرية (منطقة)"}
                </label>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <select name="directorate" value={profileData.directorate} onChange={handleChange}
                    disabled={saving || noTrainingSite}
                    style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: noTrainingSite ? "#f1f5f9" : "#f8fafc", outline: "none", appearance: "auto" }}
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
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                    {"نوع المدرسة"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <GraduationCap size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <select name="schoolType" value={profileData.schoolType} onChange={handleChange}
                      disabled={saving || noTrainingSite}
                      style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: noTrainingSite ? "#f1f5f9" : "#f8fafc", outline: "none", appearance: "auto" }}
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
        <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <button type="submit" disabled={saving || loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", border: "none", borderRadius: 10, fontSize: "0.95rem", fontWeight: 600, cursor: saving || loading ? "not-allowed" : "pointer", transition: "transform 0.2s, box-shadow 0.2s", opacity: saving ? 0.7 : 1 }}
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
