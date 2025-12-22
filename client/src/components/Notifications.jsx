import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Notifications.css'; // Kita akan buat CSS ini

const Notifications = () => {
    const [taskCount, setTaskCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTaskSummary = async () => {
            const token = localStorage.getItem('token');
            // Jika tidak ada token, jangan lakukan apa-apa
            if (!token) return;

            try {
                const response = await fetch('http://localhost:3001/api/tasks/summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setTaskCount(data.count);
            } catch (error) {
                console.error("Gagal mengambil ringkasan tugas:", error);
            }
        };

        // Panggil sekali saat komponen dimuat
        fetchTaskSummary();
        // Atur interval untuk memeriksa tugas baru setiap 60 detik (atau sesuai kebutuhan)
        const intervalId = setInterval(fetchTaskSummary, 60000); 

        // Bersihkan interval saat komponen tidak lagi ditampilkan
        return () => clearInterval(intervalId);
    }, []);

    // Saat ikon diklik, langsung arahkan ke halaman pelacakan
    const handleClick = () => {
        navigate('/tracking');
    };

    return (
        <div className="notification-container">
            <button className="notification-icon-button" onClick={handleClick} title="Lihat Tugas">
                <FaBell />
                {taskCount > 0 && <span className="notification-badge">{taskCount}</span>}
            </button>
        </div>
    );
};

export default Notifications;