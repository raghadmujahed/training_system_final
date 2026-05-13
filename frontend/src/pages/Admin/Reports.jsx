import { useEffect, useState } from "react";
import { getAdminReports, getDepartments, exportUsers, exportTrainingRequests } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from "chart.js";
import { Users, GraduationCap, Building2, FileText, Calendar, RefreshCw, Filter, UserCheck, School, AlertCircle, CheckCircle, XCircle, BookOpen, Edit3, TrendingUp } from "lucide-react";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    department_id: "",
    year: new Date().getFullYear().toString(),
  });
  const [refreshing, setRefreshing] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportingRequests, setExportingRequests] = useState(false);

  useEffect(() => {
    fetchData();
    fetchDepartments();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminReports(filters);
      setData(response.data || response); // Handle both wrapped and direct responses
    } catch (err) {
      console.error(err);
      setError("فشل تحميل بيانات التقارير");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments({ per_page: 100 });
      setDepartments(response.data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = async () => {
    await fetchData();
  };

  const clearFilters = async () => {
    setFilters({ 
      date_from: "", 
      date_to: "", 
      department_id: "",
      year: new Date().getFullYear().toString(),
    });
    await fetchData();
  };

  const handleExportUsers = async () => {
    if (exportingUsers) return;
    setExportingUsers(true);
    try {
      await exportUsers(filters);
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message;
      alert(msg?.includes('صلاحية') ? 'لا تملك صلاحية التصدير' : (msg || 'فشل تصدير المستخدمين'));
    } finally {
      setExportingUsers(false);
    }
  };

  const handleExportTrainingRequests = async () => {
    if (exportingRequests) return;
    setExportingRequests(true);
    try {
      await exportTrainingRequests(filters);
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message;
      alert(msg?.includes('صلاحية') ? 'لا تملك صلاحية التصدير' : (msg || 'فشل تصدير طلبات التدريب'));
    } finally {
      setExportingRequests(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="page" text="جاري تحميل التقارير..." />;
  }

  if (error) {
    return (
      <div className="section-card p-10 text-center">
        <p className="text-danger text-lg">{error}</p>
      </div>
    );
  }

  // Enhanced Chart configurations
  const usersByRoleChart = {
    labels: data?.charts?.users_by_role?.map((item) => item.role) || [],
    datasets: [
      {
        label: "عدد المستخدمين",
        data: data?.charts?.users_by_role?.map((item) => item.count) || [],
        backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"],
        borderWidth: 1,
      },
    ],
  };

  const studentsByDepartmentChart = {
    labels: data?.charts?.students_by_department?.map((item) => item.department) || [],
    datasets: [
      {
        label: "عدد الطلبة",
        data: data?.charts?.students_by_department?.map((item) => item.count) || [],
        backgroundColor: "#3B82F6",
        borderWidth: 1,
      },
    ],
  };

  const requestsByStatusChart = {
    labels: data?.charts?.requests_by_status?.map((item) => {
      const statusLabels = {
        'draft': 'مسودة',
        'pending': 'قيد الانتظار',
        'approved': 'موافق عليه',
        'rejected': 'مرفوض',
        'completed': 'مكتمل'
      };
      return statusLabels[item.status] || item.status;
    }) || [],
    datasets: [
      {
        data: data?.charts?.requests_by_status?.map((item) => item.count) || [],
        backgroundColor: ["#FBBF24", "#3B82F6", "#10B981", "#EF4444", "#6366F1"],
        borderWidth: 1,
      },
    ],
  };

  const monthlyTrainingRequestsChart = {
    labels: data?.charts?.monthly_training_requests?.map((item) => {
      const [year, month] = item.month.split('-');
      const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      return `${monthNames[parseInt(month) - 1]}/${year}`;
    }) || [],
    datasets: [
      {
        label: "عدد الطلبات",
        data: data?.charts?.monthly_training_requests?.map((item) => item.count) || [],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const studentsBySectionChart = {
    labels: data?.charts?.students_by_section?.map((item) => item.section) || [],
    datasets: [
      {
        label: "عدد الطلبة",
        data: data?.charts?.students_by_section?.map((item) => item.count) || [],
        backgroundColor: "#10B981",
        borderWidth: 1,
      },
    ],
  };

  const evaluationCompletionChart = {
    labels: ["تم التقييم", "قيد الانتظار"],
    datasets: [
      {
        data: [
          data?.charts?.evaluation_completion?.submitted || 0,
          data?.charts?.evaluation_completion?.pending || 0
        ],
        backgroundColor: ["#10B981", "#F59E0B"],
        borderWidth: 1,
      },
    ],
  };

  const portfolioActivityChart = {
    labels: data?.charts?.portfolio_activity?.map((item) => {
      const [year, month] = item.month.split('-');
      const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      return `${monthNames[parseInt(month) - 1]}/${year}`;
    }) || [],
    datasets: [
      {
        label: "عدد المدخلات",
        data: data?.charts?.portfolio_activity?.map((item) => item.count) || [],
        borderColor: "#8B5CF6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="content-header">
        <div className="content-header-icon">
          <FileText size={26} />
        </div>
        <div className="content-header-content">
          <h1 className="page-title">التقارير والإحصائيات</h1>
          <p className="page-subtitle">نظرة شاملة على النظام</p>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="filters-bar mb-6">
          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleFilterChange}
            title="من تاريخ"
          />
          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleFilterChange}
            title="إلى تاريخ"
          />
          <select
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
          >
            <option value="">كل السنوات</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
          <select
            name="department_id"
            value={filters.department_id}
            onChange={handleFilterChange}
          >
            <option value="">جميع الأقسام</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <button onClick={applyFilters} className="btn-primary">
            تطبيق الفلاتر
          </button>
          <button onClick={clearFilters} className="btn-secondary">
            مسح الفلاتر
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary"
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            تحديث
          </button>
          <button onClick={handleExportUsers} disabled={exportingUsers} className="btn-secondary">
            {exportingUsers ? "جاري تجهيز الملف..." : "⬇ تصدير المستخدمين CSV"}
          </button>
          <button onClick={handleExportTrainingRequests} disabled={exportingRequests} className="btn-secondary">
            {exportingRequests ? "جاري تجهيز الملف..." : "⬇ تصدير طلبات التدريب CSV"}
          </button>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users Card */}
        <div className="section-card p-5 border-l-4 border-l-[#3B82F6]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">إجمالي المستخدمين</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_users || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] flex items-center justify-center">
              <Users size={24} className="text-[#3B82F6]" />
            </div>
          </div>
        </div>

        {/* Total Students Card */}
        <div className="section-card p-5 border-l-4 border-l-[#10B981]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">إجمالي الطلبة</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_students || 0}</p>
              <p className="text-xs text-[#10B981] mt-1">{data?.percentages?.students_percentage || 0}% من إجمالي المستخدمين</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#D1FAE5] flex items-center justify-center">
              <GraduationCap size={24} className="text-[#10B981]" />
            </div>
          </div>
        </div>

        {/* Academic Supervisors Card */}
        <div className="section-card p-5 border-l-4 border-l-[#8B5CF6]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">المشرفون الأكاديميون</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_academic_supervisors || 0}</p>
              <p className="text-xs text-[#8B5CF6] mt-1">{data?.percentages?.academic_supervisors_percentage || 0}% من إجمالي المستخدمين</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#EDE9FE] flex items-center justify-center">
              <UserCheck size={24} className="text-[#8B5CF6]" />
            </div>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="section-card p-5 border-l-4 border-l-[#F59E0B]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">المدرسون/مشرفو المدارس</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_teachers || 0}</p>
              <p className="text-xs text-[#F59E0B] mt-1">{data?.percentages?.teachers_percentage || 0}% من إجمالي المستخدمين</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center">
              <School size={24} className="text-[#F59E0B]" />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row of Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* School Managers Card */}
        <div className="section-card p-5 border-l-4 border-l-[#EC4899]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">مديرو المدارس</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_school_managers || 0}</p>
              <p className="text-xs text-[#EC4899] mt-1">{data?.percentages?.school_managers_percentage || 0}% من إجمالي المستخدمين</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#FCE7F3] flex items-center justify-center">
              <Building2 size={24} className="text-[#EC4899]" />
            </div>
          </div>
        </div>

        {/* Training Requests Card */}
        <div className="section-card p-5 border-l-4 border-l-[#F59E0B]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">طلبات التدريب</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_training_requests || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center">
              <FileText size={24} className="text-[#F59E0B]" />
            </div>
          </div>
        </div>

        {/* Departments Card */}
        <div className="section-card p-5 border-l-4 border-l-[#06B6D4]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">الأقسام الأكاديمية</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_departments || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#CFFAFE] flex items-center justify-center">
              <Building2 size={24} className="text-[#06B6D4]" />
            </div>
          </div>
        </div>

        {/* Sections Card */}
        <div className="section-card p-5 border-l-4 border-l-[#84CC16]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">الشعب التدريبية</p>
              <p className="text-2xl font-bold text-[#1e293b]">{data?.summary?.total_sections || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#ECFCCB] flex items-center justify-center">
              <BookOpen size={24} className="text-[#84CC16]" />
            </div>
          </div>
        </div>
      </div>

      {/* Third Row - Training Request Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Pending Requests */}
        <div className="section-card p-4 border-l-4 border-l-[#FBBF24]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">طلبات معلقة</p>
              <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.pending_training_requests || 0}</p>
              <p className="text-xs text-[#F59E0B] mt-1">{data?.percentages?.pending_requests_percentage || 0}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center">
              <AlertCircle size={20} className="text-[#F59E0B]" />
            </div>
          </div>
        </div>

        {/* Approved Requests */}
        <div className="section-card p-4 border-l-4 border-l-[#10B981]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">طلبات معتمدة</p>
              <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.approved_training_requests || 0}</p>
              <p className="text-xs text-[#10B981] mt-1">{data?.percentages?.approved_requests_percentage || 0}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center">
              <CheckCircle size={20} className="text-[#10B981]" />
            </div>
          </div>
        </div>

        {/* Rejected Requests */}
        <div className="section-card p-4 border-l-4 border-l-[#EF4444]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">طلبات مرفوضة</p>
              <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.rejected_training_requests || 0}</p>
              <p className="text-xs text-[#EF4444] mt-1">{data?.percentages?.rejected_requests_percentage || 0}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
              <XCircle size={20} className="text-[#EF4444]" />
            </div>
          </div>
        </div>

        {/* Completed Requests */}
        <div className="section-card p-4 border-l-4 border-l-[#6366F1]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748b] text-sm mb-1">تدريب مكتمل</p>
              <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.completed_training_requests || 0}</p>
              <p className="text-xs text-[#6366F1] mt-1">{data?.percentages?.completed_requests_percentage || 0}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E0E7FF] flex items-center justify-center">
              <TrendingUp size={20} className="text-[#6366F1]" />
            </div>
          </div>
        </div>
      </div>

      {/* Fourth Row - Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Training Sites */}
        <div className="section-card p-4">
          <p className="text-[#64748b] text-sm mb-1">أماكن التدريب</p>
          <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.total_training_sites || 0}</p>
          <p className="text-xs text-[#64748b]">نشط: {data?.summary?.active_training_sites || 0}</p>
        </div>

        {/* Evaluation Templates */}
        <div className="section-card p-4">
          <p className="text-[#64748b] text-sm mb-1">نماذج التقييم</p>
          <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.total_evaluation_templates || 0}</p>
        </div>

        {/* Portfolio Entries */}
        <div className="section-card p-4">
          <p className="text-[#64748b] text-sm mb-1">مدخلات ملف الإنجاز</p>
          <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.total_portfolio_entries || 0}</p>
          <p className="text-xs text-[#64748b]">قيد المراجعة: {data?.summary?.pending_review_entries || 0}</p>
        </div>

        {/* Announcements */}
        <div className="section-card p-4">
          <p className="text-[#64748b] text-sm mb-1">الإعلانات</p>
          <p className="text-xl font-bold text-[#1e293b]">{data?.summary?.total_announcements || 0}</p>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Users by Role Chart */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">المستخدمون حسب الدور</h3>
          <div style={{ height: "300px" }}>
            <Doughnut data={usersByRoleChart} options={chartOptions} />
          </div>
        </div>

        {/* Students by Department Chart */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">الطلبة حسب القسم</h3>
          <div style={{ height: "300px" }}>
            <Bar data={studentsByDepartmentChart} options={barChartOptions} />
          </div>
        </div>

        {/* Training Requests by Status Chart */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">طلبات التدريب حسب الحالة</h3>
          <div style={{ height: "300px" }}>
            <Doughnut data={requestsByStatusChart} options={chartOptions} />
          </div>
        </div>

        {/* Monthly Training Requests Chart */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">طلبات التدريب الشهرية</h3>
          <div style={{ height: "300px" }}>
            <Line data={monthlyTrainingRequestsChart} options={barChartOptions} />
          </div>
        </div>

        {/* Students by Section Chart */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">الطلبة حسب الشعبة</h3>
          <div style={{ height: "300px" }}>
            <Bar data={studentsBySectionChart} options={barChartOptions} />
          </div>
        </div>

        {/* Evaluation Completion Chart */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">إكمال التقييمات</h3>
          <div style={{ height: "300px" }}>
            <Doughnut data={evaluationCompletionChart} options={chartOptions} />
          </div>
        </div>

        {/* Portfolio Activity Chart */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">نشاط ملف الإنجاز</h3>
          <div style={{ height: "300px" }}>
            <Line data={portfolioActivityChart} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Enhanced Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Users by Role Table */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">المستخدمون حسب الدور</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="p-3 text-right font-semibold text-[#1e293b]">الدور</th>
                  <th className="p-3 text-center font-semibold text-[#1e293b]">العدد</th>
                  <th className="p-3 text-center font-semibold text-[#1e293b]">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {data?.tables?.users_by_role?.map((item, index) => (
                  <tr key={index} className="border-b border-[#e2e8f0]">
                    <td className="p-3">{item.role}</td>
                    <td className="p-3 text-center">{item.count}</td>
                    <td className="p-3 text-center">{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Students by Department Table */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">الطلبة حسب القسم</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="p-3 text-right font-semibold text-[#1e293b]">القسم</th>
                  <th className="p-3 text-center font-semibold text-[#1e293b]">العدد</th>
                  <th className="p-3 text-center font-semibold text-[#1e293b]">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {data?.tables?.students_by_department?.map((item, index) => (
                  <tr key={index} className="border-b border-[#e2e8f0]">
                    <td className="p-3">{item.department}</td>
                    <td className="p-3 text-center">{item.count}</td>
                    <td className="p-3 text-center">{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Training Requests Status Table */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">طلبات التدريب حسب الحالة</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="p-3 text-right font-semibold text-[#1e293b]">الحالة</th>
                  <th className="p-3 text-center font-semibold text-[#1e293b]">العدد</th>
                  <th className="p-3 text-center font-semibold text-[#1e293b]">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {data?.tables?.requests_by_status?.map((item, index) => {
                  const statusLabels = {
                    'draft': 'مسودة',
                    'pending': 'قيد الانتظار',
                    'approved': 'موافق عليه',
                    'rejected': 'مرفوض',
                    'completed': 'مكتمل'
                  };
                  return (
                    <tr key={index} className="border-b border-[#e2e8f0]">
                      <td className="p-3">{statusLabels[item.status] || item.status}</td>
                      <td className="p-3 text-center">{item.count}</td>
                      <td className="p-3 text-center">{item.percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Training Requests Table */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">أحدث طلبات التدريب</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="p-3 text-right font-semibold text-[#1e293b]">الطالب</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">القسم</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">مكان التدريب</th>
                  <th className="p-3 text-center font-semibold text-[#1e293b]">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data?.tables?.recent_training_requests?.map((item, index) => (
                  <tr key={index} className="border-b border-[#e2e8f0]">
                    <td className="p-3">{item.student}</td>
                    <td className="p-3">{item.department}</td>
                    <td className="p-3">{item.training_site}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'approved'
                            ? 'bg-[#D1FAE5] text-[#065F46]'
                            : item.status === 'rejected'
                            ? 'bg-[#FEE2E2] text-[#991B1B]'
                            : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {item.status === 'approved' ? 'موافق عليه' : 
                         item.status === 'rejected' ? 'مرفوض' : 
                         item.status === 'pending' ? 'قيد الانتظار' : 
                         item.status === 'completed' ? 'مكتمل' : 
                         item.status === 'draft' ? 'مسودة' : item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Additional Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Students Without Section Table */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">الطلبة بدون شعبة</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="p-3 text-right font-semibold text-[#1e293b]">اسم الطالب</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">الرقم الجامعي</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">القسم</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">البريد الإلكتروني</th>
                </tr>
              </thead>
              <tbody>
                {data?.tables?.students_without_section?.map((item, index) => (
                  <tr key={index} className="border-b border-[#e2e8f0]">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.university_id}</td>
                    <td className="p-3">{item.department}</td>
                    <td className="p-3">{item.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Students Without Training Request Table */}
        <div className="section-card p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">الطلبة بدون طلب تدريب</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="p-3 text-right font-semibold text-[#1e293b]">اسم الطالب</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">الرقم الجامعي</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">القسم</th>
                  <th className="p-3 text-right font-semibold text-[#1e293b]">البريد الإلكتروني</th>
                </tr>
              </thead>
              <tbody>
                {data?.tables?.students_without_training_request?.map((item, index) => (
                  <tr key={index} className="border-b border-[#e2e8f0]">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.university_id}</td>
                    <td className="p-3">{item.department}</td>
                    <td className="p-3">{item.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activities Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Evaluations Table */}
        {data?.tables?.recent_evaluations && data?.tables?.recent_evaluations.length > 0 && (
          <div className="section-card p-5">
            <h3 className="text-lg font-bold text-[#1e293b] mb-4">أحدث التقييمات</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    <th className="p-3 text-right font-semibold text-[#1e293b]">الطالب</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">المقيم</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">النموذج</th>
                    <th className="p-3 text-center font-semibold text-[#1e293b]">الدرجة</th>
                    <th className="p-3 text-center font-semibold text-[#1e293b]">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.tables?.recent_evaluations?.map((item, index) => (
                    <tr key={index} className="border-b border-[#e2e8f0]">
                      <td className="p-3">{item.student}</td>
                      <td className="p-3">{item.evaluator}</td>
                      <td className="p-3">{item.template}</td>
                      <td className="p-3 text-center">{item.score}</td>
                      <td className="p-3 text-center">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Portfolio Entries Table */}
        {data?.tables?.recent_portfolio_entries && data?.tables?.recent_portfolio_entries.length > 0 && (
          <div className="section-card p-5">
            <h3 className="text-lg font-bold text-[#1e293b] mb-4">أحدث مدخلات ملف الإنجاز</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    <th className="p-3 text-right font-semibold text-[#1e293b]">الطالب</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">العنوان</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">الفئة</th>
                    <th className="p-3 text-center font-semibold text-[#1e293b]">الحالة</th>
                    <th className="p-3 text-center font-semibold text-[#1e293b]">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.tables?.recent_portfolio_entries?.map((item, index) => (
                    <tr key={index} className="border-b border-[#e2e8f0]">
                      <td className="p-3">{item.student}</td>
                      <td className="p-3">{item.title}</td>
                      <td className="p-3">{item.category}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.review_status === 'approved'
                              ? 'bg-[#D1FAE5] text-[#065F46]'
                              : item.review_status === 'rejected'
                              ? 'bg-[#FEE2E2] text-[#991B1B]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}
                        >
                          {item.review_status === 'approved' ? 'موافق عليه' : 
                           item.review_status === 'rejected' ? 'مرفوض' : 
                           'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="p-3 text-center">{item.created_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
