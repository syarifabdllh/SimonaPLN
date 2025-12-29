const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 28882, // Port default Aiven
  ssl: {
    rejectUnauthorized: false // Wajib ditambahkan untuk Aiven
  }
});

db.connect((err) => {
  if (err) {
    console.error('Gagal koneksi ke Aiven:', err.message);
    return;
  }
  console.log('Terhubung ke database Aiven MySQL!');
});

module.exports = db;