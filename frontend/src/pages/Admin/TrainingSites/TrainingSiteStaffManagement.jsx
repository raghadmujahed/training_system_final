import { useState, useEffect, useCallback, useRef } from "react";
import useAppToast from "../../../hooks/useAppToast";
import { readStoredUser } from "../../../utils/session";
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

const DIRECTORATE_ROLES = ["education_directorate", "health_directorate"];

export default function TrainingSiteStaffManagement() {
  const toast = useAppToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const user = readStoredUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);
  const [trainingSites, setTrainingSites] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
  });

  const userRoleName = user?.role?.name ?? user?.role ?? "";
  const isAdmin = userRoleName === "admin";
  // Both education_directorate and health_directorate are treated as directorate accounts
  const isDirectorate = DIRECTORATE_ROLES.includes(userRoleName);
  const userDirectorate = isDirectorate ? (user?.directorate ?? "") : "";

  const [filters, setFilters] = useState({
    search: "",
    // Directorate users: lock filter to their own directorate (backend enforces it too)
    directorate: userDirectorate,
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
  const [modalError, setModalError] = useState("");

  const [assignForm, setAssignForm] = useState({
    user_id: "",
    training_site_id: "",
  });
  const [transferForm, setTransferForm] = useState({
    training_site_id: "",
    reason: "",
  });

  const userPermissions = user?.role?.permissions || [];
  const hasPermission = (name) =>
    isAdmin || userPermissions.some((p) => (p?.name ?? p) === name);
  const canAssign = hasPermission("training_sites.staff.assign");
  const canTransfer = hasPermission("training_sites.staff.transfer");
  const canRemove = hasPermission("training_sites.staff.remove");

  const fetchStaff = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const params = { page, per_page: 20, ...filters };
        // Strip empty values
        Object.keys(params).forEach((key) => {
          if (params[key] === "" || params[key] === null || params[key] === undefined) {
            delete params[key];
          }
        });

        const response = await getTrainingSiteStaff(params);
        const items = Array.isArray(response?.data) ? response.data : [];
        setStaff(items);
        setPagination({
          current_page: response?.current_page || 1,
          per_page: response?.per_page || 20,
          total: response?.total || 0,
          last_page: response?.last_page || 1,
        });
      } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message;
        if (status === 403) {
          setError(msg || "لا تملك صلاحية الوصول إلى إدارة كوادر التدريب");
        } else if (status === 401) {
          setError("يرجى تسجيل الدخول أولاً");
        } else {
          setError(msg || "فشل تحميل بيانات الكوادر، يرجى المحاولة مجدداً");
        }
        toastRef.current.error(msg || "فشل تحميل بيانات الكوادر");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const fetchTrainingSites = useCallback(async () => {
    try {
      // For directorate accounts: pass directorate filter to backend so we only get their sites
      const params = { per_page: 500 };
      if (userDirectorate) params.directorate = userDirectorate;
      const cacheKey = `training-sites:staff-mgmt:${userDirectorate || "all"}`;
      const response = await apiCache.get(
        cacheKey,
        () => getTrainingSites(params),
        5 * 60_000
      );
      const sites = response?.data || response || [];
      setTrainingSites(sites);
    } catch (err) {
      console.error("Failed to load training sites", err);
    }
  }, [userDirectorate]);

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
      const list = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      setAvailableStaff(list);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        toastRef.current.error("لا تملك صلاحية تعيين الكوادر");
        setShowAssignModal(false);
      } else {
        toastRef.current.error(err?.response?.data?.message || "فشل تحميل قائمة المستخدمين المتاحين");
      }
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
    setModalError("");
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!assignForm.user_id || !assignForm.training_site_id) {
      setModalError("الرجاء اختيار المستخدم والموقع");
      return;
    }
    setSubmitting(true);
    try {
      const res = await assignStaff(assignForm);
      toastRef.current.success("تم تعيين المستخدم بنجاح");
      closeModals();
      // Add new staff member to local state if returned
      const newPerson = res?.data;
      if (newPerson?.id) {
        setStaff(prev => [newPerson, ...prev]);
        setPagination(p => ({ ...p, total: p.total + 1 }));
      } else {
        fetchStaff(pagination.current_page);
      }
      apiCache.invalidatePrefix("training-sites:staff-mgmt:");
    } catch (err) {
      const msg = err?.response?.data?.message || "فشل تعيين المستخدم";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!transferForm.training_site_id) {
      setModalError("الرجاء اختيار الموقع الجديد");
      return;
    }
    // Detect no change
    if (String(transferForm.training_site_id) === String(selectedUser?.training_site_id)) {
      setModalError("لم تقم بتغيير المدرسة — الموقع المختار هو نفس الموقع الحالي");
      return;
    }
    setSubmitting(true);
    try {
      const res = await transferStaff({
        user_id: selectedUser.id,
        training_site_id: transferForm.training_site_id,
        reason: transferForm.reason,
      });
      const updatedPerson = res?.data;
      toastRef.current.success("تم نقل الكادر بنجاح");
      closeModals();
      // Update local state directly — no full reload needed
      if (updatedPerson?.id) {
        setStaff(prev =>
          prev.map(p =>
            p.id === updatedPerson.id ? { ...p, ...updatedPerson } : p
          )
        );
      } else {
        fetchStaff(pagination.current_page);
      }
      apiCache.invalidatePrefix("training-sites:staff-mgmt:");
    } catch (err) {
      // Do NOT close modal on error — show error inside modal
      const msg = err?.response?.data?.message || "فشل نقل الكادر";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setModalError("");
    setSubmitting(true);
    try {
      await removeStaff(selectedUser.id);
      const removedId = selectedUser.id;
      toastRef.current.success("تم إزالة الكادر من الموقع بنجاح");
      closeModals();
      // Remove from local state directly
      setStaff(prev => prev.filter(p => p.id !== removedId));
      setPagination(p => ({ ...p, total: Math.max(0, p.total - 1) }));
      apiCache.invalidatePrefix("training-sites:staff-mgmt:");
    } catch (err) {
      const msg = err?.response?.data?.message || "فشل إزالة الكادر";
      setModalError(msg);
      toastRef.current.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (roleName) => {
    const role = STAFF_ROLES.find((r) => r.value === roleName);
    return role?.label || roleName;
  };

  // trainingSites is already filtered by backend for directorate users
  const filteredSites = trainingSites;

  // Block directorate users not linked to a directorate
  if (isDirectorate && !userDirectorate) {
    return (
      <div className="page-container">
        <PageHeader title="إدارة كوادر مواقع التدريب" />
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl p-6 mt-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-lg mb-1">الحساب غير مرتبط بمديرية</p>
            <p className="text-sm">لم يتم ربط حسابك بمديرية، يرجى التواصل مع مدير النظام لربط حسابك بالمديرية الصحيحة.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="إدارة كوادر مواقع التدريب"
        subtitle={isDirectorate ? `المديرية: ${userDirectorate}` : undefined}
      />

      <div className="filters-bar flex flex-wrap gap-2 items-center mb-4">
        <input
          type="text"
          className="form-input w-56"
          placeholder="بحث بالاسم أو البريد أو الهاتف..."
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />

        {/* Admin: show directorate dropdown. Directorate users: locked to their own */}
        {isAdmin && (
          <select
            className="form-select w-36"
            value={filters.directorate}
            onChange={(e) => handleFilterChange("directorate", e.target.value)}
          >
            {DIRECTORATES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        )}

        <select
          className="form-select w-48"
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
          className="form-select w-36"
          value={filters.role}
          onChange={(e) => handleFilterChange("role", e.target.value)}
        >
          {STAFF_ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        {canAssign && (
          <Button variant="primary" onClick={openAssignModal}>
            + تعيين جديد
          </Button>
        )}

        <span className="text-sm text-gray-500 mr-auto">
          {pagination.total > 0 ? `إجمالي: ${pagination.total} كادر` : ""}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold mb-1">تعذّر تحميل البيانات</p>
            <p className="text-sm">{error}</p>
            {!error.includes("صلاحية") && (
              <button
                onClick={() => fetchStaff(1)}
                className="mt-2 text-sm underline text-red-700 hover:text-red-900"
              >
                إعادة المحاولة
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? null : staff.length === 0 ? (
        <EmptyState title="لا توجد كوادر مضافة حالياً" description="لم يتم تسجيل أي كادر في مواقع التدريب بعد" />
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
            <h3>تعيين كادر جديد في موقع تدريبي</h3>
            {loadingModal ? (
              <LoadingSpinner />
            ) : (
              <form onSubmit={handleAssign}>
                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">
                    {modalError}
                  </div>
                )}
                <div className="form-group">
                  <label>المستخدم *</label>
                  <select
                    value={assignForm.user_id}
                    onChange={(e) => {
                      setModalError("");
                      setAssignForm((prev) => ({ ...prev, user_id: e.target.value }));
                    }}
                    className="form-select"
                    required
                  >
                    <option value="">اختر مستخدم...</option>
                    {availableStaff.length === 0 ? (
                      <option disabled value="">لا يوجد مستخدمون متاحون حالياً</option>
                    ) : (
                      availableStaff.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {getRoleLabel(u.role?.name)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>الموقع التدريبي *</label>
                  <select
                    value={assignForm.training_site_id}
                    onChange={(e) => {
                      setModalError("");
                      setAssignForm((prev) => ({ ...prev, training_site_id: e.target.value }));
                    }}
                    className="form-select"
                    required
                  >
                    <option value="">اختر موقع...</option>
                    {filteredSites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}{isAdmin && site.directorate ? ` (${site.directorate})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "جاري الحفظ..." : "تعيين"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeModals} disabled={submitting}>
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
            <h3>نقل الكادر</h3>

            {/* Staff info summary */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span><strong>الاسم:</strong> {selectedUser.name}</span>
                <span><strong>الدور:</strong> {getRoleLabel(selectedUser.role?.name)}</span>
                <span><strong>الموقع الحالي:</strong> {selectedUser.training_site?.name || "—"}</span>
                {isAdmin && (
                  <span><strong>المديرية الحالية:</strong> {selectedUser.training_site?.directorate || "—"}</span>
                )}
              </div>
            </div>

            {/* Manager warning */}
            {(() => {
              const newSite = filteredSites.find(
                (s) => String(s.id) === String(transferForm.training_site_id)
              );
              const isManagerRole = ["school_manager", "principal"].includes(
                selectedUser.role?.name
              );
              if (isManagerRole && newSite?.manager_id && newSite.manager_id !== selectedUser.id) {
                return (
                  <div className="bg-orange-50 border border-orange-300 text-orange-800 rounded-lg px-3 py-2 text-sm mb-3">
                    ⚠️ هذه المدرسة لديها مدير حالي — لن يتم النقل حتى يتم نقل أو إزالة المدير الحالي أولاً.
                  </div>
                );
              }
              return null;
            })()}

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">
                {modalError}
              </div>
            )}

            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label>الموقع الجديد *</label>
                <select
                  value={transferForm.training_site_id}
                  onChange={(e) => {
                    setModalError("");
                    setTransferForm((prev) => ({ ...prev, training_site_id: e.target.value }));
                  }}
                  className="form-select"
                  required
                >
                  <option value="">اختر موقع...</option>
                  {filteredSites
                    .filter((s) => s.id !== selectedUser.training_site_id)
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}{isAdmin && site.directorate ? ` (${site.directorate})` : ""}
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
                  rows={2}
                  placeholder="اختياري..."
                />
              </div>
              <div className="modal-actions">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "جاري النقل..." : "تنفيذ النقل"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeModals} disabled={submitting}>
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
            <h3>إزالة الكادر من الموقع</h3>
            <p className="mb-1">
              هل أنت متأكد من إزالة <strong>{selectedUser.name}</strong>
              {" "}(<span className="text-gray-600">{getRoleLabel(selectedUser.role?.name)}</span>)
              {" "}من <strong>{selectedUser.training_site?.name || "الموقع الحالي"}</strong>؟
            </p>
            <p className="text-sm text-gray-500 mb-3">لن يتم حذف الحساب — فقط إلغاء ربطه بهذا الموقع.</p>
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">
                {modalError}
              </div>
            )}
            <div className="modal-actions">
              <Button variant="danger" onClick={handleRemove} disabled={submitting}>
                {submitting ? "جاري الإزالة..." : "تأكيد الإزالة"}
              </Button>
              <Button variant="secondary" onClick={closeModals} disabled={submitting}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
