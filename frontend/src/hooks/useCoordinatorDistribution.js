import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getTrainingRequests,
  getTrainingRequestBatches,
  createTrainingRequestBatch,
  sendTrainingRequestBatch,
  getTrainingSites,
  coordinatorReviewTrainingRequest,
  itemsFromPagedResponse,
} from "../services/api";
import { apiCache } from "../services/apiCache";

const TTL_DYNAMIC = 2 * 60_000;

const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;
  const validationErrors = responseData?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors).flat().find(Boolean);
    if (firstError) return firstError;
  }

  return responseData?.message || fallbackMessage;
};

export default function useCoordinatorDistribution() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [requests, setRequests] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sites, setSites] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, sitesRes, batchesRes] = await Promise.allSettled([
        getTrainingRequests({ per_page: 200 }),
        apiCache.get("training-sites:{\"per_page\":200}", () => getTrainingSites({ per_page: 200 }), TTL_DYNAMIC),
        getTrainingRequestBatches({ per_page: 50 }),
      ]);
      setRequests(
        reqRes.status === "fulfilled" ? itemsFromPagedResponse(reqRes.value) : []
      );
      setSites(
        sitesRes.status === "fulfilled" ? itemsFromPagedResponse(sitesRes.value) : []
      );
      setBatches(
        batchesRes.status === "fulfilled" ? itemsFromPagedResponse(batchesRes.value) : []
      );

      if (reqRes.status === "rejected" || batchesRes.status === "rejected") {
        const firstFailed =
          reqRes.status === "rejected"
            ? reqRes.reason
            : batchesRes.status === "rejected"
              ? batchesRes.reason
              : null;
        setError(getApiErrorMessage(firstFailed, "فشل تحميل بيانات المنسق"));
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "فشل تحميل بيانات التوزيع"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const incomingRequests = useMemo(
    () =>
      requests.filter((r) =>
        ["sent_to_coordinator", "coordinator_under_review", "needs_edit"].includes(
          r.book_status
        )
      ),
    [requests]
  );

  const prelimApproved = useMemo(
    () => requests.filter((r) => r.book_status === "prelim_approved"),
    [requests]
  );

  const batchedPending = useMemo(
    () => requests.filter((r) => r.book_status === "batched_pending_send"),
    [requests]
  );

  const coordinatorRejected = useMemo(
    () => requests.filter((r) => r.book_status === "coordinator_rejected"),
    [requests]
  );

  const prelimApprovedByGroup = useMemo(() => {
    const map = new Map();
    for (const r of prelimApproved) {
      const gb = r.governing_body || "directorate_of_education";
      const dir = r.training_site?.directorate || r.directorate || "";
      const key = `${gb}::${dir}`;
      if (!map.has(key)) {
        map.set(key, { governing_body: gb, directorate: dir, requests: [] });
      }
      map.get(key).requests.push(r);
    }
    return Array.from(map.values());
  }, [prelimApproved]);

  const createBatchForGroup = useCallback(
    async (governing_body, directorate, requestIds) => {
      if (requestIds.length === 0) {
        setError("لا توجد طلبات لإنشاء دفعة.");
        return;
      }
      setSaving(true);
      setError("");
      try {
        await createTrainingRequestBatch({
          governing_body,
          directorate:
            governing_body === "directorate_of_education"
              ? directorate || null
              : null,
          training_request_ids: requestIds,
        });
        setSuccess("تم إنشاء الدفعة بنجاح");
        await load();
      } catch (e) {
        setError(getApiErrorMessage(e, "فشل إنشاء الدفعة"));
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const reviewDecision = useCallback(
    async (id, decision, reason = null) => {
      setSaving(true);
      setError("");
      try {
        await coordinatorReviewTrainingRequest(id, { decision, reason });
        await load();
      } catch (e) {
        setError(getApiErrorMessage(e, "فشل تنفيذ الإجراء"));
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const sendBatch = useCallback(
    async (batchId, letterData = {}) => {
      setSaving(true);
      setError("");
      try {
        await sendTrainingRequestBatch(batchId, letterData);
        setSuccess("تم إرسال الدفعة بنجاح");
        await load();
        return true;
      } catch (e) {
        setError(getApiErrorMessage(e, "فشل إرسال الدفعة"));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  return {
    loading,
    saving,
    error,
    success,
    setSuccess,
    requests,
    batches,
    sites,
    incomingRequests,
    prelimApproved,
    prelimApprovedByGroup,
    batchedPending,
    coordinatorRejected,
    reviewDecision,
    createBatchForGroup,
    sendBatch,
    reload: load,
  };
}
