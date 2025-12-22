import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Form.css';

const CreateAnggaranPage = () => {
    const [formData, setFormData] = useState({
        nomor_prk: '',
        nomor_wbs: '',
        nomor_io: '',
        kode_skko: '', // Dulu kode_skko, sekarang kita sesuaikan
        nama_program: '',
        pagu_anggaran: '',
        tahun_anggaran: new Date().getFullYear(),
        jenis_anggaran: 'Rutin'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/anggaran', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Gagal membuat pagu anggaran.');
            
            alert('Pagu anggaran berhasil dibuat!');
            navigate('/anggaran');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit} className="form-card">
                <h2>Input Pagu Anggaran Baru (SKKO)</h2>
                {error && <p className="error-message">{error}</p>}
                <div className="input-group">
                    <label htmlFor="nama_program">Uraian Pekerjaan / Nama Program</label>
                    <input type="text" name="nama_program" value={formData.nama_program} onChange={handleChange} required />
                </div>
                <div className="input-group">
                    <label htmlFor="nomor_prk">No PRK</label>
                    <input type="text" name="nomor_prk" value={formData.nomor_prk} onChange={handleChange} required />
                </div>
                <div className="input-group">
                    <label htmlFor="nomor_wbs">No WBS</label>
                    <input type="text" name="nomor_wbs" value={formData.nomor_wbs} onChange={handleChange} />
                </div>
                <div className="input-group">
                    <label htmlFor="nomor_io">No IO</label>
                    <input type="text" name="nomor_io" value={formData.nomor_io} onChange={handleChange} />
                </div>
                <div className="input-group">
                    <label htmlFor="kode_skko">Kode SKKO (digunakan sebagai ID unik internal)</label>
                    <input type="text" name="kode_skko" value={formData.kode_skko} onChange={handleChange} required />
                </div>
                <div className="input-group">
                    <label htmlFor="pagu_anggaran">Pagu Anggaran (Rp)</label>
                    <input type="number" name="pagu_anggaran" value={formData.pagu_anggaran} onChange={handleChange} required />
                </div>
                <div className="input-group">
                    <label htmlFor="tahun_anggaran">Tahun Anggaran</label>
                    <input type="number" name="tahun_anggaran" value={formData.tahun_anggaran} onChange={handleChange} required />
                </div>
                <div className="input-group">
                    <label htmlFor="jenis_anggaran">Jenis Anggaran</label>
                    <select name="jenis_anggaran" value={formData.jenis_anggaran} onChange={handleChange} required>
                        <option value="Rutin">Rutin</option>
                        <option value="Non-Rutin">Non-Rutin</option>
                    </select>
                </div>
                <button type="submit" className="form-button" disabled={loading}>
                    {loading ? 'Menyimpan...' : 'Simpan Pagu Anggaran'}
                </button>
            </form>
        </div>
    );
};

export default CreateAnggaranPage;