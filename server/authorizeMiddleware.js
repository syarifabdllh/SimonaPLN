// File: server/authorizeMiddleware.js
const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user dibuat oleh middleware 'protect' sebelumnya
        if (!req.user || !roles.includes(req.user.jabatan)) {
            // 403 Forbidden - Tahu siapa kamu, tapi kamu tidak boleh akses
            return res.status(403).json({ message: 'Akses ditolak. Peran tidak diizinkan.' });
        }
        next(); // Peran cocok, izinkan akses
    };
};

module.exports = { authorize };