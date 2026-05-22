# 🔧 Panduan Troubleshooting & Maintenance

## Level: Menengah ⚠️ | Untuk: Operator IT & Support Team

---

## Bagian 1: Masalah Umum & Solusi

### ❌ Error: "Firebase configuration incomplete"

**Gejala:**
```
❌ Missing Firebase configuration:
   FIREBASE_API_KEY, FIREBASE_PROJECT_ID, ...
```

**Penyebab:**
- File `.env` tidak ada atau path salah
- Environment variables tidak terbaca
- Typo dalam nama variable

**Solusi:**
1. Cek apakah file `.env` ada di root directory:
   ```bash
   # Tampilkan semua file
   ls -la
   # Atau di Windows
   dir
   ```

2. Verifikasi isi `.env`:
   ```bash
   cat .env
   ```

3. Pastikan tidak ada typo:
   ```env
   ✅ BENAR
   FIREBASE_API_KEY=xxxxx
   FIREBASE_PROJECT_ID=sdn1-cempaka-erapor

   ❌ SALAH
   firebase_api_key=xxxxx
   FirebaseProjectId=sdn1-cempaka-erapor
   ```

4. Restart aplikasi:
   ```bash
   npm start
   ```

---

### ❌ Error: "Access Denied (403) - Permission denied"

**Gejala:**
```
❌ Error: Firebase permission denied
   at rapor/[NISN]/...
```

**Penyebab:**
- Firebase Security Rules tidak dikonfigurasi
- User tidak punya akses yang sesuai
- API Key tidak punya permission tertentu

**Solusi:**
1. Buka Firebase Console → Database → Rules
2. Update rules menjadi:
   ```json
   {
     "rules": {
       "rapor": {
         ".read": true,
         ".write": "auth.uid != null"
       },
       ".read": false,
       ".write": false
     }
   }
   ```

3. Klik "Publish" untuk menyimpan

---

### ❌ Error: "CORS Error - No Access-Control-Allow-Origin"

**Gejala:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Penyebab:**
- Browser blocking cross-origin request
- API endpoint beda domain

**Solusi:**
1. Gunakan proxy atau Cloud Function
2. Tambahkan CORS headers di backend:
   ```javascript
   // Jika menggunakan Express
   const cors = require('cors');
   app.use(cors({
     origin: [
       'https://sdn-1-cempaka.github.io',
       'http://localhost:3000'
     ]
   }));
   ```

3. Test dengan curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.erapor.kemendikbud.go.id/health
   ```

---

### ❌ Error: "Rapor PDF tidak ter-download"

**Gejala:**
```
❌ Failed to download rapor
   Error: 404 Not Found
```

**Penyebab:**
- File belum ter-upload ke Cloud Storage
- URL rapor sudah expired
- File dihapus

**Solusi:**
1. Cek apakah file ada di Firebase Storage:
   ```
   Firebase Console → Storage → Lihat folder rapor
   ```

2. Verifikasi URL rapor:
   ```javascript
   // Check URL validity
   const response = await fetch(pdfUrl);
   if (!response.ok) {
     console.error('PDF URL invalid:', response.status);
   }
   ```

3. Re-sync data dari E-Rapor:
   ```bash
   npm run sync:manual
   ```

---

### ❌ Error: "Notifikasi tidak terkirim ke email"

**Gejala:**
```
Email not received oleh parent
```

**Penyebab:**
- Email configuration tidak setup
- SMTP credentials salah
- Email masuk spam folder

**Solusi:**
1. Verifikasi email configuration di `.env`:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_ADDRESS=sekolah@gmail.com
   EMAIL_PASSWORD=xxxx_xxxx_xxxx_xxxx  # App password, bukan password Gmail
   ```

2. Setup Gmail App Password:
   - Buka: https://myaccount.google.com/apppasswords
   - Pilih Mail dan Windows PC
   - Copy app password ke `.env`

3. Test email sending:
   ```javascript
   import nodemailer from 'nodemailer';

   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: process.env.EMAIL_ADDRESS,
       pass: process.env.EMAIL_PASSWORD
     }
   });

   const result = await transporter.sendMail({
     from: process.env.EMAIL_ADDRESS,
     to: 'test@example.com',
     subject: 'Test Email',
     text: 'This is a test'
   });

   console.log('Email sent:', result.messageId);
   ```

4. Check email spam folder

---

## Bagian 2: Performance & Optimization

### 📊 Monitor Database Usage

**Cek quota Firebase:**
1. Firebase Console → Settings → Usage
2. Perhatian jika sudah mencapai:
   - 🟡 60% quota
   - 🔴 90% quota

**Cara menghemat quota:**
```javascript
// ❌ TIDAK EFISIEN - Baca semua data
const snapshot = await get(ref(db, 'rapor'));

// ✅ EFISIEN - Baca hanya yang diperlukan
const snapshot = await get(query(
  ref(db, 'rapor'),
  limitToFirst(100)
));
```

### 🚀 Optimasi Sync Performance

```javascript
// ❌ LAMBAT - Banyak request individual
for (let nisn of studentList) {
  await saveToFirebase(getRaporForStudent(nisn));
}

// ✅ CEPAT - Batch operations
const batch = writeBatch(database);
for (let nisn of studentList) {
  const docRef = ref(database, `rapor/${nisn}`);
  batch.set(docRef, getRaporForStudent(nisn));
}
await batch.commit();
```

---

## Bagian 3: Database Maintenance

### 🧹 Cleaning Old Data

```javascript
/**
 * Hapus data rapor yang lebih dari 5 tahun
 */
async function cleanOldData() {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const snapshot = await get(ref(database, 'rapor'));
  const updates = {};

  snapshot.forEach(child => {
    const data = child.val();
    if (new Date(data.tanggal_publikasi) < fiveYearsAgo) {
      updates[child.key] = null; // null = delete
    }
  });

  await update(ref(database, 'rapor'), updates);
  console.log('✅ Old data cleaned');
}
```

### 📦 Backup Database

**Manual Backup:**
1. Firebase Console → Database → Options (⋮)
2. Klik "Export JSON"
3. File akan didownload

**Automated Backup:**
```bash
# Buat schedule (misal setiap hari pukul 2 pagi)
# Di Linux/Mac gunakan cron:
0 2 * * * /usr/bin/node /home/backup-database.js

# Di Windows gunakan Task Scheduler
```

---

## Bagian 4: Security Maintenance

### 🔐 Update Credential Reguler

**Setiap 3 Bulan:**
1. Generate API Key baru
2. Update di `.env`
3. Revoke API Key lama
4. Restart aplikasi

**Cara:**
```bash
# Generate new key
firebase:json → settings → update credentials

# Atau di Firebase Console
Settings → Project Settings → Service Accounts → Generate New Private Key
```

### 🚨 Jika Ada Keamanan Breach

**Langkah Emergency:**
1. **SEGERA:** Revoke semua API Keys
   - Firebase Console → Settings
   - Delete compromised keys

2. Generate API Key baru
   - Firebase Console → Settings → Service Accounts
   - Download private key baru

3. Update `.env` dengan credential baru

4. Restart aplikasi

5. Check audit logs untuk aktivitas mencurigakan
   - Firebase Console → Logs

6. Notify admin & kepala sekolah

---

## Bagian 5: Monitoring & Alerts

### 📊 Dashboard Monitoring

Buat file `monitoring.js`:

```javascript
/**
 * Simple monitoring script
 * Check health setiap 5 menit
 */

async function monitorSystem() {
  const checks = {
    firebase: await checkFirebaseHealth(),
    erapor_api: await checkERaporHealth(),
    storage: await checkStorageHealth(),
    last_sync: await getLastSyncTime()
  };

  console.log('📊 System Health Check:');
  console.log(JSON.stringify(checks, null, 2));

  // Alert jika ada yang error
  if (!checks.firebase || !checks.erapor_api) {
    await sendAlert('System health check FAILED');
  }
}

async function checkFirebaseHealth() {
  try {
    const testRef = ref(database, 'health_check');
    await set(testRef, { timestamp: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Firebase health check failed:', error);
    return false;
  }
}

async function checkERaporHealth() {
  try {
    const response = await fetch(
      `${ERAPOR_API_URL}/health`,
      { headers: { 'Authorization': `Bearer ${ERAPOR_API_KEY}` } }
    );
    return response.ok;
  } catch (error) {
    console.error('E-Rapor health check failed:', error);
    return false;
  }
}

// Run setiap 5 menit
setInterval(monitorSystem, 5 * 60 * 1000);
```

---

## Bagian 6: Log Analysis

### 📝 Membaca Logs

**Firebase Console Logs:**
1. Firebase Console → Functions → Logs
2. Filter berdasarkan:
   - Time range
   - Function name
   - Error level (Info, Warning, Error)

**Application Logs:**
```bash
# Save logs ke file
npm start > app.log 2>&1

# Real-time log monitoring
tail -f app.log

# Search dalam logs
grep "error" app.log
```

---

## Bagian 7: Disaster Recovery Plan

### 🚨 Jika Data Hilang

**Langkah Recovery:**
1. Stop aplikasi (prevent data corruption)
   ```bash
   npm stop
   ```

2. Restore dari backup:
   - Firebase Console → Database → Options (⋮)
   - Klik "Restore Backup"
   - Pilih backup date

3. Verifikasi data sudah benar

4. Restart aplikasi
   ```bash
   npm start
   ```

---

## Bagian 8: Contact & Escalation

### 🆘 Jika Masalah Tidak Terpecahkan

**Escalation Path:**
1. **Tier 1 - IT Operator:** Coba solusi di guide ini
2. **Tier 2 - Senior IT:** Hubungi developer tim
3. **Tier 3 - External Support:**
   - Firebase: https://firebase.google.com/support
   - E-Rapor: api-support@erapor.kemendikbud.go.id
   - GitHub Issues: https://github.com/SDN-1-CEMPAKA/sdn1cempaka/issues

---

## Checklist Maintenance Bulanan

- [ ] Cek Firebase quota usage
- [ ] Review recent error logs
- [ ] Test email notifications
- [ ] Verify backup mencapai success
- [ ] Update npm packages (security patches)
- [ ] Check HTTPS certificate validity
- [ ] Review database structure
- [ ] Monitor performance metrics

---

## Checklist Maintenance Tahunan

- [ ] Security audit
- [ ] Full system backup & restore test
- [ ] Database optimization
- [ ] Update documentation
- [ ] Review and rotate credentials
- [ ] Performance capacity planning

---

**Last Updated:** 2026-05-22
**Maintained by:** Tim IT SDN 1 CEMPAKA
**Next Review:** 2026-08-22
