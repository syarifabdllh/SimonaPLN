import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Form.css';
import './Tracking.css';

const CreateKontrakPage = () => {
    const [pengajuanSiap, setPengajuanSiap] = useState([]);
    const [formData, setFormData] = useState({
        id_pengajuan: '',
        nomor_kontrak: '',
        nama_vendor: '',
        nilai_kontrak: '',
        tanggal_mulai: '',
        tanggal_selesai: ''
    });
    const [nilaiKontrakDisplay, setNilaiKontrakDisplay] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReadyPengajuan = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch('http://localhost:3001/api/pengajuan', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const allPengajuan = await response.json();
                const ready = allPengajuan.filter(p => p.status === 'Proses Pengadaan');
                setPengajuanSiap(ready);
                if (ready.length > 0) {
                    setFormData(prev => ({ ...prev, id_pengajuan: ready[0].id }));
                }
            } catch (err) {
                setError('Gagal memuat daftar pengajuan.');
            } finally {
                setLoading(false);
            }
        };
        fetchReadyPengajuan();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Format rupiah dengan titik sebagai pemisah ribuan
    const formatRupiah = (value) => {
        const number = value.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const handleNilaiKontrakChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, ''); // Hapus semua non-digit
        setFormData({ ...formData, nilai_kontrak: rawValue });
        setNilaiKontrakDisplay(formatRupiah(rawValue));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/kontrak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Gagal membuat kontrak.');
            
            alert('Kontrak berhasil dibuat!');
            navigate('/tracking');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && pengajuanSiap.length === 0) return <div className="status-message">Memuat data...</div>;

    return (
        <div className="form-container" style={{ maxWidth: '900px' }}>
            <div className="form-card">
                <h2>Buat Kontrak Baru</h2>
                {pengajuanSiap.length === 0 ? (
                    <p>Tidak ada pengajuan yang siap untuk dibuatkan kontrak saat ini.</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && <p className="error-message">{error}</p>}
                        <div className="input-group">
                            <label htmlFor="id_pengajuan">Pilih Pengajuan</label>
                            <select name="id_pengajuan" value={formData.id_pengajuan} onChange={handleChange} required>
                                {pengajuanSiap.map(p => (
                                    <option key={p.id} value={p.id}>{p.nama_kegiatan} (RAB: Rp {new Intl.NumberFormat('id-ID').format(p.nilai_rab)})</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label htmlFor="nomor_kontrak">Nomor Kontrak / SPK</label>
                            <input type="text" name="nomor_kontrak" value={formData.nomor_kontrak} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="nama_vendor">Nama Vendor</label>
                            <input type="text" name="nama_vendor" value={formData.nama_vendor} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="nilai_kontrak">Nilai Final Kontrak (Rp)</label>
                            <input 
                                type="text" 
                                name="nilai_kontrak" 
                                value={nilaiKontrakDisplay} 
                                onChange={handleNilaiKontrakChange} 
                                placeholder="Contoh: 1.000.000"
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="tanggal_mulai">Tanggal Mulai</label>
                            <input type="date" name="tanggal_mulai" value={formData.tanggal_mulai} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="tanggal_selesai">Tanggal Selesai</label>
                            <input type="date" name="tanggal_selesai" value={formData.tanggal_selesai} onChange={handleChange} />
                        </div>
                        <button type="submit" className="form-button" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Kontrak & Lanjutkan'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateKontrakPage;