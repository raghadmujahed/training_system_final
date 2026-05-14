// src/hooks/useSharedData.js
// Shared hooks for frequently-fetched reference data.
// All hooks use apiCache → one network request per TTL window, shared across all consumers.

import { useState, useEffect } from "react";
import { apiCache } from "../services/apiCache";
import { getDepartments, getRoles, getTrainingSites, getTrainingPeriods, getCourses, getPermissions, getAnnouncements, getCurrentUser } from "../services/api";
import { readStoredUser } from "../utils/session";

// TTLs
const TTL_STATIC = 5 * 60_000;   // 5 min — rarely changes (departments, roles, courses)
const TTL_DYNAMIC = 2 * 60_000;  // 2 min — changes more often (sites, periods)

// ─── Generic hook factory ──────────────────────────────────────────────────

function useApiData(cacheKey, fetcher, ttl, extractFn) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiCache
      .get(cacheKey, fetcher, ttl)
      .then((raw) => {
        if (!cancelled) {
          setData(extractFn(raw));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(`[useSharedData] ${cacheKey}:`, err);
          setError(err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const extractArray = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  return [];
};

// ─── Exported hooks ───────────────────────────────────────────────────────

/** Departments list — cached 5 min */
export function useDepartments() {
  return useApiData(
    "departments:list",
    () => getDepartments(),
    TTL_STATIC,
    extractArray,
  );
}

/** Roles list — cached 5 min */
export function useRoles(params = {}) {
  const key = `roles:list:${JSON.stringify(params)}`;
  return useApiData(
    key,
    () => getRoles(params),
    TTL_STATIC,
    extractArray,
  );
}

/** Training sites list — cached 2 min, accepts params for filtering */
export function useTrainingSites(params = {}) {
  const key = `training-sites:${JSON.stringify(params)}`;
  return useApiData(
    key,
    () => getTrainingSites(params),
    TTL_DYNAMIC,
    extractArray,
  );
}

/** Training periods — cached 2 min */
export function useTrainingPeriods(params = {}) {
  const key = `training-periods:${JSON.stringify(params)}`;
  return useApiData(
    key,
    () => getTrainingPeriods(params),
    TTL_DYNAMIC,
    extractArray,
  );
}

/** Courses list — cached 5 min. Cache key is user-scoped to prevent admin/head cache pollution. */
export function useCourses(params = {}) {
  const savedUser = readStoredUser();
  const userScope = `${savedUser?.role?.name || savedUser?.role || ""}:${savedUser?.department_id || ""}`;
  const key = `courses:list:${userScope}:${JSON.stringify(params)}`;
  return useApiData(
    key,
    () => getCourses(params),
    TTL_STATIC,
    extractArray,
  );
}

/** Permissions list — cached 5 min (rarely changes) */
export function usePermissions() {
  return useApiData(
    "permissions:list",
    () => getPermissions(),
    TTL_STATIC,
    (raw) => {
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data?.data)) return raw.data.data;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    },
  );
}

const TTL_ANNOUNCEMENTS = 60_000; // 1 min — semi-dynamic

/**
 * Announcements list — cached 1 min per unique param set.
 * @param {object} params  e.g. { status: 'active', per_page: 5 }
 */
export function useAnnouncements(params = {}) {
  const key = `announcements:${JSON.stringify(params)}`;
  return useApiData(
    key,
    () => getAnnouncements(params),
    TTL_ANNOUNCEMENTS,
    extractArray,
  );
}

const TTL_CURRENT_USER = 2 * 60_000; // 2 min

/** Current authenticated user — cached 2 min. Returns { data, loading, error } where data is the user object. */
export function useCurrentUser() {
  const { data: list, loading, error } = useApiData(
    "current-user",
    () => getCurrentUser(),
    TTL_CURRENT_USER,
    (raw) => {
      const u = raw?.data || raw;
      return u ? [u] : [];
    },
  );
  return { data: list[0] ?? null, loading, error };
}
