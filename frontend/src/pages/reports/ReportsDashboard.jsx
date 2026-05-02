import { useEffect, useState } from "react";
import { getDashboardStats, getTrainingRequests, getUsers } from "../../services/api";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import Papa from "papaparse";

// تسجيل مكونات Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function ReportsDashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_sites: 0,
    completed_evaluations: 0,
    pending_reports: 0,
    ongoing_trainings: 0,
    completed_trainings: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // بيانات الرسم البياني لأعداد الطلبات حسب الشهر (مثال)
  const [monthlyRequests, setMonthlyRequests] = useState({
    labels: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"],
    values: [12, 19, 3, 5, 2, 3],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // جلب الإحصائيات العامة
      const statsData = await getDashboardStats();
      setStats({
        total_students: statsData.total_students || 0,
        total_sites: statsData.total_sites || 0,
        completed_evaluations: statsData.completed_evaluations || 0,
        pending_reports: statsData.pending_evaluations || 0,
        ongoing_trainings: statsData.ongoing_trainings || 0,
        completed_trainings: statsData.completed_trainings || 0,
      });

      // جلب آخر 5 طلبات تدريب
      const requestsData = await getTrainingRequests({ per_page: 5 });
      setRecentRequests(requestsData.data || []);
    } catch (err) {
      console.error(err);
      setError("فشل تحميل بيانات التقارير");
    } finally {
      setLoading(false);
    }
  };

  // تصدير البيانات إلى CSV
  const exportToCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // إضافة BOM للعربية
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportUsers = async () => {
    try {
      const usersData = await getUsers({ per_page: 1000 });
      const users = usersData.data || [];
      const exportData = users.map(u => ({
        "الاسم": u.name,
        "البريد الإلكتروني": u.email,
        "الدور": u.role?.name,
        "الحالة": u.status_label,
      }));
      exportToCSV(exportData, "users_report");
    } catch (err) {
      alert("فشل تصدير المستخدمين");
    }
  };

  const exportTrainingRequests = async () => {
    try {
      const requestsData = await getTrainingRequests({ per_page: 1000 });
      const requests = requestsData.data || [];
      const exportData = requests.map(r => ({
        "رقم الكتاب": r.letter_number,
        "تاريخ الكتاب": r.letter_date,
        "الحالة": r.book_status_label,
        "المدرسة": r.training_site?.name,
        "تاريخ الإنشاء": new Date(r.created_at).toLocaleDateString(),
      }));
      exportToCSV(exportData, "training_requests_report");
    } catch {
      alert("فشل تصدير طلبات التدريب");
    }
  };

  // إعدادات الرسم البياني
  const barChartData = {
    labels: monthlyRequests.labels,
    datasets: [
      {
        label: "عدد الطلبات",
        data: monthlyRequests.values,
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const doughnutData = {
    labels: ["طلبات قيد الانتظار", "طلبات مقبولة", "طلبات مرفوضة"],
    datasets: [
      {
        data: [stats.pending_reports || 5, stats.completed_evaluations || 10, 3],
        backgroundColor: ["#FFCE56", "#36A2EB", "#FF6384"],
        hoverBackgroundColor: ["#FFCE56", "#36A2EB", "#FF6384"],
      },
    ],
  };

  if (loading) return <div className="text-center">جاري تحميل التقارير...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>التقارير والإحصائيات</h1>
        <div className="export-buttons">
          <button onClick={exportUsers} className="btn-secondary">تصدير المستخدمين CSV</button>
          <button onClick={exportTrainingRequests} className="btn-secondary">تصدير طلبات التدريب CSV</button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="dashboard-grid">
        <div className="stat-card primary">
          <div className="stat-title">إجمالي الطلبة</div>
          <div className="stat-value">{stats.total_students}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-title">أماكن التدريب</div>
          <div className="stat-value">{stats.total_sites}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-title">التقييمات المكتملة</div>
          <div className="stat-value">{stats.completed_evaluations}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-title">التدريبات الجارية</div>
          <div className="stat-value">{stats.ongoing_trainings}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-title">التدريبات المكتملة</div>
          <div className="stat-value">{stats.completed_trainings}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-title">التقارير المعلقة</div>
          <div className="stat-value">{stats.pending_reports}</div>
        </div>
      </div>

      {/* الرسوم البيانية */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>طلبات التدريب الشهرية</h3>
          <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="chart-card">
          <h3>حالة الطلبات</h3>
          <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>

      {/* أحدث طلبات التدريب */}
      <div className="section-card">
        <h4>أحدث طلبات التدريب</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الكتاب</th>
              <th>التاريخ</th>
              <th>المدرسة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {recentRequests.length > 0 ? (
              recentRequests.map(req => (
                <tr key={req.id}>
                  <td>{req.letter_number}</td>
                  <td>{req.letter_date}</td>
                  <td>{req.training_site?.name || "—"}</td>
                  <td>{req.book_status_label}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4">لا توجد طلبات حديثة</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}