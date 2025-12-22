// src/pages/CreatePengajuanPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Form.css';

/* Util format & parse Rupiah */
const formatRupiahInput = (raw) => {
  const digitsOnly = (raw || '').toString().replace(/\D/g, '');
  if (!digitsOnly) return '';
  const asNumber = Number(digitsOnly);
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(asNumber);
};
const parseRupiahToNumber = (formatted) => {
  const digitsOnly = (formatted || '').toString().replace(/\D/g, '');
  return Number(digitsOnly || 0);
};

const CreatePengajuanPage = () => {
  const [masterAnggaran, setMasterAnggaran] = useState([]);
  const [selectedJenisAnggaran, setSelectedJenisAnggaran] = useState('');
  const [filteredAnggaran, setFilteredAnggaran] = useState([]);

  const [nama_kegiatan, setNamaKegiatan] = useState('');
  const [nilai_rab, setNilaiRab] = useState('');
  const [id_anggaran, setIdAnggaran] = useState('');
  const [jenis_pengadaan, setJenisPengadaan] = useState('SPK');

  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnggaran = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        const response = await fetch('http://localhost:3001/api/master/anggaran', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Gagal mengambil daftar master anggaran.');
        setMasterAnggaran(data);
      } catch (err) { setError(err.message); }
    };
    fetchAnggaran();
  }, [navigate]);

  useEffect(() => {
    if (selectedJenisAnggaran) {
      const filtered = masterAnggaran.filter(i => i.jenis_anggaran === selectedJenisAnggaran);
      setFilteredAnggaran(filtered);
      setIdAnggaran(filtered[0]?.id || '');
    } else {
      setFilteredAnggaran([]);
      setIdAnggaran('');
    }
  }, [selectedJenisAnggaran, masterAnggaran]);

  // Nilai RAB handlers (tanpa minimal)
  const handleNilaiRabChange = (e) => {
    const next = formatRupiahInput(e.target.value);
    setNilaiRab(next);
    setFieldError(prev => ({ ...prev, nilai_rab: '' })); // hapus pesan error jika ada
  };
  const handleNilaiRabPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const formatted = formatRupiahInput(text);
    setNilaiRab(formatted);
  };
  const handleNilaiRabKeyDown = (e) => {
    const ok = ['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab'];
    if (ok.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const validateBeforeSubmit = () => {
    const errs = {};
    if (!nama_kegiatan.trim()) errs.nama_kegiatan = 'Nama kegiatan wajib diisi';
    if (!nilai_rab || parseRupiahToNumber(nilai_rab) <= 0) errs.nilai_rab = 'Nilai RAB wajib diisi';
    if (!selectedJenisAnggaran) errs.jenis_anggaran = 'Pilih jenis anggaran';
    if (!id_anggaran) errs.id_anggaran = 'Pilih program kerja';
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateBeforeSubmit()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        nama_kegiatan,
        nilai_rab: parseRupiahToNumber(nilai_rab),
        id_anggaran,
        jenis_pengadaan
      };
      const response = await fetch('http://localhost:3001/api/pengajuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Gagal membuat pengajuan.');
      alert('Pengajuan berhasil dibuat!');
      navigate('/tracking');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="form-card form-wizard">
        <div className="form-header">
          <div className="form-header-title">
            <span className="form-header-icon">📝</span>
            <h2>Buat Pengajuan RAB Baru</h2>
          </div>
          <p className="form-subtitle">Lengkapi data di bawah ini dengan jelas dan akurat.</p>
        </div>

        {/* Ringkasan cepat */}
        <div className="summary-bar">
          <div className="summary-item">
            <span className="summary-label">Jenis Anggaran</span>
            <span className="summary-value">{selectedJenisAnggaran || '—'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Jenis Pengadaan</span>
            <span className="summary-value">{jenis_pengadaan}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Nilai RAB</span>
            <span className="summary-value">Rp {nilai_rab || '—'}</span>
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* Informasi Kegiatan */}
        <div className="section">
          <div className="section-title">
            <span className="section-dot" />
            <h3>Informasi Kegiatan</h3>
          </div>

          <div className="input-group">
            <label htmlFor="nama_kegiatan">Nama Kegiatan</label>
            <input
              type="text"
              id="nama_kegiatan"
              value={nama_kegiatan}
              onChange={e => setNamaKegiatan(e.target.value)}
              aria-invalid={!!fieldError.nama_kegiatan}
              required
            />
            {fieldError.nama_kegiatan && <div className="field-error">{fieldError.nama_kegiatan}</div>}
          </div>

          <div className="input-group">
            <label htmlFor="nilai_rab">Nilai RAB (Rp)</label>
            <input
              type="text"
              id="nilai_rab"
              className="currency-input"
              inputMode="numeric"
              placeholder="Contoh: 50.000.000"
              value={nilai_rab}
              onChange={handleNilaiRabChange}
              onKeyDown={handleNilaiRabKeyDown}
              onPaste={handleNilaiRabPaste}
              autoComplete="off"
              aria-invalid={!!fieldError.nilai_rab}
              required
            />
            <div className="field-hint">Masukkan angka saja, akan otomatis diberi titik.</div>
            {fieldError.nilai_rab && <div className="field-error">{fieldError.nilai_rab}</div>}
          </div>
        </div>

        {/* Anggaran */}
        <div className="section">
          <div className="section-title">
            <span className="section-dot" />
            <h3>Anggaran</h3>
          </div>

          <div className="input-group">
            <label htmlFor="jenis_anggaran_select">Pilih Jenis Anggaran</label>
            <select
              id="jenis_anggaran_select"
              value={selectedJenisAnggaran}
              onChange={e => setSelectedJenisAnggaran(e.target.value)}
              aria-invalid={!!fieldError.jenis_anggaran}
              required
            >
              <option value="" disabled>-- Pilih Rutin / Non-Rutin --</option>
              <option value="Rutin">Rutin</option>
              <option value="Non-Rutin">Non-Rutin</option>
            </select>
            {fieldError.jenis_anggaran && <div className="field-error">{fieldError.jenis_anggaran}</div>}
          </div>

          {selectedJenisAnggaran && (
            <div className="input-group">
              <label htmlFor="id_anggaran">Pilih Program Kerja</label>
              <select
                id="id_anggaran"
                value={id_anggaran}
                onChange={e => setIdAnggaran(e.target.value)}
                aria-invalid={!!fieldError.id_anggaran}
                required
              >
                {filteredAnggaran.length > 0 ? (
                  filteredAnggaran.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nama_program} ({a.kode_skko})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Tidak ada program kerja untuk jenis ini.</option>
                )}
              </select>
              {fieldError.id_anggaran && <div className="field-error">{fieldError.id_anggaran}</div>}
            </div>
          )}
        </div>

        {/* Pengadaan */}
        <div className="section">
          <div className="section-title">
            <span className="section-dot" />
            <h3>Pengadaan</h3>
          </div>

          <div className="input-group">
            <label htmlFor="jenis_pengadaan">Jenis Pengadaan</label>
            <select
              id="jenis_pengadaan"
              value={jenis_pengadaan}
              onChange={e => setJenisPengadaan(e.target.value)}
              required
            >
              <option value="SPK">SPK</option>
              <option value="PO">PO</option>
              <option value="Non-PO">Non-PO</option>
              <option value="Petty Cash">Petty Cash</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Batal</button>
          <button type="submit" className="form-button" disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePengajuanPage;
