import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AuthForm.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengirim email reset.');
      }

      // Tampilkan pesan sukses
      setSuccess(data.message);
      setEmail(''); // Clear email field
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <img src="/logo-pln.png" alt="Logo PLN" className="auth-logo" />
        <h2>Lupa Password</h2>
        <p>Masukkan email Anda untuk menerima link reset password.</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {!success && (
          <>
            <div className="input-group">
              <label htmlFor="email">Email Terdaftar</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@pln.co.id"
                required
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Mengirim...' : 'Kirim Link Reset Password'}
            </button>
          </>
        )}

        <div className="switch-auth">
          <Link to="/login">Kembali ke Halaman Login</Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;