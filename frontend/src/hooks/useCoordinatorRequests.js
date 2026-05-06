import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getTrainingRequests,
  getCourses,
  getTrainingPeriods,
  getTrainingSites,
  coordinatorReviewTrainingRequest,
  itemsFromPagedResponse,
} from "../services/api";
import { apiCache } from "../services/apiCache";

const TTL_DYNAMIC = 2 * 60_000;
const TTL_STATIC  = 5 * 60_000;

export default function useCoordinatorRequests() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const [courses, setCourses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [sites, setSites] = useState([]);

  const [filters, setFilters] = useState({
    status: "",
    department: "",
    period: "",
    search: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, coursesRes, periodsRes, sitesRes] = await Promise.all([
        getTrainingRequests({ per_page: 200 }),
        apiCache.get("courses:list:{\"per_page\":200}", () => getCourses({ per_page: 200 }), TTL_STATIC),
        apiCache.get("training-periods:{\"per_page\":200}", () => getTrainingPeriods({ per_page: 200 }), TTL_DYNAMIC),
        apiCache.get("training-sites:{\"per_page\":200}", () => getTrainingSites({ per_page: 200 }), TTL_DYNAMIC),
      ]);
      setRequests(itemsFromPagedResponse(reqRes));
      setCourses(itemsFromPagedResponse(coursesRes));
      setPeriods(itemsFromPagedResponse(periodsRes));
      setSites(itemsFromPagedResponse(sitesRes));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reviewRequest = useCallback(
    async (id, decision, reason = null) => {
      setSaving(true);
      setError("");
      try {
        await coordinatorReviewTrainingRequest(id, { decision, reason });
        await load();
      } catch (e) {
        setError(e?.response?.data?.message || "فشل تنفيذ الإجراء");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (filters.status) {
      list = list.filter((r) => r.book_status === filters.status);
    }
    if (filters.period) {
      list = list.filter(
        (r) => String(r.training_period_id) === filters.period
      );
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((r) => {
        const name =
          r.students?.[0]?.user?.name ||
          r.requested_by?.name ||
          "";
        const uid = r.students?.[0]?.user?.university_id || "";
        return (
          name.toLowerCase().includes(q) || uid.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [requests, filters]);

  const incomingRequests = useMemo(
    () =>
      filteredRequests.filter((r) =>
        ["sent_to_coordinator", "coordinator_under_review", "needs_edit"].includes(
          r.book_status
        )
      ),
    [filteredRequests]
  );

  const prelimApproved = useMemo(
    () => filteredRequests.filter((r) => r.book_status === "prelim_approved"),
    [filteredRequests]
  );

  const coordinatorRejected = useMemo(
    () =>
      filteredRequests.filter((r) => r.book_status === "coordinator_rejected"),
    [filteredRequests]
  );

  return {
    loading,
    saving,
    error,
    requests: filteredRequests,
    allRequests: requests,
    courses,
    periods,
    sites,
    filters,
    setFilters,
    reviewRequest,
    reload: load,
    incomingRequests,
    prelimApproved,
    coordinatorRejected,
  };
}
