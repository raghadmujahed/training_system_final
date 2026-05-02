// src/stores/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // محاولة استعادة المستخدم عند تحميل التطبيق
        const token = localStorage.getItem('access_token');
        if (token) {
            getCurrentUser()
                .then(userData => setUser(userData))
                .catch(() => {
                    localStorage.removeItem('access_token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            queueMicrotask(() => setLoading(false));
        }
    }, []);

    const login = async (credentials) => {
        const data = await apiLogin(credentials);
        setUser(data.user);
        return data;
    };

    const logout = async () => {
        await apiLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components -- مزود السياق يصدّر هوك مرفق
export const useAuth = () => useContext(AuthContext);