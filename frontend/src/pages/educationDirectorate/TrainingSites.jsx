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
  Phone,
  Mail,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import MinistryEducationSeal from "../../components/branding/MinistryEducationSeal";
import PageHeader from "../../components/common/PageHeader";
import useAppToast from "../../hooks/useAppToast";
import { useAuth } from "../../stores/AuthContext";

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
  const toast = useAppToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const userDirectorate = user?.directorate || "وسط";

  const [formData, setFormData] = useState({
    name: "",
    school_type: "حكومية",
    city: "",
    phone: "",
    email: "",
    mobile: "",
    capacity: "",
    directorate: userDirectorate,
    gender_classification: "",
    school_level: "lower",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    school_type: "حكومية",
    city: "",
    phone: "",
    email: "",
    mobile: "",
    capacity: "",
    directorate: userDirectorate,
    is_active: true,
    gender_classification: "",
    school_level: "lower",
  });

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const data = await getTrainingSites();

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setPlaces(list.map(normalizePlace));
    } catch (error) {
      console.error("Failed to load training sites:", error);
      toast.error("تعذر تحميل أماكن التدريب.");
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
      !formData.directorate ||
      !formData.school_level
    ) {
      toast.warning("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        location: formData.city,
        capacity: Number(formData.capacity),
        is_active: true,
        directorate: userDirectorate,
        school_type: toApiSchoolType(formData.school_type),
        school_level: formData.school_level || "lower",
        site_type: "school",
        governing_body: "directorate_of_education",
      };
      if (formData.phone) payload.phone = formData.phone;
      if (formData.mobile) payload.mobile = formData.mobile;
      if (formData.email) payload.email = formData.email;
      if (formData.gender_classification) payload.gender_classification = formData.gender_classification;
      await createTrainingSite(payload);

      setFormData({
        name: "",
        school_type: "حكومية",
        city: "",
        phone: "",
        email: "",
        mobile: "",
        capacity: "",
        directorate: userDirectorate,
        gender_classification: "",
        school_level: "lower",
      });

      toast.success("تم حفظ مكان التدريب بنجاح.");
      fetchPlaces();
    } catch (error) {
      console.error("Failed to create training site:", error);
      toast.error(extractValidationMessage(error, "تعذر حفظ مكان التدريب."));
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
      directorate: userDirectorate,
      is_active: true,
      gender_classification: "",
      school_level: "lower",
    });
  };

  const handleUpdatePlace = async (id) => {
    if (
      !editFormData.name ||
      !editFormData.school_type ||
      !editFormData.city ||
      !editFormData.capacity ||
      !editFormData.directorate ||
      !editFormData.school_level
    ) {
      toast.warning("يرجى تعبئة جميع حقول التعديل المطلوبة.");
      return;
    }

    try {
      const payload = {
        name: editFormData.name,
        location: editFormData.city,
        capacity: Number(editFormData.capacity),
        is_active: editFormData.is_active,
        directorate: userDirectorate,
        school_type: toApiSchoolType(editFormData.school_type),
        school_level: editFormData.school_level || "lower",
        site_type: "school",
        governing_body: "directorate_of_education",
      };
      if (editFormData.phone) payload.phone = editFormData.phone;
      if (editFormData.mobile) payload.mobile = editFormData.mobile;
      if (editFormData.email) payload.email = editFormData.email;
      if (editFormData.gender_classification) payload.gender_classification = editFormData.gender_classification;
      await updateTrainingSite(id, payload);

      toast.success("تم تعديل مكان التدريب بنجاح.");
      setEditingId(null);
      fetchPlaces();
    } catch (error) {
      console.error("Failed to update training site:", error);
      toast.error(extractValidationMessage(error, "تعذر تعديل مكان التدريب."));
    }
  };

  const handleDeletePlace = async (id) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف مكان التدريب؟");
    if (!confirmed) return;

    try {
      await deleteTrainingSite(id);
      toast.success("تم حذف مكان التدريب بنجاح.");
      fetchPlaces();
    } catch (error) {
      console.error("Failed to delete training site:", error);
      toast.error("تعذر حذف مكان التدريب.");
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
      <div className="flex items-start gap-3 flex-wrap mb-4">
        <MinistryEducationSeal size={54} />
        <div className="flex-1">
          <PageHeader title="أماكن التدريب" subtitle="إدارة وعرض أماكن التدريب المعتمدة التابعة لمديرية التربية والتعليم" icon={Building2} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
        {[
          { title: "إجمالي الأماكن", value: places.length, icon: Building2, color: "#3b82f6", bg: "#dbeafe" },
          { title: "أماكن نشطة", value: activeCount, icon: CheckCircle2, color: "#10b981", bg: "#d1fae5" },
          { title: "غير نشطة", value: inactiveCount, icon: XCircle, color: "#ef4444", bg: "#fee2e2" },
          { title: "الطاقة الاستيعابية", value: totalCapacity, icon: Users, color: "#8b5cf6", bg: "#ede9fe" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 border border-[#e2e8f0] flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                <Icon size={24} />
              </div>
              <div>
                <div className="text-[0.8rem] text-[#94a3b8]">{card.title}</div>
                <div className="text-2xl font-extrabold text-[#1e293b]">{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Form */}
      <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] mb-4">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white">
            <Plus size={20} />
          </div>
          <h4 className="m-0 text-[1.1rem] font-bold">إضافة مكان تدريب جديد</h4>
        </div>

        <form onSubmit={handleAddPlace}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">اسم مكان التدريب</label>
              <div className="relative">
                <School size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input type="text" name="name" placeholder="أدخل اسم مكان التدريب" value={formData.name} onChange={handleChange}
                  className="w-full py-2.5 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none focus:border-[#3b82f6] transition-colors"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">نوع المدرسة</label>
              <select name="school_type" value={formData.school_type} onChange={handleChange}
                className="w-full py-2.5 px-3 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none"
              >
                <option value="حكومية">حكومية</option>
                <option value="خاصة">خاصة</option>
              </select>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">المدينة / الموقع</label>
              <div className="relative">
                <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input type="text" name="city" placeholder="أدخل المدينة أو الموقع" value={formData.city} onChange={handleChange}
                  className="w-full py-2.5 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none focus:border-[#3b82f6] transition-colors"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">السعة الاستيعابية</label>
              <div className="relative">
                <Users size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input type="number" name="capacity" placeholder="عدد الطلبة" value={formData.capacity} onChange={handleChange} min="1"
                  className="w-full py-2.5 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none focus:border-[#3b82f6] transition-colors"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">المديرية</label>
              <input
                type="text"
                value={userDirectorate}
                readOnly
                disabled
                className="w-full py-2.5 px-3 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f1f5f9] text-[#64748b] cursor-not-allowed outline-none"
              />
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">الهاتف</label>
              <div className="relative">
                <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input type="text" name="phone" placeholder="رقم الهاتف" value={formData.phone} onChange={handleChange}
                  className="w-full py-2.5 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input type="email" name="email" placeholder="بريد المدير" value={formData.email} onChange={handleChange}
                  className="w-full py-2.5 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">رقم المحمول</label>
              <div className="relative">
                <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input type="text" name="mobile" placeholder="رقم المحمول" value={formData.mobile} onChange={handleChange}
                  className="w-full py-2.5 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">تصنيف المدرسة</label>
              <select name="gender_classification" value={formData.gender_classification} onChange={handleChange}
                className="w-full py-2.5 px-3 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none"
              >
                <option value="">-- اختر --</option>
                <option value="boys">ذكور</option>
                <option value="girls">إناث</option>
                <option value="mixed">مختلطة</option>
              </select>
            </div>

            <div>
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-1.5">مرحلة المدرسة</label>
              <select name="school_level" value={formData.school_level} onChange={handleChange}
                className="w-full py-2.5 px-3 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none"
              >
                <option value="lower">دنيا</option>
                <option value="upper">عليا</option>
              </select>
            </div>

          </div>

          <div className="flex items-center gap-4 mt-5 flex-wrap">
            <button type="submit" className="inline-flex items-center gap-2 py-2.5 px-5 bg-gradient-to-br from-[#10b981] to-[#059669] text-white border-none rounded-[10px] text-[0.9rem] font-semibold cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all">
              <Save size={16} /> حفظ مكان التدريب
            </button>
          </div>
        </form>
      </div>

      {/* Training Sites List */}
      <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0]">
        <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-[#e2e8f0] flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white">
              <Building2 size={20} />
            </div>
            <h4 className="m-0 text-[1.1rem] font-bold">قائمة أماكن التدريب</h4>
          </div>
          <div className="relative min-w-[220px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input type="text" placeholder="بحث بالاسم أو المدينة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 rounded-[10px] border border-[#e2e8f0] text-[0.85rem] bg-[#f8fafc] outline-none"
              style={{ paddingLeft: '12px', paddingRight: '40px' }}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="section" text="جاري تحميل أماكن التدريب..." />
        ) : (
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
            <table className="w-full border-collapse text-[0.9rem]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  {["اسم المكان", "نوع المدرسة", "المدينة", "الهاتف", "البريد", "المحمول", "السعة", "المديرية", "الحالة", "الإجراءات"].map((h) => (
                    <th key={h} className="py-3.5 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPlaces.map((place, idx) =>
                  editingId === place.id ? (
                    <tr key={place.id} className="bg-[#fef3c7]">
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <input type="text" name="name" value={editFormData.name} onChange={handleEditChange}
                          className="w-full py-1.5 px-2 rounded-md border border-[#d97706] text-[0.85rem]"
                        />
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <select name="school_type" value={editFormData.school_type} onChange={handleEditChange}
                          className="py-1.5 px-2 rounded-md border border-[#d97706] text-[0.85rem]"
                        >
                          <option value="حكومية">حكومية</option>
                          <option value="خاصة">خاصة</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <input type="text" name="city" value={editFormData.city} onChange={handleEditChange}
                          className="w-full py-1.5 px-2 rounded-md border border-[#d97706] text-[0.85rem]"
                        />
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <input type="text" name="phone" value={editFormData.phone} onChange={handleEditChange}
                          className="w-full py-1.5 px-2 rounded-md border border-[#d97706] text-[0.85rem]"
                        />
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <input type="email" name="email" value={editFormData.email} onChange={handleEditChange}
                          className="w-full py-1.5 px-2 rounded-md border border-[#d97706] text-[0.85rem]"
                        />
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <input type="text" name="mobile" value={editFormData.mobile} onChange={handleEditChange}
                          className="w-full py-1.5 px-2 rounded-md border border-[#d97706] text-[0.85rem]"
                        />
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <input type="number" name="capacity" value={editFormData.capacity} onChange={handleEditChange} min="1"
                          className="w-[70px] py-1.5 px-2 rounded-md border border-[#d97706] text-[0.85rem]"
                        />
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <span className="text-[0.85rem] text-[#64748b] font-semibold">{userDirectorate}</span>
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <label className="flex gap-1.5 items-center text-[0.85rem] cursor-pointer">
                          <input type="checkbox" name="is_active" checked={editFormData.is_active} onChange={handleEditChange} />
                          نشط
                        </label>
                      </td>
                      <td className="py-3 px-4 border-b border-[#e2e8f0]">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => handleUpdatePlace(place.id)}
                            className="inline-flex items-center gap-1 py-1.5 px-3 bg-[#10b981] text-white border-none rounded-md text-[0.8rem] font-semibold cursor-pointer"
                          >
                            <Save size={13} /> حفظ
                          </button>
                          <button type="button" onClick={cancelEdit}
                            className="inline-flex items-center gap-1 py-1.5 px-3 bg-[#64748b] text-white border-none rounded-md text-[0.8rem] font-semibold cursor-pointer"
                          >
                            <X size={13} /> إلغاء
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={place.id} className={`border-b border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                        <div className="flex items-center gap-2">
                          <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] text-[#2563eb] flex items-center justify-center shrink-0">
                            <School size={16} />
                          </div>
                          <span className="font-semibold">{place.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">{place.school_type}</td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">
                        <span className="flex items-center gap-1"><MapPin size={13} />{place.city}</span>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">{place.phone || "-"}</td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">{place.email || "-"}</td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">{place.mobile || "-"}</td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#1e293b]">
                          <Users size={14} color="#64748b" />{place.capacity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0] text-[#64748b]">{place.directorate}</td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                        <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.8rem] font-semibold" style={{ background: place.status === "متاح" ? "#d1fae5" : "#fee2e2", color: place.status === "متاح" ? "#059669" : "#dc2626" }}>
                          {place.status === "متاح" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {place.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#e2e8f0]">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => startEdit(place)}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] rounded-md text-[0.8rem] font-semibold cursor-pointer hover:bg-[#e2e8f0] hover:text-[#1e293b] transition-all"
                          >
                            <Pencil size={13} /> تعديل
                          </button>
                          <button type="button" onClick={() => handleDeletePlace(place.id)}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] rounded-md text-[0.8rem] font-semibold cursor-pointer hover:bg-[#fee2e2] transition-all"
                          >
                            <Trash2 size={13} /> حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {filteredPlaces.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center">
                      <div className="text-[#94a3b8]">
                        <School size={48} className="mb-3 opacity-40" />
                        <p className="m-0 text-[1rem] font-semibold">
                          {searchQuery ? "لا توجد نتائج مطابقة للبحث" : "لا توجد أماكن تدريب مسجلة حاليًا"}
                        </p>
                        {searchQuery && <p className="m-0 mt-1 text-[0.85rem]">جرّب كلمات بحث مختلفة</p>}
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