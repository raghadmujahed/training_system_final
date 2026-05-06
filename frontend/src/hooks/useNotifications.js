// src/hooks/useNotifications.js
// Centralized notifications hook.
// Module-level singleton state so ALL consumers share the same data
// and produce exactly ONE polling interval.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getUnreadNotificationsCount,
  getNotifications,
  markSystemNotificationAsRead,
  markAllSystemNotificationsAsRead,
} from "../services/api";
import { readStoredToken } from "../utils/session";

const POLL_MS = 30_000;

// ─── Singleton store ──────────────────────────────────────────────────────────
// One copy of data + one polling interval, no matter how many components mount.

let _unreadCount = 0;
let _notifications = [];
let _notificationsLoading = false;
let _listeners = new Set();

function _notify() {
  const snap = { unreadCount: _unreadCount, notifications: _notifications, notificationsLoading: _notificationsLoading };
  _listeners.forEach((fn) => fn(snap));
}

function _hasSession() {
  const t = readStoredToken();
  return Boolean(t && t !== "undefined" && t !== "null");
}

// In-flight deduplication
let _countFetchPromise = null;
function _fetchUnreadCount() {
  if (!_hasSession()) { _unreadCount = 0; _notify(); return Promise.resolve(); }
  if (_countFetchPromise) return _countFetchPromise;
  _countFetchPromise = getUnreadNotificationsCount()
    .then((data) => { _unreadCount = data?.unread_count ?? 0; })
    .catch((err) => { if (err?.response?.status === 401) _unreadCount = 0; })
    .finally(() => { _countFetchPromise = null; _notify(); });
  return _countFetchPromise;
}

// Per-perPage in-flight map so NotificationBell(5) and Notifications(100) don't collide
const _listFetchPromises = new Map();
function _fetchNotificationsList(perPage) {
  if (!_hasSession()) { _notifications = []; _notificationsLoading = false; _notify(); return Promise.resolve(); }
  if (_listFetchPromises.has(perPage)) return _listFetchPromises.get(perPage);
  _notificationsLoading = true;
  _notify();
  const promise = getNotifications({ per_page: perPage })
    .then((data) => { _notifications = Array.isArray(data?.data) ? data.data : []; })
    .catch((err) => { if (err?.response?.status === 401) _notifications = []; })
    .finally(() => { _notificationsLoading = false; _listFetchPromises.delete(perPage); _notify(); });
  _listFetchPromises.set(perPage, promise);
  return promise;
}

// Single polling interval shared across all consumers
let _pollingInterval = null;
let _consumerCount = 0;

function _startPolling() {
  if (_pollingInterval) return;
  _fetchUnreadCount();
  _pollingInterval = setInterval(() => {
    if (document.visibilityState === "visible") _fetchUnreadCount();
  }, POLL_MS);
}

function _stopPolling() {
  if (_pollingInterval) { clearInterval(_pollingInterval); _pollingInterval = null; }
}

export function resetNotificationsState() {
  _unreadCount = 0;
  _notifications = [];
  _notificationsLoading = false;
  _countFetchPromise = null;
  _listFetchPromises.clear();
  _notify();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications({ pollUnread = true, perPage = 5 } = {}) {
  const [state, setState] = useState(() => ({
    unreadCount: _unreadCount,
    notifications: _notifications,
    notificationsLoading: _notificationsLoading,
  }));

  useEffect(() => {
    _listeners.add(setState);
    setState({ unreadCount: _unreadCount, notifications: _notifications, notificationsLoading: _notificationsLoading });
    return () => { _listeners.delete(setState); };
  }, []);

  useEffect(() => {
    if (!pollUnread) {
      // One-shot fetch for consumers that only need the list without polling
      _fetchNotificationsList(perPage);
      return undefined;
    }
    _consumerCount++;
    _startPolling();
    return () => {
      _consumerCount--;
      if (_consumerCount <= 0) { _consumerCount = 0; _stopPolling(); }
    };
  }, [pollUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  const perPageRef = useRef(perPage);
  perPageRef.current = perPage;

  const fetchNotifications = useCallback((pg) => _fetchNotificationsList(pg ?? perPageRef.current), []);
  const refreshUnreadCount = useCallback(() => _fetchUnreadCount(), []);

  const markAsRead = useCallback(async (id) => {
    try {
      await markSystemNotificationAsRead(id);
      _notifications = _notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      );
      _unreadCount = Math.max(0, _unreadCount - 1);
      _notify();
    } catch { /* ignore */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllSystemNotificationsAsRead();
      _notifications = _notifications.map((n) => ({ ...n, read_at: new Date().toISOString() }));
      _unreadCount = 0;
      _notify();
    } catch { /* ignore */ }
  }, []);

  const decrementUnread = useCallback(() => {
    _unreadCount = Math.max(0, _unreadCount - 1);
    _notify();
  }, []);

  return {
    unreadCount: state.unreadCount,
    notifications: state.notifications,
    notificationsLoading: state.notificationsLoading,
    fetchNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    decrementUnread,
  };
}
