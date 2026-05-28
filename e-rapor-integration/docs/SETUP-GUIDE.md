# 🚀 Panduan Setup Lengkap untuk Operator IT Sekolah

## Level: Pemula ✅ | Durasi: 30 menit

---

## Bagian 1: Setup Firebase Account

### Step 1.1: Membuat Google Account (Jika belum punya)
1. Buka https://accounts.google.com/signup
2. Isi form dengan data sekolah:
   ```
   Email: [sekolah]@gmail.com
   Password: [Kata sandi kuat - simpan di password manager]
   Nama: SDN 1 CEMPAKA IT
   ```
3. Verifikasi nomor telepon
4. Catat credential ini di tempat aman

### Step 1.2: Membuat Firebase Project
1. Buka https://console.firebase.google.com
2. Klik **"Buat Project"** atau **"Add Project"**
3. Isi form:
   ```
   Nama Projekt: sdn1-cempaka-erapor
   Analytics: [Nonaktifkan untuk tahap awal]
   Region: Asia Tenggara
   ```
4. Tunggu 1-2 menit, project akan terbuat
5. Klik project yang baru dibuat

### Step 1.3: Setup Realtime Database
1. Di sidebar sebelah kiri, cari **"Build"** → **"Realtime Database"**
2. Klik **"Buat Database"**
3. Atur pengaturan:
   ```
   Location: asia-southeast1 (Jakarta)
   Mode: [Pilih "Mulai dalam mode test"]
   ```
4. Tunggu database terbuat (±30 detik)
5. Copy URL database:
   ```
   Format: https://sdn1-cempaka-erapor.firebaseio.com
   [Simpan URL ini di file .env]
   ```

### Step 1.4: Setup Cloud Storage
1. Buka **Build** → **Storage**
2. Klik **"Get started"**
3. Atur pengaturan:
   ```
   Location: asia-southeast1 (Jakarta)
   Mode: [Pilih "Mulai dalam mode test"]
   ```
4. Tunggu storage terbuat

### Step 1.5: Ambil Credential Firebase
1. Klik ⚙️ (Gear icon) → **Pengaturan Projekt**
2. Pilih tab **"Akun Layanan"**
3. Klik **"Generate Kunci Privat"** (atau New Private Key)
4. File JSON akan terunduh, **JANGAN SHARE KE SIAPAPUN**
5. Buka file tersebut dan salin credential:
   ```json
   {
     "apiKey": "xxxxx",
     "authDomain": "sdn1-cempaka-erapor.firebaseapp.com",
     "databaseURL": "https://sdn1-cempaka-erapor.firebaseio.com",
     "projectId": "sdn1-cempaka-erapor",
     "storageBucket": "sdn1-cempaka-erapor.appspot.com",
     "messagingSenderId": "xxxxx",
     "appId": "xxxxx"
   }
   ```

---

## Bagian 2: Setup Environment Variables

### Step 2.1: Buat File .env
1. Buka editor teks (Notepad++, VS Code, atau Sublime)
2. Buat file baru bernama `.env`
3. Isi dengan:
   ```
   # Firebase Configuration
   FIREBASE_API_KEY=your_api_key_here
   FIREBASE_AUTH_DOMAIN=sdn1-cempaka-erapor.firebaseapp.com
   FIREBASE_DATABASE_URL=https://sdn1-cempaka-erapor.firebaseio.com
   FIREBASE_PROJECT_ID=sdn1-cempaka-erapor
   FIREBASE_STORAGE_BUCKET=sdn1-cempaka-erapor.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   FIREBASE_APP_ID=your_app_id_here

   # E-Rapor API Configuration
   ERAPOR_API_URL=https://api.erapor.kemendikbud.go.id
   ERAPOR_API_KEY=your_erapor_api_key
   ERAPOR_SCHOOL_CODE=123456

   # Email Configuration (Optional)
   EMAIL_SERVICE=gmail
   EMAIL_ADDRESS=sekolah@gmail.com
   EMAIL_PASSWORD=your_app_password_here

   # Environment
   NODE_ENV=production
   ```

4. **PENTING:** Ganti `your_xxxx_here` dengan nilai sebenarnya dari Firebase
5. Simpan file ini di folder root project
6. **JANGAN commit file ini ke Git!**

### Step 2.2: Konfigurasi .gitignore
1. Buka file `.gitignore` di root project
2. Pastikan berisi:
   ```
   .env
   .env.local
   .env.*.local
   config/firebase.config.json
   config/supabase.config.json
   node_modules/
   dist/
   .DS_Store
   Thumbs.db
   ```

---

## Bagian 3: Setup Kode

### Step 3.1: Install Dependencies
1. Buka Terminal/Command Prompt
2. Navigate ke folder project:
   ```bash
   cd sdn1cempaka/e-rapor-integration
   ```
3. Install package:
   ```bash
   npm install
   ```

### Step 3.2: Konfigurasi Firebase Config
1. Buat file `src/firebase-config.js`:
   ```javascript
   // Import Firebase SDK
   import { initializeApp } from 'firebase/app';
   import { getDatabase } from 'firebase/database';
   import { getStorage } from 'firebase/storage';

   // Firebase configuration
   const firebaseConfig = {
     apiKey: process.env.FIREBASE_API_KEY,
     authDomain: process.env.FIREBASE_AUTH_DOMAIN,
     databaseURL: process.env.FIREBASE_DATABASE_URL,
     projectId: process.env.FIREBASE_PROJECT_ID,
     storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.FIREBASE_APP_ID
   };

   // Initialize Firebase
   const app = initializeApp(firebaseConfig);

   // Get references to services
   export const database = getDatabase(app);
   export const storage = getStorage(app);
   export default app;
   ```

---

## Bagian 4: Testing & Deployment

### Step 4.1: Test Koneksi Firebase
1. Buat file `test-connection.js`:
   ```javascript
   const app = require('./src/firebase-config.js');
   const { getDatabase, ref, set } = require('firebase/database');

   async function testConnection() {
     try {
       const db = getDatabase(app);
       const testRef = ref(db, 'test');
       await set(testRef, {
         message: 'Connection successful',
         timestamp: new Date().toISOString()
       });
       console.log('✅ Firebase connection SUCCESS');
     } catch (error) {
       console.error('❌ Firebase connection FAILED:', error);
     }
   }

   testConnection();
   ```

2. Jalankan test:
   ```bash
   node test-connection.js
   ```

3. Jika berhasil, lihat di Firebase Console → Database → Data

### Step 4.2: Deploy ke GitHub Pages
1. Commit perubahan:
   ```bash
   git add .
   git commit -m "feat: Setup E-Rapor integration"
   ```

2. Push ke branch:
   ```bash
   git push origin feature/e-rapor-integration
   ```

3. Buat Pull Request di GitHub

---

## Bagian 5: Checklist Setup

- [ ] Google Account dibuat
- [ ] Firebase Project dibuat
- [ ] Realtime Database setup
- [ ] Cloud Storage setup
- [ ] Credential diambil
- [ ] File `.env` dibuat
- [ ] File `.gitignore` sudah benar
- [ ] Dependencies terinstall
- [ ] Firebase config file dibuat
- [ ] Test connection berhasil
- [ ] Code di-push ke GitHub
- [ ] Pull Request dibuat

---

## FAQ

**Q: Saya tidak punya akun Gmail?**
```
A: Buat Gmail baru di https://gmail.com
   Gunakan akun sekolah (misal: sdn1cempaka.official@gmail.com)
```

**Q: Bagaimana jika lupa password Firebase?**
```
A: 1. Buka https://console.firebase.google.com
   2. Klik profile picture → Logout
   3. Login kembali dengan reset password
```

**Q: .env file tidak dibaca?**
```
A: 1. Pastikan npm package "dotenv" sudah terinstall
   2. Cek apakah path .env benar
   3. Restart aplikasi
```

**Q: Saya tidak mengerti Terminal/Command Prompt**
```
A: Lihat video tutorial ini:
   https://www.youtube.com/watch?v=MBBWVgc0SYk
```

---

**Butuh Bantuan?**
- 📧 Email: admin@sdn1cempaka.sch.id
- 📞 WhatsApp Group: Tim IT SDN 1 CEMPAKA
- 🔗 GitHub Issues: https://github.com/SDN-1-CEMPAKA/sdn1cempaka/issues

---

**Last Updated:** 2026-05-22
**Versi:** 1.0
**Status:** ✅ Ready for Production
