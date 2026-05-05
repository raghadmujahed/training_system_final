import { useEffect, useState } from "react";
import {
  getTrainingSites,
  createTrainingSite,
  updateTrainingSite,
  deleteTrainingSite,
} from "../../services/api";
import {
  School,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Building2,
  AlertCircle,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import MinistryEducationSeal from "../../components/branding/MinistryEducationSeal";

const getSchoolTypeFromItem = (item) => {
  if (item.school_type === "private") return "خاصة";
  if (item.school_type === "public") return "حكومية";

  const description = item.description || "";
  if (description.includes("school_type:private")) return "خاصة";
  if (description.includes("school_type:public")) return "حكومية";

  return "حكومية";
};

const normalizePlace = (item) => ({
  id: item.id,
  name: item.name || "—",
  school_type: getSchoolTypeFromItem(item),
  city: item.location || "—",
  capacity: item.capacity ?? 0,
  directorate: item.directorate || "وسط",
  status:
    item.is_active === true || item.is_active === 1 ? "متاح" : "غير نشط",
  is_active: item.is_active === true || item.is_active === 1,
});

const toApiSchoolType = (value) => (value === "خاصة" ? "private" : "public");

const extractValidationMessage = (error, fallback) => {
  const apiMessage = error?.response?.data?.message;
  const validationErrors = error?.response?.data?.errors;
  if (validationErrors && typeof validationErrors === "object") {
    const firstField = Object.keys(validationErrors)[0];
    const firstError = firstField ? validationErrors[firstField]?.[0] : null;
    if (firstError) return firstError;
  }
  return apiMessage || fallback;
};

export default function TrainingPlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    school_type: "حكومية",
    city: "",
    phone: "",
    email: "",
    mobile: "",
    capacity: "",
    directorate: "وسط",
    gender_classification: "",
    school_level: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    school_type: "حكومية",
    city: "",
    phone: "",
    email: "",
    mobile: "",
    capacity: "",
    directorate: "وسط",
    is_active: true,
    gender_classification: "",
    school_level: "",
  });

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getTrainingSites();

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setPlaces(list.map(normalizePlace));
    } catch (error) {
      console.error("Failed to load training sites:", error);
      setErrorMessage("تعذر تحميل أماكن التدريب.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSavedMessage("");
    setErrorMessage("");
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddPlace = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.school_type ||
      !formData.city ||
      !formData.capacity ||
      !formData.directorate
    ) {
      setErrorMessage("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    try {
      setSavedMessage("");
      setErrorMessage("");

      await createTrainingSite({
        name: formData.name,
        location: formData.city,
        phone: formData.phone,
        email: formData.email,
        mobile: formData.mobile,
        capacity: Number(formData.capacity),
        is_active: true,
        directorate: formData.directorate,
        school_type: toApiSchoolType(formData.school_type),
        gender_classification: formData.gender_classification,
        school_level: formData.school_level,
        site_type: "school",
        governing_body: "directorate_of_education",
      });

      setFormData({
        name: "",
        school_type: "حكومية",
        city: "",
        phone: "",
        email: "",
        mobile: "",
        capacity: "",
        directorate: "وسط",
        gender_classification: "",
        school_level: "",
      });

      setSavedMessage("تم حفظ مكان التدريب بنجاح.");
      fetchPlaces();
    } catch (error) {
      console.error("Failed to create training site:", error);
      setErrorMessage(
        extractValidationMessage(error, "تعذر حفظ مكان التدريب.")
      );
    }
  };

  const startEdit = (place) => {
    setEditingId(place.id);
    setEditFormData({
      name: place.name,
      school_type: place.school_type,
      city: place.city,
      phone: place.phone || "",
      email: place.email || "",
      mobile: place.mobile || "",
      capacity: String(place.capacity),
      directorate: place.directorate,
      is_active: place.is_active,
      gender_classification: place.gender_classification || "",
      school_level: place.school_level || "",
    });
    setSavedMessage("");
    setErrorMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({
      name: "",
      school_type: "حكومية",
      city: "",
      phone: "",
      email: "",
      mobile: "",
      capacity: "",
      directorate: "وسط",
      is_active: true,
      gender_classification: "",
      school_level: "",
    });
  };

  const handleUpdatePlace = async (id) => {
    if (
      !editFormData.name ||
      !editFormData.school_type ||
      !editFormData.city ||
      !editFormData.capacity ||
      !editFormData.directorate
    ) {
      setErrorMessage("يرجى تعبئة جميع حقول التعديل المطلوبة.");
      return;
    }

    try {
      setSavedMessage("");
      setErrorMessage("");

      await updateTrainingSite(id, {
        name: editFormData.name,
        location: editFormData.city,
        phone: editFormData.phone,
        email: editFormData.email,
        mobile: editFormData.mobile,
        capacity: Number(editFormData.capacity),
        is_active: editFormData.is_active,
        directorate: editFormData.directorate,
        school_type: toApiSchoolType(editFormData.school_type),
        gender_classification: editFormData.gender_classification,
        school_level: editFormData.school_level,
        site_type: "school",
        governing_body: "directorate_of_education",
      });

      setSavedMessage("تم تعديل مكان التدريب بنجاح.");
      setEditingId(null);
      fetchPlaces();
    } catch (error) {
      console.error("Failed to update training site:", error);
      setErrorMessage(
        extractValidationMessage(error, "تعذر تعديل مكان التدريب.")
      );
    }
  };

  const handleDeletePlace = async (id) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف مكان التدريب؟");
    if (!confirmed) return;

    try {
      setSavedMessage("");
      setErrorMessage("");

      await deleteTrainingSite(id);
      setSavedMessage("تم حذف مكان التدريب بنجاح.");
      fetchPlaces();
    } catch (error) {
      console.error("Failed to delete training site:", error);
      setErrorMessage("تعذر حذف مكان التدريب.");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlaces = places.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.directorate.toLowerCase().includes(q);
  });

  const activeCount = places.filter((p) => p.status === "متاح").length;
  const inactiveCount = places.filter((p) => p.status !== "متاح").length;
  const totalCapacity = places.reduce((sum, p) => sum + p.capacity, 0);

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content" style={{ alignItems: "flex-start" }}>
          <MinistryEducationSeal size={54} />
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">{"أماكن التدريب"}</h1>
            <p className="hero-subtitle">
              {"إدارة وعرض أماكن التدريب المعتمدة التابعة لمديرية التربية والتعليم"}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { title: "إجمالي الأماكن", value: places.length, icon: Building2, color: "#3b82f6", bg: "#dbeafe" },
          { title: "أماكن نشطة", value: activeCount, icon: CheckCircle2, color: "#10b981", bg: "#d1fae5" },
          { title: "غير نشطة", value: inactiveCount, icon: XCircle, color: "#ef4444", bg: "#fee2e2" },
          { title: "الطاقة الاستيعابية", value: totalCapacity, icon: Users, color: "#8b5cf6", bg: "#ede9fe" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ background: "#fff", borderRadius: "16px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "14px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{card.title}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Form */}
      <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <Plus size={20} />
          </div>
          <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{"إضافة مكان تدريب جديد"}</h4>
        </div>

        <form onSubmit={handleAddPlace}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"اسم مكان التدريب"}
              </label>
              <div style={{ position: "relative" }}>
                <School size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input type="text" name="name" placeholder={"أدخل اسم مكان التدريب"} value={formData.name} onChange={handleChange}
                  style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"نوع المدرسة"}
              </label>
              <select name="school_type" value={formData.school_type} onChange={handleChange}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none" }}
              >
                <option value="حكومية">{"حكومية"}</option>
                <option value="خاصة">{"خاصة"}</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"المدينة / الموقع"}
              </label>
              <div style={{ position: "relative" }}>
                <MapPin size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input type="text" name="city" placeholder={"أدخل المدينة أو الموقع"} value={formData.city} onChange={handleChange}
                  style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"السعة الاستيعابية"}
              </label>
              <div style={{ position: "relative" }}>
                <Users size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input type="number" name="capacity" placeholder={"عدد الطلبة"} value={formData.capacity} onChange={handleChange} min="1"
                  style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"المديرية"}
              </label>
              <select name="directorate" value={formData.directorate} onChange={handleChange}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none" }}
              >
                <option value="وسط">{"وسط"}</option>
                <option value="شمال">{"شمال"}</option>
                <option value="جنوب">{"جنوب"}</option>
                <option value="يطا">{"يطا"}</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"الهاتف"}
              </label>
              <input type="text" name="phone" placeholder={"رقم الهاتف"} value={formData.phone} onChange={handleChange}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"البريد الإلكتروني"}
              </label>
              <input type="email" name="email" placeholder={"بريد المدير"} value={formData.email} onChange={handleChange}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"رقم المحمول"}
              </label>
              <input type="text" name="mobile" placeholder={"رقم المحمول"} value={formData.mobile} onChange={handleChange}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"تصنيف المدرسة"}
              </label>
              <select name="gender_classification" value={formData.gender_classification} onChange={handleChange}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none" }}
              >
                <option value="">{"-- اختر --"}</option>
                <option value="boys">{"ذكور"}</option>
                <option value="girls">{"إناث"}</option>
                <option value="mixed">{"مختلطة"}</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.375rem" }}>
                {"مرحلة المدرسة"}
              </label>
              <select name="school_level" value={formData.school_level} onChange={handleChange}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "#f8fafc", outline: "none" }}
              >
                <option value="">{"-- اختر --"}</option>
                <option value="lower">{"دنيا"}</option>
                <option value="upper">{"عليا"}</option>
              </select>
            </div>

          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <Save size={16} /> {"حفظ مكان التدريب"}
            </button>

            {savedMessage && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "#d1fae5", color: "#059669", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                <CheckCircle2 size={14} /> {savedMessage}
              </div>
            )}

            {errorMessage && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                <AlertCircle size={14} /> {errorMessage}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Training Sites List */}
      <div className="section-card" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <Building2 size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{"قائمة أماكن التدريب"}</h4>
          </div>
          <div style={{ position: "relative", minWidth: 220 }}>
            <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input type="text" placeholder={"بحث بالاسم أو المدينة..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem 0.5rem 0.75rem", paddingRight: 36, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: "0.85rem", background: "#f8fafc", outline: "none" }}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="section" text="جاري تحميل أماكن التدريب..." />
        ) : (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["اسم المكان", "نوع المدرسة", "المدينة", "الهاتف", "البريد", "المحمول", "السعة", "المديرية", "الحالة", "الإجراءات"].map((h) => (
                    <th key={h} style={{ padding: "0.875rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPlaces.map((place, idx) =>
                  editingId === place.id ? (
                    <tr key={place.id} style={{ background: "#fef3c7" }}>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <input type="text" name="name" value={editFormData.name} onChange={handleEditChange}
                          style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <select name="school_type" value={editFormData.school_type} onChange={handleEditChange}
                          style={{ padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        >
                          <option value="حكومية">{"حكومية"}</option>
                          <option value="خاصة">{"خاصة"}</option>
                        </select>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <input type="text" name="city" value={editFormData.city} onChange={handleEditChange}
                          style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <input type="text" name="phone" value={editFormData.phone} onChange={handleEditChange}
                          style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <input type="email" name="email" value={editFormData.email} onChange={handleEditChange}
                          style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <input type="text" name="mobile" value={editFormData.mobile} onChange={handleEditChange}
                          style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <input type="number" name="capacity" value={editFormData.capacity} onChange={handleEditChange} min="1"
                          style={{ width: 70, padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        />
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <select name="directorate" value={editFormData.directorate} onChange={handleEditChange}
                          style={{ padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #d97706", fontSize: "0.85rem" }}
                        >
                          <option value="وسط">{"وسط"}</option>
                          <option value="شمال">{"شمال"}</option>
                          <option value="جنوب">{"جنوب"}</option>
                          <option value="يطا">{"يطا"}</option>
                        </select>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.85rem", cursor: "pointer" }}>
                          <input type="checkbox" name="is_active" checked={editFormData.is_active} onChange={handleEditChange} />
                          {"نشط"}
                        </label>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => handleUpdatePlace(place.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.375rem 0.75rem", background: "#10b981", color: "white", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            <Save size={13} /> {"حفظ"}
                          </button>
                          <button type="button" onClick={cancelEdit}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.375rem 0.75rem", background: "#64748b", color: "white", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            <X size={13} /> {"إلغاء"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={place.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f8fafc")}
                    >
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "8px", background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <School size={16} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{place.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        {place.school_type}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><MapPin size={13} />{place.city}</span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        {place.phone || "-"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        {place.email || "-"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        {place.mobile || "-"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600, color: "#1e293b" }}>
                          <Users size={14} color="#64748b" />{place.capacity}
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        {place.directorate}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600, background: place.status === "متاح" ? "#d1fae5" : "#fee2e2", color: place.status === "متاح" ? "#059669" : "#dc2626" }}>
                          {place.status === "متاح" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {place.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => startEdit(place)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.375rem 0.625rem", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }}
                          >
                            <Pencil size={13} /> {"تعديل"}
                          </button>
                          <button type="button" onClick={() => handleDeletePlace(place.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.375rem 0.625rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                          >
                            <Trash2 size={13} /> {"حذف"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {filteredPlaces.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: "2.5rem", textAlign: "center" }}>
                      <div style={{ color: "#94a3b8" }}>
                        <School size={48} style={{ marginBottom: "0.75rem", opacity: 0.4 }} />
                        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                          {searchQuery ? "لا توجد نتائج مطابقة للبحث" : "لا توجد أماكن تدريب مسجلة حاليًا"}
                        </p>
                        {searchQuery && <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>{"جرّب كلمات بحث مختلفة"}</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}