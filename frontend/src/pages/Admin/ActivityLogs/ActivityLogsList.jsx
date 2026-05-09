import { useEffect, useState } from "react";
import { getActivityLogs, getUsers } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function ActivityLogsList() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    user_id: "",
    action: "",
  });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [perPage, setPerPage] = useState(10);

  const fetchUsers = async () => {
    try {
      const res = await getUsers({ per_page: 100 });
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "")
      );

      const response = await getActivityLogs({
        ...cleanFilters,
        page,
        per_page: perPage,
      });

      const logsData = response.data || [];
      const meta = response.meta || {};

      setLogs(logsData);
      setPagination({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: meta.per_page || perPage,
        total: meta.total || 0,
      });
    } catch (err) {
      console.error(err);
      setError("فشل تحميل سجل النشاطات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters, perPage]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const goToPage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchLogs(page);
  };

  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div>
      <h1>سجل النشاطات</h1>

      <div className="filters-bar">
        <select
          value={filters.user_id}
          onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
        >
          <option value="">كل المستخدمين</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <input
          placeholder="الإجراء (login, create...)"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />

        <select
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className="w-auto"
        >
          <option value="10">10 سجلات</option>
          <option value="20">20 سجل</option>
          <option value="50">50 سجل</option>
          <option value="100">100 سجل</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : logs.length === 0 ? (
        <div>لا توجد سجلات</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الحدث</th>
              <th>الوصف</th>
              <th>IP</th>
              <th> التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.user?.name || "—"}</td>
                <td>{log.action}</td>
                <td>{log.description}</td>
                <td>{log.ip_address || "—"}</td>
                <td>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pagination.last_page > 1 && (
        <div className="pagination">
          <button
            onClick={() => goToPage(pagination.current_page - 1)}
            disabled={pagination.current_page === 1}
          >
            &laquo; السابق
          </button>
          <span>
            الصفحة {pagination.current_page} من {pagination.last_page}
            (إجمالي {pagination.total} سجل)
          </span>
          <button
            onClick={() => goToPage(pagination.current_page + 1)}
            disabled={pagination.current_page === pagination.last_page}
          >
            التالي &raquo;
          </button>
        </div>
      )}
    </div>
  );
}