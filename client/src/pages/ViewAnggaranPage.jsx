import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Tracking.css'; 

// --- Komponen Tabel ---
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

// --- Halaman Utama ---
const ViewAnggaranPage = () => {
    const [anggaranList, setAnggaranList] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // 1. Fetch Daftar Tahun (Hanya sekali saat load)
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:3001/api/anggaran/years', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const years = await response.json();
                    if (years.length > 0) {
                        setAvailableYears(years);
                        if (!years.includes(selectedYear)) {
                             setSelectedYear(years[0]);
                        }
                    } else {
                        setAvailableYears([new Date().getFullYear()]);
                    }
                }
            } catch (err) {
                console.error("Gagal memuat tahun, menggunakan default.", err);
                setAvailableYears([new Date().getFullYear()]);
            }
        };
        fetchYears();
    }, []);

    // 2. Fetch Data Anggaran (Setiap kali selectedYear berubah)
    useEffect(() => {
        const fetchAnggaran = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }
                
                const response = await fetch(`http://localhost:3001/api/anggaran?tahun=${selectedYear}`, {
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
    }, [selectedYear, navigate]);

    const handleYearChange = (e) => {
        setSelectedYear(parseInt(e.target.value));
    };

    // Filter Data Rutin / Non-Rutin
    const rutinItems = anggaranList.filter(item => item.jenis_anggaran === 'Rutin');
    const nonRutinItems = anggaranList.filter(item => item.jenis_anggaran === 'Non-Rutin');

    return (
        <div className="tracking-container">
            <div className="tracking-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
                <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '28px' }}>Daftar Pagu Anggaran</h1>
                
                {/* --- DROPDOWN FILTER TAHUN --- */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#fff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '2px solid #e1e8ed',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                }}>
                    <label htmlFor="year-select" style={{ 
                        fontWeight: '600', 
                        color: '#5a6c7d',
                        fontSize: '15px',
                        margin: 0
                    }}>
                        Tahun:
                    </label>
                    <select 
                        id="year-select" 
                        value={selectedYear} 
                        onChange={handleYearChange}
                        style={{ 
                            padding: '8px 32px 8px 12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            border: '2px solid #0066cc',
                            borderRadius: '6px',
                            backgroundColor: '#fff',
                            color: '#0066cc',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            appearance: 'none',
                            backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230066cc\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            backgroundSize: '20px'
                        }}
                        onMouseOver={(e) => e.target.style.borderColor = '#004d99'}
                        onMouseOut={(e) => e.target.style.borderColor = '#0066cc'}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="status-message">Sedang mengambil data tahun {selectedYear}...</div>
            ) : error ? (
                <div className="status-message error">{error}</div>
            ) : (
                <>
                    <AnggaranTable title={`Anggaran Rutin ${selectedYear}`} items={rutinItems} />
                    <AnggaranTable title={`Anggaran Non-Rutin ${selectedYear}`} items={nonRutinItems} />
                </>
            )}
        </div>
    );
};

export default ViewAnggaranPage;
