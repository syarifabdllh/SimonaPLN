import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Komponen kartu chart (existing)
const SummaryChartCard = ({ title, data, totalPagu, totalRealisasi }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1F2937',
                padding: 12,
                titleColor: '#F9FAFB',
                bodyColor: '#F9FAFB',
                borderColor: '#374151',
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        const value = new Intl.NumberFormat('id-ID').format(context.raw);
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.raw / total) * 100).toFixed(1);
                        return `${context.label}: Rp ${value} (${percentage}%)`;
                    }
                }
            }
        },
    };
    
    const percentage = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(2) : 0;
    
    return (
        <div className="summary-chart-card">
            <h3>{title}</h3>
            <div className="summary-chart-wrapper">
                {data.labels && <Doughnut data={data} options={options} />}
            </div>
            <div className="chart-legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: data.datasets?.[0]?.backgroundColor[0] }}></span>
                    <span>Realisasi ({percentage}%)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: data.datasets?.[0]?.backgroundColor[1] }}></span>
                    <span>Sisa Anggaran</span>
                </div>
            </div>
            <div className="chart-summary-values">
                <span>Pagu: Rp {new Intl.NumberFormat('id-ID').format(totalPagu)}</span>
                <span>Realisasi: Rp {new Intl.NumberFormat('id-ID').format(totalRealisasi)}</span>
            </div>
        </div>
    );
};

// Komponen BARU untuk chart kontrak
const KontrakChartCard = ({ title, data, label1, label2, value1, value2, color1, color2 }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1F2937',
                padding: 12,
                titleColor: '#F9FAFB',
                bodyColor: '#F9FAFB',
                borderColor: '#374151',
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        const value = new Intl.NumberFormat('id-ID').format(context.raw);
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.raw / total) * 100).toFixed(1);
                        return `${context.label}: Rp ${value} (${percentage}%)`;
                    }
                }
            }
        },
    };
    
    const total = value1 + value2;
    const percentage = total > 0 ? ((value1 / total) * 100).toFixed(2) : 0;
    
    return (
        <div className="summary-chart-card">
            <h3>{title}</h3>
            <div className="summary-chart-wrapper">
                {data.labels && <Doughnut data={data} options={options} />}
            </div>
            <div className="chart-legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: color1 }}></span>
                    <span>{label1} ({percentage}%)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: color2 }}></span>
                    <span>{label2}</span>
                </div>
            </div>
            <div className="chart-summary-values">
                <span>{label1}: Rp {new Intl.NumberFormat('id-ID').format(value1)}</span>
                <span>{label2}: Rp {new Intl.NumberFormat('id-ID').format(value2)}</span>
            </div>
        </div>
    );
};

function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    
    // State existing
    const [overallData, setOverallData] = useState({ data: {}, pagu: 0, realisasi: 0 });
    const [routineData, setRoutineData] = useState({ data: {}, pagu: 0, realisasi: 0 });
    const [nonRoutineData, setNonRoutineData] = useState({ data: {}, pagu: 0, realisasi: 0 });
    
    // State BARU untuk kontrak
    const [kontrakData, setKontrakData] = useState({
        terkontrak: { data: {}, value1: 0, value2: 0 },
        progress: { data: {}, value1: 0, value2: 0 },
        terserap: { data: {}, value1: 0, value2: 0 }
    });

    // Fetch daftar tahun
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
                console.error("Gagal memuat tahun:", err);
                setAvailableYears([new Date().getFullYear()]);
            }
        };
        
        if (user && ['Manager', 'KKU', 'Admin'].includes(user.jabatan)) {
            fetchYears();
        }
    }, [user]);

    // Fetch data anggaran (existing)
    useEffect(() => {
        if (user && ['Manager', 'KKU', 'Admin'].includes(user.jabatan)) {
            const fetchData = async () => {
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
                    if (!response.ok) throw new Error(`Gagal mengambil data dari server.`);

                    const anggaranData = await response.json();

                    // Kalkulasi Total Keseluruhan
                    const totalPagu = anggaranData.reduce((sum, item) => sum + parseFloat(item.pagu_anggaran), 0);
                    const totalRealisasi = anggaranData.reduce((sum, item) => sum + parseFloat(item.total_realisasi), 0);
                    setOverallData({
                        data: {
                            labels: ['Realisasi', 'Sisa Anggaran'],
                            datasets: [{ 
                                data: [totalRealisasi, Math.max(0, totalPagu - totalRealisasi)], 
                                backgroundColor: ['#0066cc', '#e0e0e0'],
                                borderWidth: 0
                            }]
                        },
                        pagu: totalPagu,
                        realisasi: totalRealisasi
                    });

                    // Kalkulasi Total Anggaran Rutin
                    const routineItems = anggaranData.filter(item => item.jenis_anggaran === 'Rutin');
                    const routinePagu = routineItems.reduce((sum, item) => sum + parseFloat(item.pagu_anggaran), 0);
                    const routineRealisasi = routineItems.reduce((sum, item) => sum + parseFloat(item.total_realisasi), 0);
                    setRoutineData({
                        data: {
                            labels: ['Realisasi', 'Sisa Anggaran'],
                            datasets: [{ 
                                data: [routineRealisasi, Math.max(0, routinePagu - routineRealisasi)], 
                                backgroundColor: ['#0066cc', '#e0e0e0'],
                                borderWidth: 0
                            }]
                        },
                        pagu: routinePagu,
                        realisasi: routineRealisasi
                    });

                    // Kalkulasi Total Anggaran Non-Rutin
                    const nonRoutineItems = anggaranData.filter(item => item.jenis_anggaran === 'Non-Rutin');
                    const nonRoutinePagu = nonRoutineItems.reduce((sum, item) => sum + parseFloat(item.pagu_anggaran), 0);
                    const nonRoutineRealisasi = nonRoutineItems.reduce((sum, item) => sum + parseFloat(item.total_realisasi), 0);
                    setNonRoutineData({
                        data: {
                            labels: ['Realisasi', 'Sisa Anggaran'],
                            datasets: [{ 
                                data: [nonRoutineRealisasi, Math.max(0, nonRoutinePagu - nonRoutineRealisasi)], 
                                backgroundColor: ['#0066cc', '#e0e0e0'],
                                borderWidth: 0
                            }]
                        },
                        pagu: nonRoutinePagu,
                        realisasi: nonRoutineRealisasi
                    });

                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else {
            setLoading(false);
        }
    }, [navigate, user, selectedYear]);

    // Fetch data kontrak (BARU)
    useEffect(() => {
        if (user && ['Manager', 'KKU', 'Admin'].includes(user.jabatan)) {
            const fetchKontrakData = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`http://localhost:3001/api/dashboard/kontrak?tahun=${selectedYear}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Setup Anggaran Terkontrak
                        setKontrakData(prev => ({
                            ...prev,
                            terkontrak: {
                                data: {
                                    labels: ['Terkontrak', 'Tersedia'],
                                    datasets: [{
                                        data: [data.anggaran_terkontrak.terkontrak, data.anggaran_terkontrak.tersedia],
                                        backgroundColor: ['#dc2626', '#e0e0e0'],
                                        borderWidth: 0
                                    }]
                                },
                                value1: data.anggaran_terkontrak.terkontrak,
                                value2: data.anggaran_terkontrak.tersedia
                            },
                            progress: {
                                data: {
                                    labels: ['On Progress', 'Belum Realisasi'],
                                    datasets: [{
                                        data: [data.kontrak_progress.onProgress, data.kontrak_progress.belumRealisasi],
                                        backgroundColor: ['#2563eb', '#e0e0e0'],
                                        borderWidth: 0
                                    }]
                                },
                                value1: data.kontrak_progress.onProgress,
                                value2: data.kontrak_progress.belumRealisasi
                            },
                            terserap: {
                                data: {
                                    labels: ['Terserap', 'Tersisa'],
                                    datasets: [{
                                        data: [data.anggaran_terserap.terserap, data.anggaran_terserap.tersisa],
                                        backgroundColor: ['#dc2626', '#e0e0e0'],
                                        borderWidth: 0
                                    }]
                                },
                                value1: data.anggaran_terserap.terserap,
                                value2: data.anggaran_terserap.tersisa
                            }
                        }));
                    }
                } catch (err) {
                    console.error("Gagal mengambil data kontrak:", err);
                }
            };
            fetchKontrakData();
        }
    }, [user, selectedYear]);

    if (loading) return <div className="status-message">⏳ Sedang mengambil data untuk tahun {selectedYear}...</div>;
    if (error) return <div className="status-message error">❌ Error: {error}</div>;

    if (user && ['Manager', 'KKU', 'Admin'].includes(user.jabatan)) {
        return (
            <div className="dashboard-container">
                {/* Section 1: Ringkasan Penyerapan Anggaran */}
                <div className="dashboard-title">
                    <div>
                        <h2>RINGKASAN PENYERAPAN ANGGARAN</h2>
                        <p>Total, Rutin, dan Non-Rutin</p>
                    </div>
                    <div className="year-selector">
                        <label htmlFor="year-select">Tahun Anggaran:</label>
                        <select 
                            id="year-select" 
                            value={selectedYear} 
                            onChange={e => setSelectedYear(parseInt(e.target.value))}
                        >
                            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="summary-charts-grid">
                    <SummaryChartCard 
                        title="TOTAL KESELURUHAN"
                        data={overallData.data}
                        totalPagu={overallData.pagu}
                        totalRealisasi={overallData.realisasi}
                    />
                    <SummaryChartCard 
                        title="TOTAL ANGGARAN RUTIN"
                        data={routineData.data}
                        totalPagu={routineData.pagu}
                        totalRealisasi={routineData.realisasi}
                    />
                    <SummaryChartCard 
                        title="TOTAL ANGGARAN NON-RUTIN"
                        data={nonRoutineData.data}
                        totalPagu={nonRoutineData.pagu}
                        totalRealisasi={nonRoutineData.realisasi}
                    />
                </div>

                {/* Section 2: STATUS KONTRAK (BARU) */}
                <div className="dashboard-title" style={{ marginTop: '50px' }}>
                    <div>
                        <h2>STATUS KONTRAK TAHUN {selectedYear}</h2>
                        <p>Terkontrak, On Progress, dan Terserap</p>
                    </div>
                </div>

                <div className="summary-charts-grid">
                    <KontrakChartCard 
                        title="ANGGARAN TERKONTRAK"
                        data={kontrakData.terkontrak.data}
                        label1="Terkontrak"
                        label2="Tersedia"
                        value1={kontrakData.terkontrak.value1}
                        value2={kontrakData.terkontrak.value2}
                        color1="#dc2626"
                        color2="#e0e0e0"
                    />
                    
                    <KontrakChartCard 
                        title="KONTRAK ON PROGRESS"
                        data={kontrakData.progress.data}
                        label1="On Progress"
                        label2="Belum Realisasi"
                        value1={kontrakData.progress.value1}
                        value2={kontrakData.progress.value2}
                        color1="#2563eb"
                        color2="#e0e0e0"
                    />
                    <KontrakChartCard 
                        title="ANGGARAN TERSERAP"
                        data={kontrakData.terserap.data}
                        label1="Terserap"
                        label2="Tersisa"
                        value1={kontrakData.terserap.value1}
                        value2={kontrakData.terserap.value2}
                        color1="#dc2626"
                        color2="#e0e0e0"
                    />
                </div>
            </div>
        );
    }

    // Tampilan default
    return (
        <div className="dashboard-container">
            <div className="dashboard-title">
                <h2>Selamat Datang</h2>
                <p>Silakan gunakan menu di samping untuk melihat atau mengelola tugas Anda.</p>
            </div>
        </div>
    );
}

export default Dashboard;
