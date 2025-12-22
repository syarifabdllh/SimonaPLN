import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthForm.css';

const RegisterPage = () => {
    // State lainnya tetap sama
    const [nama_lengkap, setNamaLengkap] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [jabatan, setJabatan] = useState('User'); // Default role adalah 'User'
    const [unit, setUnit] = useState(''); // Tambahkan state untuk unit
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await fetch('http://localhost:3001/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama_lengkap, email, password, jabatan, unit }), // Kirim semua data
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Gagal untuk mendaftar.');
            }

            setSuccess('Registrasi berhasil! Anda akan diarahkan ke halaman login.');
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <img src="/logo-pln.png" alt="Logo PLN" className="auth-logo" />
                <h2>Daftar Akun Baru</h2>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                
                <div className="input-group">
                    <label htmlFor="nama">Nama Lengkap</label>
                    <input type="text" id="nama" value={nama_lengkap} onChange={(e) => setNamaLengkap(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                 <div className="input-group">
                    <label htmlFor="unit">Unit</label>
                    <input type="text" id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Contoh: Fasilitas Operasi" />
                </div>
                
                {/* --- PERUBAHAN UTAMA DI SINI --- */}
                <div className="input-group">
                    <label htmlFor="jabatan">Jabatan</label>
                    <select id="jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} required>
                        <option value="User">User / Unit Pengguna</option>
                        <option value="Manager">Manager UP2B</option>
                        <option value="Ren Eval">Unit Ren Eval</option>
                        <option value="Pengadaan">PJ Pelaksana Pengadaan</option>
                        <option value="KKU">Unit KKU</option>
                        <option value="Admin">Admin</option>
                    </select>
                </div>
                
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <button type="submit" className="auth-button">Daftar</button>
                <div className="switch-auth">
                    Sudah punya akun? <Link to="/login">Login di sini</Link>
                </div>
            </form>
        </div>
    );
};

export default RegisterPage;