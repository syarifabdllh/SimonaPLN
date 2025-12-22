import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthForm.css';
// Impor ikon dari library react-icons
import { FiEye, FiEyeOff } from 'react-icons/fi';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Gagal untuk login.');
            }
            login(data.token);
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="page-wrapper">
            {/* Header Bar */}
            <header className="page-header"></header>

            <main className="auth-container">
                <div className="auth-form-card">
                    <img src="/logo-pln.png" alt="PLN Logo" className="form-logo" />
                    
                    {/* 1. Judul Sistem Ditambahkan */}
                    <h1 className="system-name">SIMONA</h1>
                    
                    <h2 className="form-title">Sign In</h2>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input 
                                type="text"
                                placeholder="Username/Email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="input-group">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="Password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                            />
                            {/* 2. Ikon Mata Diubah */}
                            <span 
                                className="password-toggle" 
                                onClick={() => setShowPassword(!showPassword)}
                            >
                               {showPassword ? <FiEyeOff /> : <FiEye />}
                            </span>
                        </div>
                        
                        <div className="form-options">
                            <label className="remember-me">
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                Remember Me?
                            </label>
                        </div>
                        
                        <button type="submit" className="auth-button">Sign In</button>
                        
                        {/* 3. Tata Letak Link Disesuaikan */}
                        <div className="forgot-password">
                            <Link to="/forgot-password">Forgot Password</Link>
                        </div>
                    </form>

                    <div className="form-footer-links">
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms</Link>
                    </div>
                </div>
            </main>

            {/* Footer Bar */}
            <footer className="page-footer-bar">
                 <p>PLN Unit Pelaksana Pengatur Beban</p>
                 <p>Copyright © 2025 PT PLN (Persero)</p>
            </footer>
        </div>
    );
};

export default LoginPage;