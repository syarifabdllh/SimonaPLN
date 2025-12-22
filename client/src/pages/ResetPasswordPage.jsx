import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './AuthForm.css';

const ResetPasswordPage = () => {
  // PERBAIKAN: Gunakan useParams untuk ambil token dari URL path
  const { token } = useParams();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  
  const navigate = useNavigate();

  // Validasi token saat halaman dimuat
  useEffect(() => {
    const validateToken = async () => {
      console.log('Validating token:', token);
      
      if (!token) {
        setError('Token tidak ditemukan. Link tidak valid.');
        setValidatingToken(false);
        return;
      }

      try {
        // PERBAIKAN: Token di URL path, bukan query string
        const response = await fetch(`http://localhost:3001/api/validate-reset-token/${token}`);
        const data = await response.json();

        console.log('Validation response:', data);

        if (!response.ok) {
          throw new Error(data.message || 'Token tidak valid atau sudah kedaluwarsa.');
        }

        setTokenValid(true);
        setUserInfo(data.user);
      } catch (err) {
        console.error('Validation error:', err);
        setError(err.message);
        setTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validasi password match
    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi password tidak cocok.');
      return;
    }

    // Validasi panjang password
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      // PERBAIKAN: Method PUT, bukan POST
      const response = await fetch('http://localhost:3001/api/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mereset password.');
      }

      setSuccess(data.message);
      
      // Redirect ke login setelah 3 detik
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state saat validasi token
  if (validatingToken) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <img src="/logo-pln.png" alt="Logo PLN" className="auth-logo" />
          <h2>Memvalidasi Link...</h2>
          <p>Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  // Jika token tidak valid
  if (!tokenValid) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <img src="/logo-pln.png" alt="Logo PLN" className="auth-logo" />
          <h2>Link Tidak Valid</h2>
          {error && <div className="error-message">{error}</div>}
          <p>Link reset password tidak valid atau sudah kedaluwarsa.</p>
          <div className="switch-auth">
            <Link to="/forgot-password">Kirim Ulang Link Reset</Link>
            <br />
            <Link to="/login">Kembali ke Halaman Login</Link>
          </div>
        </div>
      </div>
    );
  }

  // Form reset password
  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <img src="/logo-pln.png" alt="Logo PLN" className="auth-logo" />
        <h2>Reset Password</h2>
        
        {userInfo && (
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            padding: '12px', 
            borderRadius: '5px',
            marginBottom: '15px',
            border: '1px solid #b3d9ff'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#004085' }}>
              <strong>User:</strong> {userInfo.nama_lengkap}<br />
              <strong>Email:</strong> {userInfo.email}
            </p>
          </div>
        )}

        <p>Masukkan password baru Anda.</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {!success && (
          <>
            <div className="input-group">
              <label htmlFor="newPassword">Password Baru</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength="6"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Konfirmasi Password Baru</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Masukkan password yang sama"
                minLength="6"
                required
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Memperbarui...' : 'Reset Password'}
            </button>
          </>
        )}

        {success && (
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <p style={{ color: '#28a745', fontWeight: 'bold' }}>
              Anda akan diarahkan ke halaman login...
            </p>
          </div>
        )}

        <div className="switch-auth">
          <Link to="/login">Kembali ke Halaman Login</Link>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordPage;