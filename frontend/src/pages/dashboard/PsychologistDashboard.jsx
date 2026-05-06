import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, itemsFromPagedResponse } from "../../services/api";
import { useAnnouncements } from "../../hooks/useSharedData";

export default function PsychologistDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentsCount, setStudentsCount] = useState(0);
  const { data: announcements } = useAnnouncements({ per_page: 5 });

  useEffect(() => {
    let m = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const usersRes = await getUsers({ per_page: 200, status: "active" });
        if (!m) return;
        const users = itemsFromPagedResponse(usersRes);
        setStudentsCount(
          typeof usersRes?.meta?.total === "number" ? usersRes.meta.total : users.length
        );
      } catch (e) {
        if (m) setError(e?.response?.data?.message || "فشل تحميل البيانات");
      } finally {
        if (m) setLoading(false);
      }
    }
    load();
    return () => { m = false; };
  }, []);

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">لوحة الأخصائي النفسي</h1>
        <p className="page-subtitle">
          منصة دعم نفسي وإرشاد للطلبة ضمن إطار التدريب الميداني والأكاديمي.
        </p>
      </div>

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card primary">
              <div className="stat-title">الطلبة (قائمة مرجعية)</div>
              <div className="stat-value">{studentsCount}</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-title">إعلانات حديثة</div>
              <div className="stat-value">{announcements.length}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-title">خدمات الإرشاد</div>
              <div className="stat-value">دليل</div>
            </div>
            <div className="stat-card info">
              <div className="stat-title">التواصل</div>
              <div className="stat-value">داخلي</div>
            </div>
          </div>

          <div className="dashboard-row">
            <div className="section-card">
              <h4>أحدث الإعلانات الموجهة لك</h4>
              {announcements.length === 0 ? (
                <p className="text-soft">لا توجد إعلانات حالياً.</p>
              ) : (
                <div className="activity-list">
                  {announcements.map((a) => (
                    <div className="activity-item" key={a.id}>
                      <h6>{a.title || "إعلان"}</h6>
                      <p>{a.content || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn-primary-custom btn-sm-custom" to="/psychologist/students">
                  قائمة الطلبة
                </Link>
                <Link className="btn-outline-custom btn-sm-custom" to="/psychologist/guidance">
                  الإرشاد والدعم
                </Link>
                <Link className="btn-outline-custom btn-sm-custom" to="/notifications">
                  الإشعارات
                </Link>
              </div>
            </div>

            <div className="announcement-box">
              <h5>تنويه</h5>
              <p>
                تُعرض هنا بيانات عامة وإعلانات فقط. أي جلسات أو تقارير سرية يجب أن تُدار وفق
                سياسة الجامعة والسرية المهنية، ولا تُخزَّن في هذا النموذج الأولي إلا بعد
                إضافة وحدة خلفية مخصصة.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
