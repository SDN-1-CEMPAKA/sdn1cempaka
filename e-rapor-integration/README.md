# 📚 Panduan Integrasi E-Rapor dengan Portal Sekolah

## Daftar Isi
1. [Gambaran Umum](#gambaran-umum)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Setup Awal](#setup-awal)
4. [Implementasi Tahap 1](#implementasi-tahap-1)
5. [Implementasi Tahap 2](#implementasi-tahap-2)
6. [Troubleshooting](#troubleshooting)

---

## Gambaran Umum

Sistem ini mengintegrasikan E-Rapor Kementerian Pendidikan dengan portal sekolah SDN 1 CEMPAKA untuk:
- ✅ Sinkronisasi data rapor otomatis
- ✅ Notifikasi kepada siswa/orang tua
- ✅ Download rapor digital mandiri
- ✅ Tidak perlu server (serverless)
- ✅ Skalabel sesuai pertumbuhan

### Keunggulan Solusi Ini
| Aspek | Keuntungan |
|-------|-----------|
| **Biaya** | Gratis (GitHub Pages + Firebase free tier) |
| **Maintenance** | Minimal, otomatis ter-update |
| **Keamanan** | Terenkripsi, compliance dengan standar |
| **Skalabilitas** | Tumbuh seiring kebutuhan |
| **Fleksibilitas** | Mudah dikustomisasi |

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    E-Rapor Kementerian                      │
│              (Data source eksternal - API)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Firebase/Supabase (Middleware)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Realtime DB │  │   Storage    │  │   Functions  │      │
│  │  (Sinkronisasi)│ │ (PDF/File)   │  │ (Trigger)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ GitHub Pages     │      │ Mobile/Desktop   │
│ (Portal Web)     │      │ (Aplikasi Client)│
│                  │      │                  │
│ - Dashboard      │      │ - Notifikasi     │
│ - Download       │      │ - Push Alert     │
│ - Riwayat        │      │ - Reminder       │
└──────────────────┘      └──────────────────┘
```

---

## Setup Awal

### Prerequisite
- ✅ GitHub Account (SDN-1-CEMPAKA)
- ✅ Firebase atau Supabase Account (gratis)
- ✅ Text Editor (VS Code, Sublime, dll)
- ✅ Git terinstall

### Step 1: Setup Firebase (Recommended)

1. **Buat Projekt Firebase Baru**
   - Kunjungi: https://console.firebase.google.com
   - Klik "Create a new project"
   - Nama: `sdn1-cempaka-erapor`
   - Region: `asia-southeast1` (Jakarta)

2. **Setup Realtime Database**
   - Menu: Build → Realtime Database
   - Klik "Create Database"
   - Location: `asia-southeast1`
   - Security Rules: Mulai dengan "Test mode" (akan diubah nanti)

3. **Setup Cloud Storage**
   - Menu: Build → Storage
   - Klik "Get started"
   - Location: `asia-southeast1`
   - Aturan: Mulai dengan "Test mode"

4. **Catat Credential Firebase**
   ```
   API Key: [SIMPAN INI]
   Project ID: sdn1-cempaka-erapor
   Database URL: https://sdn1-cempaka-erapor.firebaseio.com
   Storage Bucket: sdn1-cempaka-erapor.appspot.com
   ```

### Step 2: Setup Supabase (Alternatif)

1. **Buat Project Supabase**
   - Kunjungi: https://app.supabase.com
   - Klik "New Project"
   - Nama: `sdn1-cempaka-erapor`
   - Region: `Singapore` (terdekat ke Indonesia)
   - Password: [SIMPAN DENGAN AMAN]

2. **Catat Credential Supabase**
   ```
   Project URL: [SIMPAN]
   Anon Key: [SIMPAN]
   Service Role Key: [SIMPAN]
   ```

---

## Implementasi Tahap 1

**Durasi: 1-2 minggu**
**Output: MVP (Minimum Viable Product) dengan fitur dasar**

### Tahap 1A: Setup Struktur Folder

```
sdn1cempaka/
├── e-rapor-integration/
│   ├── docs/                    # Dokumentasi lengkap
│   │   ├── SETUP-GUIDE.md
│   │   ├── API-INTEGRATION.md
│   │   ├── SECURITY.md
│   │   └── TROUBLESHOOTING.md
│   ├── src/
│   │   ├── firebase-config.js   # Konfigurasi Firebase
│   │   ├── supabase-config.js   # Konfigurasi Supabase (opsional)
│   │   ├── sync-service.js      # Service sinkronisasi
│   │   ├── notification-service.js # Layanan notifikasi
│   │   └── storage-service.js   # Layanan penyimpanan file
│   ├── pages/
│   │   ├── index.html           # Halaman utama
│   │   ├── dashboard.html       # Dashboard siswa/ortu
│   │   ├── download.html        # Halaman download rapor
│   │   └── admin.html           # Panel admin
│   ├��─ styles/
│   │   ├── main.css
│   │   ├── dashboard.css
│   │   └── responsive.css
│   ├── functions/
│   │   ├── sync-erapor.js       # Cloud Function
│   │   ├── send-notification.js # Cloud Function
│   │   └── validate-user.js     # Cloud Function
│   ├── tests/
│   │   ├── sync.test.js
│   │   └── notification.test.js
│   ├── config/
│   │   ├── firebase.config.json # (JANGAN PUSH KE GIT)
│   │   └── supabase.config.json # (JANGAN PUSH KE GIT)
│   └── package.json
```

### Tahap 1B: Setup Keamanan

1. **Buat `.gitignore`**
   ```
   .env
   .env.local
   config/firebase.config.json
   config/supabase.config.json
   node_modules/
   dist/
   ```

2. **Setup Environment Variables**
   ```bash
   # Buat file: .env
   FIREBASE_API_KEY=xxxxx
   FIREBASE_PROJECT_ID=sdn1-cempaka-erapor
   FIREBASE_DATABASE_URL=https://sdn1-cempaka-erapor.firebaseio.com
   SUPABASE_URL=xxxxx
   SUPABASE_ANON_KEY=xxxxx
   ```

---

## Implementasi Tahap 2

**Durasi: 2-4 minggu**
**Output: Fitur lengkap + Dashboard admin**

### Fitur Prioritas Tahap 2:
1. ✅ Dashboard login siswa/orang tua
2. ✅ Download rapor PDF
3. ✅ Riwayat rapor (5 tahun terakhir)
4. ✅ Panel admin sinkronisasi manual
5. ✅ Notifikasi email otomatis
6. ✅ Analytics sederhana

---

## Troubleshooting

### Masalah Umum

**Q: CORS Error saat sinkronisasi**
```
A: 1. Periksa Firebase Security Rules
   2. Pastikan domain GitHub Pages sudah di-whitelist
   3. Gunakan proxy atau Cloud Function
```

**Q: File rapor tidak ter-upload**
```
A: 1. Cek quota Firebase Storage
   2. Pastikan file < 25MB
   3. Verifikasi permission Storage Rules
```

**Q: Notifikasi tidak terkirim**
```
A: 1. Verifikasi email orang tua tersimpan
   2. Cek Firebase Cloud Function logs
   3. Test dengan email admin terlebih dahulu
```

---

## Next Steps

1. ✅ Setup Firebase/Supabase (Hari 1)
2. ✅ Konfigurasi Environment (Hari 2)
3. ✅ Deploy Template Dasar (Hari 3)
4. ✅ Testing & Security Review (Hari 4-5)

**Support:**
- 📧 Email: admin@sdn1cempaka.sch.id
- 📞 WhatsApp: [Nomor Sekolah]
- 🔧 GitHub Issues: https://github.com/SDN-1-CEMPAKA/sdn1cempaka/issues

---

**Last Updated:** 2026-05-22
**Maintainer:** Tim IT SDN 1 CEMPAKA
