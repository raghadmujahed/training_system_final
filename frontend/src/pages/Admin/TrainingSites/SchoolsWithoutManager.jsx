import { useEffect, useState } from "react";
import { getSchoolsWithoutManager, getAvailableSchoolManagers, assignManagerToSchool } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";

export default function SchoolsWithoutManager() {
  const toast = useAppToast();
  const [schools, setSchools] = useState([]);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningManager, setAssigningManager] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedManager, setSelectedManager] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schoolsData, managersData] = await Promise.all([
        getSchoolsWithoutManager(),
        getAvailableSchoolManagers()
      ]);
      setSchools(schoolsData);
      setAvailableManagers(managersData);
    } catch (err) {
      console.error(err);
      toast.apiError(err, "حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignManager = (school) => {
    setSelectedSchool(school);
    setSelectedManager("");
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedSchool || !selectedManager) {
      toast.warning("يرجى اختيار مدير المدرسة");
      return;
    }

    setAssigningManager(selectedSchool.id);
    try {
      await assignManagerToSchool(selectedSchool.id, selectedManager);
      toast.success("تم ربط المدير بالمدرسة بنجاح");
      setShowAssignModal(false);
      fetchData(); // Refresh data
    } catch (err) {
      console.error(err);
      toast.apiError(err, "حدث خطأ أثناء ربط المدير");
    } finally {
      setAssigningManager(null);
    }
  };

  const getSchoolTypeLabel = (type) => {
    const labels = {
      public: "حكومية",
      private: "خاصة",
      unrwa: "وكالة"
    };
    return labels[type] || type;
  };

  const getSchoolLevelLabel = (level) => {
    const labels = {
      lower: "أساسية",
      upper: "ثانوية",
      both: "أساسية وثانوية"
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="schools-without-manager">
      <PageHeader 
        title="المدارس بدون مدير" 
        description="قائمة بالمدارس التي لم يتم ربطها بمدير مدرسة بعد"
      />

      <div className="card">
        <div className="card-content">
          {schools.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>جميع المدارس مرتبطة بمدراء حالياً</h3>
              <p>لا توجد مدارس بدون مدير في الوقت الحالي</p>
              <Button onClick={() => window.history.back()}>
                رجوع
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>اسم المدرسة</th>
                    <th>التصنيف</th>
                    <th>المرحلة الدراسية</th>
                    <th>رقم الهاتف</th>
                    <th>رقم المحمول</th>
                    <th>الموقع</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id}>
                      <td>
                        <strong>{school.name}</strong>
                        {school.location && (
                          <div className="text-muted small">{school.location}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {getSchoolTypeLabel(school.school_type)}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-secondary">
                          {getSchoolLevelLabel(school.school_level)}
                        </span>
                      </td>
                      <td>{school.phone || "-"}</td>
                      <td>{school.mobile || "-"}</td>
                      <td>{school.location || "-"}</td>
                      <td>
                        <Button
                          size="sm"
                          onClick={() => handleAssignManager(school)}
                          disabled={availableManagers.length === 0}
                        >
                          ربط مدير
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign Manager Modal */}
      {showAssignModal && selectedSchool && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>ربط مدير بالمدرسة</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>المدرسة</label>
                <input 
                  type="text" 
                  value={selectedSchool.name} 
                  disabled 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>اختر مدير المدرسة</label>
                <select 
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="form-control"
                >
                  <option value="">اختر مدير المدرسة من الحسابات الموجودة</option>
                  {availableManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  يمكن ترك هذا الحقل فارغاً وربط المدرسة بمدير لاحقاً.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowAssignModal(false)}
              >
                إلغاء
              </Button>
              <Button 
                onClick={handleConfirmAssign}
                loading={assigningManager === selectedSchool.id}
                disabled={!selectedManager}
              >
                حفظ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
