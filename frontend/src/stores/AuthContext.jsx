// src/stores/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            getCurrentUser()
                .then(userData => setUser(userData?.data ?? userData))
                .catch(() => {
                    localStorage.removeItem('access_token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            queueMicrotask(() => setLoading(false));
        }
    }, []);

    const login = useCallback(async (credentials) => {
        const data = await apiLogin(credentials);
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, logout }),
        [user, loading, login, logout]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components -- مزود السياق يصدّر هوك مرفق
export const useAuth = () => useContext(AuthContext);
