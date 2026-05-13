import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAppToast from "../../../hooks/useAppToast";
import { useAuth } from "../../../stores/AuthContext";
import PageHeader from "../../../components/common/PageHeader";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import EmptyState from "../../../components/common/EmptyState";
import Button from "../../../components/ui/Button";
import {
  getTrainingSiteStaff,
  getAvailableStaff,
  getTrainingSites,
  assignStaff,
  transferStaff,
  removeStaff,
} from "../../../services/api";
import { apiCache } from "../../../services/apiCache";

const STAFF_ROLES = [
  { value: "", label: "كل الأدوار" },
  { value: "teacher", label: "معلم مرشد" },
  { value: "school_manager", label: "مدير مدرسة" },
  { value: "principal", label: "مدير جهة تدريب" },
  { value: "adviser", label: "مرشد تربوي" },
  { value: "field_supervisor", label: "مشرف ميداني" },
  { value: "psychologist", label: "أخصائي نفسي" },
];

const DIRECTORATES = [
  { value: "", label: "كل المديريات" },
  { value: "وسط", label: "وسط" },
  { value: "شمال", label: "شمال" },
  { value: "جنوب", label: "جنوب" },
  { value: "يطا", label: "يطا" },
];

export default function TrainingSiteStaffManagement() {
  const toast = useAppToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [trainingSites, setTrainingSites] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
  });

  const [filters, setFilters] = useState({
    search: "",
    directorate: user?.directorate || "",
    training_site_id: "",
    role: "",
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [assignForm, setAssignForm] = useState({
    user_id: "",
    training_site_id: "",
  });
  const [transferForm, setTransferForm] = useState({
    training_site_id: "",
    reason: "",
  });

  const userRoleName = user?.role?.name ?? user?.role ?? "";
  const isAdmin = userRoleName === "admin";
  const isEducationDirectorate = userRoleName === "education_directorate";
  const canAssign = isAdmin || user?.hasPermission?.("training_sites.staff.assign");
  const canTransfer = isAdmin || user?.hasPermission?.("training_sites.staff.transfer");
  const canRemove = isAdmin || user?.hasPermission?.("training_sites.staff.remove");

  const fetchStaff = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = {
          page,
          per_page: pagination.per_page,
          ...filters,
        };
        Object.keys(params).forEach((key) => {
          if (params[key] === "" || params[key] === null || params[key] === undefined) {
            delete params[key];
          }
        });

        const response = await getTrainingSiteStaff(params);
        setStaff(response.data || []);
        setPagination({
          current_page: response.current_page || 1,
          per_page: response.per_page || 20,
          total: response.total || 0,
          last_page: response.last_page || 1,
        });
      } catch (err) {
        toast.error(err?.response?.data?.message || "فشل تحميل بيانات الكوادر");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.per_page, toast]
  );

  const fetchTrainingSites = useCallback(async () => {
    try {
      const cacheKey = "training-sites:{\"per_page\":500}";
      const response = await apiCache.get(
        cacheKey,
        () => getTrainingSites({ per_page: 500 }),
        5 * 60_000
      );
      const sites = response?.data || response || [];
      if (isEducationDirectorate && user?.directorate) {
        setTrainingSites(sites.filter((s) => s.directorate === user.directorate));
      } else {
        setTrainingSites(sites);
      }
    } catch (err) {
      console.error("Failed to load training sites", err);
    }
  }, [isEducationDirectorate, user?.directorate]);

  useEffect(() => {
    fetchStaff(1);
  }, [filters, fetchStaff]);

  useEffect(() => {
    fetchTrainingSites();
  }, [fetchTrainingSites]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const openAssignModal = async () => {
    setShowAssignModal(true);
    setLoadingModal(true);
    try {
      const response = await getAvailableStaff({ per_page: 100 });
      setAvailableStaff(response?.data || response || []);
    } catch (err) {
      toast.error("فشل تحميل قائمة المستخدمين المتاحين");
    } finally {
      setLoadingModal(false);
    }
  };

  const openTransferModal = (user) => {
    setSelectedUser(user);
    setTransferForm({
      training_site_id: "",
      reason: "",
    });
    setShowTransferModal(true);
  };

  const openRemoveModal = (user) => {
    setSelectedUser(user);
    setShowRemoveModal(true);
  };

  const closeModals = () => {
    setShowAssignModal(false);
    setShowTransferModal(false);
    setShowRemoveModal(false);
    setSelectedUser(null);
    setAssignForm({ user_id: "", training_site_id: "" });
    setTransferForm({ training_site_id: "", reason: "" });
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.user_id || !assignForm.training_site_id) {
      toast.error("الرجاء اختيار المستخدم والموقع");
      return;
    }
    setSubmitting(true);
    try {
      await assignStaff(assignForm);
      toast.success("تم تعيين المستخدم بنجاح");
      closeModals();
      fetchStaff(pagination.current_page);
      apiCache.invalidatePrefix("training-site-staff:");
    } catch (err) {
      toast.error(err?.response?.data?.message || "فشل تعيين المستخدم");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.training_site_id) {
      toast.error("الرجاء اختيار الموقع الجديد");
      return;
    }
    setSubmitting(true);
    try {
      await transferStaff({
        user_id: selectedUser.id,
        training_site_id: transferForm.training_site_id,
        reason: transferForm.reason,
      });
      toast.success("تم نقل المستخدم بنجاح");
      closeModals();
      fetchStaff(pagination.current_page);
      apiCache.invalidatePrefix("training-site-staff:");
    } catch (err) {
      toast.error(err?.response?.data?.message || "فشل نقل المستخدم");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setSubmitting(true);
    try {
      await removeStaff(selectedUser.id);
      toast.success("تم إزالة المستخدم من الموقع بنجاح");
      closeModals();
      fetchStaff(pagination.current_page);
      apiCache.invalidatePrefix("training-site-staff:");
    } catch (err) {
      toast.error(err?.response?.data?.message || "فشل إزالة المستخدم");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (roleName) => {
    const role = STAFF_ROLES.find((r) => r.value === roleName);
    return role?.label || roleName;
  };

  const filteredSites = useMemo(() => {
    if (isEducationDirectorate && user?.directorate) {
      return trainingSites.filter((s) => s.directorate === user.directorate);
    }
    return trainingSites;
  }, [trainingSites, isEducationDirectorate, user?.directorate]);

  return (
    <div className="page-container">
      <PageHeader title="إدارة كوادر مواقع التدريب" />

      <div className="filters-bar">
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
          <select
            value={filters.directorate}
            onChange={(e) => handleFilterChange("directorate", e.target.value)}
            disabled={isEducationDirectorate}
          >
            {DIRECTORATES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            value={filters.training_site_id}
            onChange={(e) => handleFilterChange("training_site_id", e.target.value)}
          >
            <option value="">كل المواقع</option>
            {filteredSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange("role", e.target.value)}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {canAssign && (
            <Button variant="primary" onClick={openAssignModal}>
              + تعيين جديد
            </Button>
          )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : staff.length === 0 ? (
        <EmptyState message="لا يوجد كوادر مسجلة في مواقع التدريب" />
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور</th>
                <th>الموقع التدريبي</th>
                <th>المديرية</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.email}</td>
                  <td>{getRoleLabel(person.role?.name)}</td>
                  <td>{person.training_site?.name || "—"}</td>
                  <td>{person.training_site?.directorate || "—"}</td>
                  <td>{person.phone || "—"}</td>
                  <td>
                    <span className={`status-badge ${person.status}`}>
                      {person.status === "active" ? "نشط" : person.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {canTransfer && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openTransferModal(person)}
                        >
                          نقل
                        </Button>
                      )}
                      {canRemove && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openRemoveModal(person)}
                        >
                          إزالة
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.last_page > 1 && (
            <div className="pagination flex justify-center gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.current_page === 1}
                onClick={() => fetchStaff(pagination.current_page - 1)}
              >
                السابق
              </Button>
              <span className="self-center">
                صفحة {pagination.current_page} من {pagination.last_page}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchStaff(pagination.current_page + 1)}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>تعيين مستخدم جديد</h3>
            {loadingModal ? (
              <LoadingSpinner />
            ) : (
              <form onSubmit={handleAssign}>
                <div className="form-group">
                  <label>المستخدم *</label>
                  <select
                    value={assignForm.user_id}
                    onChange={(e) =>
                      setAssignForm((prev) => ({ ...prev, user_id: e.target.value }))
                    }
                    className="form-select"
                    required
                  >
                    <option value="">اختر مستخدم...</option>
                    {availableStaff.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({getRoleLabel(u.role?.name)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>الموقع التدريبي *</label>
                  <select
                    value={assignForm.training_site_id}
                    onChange={(e) =>
                      setAssignForm((prev) => ({ ...prev, training_site_id: e.target.value }))
                    }
                    className="form-select"
                    required
                  >
                    <option value="">اختر موقع...</option>
                    {filteredSites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} ({site.directorate})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "جاري الحفظ..." : "تعيين"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeModals}>
                    إلغاء
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>نقل المستخدم</h3>
            <p>
              نقل <strong>{selectedUser.name}</strong> من{" "}
              <strong>{selectedUser.training_site?.name}</strong>
            </p>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label>الموقع الجديد *</label>
                <select
                  value={transferForm.training_site_id}
                  onChange={(e) =>
                    setTransferForm((prev) => ({ ...prev, training_site_id: e.target.value }))
                  }
                  className="form-select"
                  required
                >
                  <option value="">اختر موقع...</option>
                  {filteredSites
                    .filter((s) => s.id !== selectedUser.training_site_id)
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} ({site.directorate})
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>سبب النقل</label>
                <textarea
                  value={transferForm.reason}
                  onChange={(e) =>
                    setTransferForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="form-textarea"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "جاري الحفظ..." : "نقل"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeModals}>
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>إزالة المستخدم</h3>
            <p>
              هل أنت متأكد من إزالة <strong>{selectedUser.name}</strong> من{" "}
              <strong>{selectedUser.training_site?.name}</strong>؟
            </p>
            <div className="modal-actions">
              <Button variant="danger" onClick={handleRemove} disabled={submitting}>
                {submitting ? "جاري الحذف..." : "إزالة"}
              </Button>
              <Button variant="secondary" onClick={closeModals}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
