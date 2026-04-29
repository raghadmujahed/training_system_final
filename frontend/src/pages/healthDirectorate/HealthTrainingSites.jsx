import { useEffect, useState } from "react";
import {
  getTrainingSites,
  createTrainingSite,
  updateTrainingSite,
  deleteTrainingSite,
} from "../../services/api";
import { siteLabels } from "../../utils/roles";

const normalizePlace = (item) => ({
  id: item.id,
  name: item.name || "—",
  location: item.location || "—",
  phone: item.phone || "—",
  email: item.email || "—",
  mobile: item.mobile || "—",
  capacity: item.capacity ?? 0,
  directorate: item.directorate || "—",
  status: item.is_active === true || item.is_active === 1 ? "متاح" : "غير نشط",
  is_active: item.is_active === true || item.is_active === 1,
});

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

export default function HealthTrainingSites() {
  const labels = siteLabels("health_center");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    mobile: "",
    capacity: "",
    directorate: "وسط",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    mobile: "",
    capacity: "",
    directorate: "وسط",
    is_active: true,
  });

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getTrainingSites({
        site_type: "health_center",
        per_page: 200,
      });

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setPlaces(list.map(normalizePlace));
    } catch (error) {
      console.error("Failed to load training sites:", error);
      setErrorMessage("تعذر تحميل أماكن التدريب الصحية.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === "متاح") return "badge-custom badge-success";
    if (status === "غير نشط") return "badge-custom badge-danger";
    return "badge-custom badge-soft";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

    if (!formData.name || !formData.location || !formData.capacity) {
      setErrorMessage("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    try {
      setSavedMessage("");
      setErrorMessage("");

      await createTrainingSite({
        name: formData.name,
        location: formData.location,
        phone: formData.phone,
        email: formData.email,
        mobile: formData.mobile,
        capacity: Number(formData.capacity),
        is_active: true,
        directorate: formData.directorate,
        site_type: "health_center",
        governing_body: "ministry_of_health",
      });

      setFormData({
        name: "",
        location: "",
        phone: "",
        email: "",
        mobile: "",
        capacity: "",
        directorate: "وسط",
      });

      setSavedMessage("تم حفظ مكان التدريب الصحي بنجاح.");
      fetchPlaces();
    } catch (error) {
      console.error("Failed to create training site:", error);
      setErrorMessage(extractValidationMessage(error, "تعذر حفظ مكان التدريب."));
    }
  };

  const startEdit = (place) => {
    setEditingId(place.id);
    setEditFormData({
      name: place.name,
      location: place.location,
      phone: place.phone || "",
      email: place.email || "",
      mobile: place.mobile || "",
      capacity: String(place.capacity),
      directorate: place.directorate,
      is_active: place.is_active,
    });
    setSavedMessage("");
    setErrorMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({
      name: "",
      location: "",
      phone: "",
      email: "",
      mobile: "",
      capacity: "",
      directorate: "وسط",
      is_active: true,
    });
  };

  const handleUpdatePlace = async (id) => {
    if (!editFormData.name || !editFormData.location || !editFormData.capacity) {
      setErrorMessage("يرجى تعبئة جميع حقول التعديل المطلوبة.");
      return;
    }

    try {
      setSavedMessage("");
      setErrorMessage("");

      await updateTrainingSite(id, {
        name: editFormData.name,
        location: editFormData.location,
        phone: editFormData.phone,
        email: editFormData.email,
        mobile: editFormData.mobile,
        capacity: Number(editFormData.capacity),
        is_active: editFormData.is_active,
        directorate: editFormData.directorate,
        site_type: "health_center",
        governing_body: "ministry_of_health",
      });

      setSavedMessage("تم تعديل مكان التدريب بنجاح.");
      setEditingId(null);
      fetchPlaces();
    } catch (error) {
      console.error("Failed to update training site:", error);
      setErrorMessage(extractValidationMessage(error, "تعذر تعديل مكان التدريب."));
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

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">أماكن التدريب الصحي</h1>
        <p className="page-subtitle">
          إدارة وعرض المراكز الصحية والمصحات المعتمدة التابعة لـ {labels.directorateName}.
        </p>
      </div>

      <div className="section-card mb-3">
        <h4>إضافة مركز صحي جديد</h4>

        <form onSubmit={handleAddPlace}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label-custom">اسم المركز الصحي</label>
              <input
                type="text"
                name="name"
                className="form-control-custom"
                placeholder="أدخل اسم المركز أو المصحة"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label-custom">الموقع / العنوان</label>
              <input
                type="text"
                name="location"
                className="form-control-custom"
                placeholder="أدخل الموقع أو العنوان"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label-custom">الهاتف</label>
              <input
                type="text"
                name="phone"
                className="form-control-custom"
                placeholder="رقم الهاتف"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-custom">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                className="form-control-custom"
                placeholder="بريد المدير"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-custom">رقم المحمول</label>
              <input
                type="text"
                name="mobile"
                className="form-control-custom"
                placeholder="رقم المحمول"
                value={formData.mobile}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label-custom">الطاقة الاستيعابية</label>
              <input
                type="number"
                name="capacity"
                className="form-control-custom"
                placeholder="عدد الطلبة الممكن استقبالهم"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label-custom">المنطقة / المديرية</label>
              <select
                name="directorate"
                className="form-select-custom"
                value={formData.directorate}
                onChange={handleChange}
              >
                <option value="وسط">وسط</option>
                <option value="شمال">شمال</option>
                <option value="جنوب">جنوب</option>
                <option value="يطا">يطا</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <button type="submit" className="btn-primary-custom">
              حفظ المركز الصحي
            </button>
          </div>

          {savedMessage && (
            <div className="alert-custom alert-success mt-3">{savedMessage}</div>
          )}

          {errorMessage && (
            <div className="alert-custom alert-danger mt-3">{errorMessage}</div>
          )}
        </form>
      </div>

      <div className="section-card">
        <h4>قائمة المراكز الصحية</h4>

        {loading ? (
          <div className="alert-custom alert-info">جاري تحميل المراكز الصحية...</div>
        ) : (
          <div className="table-wrapper">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>اسم المركز</th>
                  <th>الموقع</th>
                  <th>الهاتف</th>
                  <th>البريد</th>
                  <th>المحمول</th>
                  <th>الطاقة الاستيعابية</th>
                  <th>المنطقة</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {places.map((place) =>
                  editingId === place.id ? (
                    <tr key={place.id}>
                      <td>
                        <input
                          type="text"
                          name="name"
                          className="form-control-custom"
                          value={editFormData.name}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="location"
                          className="form-control-custom"
                          value={editFormData.location}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="phone"
                          className="form-control-custom"
                          value={editFormData.phone}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          name="email"
                          className="form-control-custom"
                          value={editFormData.email}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="mobile"
                          className="form-control-custom"
                          value={editFormData.mobile}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="capacity"
                          className="form-control-custom"
                          value={editFormData.capacity}
                          onChange={handleEditChange}
                          min="1"
                        />
                      </td>
                      <td>
                        <select
                          name="directorate"
                          className="form-select-custom"
                          value={editFormData.directorate}
                          onChange={handleEditChange}
                        >
                          <option value="وسط">وسط</option>
                          <option value="شمال">شمال</option>
                          <option value="جنوب">جنوب</option>
                          <option value="يطا">يطا</option>
                        </select>
                      </td>
                      <td>
                        <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={editFormData.is_active}
                            onChange={handleEditChange}
                          />
                          نشط
                        </label>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-primary-custom btn-sm-custom"
                            onClick={() => handleUpdatePlace(place.id)}
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            className="btn-outline-custom btn-sm-custom"
                            onClick={cancelEdit}
                          >
                            إلغاء
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={place.id}>
                      <td>{place.name}</td>
                      <td>{place.location}</td>
                      <td>{place.phone}</td>
                      <td>{place.email}</td>
                      <td>{place.mobile}</td>
                      <td>{place.capacity}</td>
                      <td>{place.directorate}</td>
                      <td>
                        <span className={getStatusClass(place.status)}>{place.status}</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-outline-custom btn-sm-custom"
                            onClick={() => startEdit(place)}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            className="btn-danger-custom btn-sm-custom"
                            onClick={() => handleDeletePlace(place.id)}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {places.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center">
                      لا توجد مراكز صحية مسجلة حاليًا
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
