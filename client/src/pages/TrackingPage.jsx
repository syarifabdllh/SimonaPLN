import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Tracking.css';

const TrackingPage = () => {
  const { user } = useAuth();
  const [pengajuanList, setPengajuanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPengajuan = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const response = await fetch('http://localhost:3001/api/pengajuan', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Gagal mengambil data pengajuan.');
        const data = await response.json();
        setPengajuanList(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPengajuan();
  }, [navigate]);

  const getStatusClass = (status) => {
    return status ? status.toLowerCase().replace(/\s+/g, '-') : '';
  };

  if (loading) return <div className="status-message">Memuat daftar pengajuan...</div>;
  if (error) return <div className="status-message error">{error}</div>;

  return (
    <div className="tracking-container">
      <div className="tracking-header">
        <h1>{user && user.jabatan === 'User' ? 'Daftar Pengajuan Saya' : 'Pelacakan Global'}</h1>
        {user && user.jabatan === 'User' && (
          <Link to="/pengajuan/baru" className="btn-primary">
            + Buat Pengajuan Baru
          </Link>
        )}
      </div>

      <div className="table-wrapper">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Nama Kegiatan</th>
              <th>Sumber Dana</th>
              <th>Nilai RAB</th>
              <th>No. Kontrak</th>
              <th>Status</th>
              <th>Tanggal Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {pengajuanList.length > 0 ? (
              pengajuanList.map(item => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/pengajuan/${item.id}`)}
                  className="clickable-row"
                >
                  <td>
                    <div className="cell-main">{item.nama_kegiatan}</div>
                    <div className="cell-sub">{item.pembuat}</div>
                  </td>
                  <td>{item.sumber_dana}</td>
                  <td className="currency">
                    Rp {new Intl.NumberFormat('id-ID').format(item.nilai_rab)}
                  </td>
                  <td>{item.nomor_kontrak || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    {new Date(item.tanggal_dibuat).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-table">Tidak ada data pengajuan untuk ditampilkan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrackingPage;
