// File: server/authMiddleware.js (GANTI ISI FILE INI)
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, 'RAHASIA_NEGARA_JANGAN_DIBAGI');
        req.user = decoded;
        next();
    } catch (error) {
        // Improved error handling
        if (error.name === 'TokenExpiredError') {
            console.log('⚠️ Token expired untuk user. Perlu login ulang.');
            return res.status(401).json({ 
                message: 'Sesi Anda telah berakhir. Silakan login kembali.',
                expired: true 
            });
        } else if (error.name === 'JsonWebTokenError') {
            console.log('❌ Token tidak valid');
            return res.status(401).json({ 
                message: 'Token tidak valid.',
                invalid: true 
            });
        } else {
            console.error('❌ Otorisasi gagal:', error.message);
            return res.status(500).json({ message: 'Terjadi kesalahan server.' });
        }
    }
};

module.exports = { protect };