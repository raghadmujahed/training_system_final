import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getDashboardStats,
  getTrainingRequests,
  getTrainingRequestBatches,
  getTrainingSites,
  getDepartments,
  getCourses,
  itemsFromPagedResponse,
} from "../services/api";
import { apiCache } from "../services/apiCache";

const TTL = 2 * 60_000;

export default function useCoordinatorStatistics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState({
    department: "",
    course: "",
    period: "",
    governing_body: "",
    site_type: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, batchRes, sitesRes, deptRes, courseRes, dashStats] =
        await Promise.all([
          getTrainingRequests({ per_page: 200 }),
          getTrainingRequestBatches({ per_page: 100 }),
          apiCache.get("training-sites:{\"per_page\":200}", () => getTrainingSites({ per_page: 200 }), TTL),
          apiCache.get("departments:list", () => getDepartments(), 5 * 60_000),
          apiCache.get("courses:list:{\"per_page\":200}", () => getCourses({ per_page: 200 }), 5 * 60_000),
          getDashboardStats(),
        ]);
      setRequests(itemsFromPagedResponse(reqRes));
      setBatches(itemsFromPagedResponse(batchRes));
      setSites(itemsFromPagedResponse(sitesRes));
      setDepartments(Array.isArray(deptRes) ? deptRes : deptRes?.data || []);
      setCourses(itemsFromPagedResponse(courseRes));
      setStats(dashStats);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStatus = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const s = r?.book_status || "unknown";
      map.set(s, (map.get(s) || 0) + 1);
    }
    return map;
  }, [requests]);

  const byDepartment = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const dept = r.students?.[0]?.user?.department?.name || "غير محدد";
      map.set(dept, (map.get(dept) || 0) + 1);
    }
    return map;
  }, [requests]);

  const bySite = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const site = r.training_site?.name || "غير محدد";
      map.set(site, (map.get(site) || 0) + 1);
    }
    return map;
  }, [requests]);

  const byGoverningBody = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const gb = r.governing_body || "غير محدد";
      map.set(gb, (map.get(gb) || 0) + 1);
    }
    return map;
  }, [requests]);

  const batchStats = useMemo(() => {
    const byStatus = new Map();
    for (const b of batches) {
      const s = b.status || "unknown";
      byStatus.set(s, (byStatus.get(s) || 0) + 1);
    }
    return {
      total: batches.length,
      byStatus,
    };
  }, [batches]);

  const totalStudents = stats?.total_students ?? 0;
  const totalSites = stats?.total_sites ?? 0;
  const activeTrainings = stats?.active_trainings ?? 0;

  return {
    loading,
    error,
    requests,
    batches,
    sites,
    departments,
    courses,
    stats,
    filters,
    setFilters,
    byStatus,
    byDepartment,
    bySite,
    byGoverningBody,
    batchStats,
    totalStudents,
    totalSites,
    activeTrainings,
    reload: load,
  };
}
