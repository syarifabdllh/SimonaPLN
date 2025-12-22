// File: server/emailService.js
const nodemailer = require('nodemailer');

// Validasi environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ ERROR: EMAIL_USER atau EMAIL_PASS tidak diset di .env file!');
    console.error('Silakan buat file .env dengan konfigurasi:');
    console.error('EMAIL_USER=your-email@gmail.com');
    console.error('EMAIL_PASS=your-app-password');
}

// Konfigurasi transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Tambahan konfigurasi untuk debugging
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
});

// Verifikasi koneksi email saat startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Email service error:', error.message);
        console.error('Pastikan:');
        console.error('1. EMAIL_USER dan EMAIL_PASS sudah diset di .env');
        console.error('2. Menggunakan App Password (bukan password biasa)');
        console.error('3. Less Secure Apps atau 2FA sudah dikonfigurasi');
    } else {
        console.log('✅ Email service ready to send messages');
        console.log('📧 Email from:', process.env.EMAIL_USER);
    }
});

/**
 * Kirim email reset password
 * @param {string} to - Email tujuan
 * @param {string} token - Reset token
 */
const sendResetPasswordEmail = async (to, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;

    const mailOptions = {
        from: `"SIMONA PLN" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Reset Password Akun SIMONA Anda',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #005A9C; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">SIMONA PLN</h1>
                    <p style="color: white; margin: 5px 0;">Sistem Monitoring Anggaran</p>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
                    <h2 style="color: #333;">Reset Password Anda</h2>
                    <p style="color: #555; line-height: 1.6;">
                        Anda menerima email ini karena ada permintaan untuk mereset password akun SIMONA Anda.
                    </p>
                    <p style="color: #555; line-height: 1.6;">
                        Silakan klik tombol di bawah ini untuk melanjutkan:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #005A9C; color: white; padding: 14px 40px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-weight: bold; font-size: 16px;">
                            Reset Password Saya
                        </a>
                    </div>
                    
                    <p style="color: #555; line-height: 1.6;">
                        Atau salin dan paste link berikut ke browser Anda:
                    </p>
                    <p style="background-color: #fff; padding: 15px; border: 1px solid #ddd; 
                              word-break: break-all; font-size: 14px; color: #005A9C;">
                        ${resetUrl}
                    </p>
                    
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; 
                                padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404;">
                            <strong>⚠️ Penting:</strong> Link ini akan kedaluwarsa dalam <strong>1 jam</strong>.
                        </p>
                    </div>
                    
                    <p style="color: #555; line-height: 1.6;">
                        Jika Anda tidak melakukan permintaan ini, abaikan email ini dan password Anda tidak akan berubah.
                    </p>
                </div>
                
                <div style="background-color: #f1f1f1; padding: 20px; text-align: center; 
                            border: 1px solid #ddd; border-top: none;">
                    <p style="color: #666; font-size: 12px; margin: 5px 0;">
                        Email ini dikirim secara otomatis, mohon tidak membalas email ini.
                    </p>
                    <p style="color: #666; font-size: 12px; margin: 5px 0;">
                        © ${new Date().getFullYear()} PT PLN (Persero). All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email reset password berhasil dikirim ke: ${to}`);
        console.log('Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error(`❌ Gagal mengirim email ke ${to}:`, error.message);
        
        // Log error detail untuk debugging
        if (error.code === 'EAUTH') {
            console.error('Authentication failed. Pastikan EMAIL_USER dan EMAIL_PASS benar.');
        } else if (error.code === 'ESOCKET') {
            console.error('Network error. Cek koneksi internet.');
        }
        
        throw new Error('Gagal mengirim email reset password.');
    }
};

/**
 * Kirim email notifikasi password berhasil diubah
 * @param {string} to - Email tujuan
 * @param {string} username - Nama user
 */
const sendPasswordChangedEmail = async (to, username) => {
    const mailOptions = {
        from: `"SIMONA PLN" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Password Anda Telah Diubah - SIMONA PLN',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #28a745; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">✓ Password Berhasil Diubah</h1>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
                    <p style="color: #555; line-height: 1.6;">
                        Halo <strong>${username}</strong>,
                    </p>
                    <p style="color: #555; line-height: 1.6;">
                        Password akun SIMONA Anda telah berhasil diubah pada <strong>${new Date().toLocaleString('id-ID')}</strong>.
                    </p>
                    
                    <div style="background-color: #f8d7da; border-left: 4px solid #721c24; 
                                padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #721c24;">
                            <strong>⚠️ Perhatian:</strong> Jika Anda <strong>TIDAK</strong> 
                            melakukan perubahan ini, segera hubungi administrator sistem!
                        </p>
                    </div>
                </div>
                
                <div style="background-color: #f1f1f1; padding: 20px; text-align: center;">
                    <p style="color: #666; font-size: 12px; margin: 5px 0;">
                        © ${new Date().getFullYear()} PT PLN (Persero). All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email notifikasi password berhasil dikirim ke: ${to}`);
    } catch (error) {
        console.error(`❌ Gagal mengirim email notifikasi ke ${to}:`, error.message);
        // Tidak throw error karena ini hanya notifikasi
    }
};

module.exports = { 
    sendResetPasswordEmail,
    sendPasswordChangedEmail 
};