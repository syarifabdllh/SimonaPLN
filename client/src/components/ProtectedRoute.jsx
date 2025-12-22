import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user } = useAuth(); // Ambil state 'user' dari context

  // Logika yang lebih cerdas:
  // 'user' hanya akan ada (tidak null) jika token ada, valid, DAN belum kadaluwarsa.
  // Ini adalah sumber kebenaran yang jauh lebih andal daripada localStorage.
  
  if (!user) {
    // Jika tidak ada user yang terautentikasi, paksa kembali ke halaman login.
    return <Navigate to="/login" />;
  }

  // Jika ada user, izinkan akses ke halaman yang diminta (yang akan dirender di <Outlet />).
  // Dalam kasus kita, <Outlet /> akan menjadi <MainLayout />.
  return <Outlet />;
};

export default ProtectedRoute;