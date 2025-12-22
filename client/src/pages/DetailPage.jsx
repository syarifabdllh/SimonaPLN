import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DetailPage.css';

// Form Verifikasi User (Non-PO/Petty Cash)
const UserVerificationForm = ({ handleAction }) => {
  const [nomor_dokumen, setNomorDokumen] = useState('');
  const [nilai_realisasi, setNilaiRealisasi] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    handleAction('verify-user', { nomor_dokumen, nilai_realisasi });
  };

  return (
    <div className="verification-form-card">
      <div className="form-header">
        <h3>Verifikasi Dokumen (Non-PO / Petty Cash)</h3>
      </div>
      <form onSubmit={onSubmit} className="verification-form">
        <div className="form-group">
          <label htmlFor="nomor_dokumen">Nomor Dokumen (Kwitansi, dll)</label>
          <input
            type="text"
            id="nomor_dokumen"
            value={nomor_dokumen}
            onChange={e => setNomorDokumen(e.target.value)}
            placeholder="Contoh: KWT-001/2025"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="nilai_realisasi">Nilai Realisasi Final</label>
          <input
            type="number"
            id="nilai_realisasi"
            value={nilai_realisasi}
            onChange={e => setNilaiRealisasi(e.target.value)}
            placeholder="Masukkan nilai dalam Rupiah"
            required
          />
        </div>
        <button type="submit" className="btn-submit">Simpan & Selesaikan</button>
      </form>
    </div>
  );
};

const DetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`http://localhost:3001/api/pengajuan/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil detail data.');
      const data = await response.json();
      setDetail(data.detail);
      setHistory(data.history);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (endpoint, body = {}) => {
    if (body.catatan === undefined && !endpoint.includes('verify')) {
      if (!window.confirm('Apakah Anda yakin ingin melanjutkan aksi ini?')) return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/pengajuan/${id}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Aksi gagal.');
      alert('✓ Aksi berhasil dilakukan!');
      fetchDetail();
    } catch (err) {
      alert('✗ ' + err.message);
    }
  };

  // Action Buttons
  const ActionButtons = () => {
    if (!user || !detail) return null;

    const { status, jenis_pengadaan, id_user_pembuat } = detail;
    const role = user.jabatan;
    const isOwner = user.id === id_user_pembuat;

    // Manager Approval
    if (role === 'Manager' && status === 'Menunggu Persetujuan Manager') {
      return (
        <div className="action-card">
          <div className="action-header"><h3>Aksi Manager</h3></div>
          <div className="action-buttons">
            <button
              onClick={() => handleAction('approval', { action: 'approve', catatan: 'Disetujui oleh Manager' })}
              className="btn-approve"
            >
              Setujui Pengajuan
            </button>
            <button
              onClick={() => {
                const reason = window.prompt('Masukkan alasan penolakan:');
                if (reason) handleAction('approval', { action: 'reject', catatan: reason });
              }}
              className="btn-reject"
            >
              Tolak Pengajuan
            </button>
          </div>
        </div>
      );
    }

    // SPK/PO Flow
    if (jenis_pengadaan === 'SPK' || jenis_pengadaan === 'PO') {
      // Ren Eval
      if (role === 'Ren Eval' && status === 'Proses Evaluasi RAB') {
        return (
          <div className="action-card">
            <div className="action-header"><h3>Aksi Ren Eval</h3></div>
            <div className="action-buttons">
              <button onClick={() => handleAction('evaluate')} className="btn-primary">
                Selesaikan Evaluasi RAB
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt('Masukkan catatan revisi untuk evaluasi:');
                  if (reason) handleAction('revise-evaluation', { catatan: reason });
                }}
                className="btn-warning"
              >
                Kembalikan untuk Revisi
              </button>
            </div>
          </div>
        );
      }
      // Pengadaan
      if (role === 'Pengadaan' && status === 'Proses Pengadaan') {
        return (
          <div className="action-card">
            <div className="action-header"><h3>Aksi Pengadaan</h3></div>
            <div className="action-buttons">
              <button
                onClick={() => navigate(`/kontrak/baru?pengajuan=${id}`)}
                className="btn-approve"
              >
                Setujui & Buat Kontrak
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt('Masukkan catatan revisi yang diperlukan:');
                  if (reason) handleAction('revise-pengadaan', { catatan: reason });
                }}
                className="btn-warning"
              >
                Revisi
              </button>
            </div>
          </div>
        );
      }
      // User konfirmasi pekerjaan selesai
      if (isOwner && status === 'Pelaksanaan Pekerjaan') {
        return (
          <div className="action-card">
            <div className="action-header"><h3>Konfirmasi Penyelesaian</h3></div>
            <div className="action-buttons">
              <button onClick={() => handleAction('complete-work')} className="btn-primary">
                Konfirmasi Pekerjaan Selesai
              </button>
            </div>
          </div>
        );
      }
    }

    // Non-PO/Petty Cash
    if ((jenis_pengadaan === 'Non-PO' || jenis_pengadaan === 'Petty Cash')) {
      if (isOwner && status === 'Menunggu Pembayaran KKU') {
        return <UserVerificationForm handleAction={handleAction} />;
      }
    }

    // KKU - Pembayaran
    if (role === 'KKU' && status === 'Menunggu Pembayaran KKU') {
      return (
        <div className="action-card">
          <div className="action-header"><h3>Aksi KKU</h3></div>
          <div className="action-buttons">
            <button onClick={() => handleAction('pay')} className="btn-approve">
              Proses Pembayaran
            </button>
          </div>
        </div>
      );
    }

    // Revisi oleh user
    if (isOwner && (status === 'Revisi dari Pengadaan' || status === 'Revisi dari Evaluasi')) {
      return (
        <div className="action-card">
          <div className="action-header">
            <h3>Perlu Revisi</h3>
            <p className="action-note">Pengajuan Anda dikembalikan untuk diperbaiki</p>
          </div>
          <div className="action-buttons">
            <button onClick={() => navigate(`/pengajuan/edit/${id}`)} className="btn-primary">
              Edit & Submit Ulang
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Menunggu Persetujuan Manager': 'status-pending',
      'Proses Evaluasi RAB': 'status-process',
      'Proses Pengadaan': 'status-process',
      'Pelaksanaan Pekerjaan': 'status-progress',
      'Menunggu Pembayaran KKU': 'status-warning',
      'Selesai Dibayar': 'status-success',
      'Ditolak Manager': 'status-rejected',
      'Revisi dari Evaluasi': 'status-revision',
      'Revisi dari Pengadaan': 'status-revision'
    };
    return statusColors[status] || 'status-default';
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-container">
        <div className="error-box">
          <span className="error-icon">⚠️</span>
          <h3>Terjadi Kesalahan</h3>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn-back">Kembali</button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="detail-container">
      {/* Header */}
      <div className="detail-header">
        <div className="header-top">
          <button onClick={() => navigate(-1)} className="btn-back-header">
            <span className="icon">←</span> Kembali
          </button>
        </div>

        <div className="header-content">
          <div className="header-title">
            <h1>{detail.nama_kegiatan}</h1>
            <div className={`status-badge ${getStatusColor(detail.status)}`}>{detail.status}</div>
          </div>
          <div className="header-meta">
            <div className="meta-item">
              <span className="meta-label">Jenis Pengadaan</span>
              <span className="meta-value">{detail.jenis_pengadaan}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Dibuat</span>
              <span className="meta-value">{formatDate(detail.tanggal_dibuat)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">ID Pengajuan</span>
              <span className="meta-value">#{id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <ActionButtons />

      {/* Content */}
      <div className="detail-content">
        {/* Info Umum */}
        <div className="info-card">
          <div className="card-header">
            <h2>Informasi Umum</h2>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <label>Pembuat</label>
                <div className="info-value">
                  <span className="user-avatar">{detail.pembuat?.charAt(0)}</span>
                  <div>
                    <div className="user-name">{detail.pembuat}</div>
                    <div className="user-unit">{detail.unit_pembuat}</div>
                  </div>
                </div>
              </div>

              <div className="info-item">
                <label>Sumber Dana</label>
                <div className="info-value">{detail.sumber_dana}</div>
              </div>

              <div className="info-item">
                <label>Kode SKKO</label>
                <div className="info-value code">{detail.kode_skko}</div>
              </div>

              <div className="info-item">
                <label>Nilai RAB</label>
                <div className="info-value price">{formatCurrency(detail.nilai_rab)}</div>
              </div>
            </div>

            {detail.catatan_revisi && (
              <div className="revision-note">
                <div className="note-header"><strong>Catatan Revisi</strong></div>
                <p>{detail.catatan_revisi}</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Kontrak */}
        {detail.nomor_kontrak && (
          <div className="info-card">
            <div className="card-header">
              <h2>Informasi Kontrak</h2>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <label>Nomor Kontrak</label>
                  <div className="info-value code">{detail.nomor_kontrak}</div>
                </div>
                <div className="info-item">
                  <label>Vendor</label>
                  <div className="info-value">{detail.nama_vendor}</div>
                </div>
                <div className="info-item">
                  <label>Nilai Kontrak</label>
                  <div className="info-value price">{formatCurrency(detail.nilai_kontrak)}</div>
                </div>
                <div className="info-item">
                  <label>Periode Kontrak</label>
                  <div className="info-value">
                    {formatDate(detail.tanggal_mulai)} - {formatDate(detail.tanggal_selesai)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="info-card">
          <div className="card-header">
            <h2>Riwayat Progress</h2>
          </div>
          <div className="card-body timeline-body">
            {history.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>Belum ada riwayat</p>
              </div>
            ) : (
              <div className="timeline">
                {history.map((log, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker">
                      <div className={`marker-dot ${getStatusColor(log.status_baru)}`}></div>
                      {index !== history.length - 1 && <div className="marker-line"></div>}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <h4>{log.status_baru}</h4>
                        <span className="timeline-date">
                          {new Date(log.waktu_perubahan).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="timeline-user">
                        <span className="user-avatar small">{log.diubah_oleh?.charAt(0)}</span>
                        {log.diubah_oleh}
                      </div>
                      {log.catatan && (
                        <div className="timeline-note">
                          {log.catatan}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
