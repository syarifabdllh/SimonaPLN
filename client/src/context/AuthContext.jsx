// src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth harus digunakan dalam AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    // ✅ SIMPLE: Load token langsung dari localStorage saat initialize
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Decode JWT manual (tanpa library)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                return JSON.parse(jsonPayload);
            } catch (error) {
                console.error('Error decode token:', error);
                localStorage.removeItem('token');
                return null;
            }
        }
        return null;
    });

    const login = (token) => {
        localStorage.setItem('token', token);
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const decoded = JSON.parse(jsonPayload);
            setUser(decoded);
            console.log('✅ Login berhasil');
        } catch (error) {
            console.error('Error saat login:', error);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
