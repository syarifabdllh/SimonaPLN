import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

import { 
    FaUserCircle, 
    FaBriefcase, 
    FaBuilding, 
    FaEnvelope, 
    FaMapMarkerAlt,
    FaPhone
} from 'react-icons/fa';

const ProfilePage = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const response = await fetch('http://localhost:3001/api/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Gagal mengambil data profil.');
                const data = await response.json();
                setProfile(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [navigate]);

    if (loading) return <div className="status-message">Memuat profil...</div>;
    if (error) return <div className="status-message error">{error}</div>;
    if (!profile) return <div className="status-message">Profil tidak ditemukan.</div>;

    return (
        <div className="profile-page-container">
            <div className="profile-display-card">
                
                <div className="profile-card-header">
                    <h3>Profile Saya</h3>
                </div>

                <div className="profile-card-body">
                    <div className="profile-avatar-placeholder">
                        <FaUserCircle className="profile-avatar-icon" />
                    </div>

                    <h2 className="profile-name">{profile.nama_lengkap}</h2>

                    <div className="profile-details-list">
                        {/* Jabatan - Selalu tampil */}
                        <div className="profile-detail-item">
                            <FaBriefcase className="detail-icon" />
                            <span>{profile.jabatan}</span>
                        </div>

                        {/* Unit - Hanya tampil jika ada */}
                        {profile.unit && profile.unit !== 'N/A' && (
                            <div className="profile-detail-item">
                                <FaBuilding className="detail-icon" />
                                <span>{profile.unit}</span>
                            </div>
                        )}

                        {/* Lokasi - Selalu tampil (hardcode UP2B Bali) */}
                        <div className="profile-detail-item">
                            <FaMapMarkerAlt className="detail-icon" />
                            <span>UP2B Bali</span>
                        </div>

                        {/* Email - Selalu tampil */}
                        <div className="profile-detail-item">
                            <FaEnvelope className="detail-icon" />
                            <span>{profile.email}</span>
                        </div>

                        {/* No. Telp - Hanya tampil jika ada di database */}
                        {profile.no_telp && (
                            <div className="profile-detail-item">
                                <FaPhone className="detail-icon" />
                                <span>{profile.no_telp}</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;
