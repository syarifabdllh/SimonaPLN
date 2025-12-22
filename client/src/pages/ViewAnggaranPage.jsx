import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Tracking.css'; // Kita akan perbarui CSS ini sedikit

// Komponen baru yang bisa dipakai ulang untuk merender setiap tabel anggaran
const AnggaranTable = ({ title, items }) => {
    return (
        <div className="anggaran-section">
            <h2 className="anggaran-section-title">{title}</h2>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Nama Program</th>
                            <th>Kode SKKO</th>
                            <th>Pagu Anggaran</th>
                            <th>Realisasi</th>
                            <th>Sisa Anggaran</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map(item => (
                                <tr key={item.kode_skko}>
                                    <td>{item.nama_program}</td>
                                    <td>{item.kode_skko}</td>
                                    <td className="currency">Rp {new Intl.NumberFormat('id-ID').format(item.pagu_anggaran)}</td>
                                    <td className="currency">Rp {new Intl.NumberFormat('id-ID').format(item.total_realisasi)}</td>
                                    <td className="currency">Rp {new Intl.NumberFormat('id-ID').format(item.sisa_anggaran)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-table">Tidak ada data anggaran untuk kategori ini.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const ViewAnggaranPage = () => {
    const [anggaranList, setAnggaranList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAnggaran = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }
                // Endpoint tetap sama, kita ambil semua data dulu
                const response = await fetch('http://localhost:3001/api/anggaran', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) { 
                    throw new Error('Gagal memuat data anggaran.');
                }
                const data = await response.json();
                setAnggaranList(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAnggaran();
    }, [navigate]);

    if (loading) return <div className="status-message">Memuat daftar anggaran...</div>;
    if (error) return <div className="status-message error">{error}</div>;

    // --- LOGIKA BARU: Filter data sebelum ditampilkan ---
    const rutinItems = anggaranList.filter(item => item.jenis_anggaran === 'Rutin');
    const nonRutinItems = anggaranList.filter(item => item.jenis_anggaran === 'Non-Rutin');

    return (
        <div className="tracking-container">
            <div className="tracking-header">
                <h1>Daftar Pagu Anggaran</h1>
            </div>

            {/* --- TAMPILAN BARU: Render dua tabel terpisah --- */}
            <AnggaranTable title="Anggaran Rutin" items={rutinItems} />
            <AnggaranTable title="Anggaran Non-Rutin" items={nonRutinItems} />
        </div>
    );
};

export default ViewAnggaranPage;