import React from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { 
    FaTachometerAlt, 
    FaFileInvoice, 
    FaSignOutAlt, 
    FaUserCircle, 
    FaPlusCircle, 
    FaMoneyBillWave,
    FaGavel
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './MainLayout.css';
import Notifications from '../components/Notifications'; // ✅ Tambahkan impor komponen notifikasi

const MainLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isManagerial = user && ['Manager', 'Admin', 'KKU'].includes(user.jabatan);
    const isUser = user && user.jabatan === 'User';
    const isKKU = user && user.jabatan === 'KKU';
    const isPengadaan = user && user.jabatan === 'Pengadaan';
    const canViewAnggaran = user && !['Ren Eval', 'Pengadaan'].includes(user.jabatan);

    return (
        <div className="app-container">
            {/* ===== Sidebar ===== */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src="/logo-pln.png" alt="PLN Logo" className="sidebar-logo" />
                    <h3>SIMONA</h3>
                </div>
                <nav className="sidebar-nav">
                    {isManagerial && (
                        <NavLink to="/" className="nav-link">
                            <FaTachometerAlt />
                            <span>Dashboard</span>
                        </NavLink>
                    )}
                    {isUser && (
                        <NavLink to="/pengajuan/baru" className="nav-link">
                            <FaPlusCircle />
                            <span>Buat Pengajuan</span>
                        </NavLink>
                    )}
                    {isPengadaan && (
                        <NavLink to="/kontrak/baru" className="nav-link">
                            <FaGavel />
                            <span>Buat Kontrak</span>
                        </NavLink>
                    )}
                    <NavLink to="/tracking" className="nav-link">
                        <FaFileInvoice />
                        <span>
                            {isUser ? 'Pengajuan Saya' : 'Pelacakan Global'}
                        </span>
                    </NavLink>
                    {isKKU && (
                        <NavLink to="/anggaran/baru" className="nav-link">
                            <FaMoneyBillWave />
                            <span>Buat Pagu Anggaran</span>
                        </NavLink>
                    )}
                    {canViewAnggaran && (
                        <NavLink to="/anggaran" className="nav-link">
                            <FaMoneyBillWave />
                            <span>Lihat Pagu Anggaran</span>
                        </NavLink>
                    )}
                </nav>
            </aside>

            {/* ===== Main Content ===== */}
            <main className="main-content">
                <header className="main-header">
                    <div className="header-user">
                        Selamat datang, <strong>{user ? user.email : 'Pengguna'}</strong>
                    </div>
                    <div className="header-actions">
                        {/* ✅ Tambahkan komponen Notifikasi di sini */}
                        <Notifications />

                        {/* Tombol profil */}
                        <Link to="/profile" className="header-button">
                            <FaUserCircle />
                            <span>Profil</span>
                        </Link>

                        {/* Tombol logout */}
                        <button onClick={handleLogout} className="header-button logout">
                            <FaSignOutAlt />
                            <span>Logout</span>
                        </button>
                    </div>
                </header>

                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
