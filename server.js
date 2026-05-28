// ============================================
// TKA Portal Backend Server
// Solusi: Menyimpan data validasi ke cloud
// ============================================

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const dataFilePath = path.join(__dirname, 'validasi-data.json');

// ✅ API 1: Simpan/Update validasi siswa
app.post('/api/validasi', async (req, res) => {
    try {
        const { nisn, status, nama, ttl, ortu } = req.body;

        if (!nisn || !status) {
            return res.status(400).json({ error: 'NISN dan status harus diisi' });
        }

        // Baca file validasi
        let data = [];
        try {
            const fileContent = await fs.readFile(dataFilePath, 'utf8');
            data = JSON.parse(fileContent).validations || [];
        } catch (e) {
            console.log('File tidak ada, membuat baru...');
        }

        // Cari dan update atau tambah record
        const existingIndex = data.findIndex(v => v.nisn === nisn);
        const timestamp = new Date().toISOString();

        if (existingIndex >= 0) {
            // Update existing
            data[existingIndex] = {
                nisn,
                nama: nama || data[existingIndex].nama,
                ttl: ttl || data[existingIndex].ttl,
                ortu: ortu || data[existingIndex].ortu,
                status,
                lastUpdated: timestamp
            };
        } else {
            // Tambah baru
            data.push({
                nisn,
                nama: nama || '-',
                ttl: ttl || '-',
                ortu: ortu || '-',
                status,
                createdAt: timestamp,
                lastUpdated: timestamp
            });
        }

        // Simpan ke file
        await fs.writeFile(dataFilePath, JSON.stringify({ validations: data }, null, 2));

        res.json({
            success: true,
            message: 'Data validasi berhasil disimpan',
            data: data[existingIndex >= 0 ? existingIndex : data.length - 1]
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ API 2: Ambil status validasi satu siswa
app.get('/api/validasi/:nisn', async (req, res) => {
    try {
        const nisn = req.params.nisn;
        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        const data = JSON.parse(fileContent).validations || [];
        const validation = data.find(v => v.nisn === nisn);

        if (validation) {
            res.json(validation);
        } else {
            res.json({ nisn, status: 'Belum Cek' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ API 3: Ambil semua validasi (untuk admin)
app.get('/api/validasi-all', async (req, res) => {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        const data = JSON.parse(fileContent).validations || [];
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ API 4: Hapus validasi (admin only)
app.delete('/api/validasi/:nisn', async (req, res) => {
    try {
        const nisn = req.params.nisn;
        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        let data = JSON.parse(fileContent).validations || [];

        data = data.filter(v => v.nisn !== nisn);

        await fs.writeFile(dataFilePath, JSON.stringify({ validations: data }, null, 2));

        res.json({ success: true, message: 'Data validasi dihapus' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server running', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ TKA Server berjalan di http://localhost:${PORT}`);
});
