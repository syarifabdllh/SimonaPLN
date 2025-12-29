const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { protect } = require('./authMiddleware');
const { authorize } = require('./authorizeMiddleware');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3001;


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'syarifudin@student.undiksha.ac.id', // GANTI dengan email PLN
        pass: 'gnoz ntke gnnd jfqt'      // GANTI dengan App Password Gmail
    }
});
app.use(cors({
  origin: [
    'https://simona-pln.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// =================================================================
//                      SEMUA RUTE (API ENDPOINTS)
// =================================================================

// --- Rute Otentikasi ---
app.post('/api/register', async (req, res) => {
    try {
        console.log("--- Menerima permintaan registrasi baru ---");
        console.log("Data diterima dari form:", req.body);

        // Ambil data dari body, berikan nilai default jika tidak ada
        const { nama_lengkap, email, password, unit = 'N/A', jabatan } = req.body;

        // Validasi dasar
        if (!nama_lengkap || !email || !password || !jabatan) {
            return res.status(400).json({ message: "Data tidak lengkap." });
        }

        console.log("[1] Mencari duplikasi email...");
        const [userExists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (userExists.length > 0) {
            console.log("[HASIL] Email sudah terdaftar.");
            return res.status(400).json({ message: "Email sudah terdaftar." });
        }

        console.log("[2] Email tersedia. Membuat hash password...");
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        console.log("[3] Menyimpan user baru ke database...");
        const query = 'INSERT INTO users (nama_lengkap, email, password_hash, unit, jabatan) VALUES (?, ?, ?, ?, ?)';
        await pool.query(query, [nama_lengkap, email, password_hash, unit, jabatan]);
        
        console.log("--- Registrasi berhasil! ---");
        res.status(201).json({ message: "Registrasi berhasil!" });

    } catch (error) {
        // Ini adalah bagian terpenting untuk debugging
        console.error("!!! Terjadi error fatal saat registrasi:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server." });
    }
});



app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: "Email atau password salah." });
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Email atau password salah." });
        const payload = { id: user.id, email: user.email, jabatan: user.jabatan };
        const token = jwt.sign(payload, 'RAHASIA_NEGARA_JANGAN_DIBAGI', { expiresIn: '8h' });
        res.json({ message: "Login berhasil!", token: token });
    } catch (error) {
        console.error("Error saat login:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server." });
    }
});

app.get('/api/tasks/summary', protect, async (req, res) => {
    try {
        const userRole = req.user.jabatan;
        let count = 0;
        let query = '';
        let params = [];

        // Logika untuk menghitung tugas berdasarkan peran pengguna
        switch (userRole) {
            case 'Manager':
                query = "SELECT COUNT(*) as taskCount FROM pengajuan WHERE status = 'Menunggu Persetujuan Manager'";
                break;
            case 'Ren Eval':
                query = "SELECT COUNT(*) as taskCount FROM pengajuan WHERE status = 'Proses Evaluasi RAB' AND (jenis_pengadaan = 'SPK' OR jenis_pengadaan = 'PO')";
                break;
            case 'Pengadaan':
                query = "SELECT COUNT(*) as taskCount FROM pengajuan WHERE status = 'Proses Pengadaan'";
                break;
            case 'Tim Mutu': // Jaga-jaga jika ingin dikembalikan
                query = "SELECT COUNT(*) as taskCount FROM pengajuan WHERE status = 'Menunggu Pemeriksaan Mutu'";
                break;
            case 'KKU':
                query = "SELECT COUNT(*) as taskCount FROM pengajuan WHERE status = 'Menunggu Pembayaran KKU'";
                break;
            // 'User' tidak memiliki tugas persetujuan, jadi count tetap 0
            default:
                break;
        }

        if (query) {
            const [rows] = await pool.query(query);
            count = rows[0].taskCount;
        }

        res.json({ count: count });

    } catch (error) {
        console.error("Gagal mengambil ringkasan tugas:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/api/profile', protect, (req, res) => {
    res.json(req.user);
});

// --- Rute Data Master ---
// Endpoint untuk dropdown di form pengajuan
app.get('/api/master/anggaran', protect, async (req, res) => {
    try {
        const tahun = req.query.tahun; // Opsional
        
        let query = `
            SELECT id, kode_skko, nama_program, jenis_anggaran, pagu_anggaran, tahun_anggaran
            FROM anggaran
        `;
        
        let params = [];
        
        // Filter tahun HANYA jika ada parameter
        if (tahun) {
            query += ` WHERE tahun_anggaran = ?`;
            params.push(tahun);
        }
        
        query += ` ORDER BY tahun_anggaran DESC, jenis_anggaran, nama_program;`;
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error("Gagal mengambil master anggaran:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server." });
    }
});


// --- Rute Data Anggaran (Dashboard & Daftar) ---
app.get('/api/anggaran', protect, async (req, res) => {
    try {
        const tahun = req.query.tahun;
        
        let query = `
            SELECT a.kode_skko, a.nama_program, a.pagu_anggaran, a.jenis_anggaran, a.tahun_anggaran,
                   COALESCE(SUM(k.nilai_kontrak), 0) AS total_realisasi, 
                   (a.pagu_anggaran - COALESCE(SUM(k.nilai_kontrak), 0)) AS sisa_anggaran, 
                   (COALESCE(SUM(k.nilai_kontrak), 0) / a.pagu_anggaran * 100) AS persentase_penyerapan 
            FROM anggaran a 
            LEFT JOIN pengajuan p ON a.id = p.id_anggaran AND p.status NOT IN ('Draft', 'Ditolak Manager') 
            LEFT JOIN kontrak k ON p.id = k.id_pengajuan
        `;
        
        let params = [];
        
        if (tahun) {
            query += ` WHERE a.tahun_anggaran = ?`;
            params.push(tahun);
        }
        
        query += ` GROUP BY a.id, a.kode_skko, a.nama_program, a.pagu_anggaran, a.jenis_anggaran, a.tahun_anggaran
                   ORDER BY a.tahun_anggaran DESC, a.nama_program;`;
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error("Gagal mengambil data anggaran:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server." });
    }
});

// Endpoint years sudah benar, tetap pakai yang kamu punya!
app.get('/api/anggaran/years', protect, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DISTINCT tahun_anggaran FROM anggaran ORDER BY tahun_anggaran DESC'
        );
        const years = rows.map(row => row.tahun_anggaran);
        res.json(years);
    } catch (error) {
        console.error("Gagal mengambil daftar tahun:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server." });
    }
});

app.get('/api/dashboard/kontrak', protect, async (req, res) => {
    try {
        const tahun = req.query.tahun;
        console.log(`📊 Fetching kontrak data for year: ${tahun}`);
        
        // Query 1: Total Pagu
        let paguQuery = `SELECT COALESCE(SUM(pagu_anggaran), 0) AS totalPagu FROM anggaran`;
        let paguParams = [];
        if (tahun) {
            paguQuery += ` WHERE tahun_anggaran = ?`;
            paguParams.push(tahun);
        }
        const [paguResult] = await pool.query(paguQuery, paguParams);
        const totalPagu = parseFloat(paguResult[0].totalPagu || 0);
        
        // Query 2: Total Terkontrak (SEMUA kontrak)
        let terkontrakQuery = `
            SELECT COALESCE(SUM(k.nilai_kontrak), 0) AS terkontrak
            FROM kontrak k
            INNER JOIN pengajuan p ON k.id_pengajuan = p.id
            INNER JOIN anggaran a ON p.id_anggaran = a.id
            WHERE k.nilai_kontrak IS NOT NULL
        `;
        let terkontrakParams = [];
        if (tahun) {
            terkontrakQuery += ` AND a.tahun_anggaran = ?`;
            terkontrakParams.push(tahun);
        }
        const [terkontrakResult] = await pool.query(terkontrakQuery, terkontrakParams);
        const terkontrak = parseFloat(terkontrakResult[0].terkontrak || 0);
        
        // Query 3: On Progress (Berjalan + On Progress)
        let progressQuery = `
            SELECT COALESCE(SUM(k.nilai_kontrak), 0) AS onProgress
            FROM kontrak k
            INNER JOIN pengajuan p ON k.id_pengajuan = p.id
            INNER JOIN anggaran a ON p.id_anggaran = a.id
            WHERE k.status_kontrak IN ('Berjalan', 'On Progress')
              AND k.nilai_kontrak IS NOT NULL
        `;
        let progressParams = [];
        if (tahun) {
            progressQuery += ` AND a.tahun_anggaran = ?`;
            progressParams.push(tahun);
        }
        const [progressResult] = await pool.query(progressQuery, progressParams);
        const onProgress = parseFloat(progressResult[0].onProgress || 0);
        
        // Query 4: Selesai
        let selesaiQuery = `
            SELECT COALESCE(SUM(k.nilai_kontrak), 0) AS selesai
            FROM kontrak k
            INNER JOIN pengajuan p ON k.id_pengajuan = p.id
            INNER JOIN anggaran a ON p.id_anggaran = a.id
            WHERE k.status_kontrak = 'Selesai'
              AND k.nilai_kontrak IS NOT NULL
        `;
        let selesaiParams = [];
        if (tahun) {
            selesaiQuery += ` AND a.tahun_anggaran = ?`;
            selesaiParams.push(tahun);
        }
        const [selesaiResult] = await pool.query(selesaiQuery, selesaiParams);
        const selesai = parseFloat(selesaiResult[0].selesai || 0);
        
        // Log untuk debugging
        console.log(`📊 Data Kontrak Tahun ${tahun}:`, {
            totalPagu,
            terkontrak,
            onProgress,
            selesai
        });
        
        res.json({
            totalPagu,
            anggaran_terkontrak: {
                terkontrak,
                tersedia: Math.max(0, totalPagu - terkontrak)
            },
            kontrak_progress: {
                onProgress,
                selesai  // ✅ KEY "selesai"
            },
            anggaran_terserap: {
                terserap: selesai,
                tersisa: Math.max(0, totalPagu - selesai)
            }
        });
        
    } catch (error) {
        console.error("❌ Error mengambil data kontrak:", error);
        res.status(500).json({ 
            message: "Terjadi kesalahan di server.", 
            error: error.message 
        });
    }
});



app.post('/api/anggaran', protect, authorize('KKU', 'Admin'), async (req, res) => {
    const { 
        kode_skko, 
        nomor_prk, 
        nomor_wbs, 
        nomor_io,
        nama_program, 
        pagu_anggaran, 
        tahun_anggaran, 
        jenis_anggaran 
    } = req.body;

    // Validasi input
    if (!kode_skko || !nama_program || !pagu_anggaran || !tahun_anggaran || !jenis_anggaran || !nomor_prk) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    try {
        await pool.query(
            'INSERT INTO anggaran (kode_skko, nomor_prk, nomor_wbs, nomor_io, nama_program, pagu_anggaran, tahun_anggaran, jenis_anggaran) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [kode_skko, nomor_prk, nomor_wbs, nomor_io, nama_program, pagu_anggaran, tahun_anggaran, jenis_anggaran]
        );
        res.status(201).json({ message: 'Pagu anggaran berhasil dibuat!' });
    } catch (error) {
        console.error("Gagal membuat pagu anggaran:", error);
        res.status(500).json({ message: 'Terjadi kesalahan di server.' });
    }
});

// --- Rute Pengajuan (CRUD & Aksi) ---
app.post('/api/pengajuan', protect, authorize('User'), async (req, res) => {
    const { nama_kegiatan, nilai_rab, jenis_pengadaan, id_anggaran } = req.body;
    const user_id = req.user.id;

    if (!nama_kegiatan || !nilai_rab || !id_anggaran || !jenis_pengadaan) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    // Tentukan status awal berdasarkan jenis pengadaan
    let initialStatus = 'Menunggu Persetujuan Manager';

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO pengajuan (id_user_pembuat, id_anggaran, nama_kegiatan, nilai_rab, jenis_pengadaan, status) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, id_anggaran, nama_kegiatan, nilai_rab, jenis_pengadaan, initialStatus]
        );
        const newPengajuanId = result.insertId;

        await createLog(connection, newPengajuanId, initialStatus, user_id, `Pengajuan baru (${jenis_pengadaan}) dibuat.`);
        
        await connection.commit();
        res.status(201).json({ message: 'Pengajuan berhasil dibuat!', id: newPengajuanId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Gagal membuat pengajuan:", error);
        res.status(500).json({ message: 'Terjadi kesalahan di server.' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/pengajuan', protect, async (req, res) => {
    try {
        let queryParams = [];
        let query = `
            SELECT p.id, p.nama_kegiatan, p.nilai_rab, p.status, p.tanggal_dibuat,
                   u.nama_lengkap AS pembuat, a.nama_program AS sumber_dana, k.nomor_kontrak
            FROM pengajuan p
            JOIN users u ON p.id_user_pembuat = u.id
            JOIN anggaran a ON p.id_anggaran = a.id
            LEFT JOIN kontrak k ON p.id = k.id_pengajuan
        `;
        if (req.user.jabatan === 'User') {
            query += ' WHERE p.id_user_pembuat = ?';
            queryParams.push(req.user.id);
        }
        query += ' ORDER BY p.tanggal_dibuat DESC;';
        const [rows] = await pool.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error("Gagal mengambil daftar pengajuan:", error);
        res.status(500).json({ message: "Gagal mengambil daftar pengajuan." });
    }
});

app.get('/api/pengajuan/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const pengajuanQuery = `
            SELECT p.id, p.nama_kegiatan, p.nilai_rab, p.status, p.tanggal_dibuat, p.catatan_revisi, p.jenis_pengadaan, p.id_user_pembuat,
                   u.nama_lengkap AS pembuat, u.unit AS unit_pembuat,
                   a.nama_program AS sumber_dana, a.kode_skko,
                   k.nomor_kontrak, k.nama_vendor, k.nilai_kontrak, k.tanggal_mulai, k.tanggal_selesai
            FROM pengajuan p
            JOIN users u ON p.id_user_pembuat = u.id
            JOIN anggaran a ON p.id_anggaran = a.id
            LEFT JOIN kontrak k ON p.id = k.id_pengajuan
            WHERE p.id = ?;
        `;
        const [pengajuanRows] = await pool.query(pengajuanQuery, [id]);

        if (pengajuanRows.length === 0) {
            return res.status(404).json({ message: 'Pengajuan tidak ditemukan.' });
        }

        const logQuery = `
            SELECT l.status_baru, l.waktu_perubahan, l.catatan, u.nama_lengkap as diubah_oleh
            FROM log_status l
            JOIN users u ON l.diubah_oleh_user_id = u.id
            WHERE l.id_pengajuan = ?
            ORDER BY l.waktu_perubahan ASC;
        `;
        const [logRows] = await pool.query(logQuery, [id]);

        const responseData = { detail: pengajuanRows[0], history: logRows };
        res.json(responseData);
    } catch (error) {
        console.error(`Gagal mengambil detail pengajuan ID ${req.params.id}:`, error);
        res.status(500).json({ message: "Terjadi kesalahan di server." });
    }
});


// Fungsi bantuan untuk mencatat log
const createLog = async (connection, id_pengajuan, status_baru, user_id, catatan = '') => {
    const [lastLog] = await connection.query('SELECT status_baru FROM log_status WHERE id_pengajuan = ? ORDER BY waktu_perubahan DESC LIMIT 1', [id_pengajuan]);
    const status_sebelumnya = lastLog.length > 0 ? lastLog[0].status_baru : 'Draft';
    await connection.query('INSERT INTO log_status (id_pengajuan, status_sebelumnya, status_baru, diubah_oleh_user_id, catatan) VALUES (?, ?, ?, ?, ?)',
        [id_pengajuan, status_sebelumnya, status_baru, user_id, catatan]);
};

app.put('/api/pengajuan/:id/approval', protect, authorize('Manager'), async (req, res) => {
    const { id } = req.params;
    const { action, catatan } = req.body;
    const user_id = req.user.id;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (action === 'reject') {
            await connection.query('UPDATE pengajuan SET status = ?, catatan_revisi = ? WHERE id = ?', ['Ditolak Manager', catatan, id]);
            await createLog(connection, id, 'Ditolak Manager', user_id, catatan);
            await connection.commit();
            return res.json({ message: 'Pengajuan berhasil ditolak.' });
        }

        // Jika disetujui, kita perlu tahu jenis pengadaannya
        const [pengajuanRows] = await connection.query('SELECT jenis_pengadaan FROM pengajuan WHERE id = ?', [id]);
        if (pengajuanRows.length === 0) {
            throw new Error('Pengajuan tidak ditemukan.');
        }
        
        const jenisPengadaan = pengajuanRows[0].jenis_pengadaan;
        let newStatus = '';

        // --- LOGIKA PERCABANGAN BERDASARKAN JENIS PENGADAAN ---
        if (jenisPengadaan === 'SPK' || jenisPengadaan === 'PO') {
            // Alur panjang: Lanjutkan ke Ren Eval, lalu ke Pengadaan
            newStatus = 'Proses Evaluasi RAB'; 
        } else if (jenisPengadaan === 'Non-PO' || jenisPengadaan === 'Petty Cash') {
            // Alur pendek: Langsung lompat ke KKU, melewati Ren Eval dan Pengadaan
            newStatus = 'Menunggu Pembayaran KKU'; 
        } else {
            // Fallback jika ada jenis yang tidak dikenal
            throw new Error('Jenis pengadaan tidak valid.');
        }

        await connection.query('UPDATE pengajuan SET status = ? WHERE id = ?', [newStatus, id]);
        await createLog(connection, id, newStatus, user_id, 'Disetujui oleh Manager.');
        
        await connection.commit();
        res.json({ message: 'Pengajuan berhasil disetujui dan dilanjutkan ke tahap berikutnya.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error saat approval:", error);
        res.status(500).json({ message: 'Server error saat memproses persetujuan.' });
    } finally {
        if (connection) connection.release();
    }
});

// ENDPOINT: Ren Eval menyelesaikan evaluasi RAB
app.put('/api/pengajuan/:id/evaluate', protect, authorize('Ren Eval'), async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const newStatus = 'Proses Pengadaan';
        await connection.query('UPDATE pengajuan SET status = ? WHERE id = ?', [newStatus, id]);
        await createLog(connection, id, newStatus, user_id, 'Evaluasi RAB Selesai oleh Ren Eval.');
        
        await connection.commit();
        res.json({ message: 'Evaluasi RAB berhasil diselesaikan.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error saat evaluate:", error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
});

// ENDPOINT: Ren Eval mengembalikan untuk revisi evaluasi
app.put('/api/pengajuan/:id/revise-evaluation', protect, authorize('Ren Eval'), async (req, res) => {
    const { id } = req.params;
    const { catatan } = req.body;
    const user_id = req.user.id;

    if (!catatan) {
        return res.status(400).json({ message: 'Catatan revisi wajib diisi.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const newStatus = 'Revisi dari Evaluasi';
        await connection.query('UPDATE pengajuan SET status = ?, catatan_revisi = ? WHERE id = ?', [newStatus, catatan, id]);
        await createLog(connection, id, newStatus, user_id, `Dikembalikan untuk revisi evaluasi: ${catatan}`);

        await connection.commit();
        res.json({ message: 'Pengajuan berhasil dikembalikan untuk revisi evaluasi.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error saat revise evaluation:", error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
});

// ENDPOINT: User konfirmasi pekerjaan selesai (untuk SPK/PO)
// PERUBAHAN: Langsung ke KKU, melewati Tim Mutu
app.put('/api/pengajuan/:id/complete-work', protect, authorize('User'), async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cek apakah user adalah pembuat pengajuan
        const [pengajuanRows] = await connection.query('SELECT id_user_pembuat FROM pengajuan WHERE id = ?', [id]);
        if (pengajuanRows.length === 0 || pengajuanRows[0].id_user_pembuat !== user_id) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses untuk aksi ini.' });
        }

        // PERUBAHAN: Langsung ke KKU, tanpa melewati Tim Mutu
        const newStatus = 'Menunggu Pembayaran KKU';
        await connection.query('UPDATE pengajuan SET status = ? WHERE id = ?', [newStatus, id]);
        await createLog(connection, id, newStatus, user_id, 'Pekerjaan dikonfirmasi selesai oleh User, langsung ke pembayaran.');

        await connection.commit();
        res.json({ message: 'Pekerjaan berhasil dikonfirmasi selesai dan diteruskan ke KKU.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error saat complete work:", error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/pengajuan/:id/pay', protect, authorize('KKU'), async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Ambil detail pengajuan untuk mengetahui jenis dan nilai RAB-nya
        const [pengajuanRows] = await connection.query('SELECT jenis_pengadaan, nilai_rab FROM pengajuan WHERE id = ?', [id]);
        if (pengajuanRows.length === 0) {
            throw new Error('Pengajuan tidak ditemukan.');
        }
        const { jenis_pengadaan, nilai_rab } = pengajuanRows[0];

        // 2. Jika ini adalah Non-PO atau Petty Cash, buat entri kontrak secara otomatis
        if (jenis_pengadaan === 'Non-PO' || jenis_pengadaan === 'Petty Cash') {
            // Cek dulu apakah sudah ada entri kontrak (untuk mencegah duplikasi)
            const [existingContract] = await connection.query('SELECT id FROM kontrak WHERE id_pengajuan = ?', [id]);
            if (existingContract.length === 0) {
                // Buat "pseudo-kontrak" menggunakan nilai RAB sebagai nilai realisasi
                await connection.query(
                    'INSERT INTO kontrak (id_pengajuan, nomor_kontrak, nama_vendor, nilai_kontrak, status_kontrak) VALUES (?, ?, ?, ?, ?)',
                    [id, `KWITANSI-${id}`, 'User/Petty Cash', nilai_rab, 'Selesai']
                );
            }
        }

        // 3. Update status pengajuan menjadi 'Selesai Dibayar'
        const newStatus = 'Selesai Dibayar';
        await connection.query('UPDATE pengajuan SET status = ? WHERE id = ?', [newStatus, id]);

        // 4. ✅ OTOMATIS UPDATE STATUS KONTRAK JADI "SELESAI"
        const [kontrakUpdate] = await connection.query(
            `UPDATE kontrak 
             SET status_kontrak = 'Selesai'
             WHERE id_pengajuan = ? AND (status_kontrak IS NULL OR status_kontrak != 'Selesai')`,
            [id]
        );

        // Log untuk debugging
        console.log(`✅ Pembayaran pengajuan #${id} - Status kontrak diupdate: ${kontrakUpdate.affectedRows} row(s)`);

        // 5. Catat log
        await createLog(connection, id, newStatus, user_id, 'Pembayaran Lunas diproses oleh KKU. Kontrak diselesaikan.');

        await connection.commit();
        res.json({ 
            message: 'Pembayaran berhasil diproses dan realisasi tercatat.',
            kontrak_updated: kontrakUpdate.affectedRows 
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error saat proses pembayaran:", error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
});


// ENDPOINT: User menginput detail Non-PO / Petty Cash
app.put('/api/pengajuan/:id/verify-user', protect, authorize('User'), async (req, res) => {
    const { id } = req.params;
    const { nomor_dokumen, nilai_realisasi } = req.body;
    const user_id = req.user.id;

    if (!nomor_dokumen || !nilai_realisasi) {
        return res.status(400).json({ message: 'Nomor dokumen dan nilai realisasi wajib diisi.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cek apakah user adalah pembuat pengajuan
        const [pengajuanRows] = await connection.query('SELECT id_user_pembuat FROM pengajuan WHERE id = ?', [id]);
        if (pengajuanRows.length === 0 || pengajuanRows[0].id_user_pembuat !== user_id) {
            return res.status(403).json({ message: 'Anda tidak memiliki akses untuk aksi ini.' });
        }

        // Update pengajuan dengan nomor dokumen
        await connection.query('UPDATE pengajuan SET nomor_dokumen = ? WHERE id = ?', [nomor_dokumen, id]);

        // Buat entri "pseudo-kontrak" untuk standarisasi laporan
        const [existingContract] = await connection.query('SELECT id FROM kontrak WHERE id_pengajuan = ?', [id]);
        if (existingContract.length === 0) {
            await connection.query(
                'INSERT INTO kontrak (id_pengajuan, nomor_kontrak, nama_vendor, nilai_kontrak) VALUES (?, ?, ?, ?)',
                [id, nomor_dokumen, 'User/Petty Cash', nilai_realisasi]
            );
        }

        const newStatus = 'Selesai Dibayar'; // Langsung selesai setelah verifikasi user
        await connection.query('UPDATE pengajuan SET status = ? WHERE id = ?', [newStatus, id]);
        await createLog(connection, id, newStatus, user_id, `Verifikasi dokumen ${nomor_dokumen} oleh User.`);

        await connection.commit();
        res.json({ message: 'Verifikasi berhasil disimpan.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error saat verifikasi user:", error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
    
});


// ============================================
// ENDPOINT 1: Request Reset Password Link
// ============================================
// ============================================
// BAGIAN RESET PASSWORD - LETAKKAN SETELAH ENDPOINT KONTRAK
// ============================================

// ENDPOINT 1: Request Reset Password
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        console.log('=== FORGOT PASSWORD REQUEST ===');
        console.log('Email requested:', email);

        if (!email) {
            return res.status(400).json({ message: 'Email harus diisi.' });
        }

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Format email tidak valid.' });
        }

        // Cek apakah email terdaftar
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        console.log('Users found:', users.length);

        if (users.length === 0) {
            console.log('⚠️ Email not registered');
            // Tetap return success untuk security
            return res.json({ 
                message: 'Jika email terdaftar, link reset password telah dikirim ke email Anda.' 
            });
        }

        const user = users[0];
        console.log('User found:', { id: user.id, email: user.email, nama_lengkap: user.nama_lengkap });

        // Generate token unik
        const token = crypto.randomBytes(20).toString('hex');
        console.log('Token generated:', token);
        console.log('Token length:', token.length);
        
        // Set waktu kadaluwarsa (1 jam)
        const expires = Date.now() + 3600000;
        console.log('Token expires at:', new Date(expires).toLocaleString('id-ID'));

        // Simpan token ke database
        await pool.query(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
            [token, expires, email]
        );

        console.log('✅ Token saved to database');

        // Verifikasi penyimpanan
        const [verify] = await pool.query(
            'SELECT reset_password_token, reset_password_expires FROM users WHERE email = ?', 
            [email]
        );
        console.log('Verification:', {
            token_match: verify[0].reset_password_token === token ? '✅' : '❌',
            expires_match: verify[0].reset_password_expires == expires ? '✅' : '❌'
        });

        // Buat link reset
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
        console.log('Reset link:', resetLink);

        // Kirim email
        const mailOptions = {
            from: '"PLN Monitoring Anggaran" <noreply@pln.co.id>',
            to: email,
            subject: 'Reset Password - PLN Monitoring Anggaran',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #0066cc; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">PLN</h1>
                        <p style="color: white; margin: 5px 0;">Monitoring Anggaran</p>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
                        <h2 style="color: #333;">Reset Password Anda</h2>
                        <p style="color: #555; line-height: 1.6;">
                            Halo <strong>${user.nama_lengkap || 'User'}</strong>,
                        </p>
                        <p style="color: #555; line-height: 1.6;">
                            Kami menerima permintaan untuk mereset password akun Anda di sistem 
                            <strong>Monitoring Anggaran PLN</strong>.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background-color: #0066cc; color: white; padding: 14px 40px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;
                                      font-weight: bold; font-size: 16px;">
                                Reset Password Saya
                            </a>
                        </div>
                        
                        <p style="color: #555; line-height: 1.6;">
                            Atau salin link berikut:
                        </p>
                        <p style="background-color: #fff; padding: 15px; border: 1px solid #ddd; 
                                  word-break: break-all; font-size: 14px; color: #0066cc;">
                            ${resetLink}
                        </p>
                        
                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; 
                                    padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #856404;">
                                <strong>⚠️ Penting:</strong> Link ini kedaluwarsa dalam <strong>1 jam</strong>.
                            </p>
                        </div>
                        
                        <p style="color: #555; line-height: 1.6;">
                            Jika Anda tidak meminta reset password, abaikan email ini.
                        </p>
                    </div>
                    
                    <div style="background-color: #f1f1f1; padding: 20px; text-align: center; 
                                border: 1px solid #ddd; border-top: none;">
                        <p style="color: #666; font-size: 12px; margin: 5px 0;">
                            © ${new Date().getFullYear()} PT PLN (Persero). All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        try {
            console.log('📧 Sending email...');
            await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully to:', email);
        } catch (emailError) {
            console.error('❌ Email error:', emailError.message);
        }

        console.log('=== END FORGOT PASSWORD ===\n');

        res.json({ 
            message: 'Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.' 
        });

    } catch (error) {
        console.error("❌ Error in forgot-password:", error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
});

// ENDPOINT 2: Validasi Token (DENGAN DEBUG)
app.get('/api/validate-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        console.log('=== VALIDATE TOKEN ===');
        console.log('Token received:', token);
        console.log('Token length:', token.length);
        console.log('Current timestamp:', Date.now());
        console.log('Current time:', new Date().toLocaleString('id-ID'));

        if (!token) {
            console.log('❌ No token provided');
            return res.status(400).json({ message: 'Token tidak ditemukan.' });
        }

        // Query database
        const query = 'SELECT id, email, nama_lengkap, reset_password_token, reset_password_expires FROM users WHERE reset_password_token = ?';
        const [users] = await pool.query(query, [token]);

        console.log('Users found with token:', users.length);

        if (users.length === 0) {
            console.log('❌ Token not found in database');
            
            // Debug: Tampilkan semua token yang ada
            const [allTokens] = await pool.query(
                'SELECT id, email, reset_password_token, reset_password_expires FROM users WHERE reset_password_token IS NOT NULL LIMIT 5'
            );
            console.log('Active tokens in DB:', allTokens.map(u => ({
                email: u.email,
                token_prefix: u.reset_password_token?.substring(0, 10) + '...',
                expires: new Date(parseInt(u.reset_password_expires)).toLocaleString('id-ID')
            })));

            return res.status(400).json({ 
                message: 'Token tidak valid atau sudah kedaluwarsa. Silakan minta link reset baru.' 
            });
        }

        const user = users[0];
        const currentTime = Date.now();
        const isExpired = user.reset_password_expires <= currentTime;
        
        console.log('Token details:', {
            user_email: user.email,
            token_match: user.reset_password_token === token ? '✅ Match' : '❌ Mismatch',
            expires_at: new Date(parseInt(user.reset_password_expires)).toLocaleString('id-ID'),
            current_time: new Date(currentTime).toLocaleString('id-ID'),
            is_expired: isExpired ? '❌ Expired' : '✅ Valid',
            minutes_remaining: ((user.reset_password_expires - currentTime) / 1000 / 60).toFixed(2)
        });

        if (isExpired) {
            console.log('❌ Token expired');
            return res.status(400).json({ 
                message: 'Token sudah kedaluwarsa. Silakan minta link reset baru.' 
            });
        }

        console.log('✅ Token is valid');
        console.log('=== END VALIDATE TOKEN ===\n');

        res.json({ 
            message: 'Token valid.',
            user: {
                email: user.email,
                nama_lengkap: user.nama_lengkap
            }
        });

    } catch (error) {
        console.error("❌ Error validating token:", error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
});

// ENDPOINT 3: Reset Password
app.put('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        console.log('=== RESET PASSWORD ===');
        console.log('Token received:', token);

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token dan password baru wajib diisi.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password minimal 6 karakter.' });
        }

        // Cari user dengan token valid
        const query = 'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > ?';
        const [users] = await pool.query(query, [token, Date.now()]);

        if (users.length === 0) {
            console.log('❌ Token invalid or expired');
            return res.status(400).json({ 
                message: 'Token tidak valid atau sudah kedaluwarsa.' 
            });
        }

        const user = users[0];
        console.log('User found:', user.email);

        // Hash password baru
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        // Update password dan hapus token
        await pool.query(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE reset_password_token = ?',
            [password_hash, token]
        );

        console.log('✅ Password updated successfully');

        // Kirim email notifikasi
        const mailOptions = {
            from: '"PLN Monitoring Anggaran" <noreply@pln.co.id>',
            to: user.email,
            subject: 'Password Berhasil Diubah',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #28a745; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">✓ Password Berhasil Diubah</h1>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
                        <p style="color: #555; line-height: 1.6;">
                            Halo <strong>${user.nama_lengkap}</strong>,
                        </p>
                        <p style="color: #555; line-height: 1.6;">
                            Password akun Anda telah berhasil diubah pada <strong>${new Date().toLocaleString('id-ID')}</strong>.
                        </p>
                        
                        <div style="background-color: #f8d7da; border-left: 4px solid #721c24; 
                                    padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #721c24;">
                                <strong>⚠️ Perhatian:</strong> Jika Anda TIDAK melakukan perubahan ini, 
                                segera hubungi administrator!
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('✅ Notification email sent');
        } catch (emailError) {
            console.error('❌ Notification email failed:', emailError.message);
        }

        console.log('=== END RESET PASSWORD ===\n');

        res.json({ message: 'Password berhasil diubah! Anda akan diarahkan ke halaman login.' });

    } catch (error) {
        console.error("❌ Error resetting password:", error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
});

// ENDPOINT: Validasi Token Reset (DENGAN DEBUG LOGGING)
app.get('/api/validate-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // DEBUG: Log token yang diterima
        console.log('=== DEBUG VALIDATE TOKEN ===');
        console.log('Token diterima:', token);
        console.log('Panjang token:', token.length);
        console.log('Waktu sekarang:', Date.now());
        console.log('Waktu sekarang (readable):', new Date(Date.now()).toLocaleString('id-ID'));

        if (!token) {
            console.log('❌ Token kosong!');
            return res.status(400).json({ message: 'Token tidak ditemukan.' });
        }

        // Query dengan logging
        const query = 'SELECT id, email, username, reset_password_token, reset_password_expires FROM users WHERE reset_password_token = ?';
        console.log('Query SQL:', query);
        console.log('Parameter:', [token]);

        const [users] = await pool.query(query, [token]);

        console.log('Hasil query - Jumlah user ditemukan:', users.length);

        if (users.length > 0) {
            const user = users[0];
            console.log('User ditemukan:', {
                id: user.id,
                email: user.email,
                username: user.username,
                token_db: user.reset_password_token,
                token_match: user.reset_password_token === token,
                expires: user.reset_password_expires,
                expires_readable: new Date(parseInt(user.reset_password_expires)).toLocaleString('id-ID'),
                is_expired: user.reset_password_expires <= Date.now(),
                time_diff: (user.reset_password_expires - Date.now()) / 1000 / 60 + ' menit'
            });

            // Cek apakah token sudah kedaluwarsa
            if (user.reset_password_expires <= Date.now()) {
                console.log('❌ Token sudah kedaluwarsa!');
                return res.status(400).json({ 
                    message: 'Token sudah kedaluwarsa. Silakan minta link reset baru.' 
                });
            }

            console.log('✅ Token valid!');
            return res.json({ 
                message: 'Token valid.',
                user: {
                    email: user.email,
                    username: user.username
                }
            });
        } else {
            console.log('❌ Tidak ada user dengan token ini');
            
            // DEBUG: Cek semua token yang ada di database
            const [allTokens] = await pool.query(
                'SELECT id, email, reset_password_token, reset_password_expires FROM users WHERE reset_password_token IS NOT NULL'
            );
            console.log('Token yang ada di database:', allTokens.map(u => ({
                email: u.email,
                token: u.reset_password_token,
                expires: new Date(parseInt(u.reset_password_expires)).toLocaleString('id-ID')
            })));
        }

        res.status(400).json({ 
            message: 'Token tidak valid atau sudah kedaluwarsa. Silakan minta link reset baru.' 
        });

    } catch (error) {
        console.error("❌ Error validating token:", error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
});

// =================================================================
//      ⬇️⬇️⬇️ API ENDPOINT UNTUK KONTRAK ⬇️⬇️⬇️
// =================================================================

// Endpoint: Membuat kontrak baru untuk sebuah pengajuan
app.post('/api/kontrak', protect, authorize('Pengadaan', 'Admin'), async (req, res) => {
    const { 
        id_pengajuan, 
        nomor_kontrak, 
        nama_vendor, 
        nilai_kontrak, 
        tanggal_mulai, 
        tanggal_selesai 
    } = req.body;
    const user_id = req.user.id;

    if (!id_pengajuan || !nomor_kontrak || !nama_vendor || !nilai_kontrak) {
        return res.status(400).json({ message: 'Informasi kontrak tidak lengkap.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Cek apakah pengajuan sudah memiliki kontrak
        const [existingContract] = await connection.query('SELECT id FROM kontrak WHERE id_pengajuan = ?', [id_pengajuan]);
        if (existingContract.length > 0) {
            return res.status(400).json({ message: 'Pengajuan ini sudah memiliki kontrak.' });
        }

        // 2. Simpan data kontrak baru
        await connection.query(
            'INSERT INTO kontrak (id_pengajuan, nomor_kontrak, nama_vendor, nilai_kontrak, tanggal_mulai, tanggal_selesai) VALUES (?, ?, ?, ?, ?, ?)',
            [id_pengajuan, nomor_kontrak, nama_vendor, nilai_kontrak, tanggal_mulai, tanggal_selesai]
        );
        
        // 3. Update status pengajuan menjadi 'Pelaksanaan Pekerjaan'
        const newStatus = 'Pelaksanaan Pekerjaan';
        await connection.query('UPDATE pengajuan SET status = ? WHERE id = ?', [newStatus, id_pengajuan]);

        // 4. Catat log perubahan status
        await createLog(connection, id_pengajuan, newStatus, user_id, `Kontrak ${nomor_kontrak} dibuat.`);

        await connection.commit();
        res.status(201).json({ message: 'Kontrak berhasil dibuat!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Gagal membuat kontrak:", error);
        res.status(500).json({ message: 'Terjadi kesalahan di server.' });
    } finally {
        if (connection) connection.release();
    }
});



// =================================================================
//      ⬇️⬇️⬇️ API ENDPOINT UNTUK REVISI PENGADAAN ⬇️⬇️⬇️
// =================================================================

// Endpoint: Pengadaan mengembalikan pengajuan untuk direvisi
app.put('/api/pengajuan/:id/revise-pengadaan', protect, authorize('Pengadaan', 'Admin'), async (req, res) => {
    const { id } = req.params;
    const { catatan } = req.body;
    const user_id = req.user.id;

    if (!catatan) {
        return res.status(400).json({ message: 'Catatan revisi wajib diisi.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const newStatus = 'Revisi dari Pengadaan';
        
        // Update status dan tambahkan catatan revisi
        await connection.query(
            'UPDATE pengajuan SET status = ?, catatan_revisi = ? WHERE id = ?', 
            [newStatus, catatan, id]
        );

        // Catat log
        await createLog(connection, id, newStatus, user_id, `Dikembalikan untuk revisi: ${catatan}`);

        await connection.commit();
        res.json({ message: 'Pengajuan berhasil dikembalikan untuk direvisi.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error saat proses revisi pengadaan:", error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend hidup' });
});


app.listen(PORT, () => {
  console.log(`🚀 SIMONA BACKEND RUNNING ON PORT ${PORT}`);
});
