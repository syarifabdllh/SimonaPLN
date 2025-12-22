import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Impor Layout & Pelindung
import MainLayout from './layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute'; // <-- Impor pelindung cerdas kita

// Impor semua Halaman (Pages)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
// Halaman-halaman di bawah ini sekarang akan dilindungi
import Dashboard from './components/Dashboard';
import ProfilePage from './pages/ProfilePage';
import TrackingPage from './pages/TrackingPage';
import DetailPage from './pages/DetailPage';
import CreatePengajuanPage from './pages/CreatePengajuanPage';
import CreateAnggaranPage from './pages/CreateAnggaranPage';
import ViewAnggaranPage from './pages/ViewAnggaranPage';
import CreateKontrakPage from './pages/CreateKontrakPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
    return (
        <Routes>
            {/* Rute Publik (bisa diakses siapa saja) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            {/* Rute yang Dilindungi */}
            <Route element={<ProtectedRoute />}>
                {/* Semua rute di dalam sini HANYA bisa diakses jika sudah login. */}
                {/* Komponen MainLayout sekarang hanya bertugas menampilkan sidebar & header. */}
                <Route element={<MainLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/tracking" element={<TrackingPage />} />
                    <Route path="/pengajuan/baru" element={<CreatePengajuanPage />} />
                    <Route path="/pengajuan/:id" element={<DetailPage />} />
                    <Route path="/anggaran/baru" element={<CreateAnggaranPage />} />
                    <Route path="/anggaran" element={<ViewAnggaranPage />} />
                    <Route path="/kontrak/baru" element={<CreateKontrakPage />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;