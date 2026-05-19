# Security Hardening Guide - PPDB SDN-1-CEMPAKA

**Tanggal:** 19 Mei 2026  
**Versi:** 1.0  
**Status:** Active

---

## 📋 Daftar Isi

1. [Pengantar Keamanan](#pengantar-keamanan)
2. [Otentikasi & Otorisasi](#otentikasi--otorisasi)
3. [Keamanan Data](#keamanan-data)
4. [Keamanan Jaringan](#keamanan-jaringan)
5. [Keamanan Aplikasi](#keamanan-aplikasi)
6. [Monitoring & Logging](#monitoring--logging)
7. [Incident Response](#incident-response)
8. [Compliance & Audit](#compliance--audit)
9. [Checklist Implementasi](#checklist-implementasi)

---

## 🔐 Pengantar Keamanan

### Prinsip Keamanan (Defense in Depth)
```
┌─────────────────────────────────────┐
│  Perimeter Security (Firewall)      │
├─────────────────────────────────────┤
│  Transport Security (HTTPS/TLS)     │
├─────────────────────────────────────┤
│  Authentication & Authorization     │
├─────────────────────────────────────┤
│  Application Security               │
├─────────────────────────────────────┤
│  Database Security                  │
├─────────────────────────────────────┤
│  Monitoring & Detection             │
└─────────────────────────────────────┘
```

### Tingkat Risiko Data
- 🔴 **CRITICAL:** Data orang tua, identitas siswa
- 🟠 **HIGH:** Dokumen pendaftaran, prestasi akademik
- 🟡 **MEDIUM:** Log akses, metadata
- 🟢 **LOW:** Data publik, statistik umum

---

## 🔑 Otentikasi & Otorisasi

### 1.1 Strategi Kata Sandi

#### Persyaratan Password
```
Panjang Minimum:        12 karakter
Kompleksitas:           Huruf besar + huruf kecil + angka + simbol
Format Khusus:          !@#$%^&*()_+-=[]{}|;:',.<>?/

Contoh Password Kuat:
✅ Ppdb@SDN1Cempaka2026!
✅ Sekolah#Kami123$
❌ 123456
❌ password
❌ ppdb1234
```

#### Kebijakan Password
- Durasi aktif: **90 hari**
- Riwayat: Tidak boleh menggunakan **5 password terakhir**
- Penguncian akun: Setelah **5 percobaan gagal** (lockout 30 menit)
- Reset otomatis: Admin mereset password user baru
- Mandatory change: Password pertama kali login

**Implementasi (Node.js/Express):**
```javascript
// middleware/passwordPolicy.js
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  
  validate: (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    return regex.test(password);
  }
};

module.exports = passwordPolicy;
```

### 1.2 Multi-Factor Authentication (MFA)

#### MFA untuk Admin/Guru
**Wajib untuk:**
- Semua akun admin
- Semua akun guru/verifikator
- Akses ke data sensitif

**Pilihan MFA:**
1. ✅ **TOTP** (Google Authenticator, Authy) - Direkomendasikan
2. ✅ **SMS OTP** - Fallback
3. ✅ **Email OTP** - Fallback

**Implementasi (dengan speakeasy):**
```javascript
// controllers/auth.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

exports.setupMFA = async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `PPDB SDN-1 (${req.user.email})`,
    issuer: 'SDN-1-CEMPAKA',
    length: 32
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  // Simpan temporary secret (belum diaktifkan)
  req.user.mfaSecret = secret.base32;
  req.user.mfaSetup = true;
  
  res.json({ 
    qrCode, 
    backup: secret.backup_codes 
  });
};

exports.verifyMFA = (req, res) => {
  const { token } = req.body;
  const verified = speakeasy.totp.verify({
    secret: req.user.mfaSecret,
    encoding: 'base32',
    token: token,
    window: 2
  });

  if (!verified) {
    return res.status(401).json({ error: 'Invalid MFA code' });
  }

  req.user.mfaEnabled = true;
  res.json({ success: true });
};
```

### 1.3 Session Management

#### Konfigurasi Session
```javascript
// config/session.js
const sessionConfig = {
  secret: process.env.SESSION_SECRET, // Generate dengan: crypto.randomBytes(32).toString('hex')
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,                    // HTTPS only
    httpOnly: true,                  // Tidak bisa diakses JavaScript
    sameSite: 'strict',              // CSRF protection
    maxAge: 30 * 60 * 1000,         // 30 menit
    domain: 'ppdb-sdn1cempaka.vercel.app',
    path: '/'
  },
  name: 'ppdb_session_id',           // Ganti default 'connect.sid'
  rolling: true,                     // Refresh setiap request
};

module.exports = sessionConfig;
```

#### Deteksi Session Hijacking
```javascript
// middleware/sessionValidation.js
module.exports = (req, res, next) => {
  if (req.session.userAgent !== req.get('user-agent')) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session invalid' });
  }
  next();
};
```

### 1.4 Role-Based Access Control (RBAC)

#### Definisi Role
```javascript
// config/roles.js
const ROLES = {
  ADMIN: {
    name: 'admin',
    permissions: [
      'view_all_applications',
      'verify_documents',
      'generate_reports',
      'manage_users',
      'view_audit_logs',
      'export_data'
    ]
  },
  GURU_VERIFIKATOR: {
    name: 'guru_verifikator',
    permissions: [
      'view_assigned_applications',
      'verify_documents',
      'add_notes'
    ]
  },
  GURU_PEMBIMBING: {
    name: 'guru_pembimbing',
    permissions: [
      'view_own_students',
      'add_academic_notes'
    ]
  },
  ORANG_TUA: {
    name: 'orang_tua',
    permissions: [
      'view_own_application',
      'update_own_data',
      'download_documents'
    ]
  },
  CALON_SISWA: {
    name: 'calon_siswa',
    permissions: [
      'view_own_application',
      'download_own_documents'
    ]
  }
};

module.exports = ROLES;
```

#### Middleware Otorisasi
```javascript
// middleware/authorize.js
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Anda tidak memiliki akses ke resource ini' 
      });
    }

    next();
  };
};

module.exports = authorize;

// Penggunaan:
// router.get('/admin/reports', authorize('admin'), getReports);
```

---

## 🛡️ Keamanan Data

### 2.1 Enkripsi Data in Transit

#### HTTPS/TLS Configuration
```javascript
// server.js
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();

// Redirect HTTP ke HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// HSTS Header
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});

// Konfigurasi TLS 1.2+ minimum
const httpsOptions = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem'),
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
  minVersion: 'TLSv1.2'
};

https.createServer(httpsOptions, app).listen(443);
```

### 2.2 Enkripsi Data at Rest

#### Database Encryption (MongoDB)
```javascript
// config/database.js
const mongoose = require('mongoose');
const crypto = require('crypto');

// Field-level encryption untuk data sensitif
class FieldEncryption {
  constructor(key) {
    this.key = crypto.scryptSync(key, 'salt', 32);
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData) {
    const [iv, authTag, encrypted] = encryptedData.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

const encryptor = new FieldEncryption(process.env.ENCRYPTION_KEY);

// Schema dengan enkripsi
const applicationSchema = new mongoose.Schema({
  parentPhone: {
    type: String,
    set: (value) => encryptor.encrypt(value),
    get: (value) => encryptor.decrypt(value)
  },
  parentEmail: {
    type: String,
    set: (value) => encryptor.encrypt(value),
    get: (value) => encryptor.decrypt(value)
  },
  studentAddress: {
    type: String,
    set: (value) => encryptor.encrypt(value),
    get: (value) => encryptor.decrypt(value)
  }
});

module.exports = mongoose.model('Application', applicationSchema);
```

### 2.3 Hashing Password

#### Implementasi dengan bcrypt
```javascript
// services/authService.js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12; // Semakin tinggi = lebih lambat tapi lebih aman

exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

exports.verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Penggunaan di controller
exports.register = async (req, res) => {
  const { email, password } = req.body;
  
  const hashedPassword = await hashPassword(password);
  
  const user = new User({
    email,
    password: hashedPassword
  });
  
  await user.save();
  res.json({ success: true });
};
```

### 2.4 Data Masking & Anonymization

```javascript
// utils/dataMasking.js
exports.maskPhoneNumber = (phone) => {
  // 08123456789 -> 0812****6789
  return phone.replace(/(\d{4})(\d{4})(\d{2})/, '$1****$3');
};

exports.maskEmail = (email) => {
  // user@example.com -> u***@example.com
  const [name, domain] = email.split('@');
  return `${name[0]}${'*'.repeat(name.length - 2)}@${domain}`;
};

exports.maskIdNumber = (id) => {
  // 1234567890123456 -> 123456****3456
  return id.replace(/(\d{6})(\d{8})(\d{2})/, '$1****$3');
};

exports.anonymizeData = (data) => {
  return {
    ...data,
    parentPhone: exports.maskPhoneNumber(data.parentPhone),
    parentEmail: exports.maskEmail(data.parentEmail),
    studentIdNumber: exports.maskIdNumber(data.studentIdNumber)
  };
};
```

---

## 🌐 Keamanan Jaringan

### 3.1 WAF (Web Application Firewall)

#### Rate Limiting
```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// General limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,                   // max 100 requests per windowMs
  message: 'Terlalu banyak request, coba lagi nanti',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login limit (strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Jangan count login sukses
  message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit'
});

// File upload limit
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20, // max 20 uploads per hour
  message: 'Upload limit exceeded'
});

module.exports = {
  generalLimiter,
  loginLimiter,
  uploadLimiter
};

// Penggunaan:
// app.post('/login', loginLimiter, login);
```

#### DDoS Protection
```javascript
// middleware/ddosProtection.js
const helmet = require('helmet');
const hpp = require('hpp');

module.exports = [
  // Helmet untuk security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  
  // HPP untuk HTTP Parameter Pollution
  hpp({
    whitelist: ['sort', 'fields', 'limit', 'page']
  })
];
```

### 3.2 CORS (Cross-Origin Resource Sharing)

```javascript
// config/cors.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://ppdb-sdn1cempaka.vercel.app',
    'https://sdn1cempaka.sch.id',
    'https://www.sdn1cempaka.sch.id'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions);
```

### 3.3 CSRF Protection

```javascript
// middleware/csrf.js
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  }
});

module.exports = csrfProtection;

// Penggunaan di form HTML:
// <form method="POST" action="/submit">
//   <input type="hidden" name="_csrf" value="<%= csrfToken %>">
// </form>
```

### 3.4 Firewall Rules (Vercel)

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

---

## 🔒 Keamanan Aplikasi

### 4.1 Input Validation & Sanitization

```javascript
// middleware/inputValidation.js
const { body, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');

// Validation schema
const validateApplication = [
  body('studentName')
    .trim()
    .notEmpty().withMessage('Nama siswa diperlukan')
    .isLength({ min: 3, max: 100 }).withMessage('Nama harus 3-100 karakter')
    .matches(/^[a-zA-Z\s\-'áéíóú]+$/).withMessage('Nama hanya boleh huruf'),
  
  body('parentEmail')
    .isEmail().withMessage('Email tidak valid')
    .normalizeEmail(),
  
  body('parentPhone')
    .matches(/^(\+62|62|0)[0-9]{9,12}$/).withMessage('Nomor telepon tidak valid'),
  
  body('studentBirthDate')
    .isISO8601().withMessage('Format tanggal tidak valid')
    .isBefore(new Date().toISOString()).withMessage('Tanggal lahir tidak valid'),
  
  body('studentAddress')
    .trim()
    .notEmpty().withMessage('Alamat diperlukan')
    .isLength({ min: 10, max: 500 }).withMessage('Alamat harus 10-500 karakter')
];

// Error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Sanitization
const sanitizeInput = (req, res, next) => {
  for (let key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = DOMPurify.sanitize(req.body[key]);
    }
  }
  next();
};

module.exports = {
  validateApplication,
  handleValidationErrors,
  sanitizeInput
};
```

### 4.2 SQL Injection / NoSQL Injection Prevention

```javascript
// ✅ BENAR: Gunakan prepared statements
const user = await User.findOne({ email: req.body.email });

// ❌ SALAH: String concatenation
// const user = await User.findOne({ email: `${req.body.email}` });

// ✅ BENAR: Mongoose/Parameterized queries
const application = await Application.findById(req.params.id);

// Parameterized query
const result = await db.query(
  'SELECT * FROM users WHERE email = ? AND role = ?',
  [email, role]
);

// ❌ SALAH: Direct template string
// const result = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### 4.3 XSS (Cross-Site Scripting) Prevention

```javascript
// middleware/xssProtection.js
const DOMPurify = require('isomorphic-dompurify');
const xss = require('xss');

// Untuk output HTML
exports.sanitizeHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href', 'title']
  });
};

// Template dengan escaping otomatis
// EJS: <%= data %> (auto-escaped)
// Handlebars: {{data}} (auto-escaped)
// React: {data} (auto-escaped)

// ✅ BENAR
// <div><%= userData.name %></div>

// ❌ SALAH
// <div><%- userData.name %></div> <!-- <%- = unescape! -->
```

### 4.4 File Upload Security

```javascript
// middleware/fileUpload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fileType = require('file-type');

// Whitelist tipe file
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = async (req, file, cb) => {
  // Validasi extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error('Tipe file tidak diperbolehkan'));
  }

  // Validasi MIME type
  const type = await fileType.fromBuffer(file.buffer);
  if (!type || !ALLOWED_TYPES.includes(type.mime)) {
    return cb(new Error('File type tidak valid'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Simpan dengan nama random
exports.saveUploadedFile = (file, userId) => {
  const randomName = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(file.originalname);
  const filename = `${randomName}${ext}`;
  const filepath = path.join('/uploads', userId, filename);
  
  return {
    filename,
    filepath,
    originalname: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date()
  };
};

module.exports = { upload, fileFilter };
```

### 4.5 API Security

```javascript
// middleware/apiSecurity.js

// 1. API Key validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// 2. JWT validation
const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'ppdb-sdn1cempaka',
      audience: 'ppdb-users'
    });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 3. API versioning
const apiVersionMiddleware = (req, res, next) => {
  const version = req.headers['x-api-version'] || 'v1';
  if (!['v1', 'v2'].includes(version)) {
    return res.status(400).json({ error: 'Unsupported API version' });
  }
  req.apiVersion = version;
  next();
};

module.exports = {
  validateApiKey,
  verifyJWT,
  apiVersionMiddleware
};
```

---

## 📊 Monitoring & Logging

### 5.1 Comprehensive Logging

```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ppdb-sdn1cempaka' },
  transports: [
    // File untuk errors
    new winston.transports.File({
      filename: path.join('/logs', 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    
    // File untuk combined logs
    new winston.transports.File({
      filename: path.join('/logs', 'combined.log'),
      maxsize: 10485760,
      maxFiles: 30
    })
  ]
});

// Console logging di development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### 5.2 Audit Logging

```javascript
// middleware/auditLog.js
const logger = require('../utils/logger');

const auditLog = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    const auditEntry = {
      timestamp: new Date(),
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: `${req.method} ${req.originalUrl}`,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      duration: Date.now() - req.startTime
    };

    // Log semua aksi yang mengubah data
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      logger.info('Data modification', auditEntry);
    }

    // Log akses data sensitif
    if (req.path.includes('/sensitive') || req.path.includes('/admin')) {
      logger.info('Sensitive access', auditEntry);
    }

    res.send = originalSend;
    return res.send(data);
  };

  req.startTime = Date.now();
  next();
};

module.exports = auditLog;
```

### 5.3 Real-Time Monitoring

```javascript
// services/monitoringService.js
const logger = require('../utils/logger');

class SecurityMonitor {
  constructor() {
    this.suspiciousActivities = [];
  }

  // Deteksi brute force
  detectBruteForce(userId, attempts = 5, timeWindow = 900000) {
    const recentAttempts = this.suspiciousActivities.filter(
      a => a.userId === userId && 
           a.type === 'login_failure' &&
           Date.now() - a.timestamp < timeWindow
    );

    if (recentAttempts.length >= attempts) {
      logger.warn('Brute force detected', { userId, attempts: recentAttempts.length });
      return true;
    }
    return false;
  }

  // Deteksi unusual access pattern
  detectUnusualAccess(userId, locationData) {
    // Jika user login dari lokasi baru, log dan potentially block
    logger.info('Unusual access detected', { userId, location: locationData });
  }

  // Monitor file access
  monitorFileAccess(userId, fileId, action) {
    logger.info('File access', { userId, fileId, action, timestamp: new Date() });
  }
}

module.exports = new SecurityMonitor();
```

---

## 🚨 Incident Response

### 6.1 Breach Response Plan

#### Tahapan Response
```
1. DETECT (0-1 jam)
   └─ Alert dari monitoring system
   └─ Verifikasi breach
   └─ Aktivasi incident response team

2. CONTAIN (1-24 jam)
   └─ Isolasi sistem yang terpengaruh
   └─ Stop akses unauthorized
   └─ Backup data untuk investigasi

3. INVESTIGATE (24 jam - 7 hari)
   └─ Forensik digital
   └─ Identifikasi root cause
   └─ Tentukan data yang exposed

4. NOTIFY (Sesuai regulasi)
   └─ Notifikasi ke affected users (72 jam)
   └─ Notifikasi ke authorities
   └─ Press release jika diperlukan

5. REMEDIATE (7-30 hari)
   └─ Patch vulnerabilities
   └─ Update security policies
   └─ Restore systems

6. FOLLOW-UP (30+ hari)
   └─ Post-incident review
   └─ Improve controls
   └─ Update documentation
```

### 6.2 Emergency Contacts

```javascript
// config/incidentResponse.js
const INCIDENT_RESPONSE = {
  contacts: {
    securityLead: {
      name: 'Security Lead Name',
      phone: '+62812345678',
      email: 'security@sdn1cempaka.sch.id'
    },
    itManager: {
      name: 'IT Manager Name',
      phone: '+62812345679',
      email: 'it@sdn1cempaka.sch.id'
    },
    principal: {
      name: 'Principal Name',
      phone: '+62812345680',
      email: 'principal@sdn1cempaka.sch.id'
    },
    legalTeam: {
      email: 'legal@sdn1cempaka.sch.id'
    }
  },
  
  externalContacts: {
    cybersecurity: 'cert@bssn.go.id',
    police: '110',
    insurance: '+62212345678'
  }
};

module.exports = INCIDENT_RESPONSE;
```

---

## ✅ Compliance & Audit

### 7.1 Security Checklist

#### Pre-Deployment
- [ ] Semua input divalidasi dan disanitasi
- [ ] HTTPS/TLS enabled
- [ ] Security headers dikonfigurasi
- [ ] CORS dikonfigurasi dengan benar
- [ ] CSRF tokens diimplementasikan
- [ ] Rate limiting aktif
- [ ] Password policy enforcement
- [ ] MFA untuk admin
- [ ] Database enkripsi enabled
- [ ] Secrets tidak di-hardcode (menggunakan env vars)
- [ ] Dependencies tidak ada vulnerable versions
- [ ] Security headers lengkap
- [ ] Error messages tidak expose sensitive info
- [ ] Logging dan monitoring aktif
- [ ] Backup strategy teruji
- [ ] Incident response plan written
- [ ] Staff security training done

#### Post-Deployment
- [ ] Monitoring 24/7 aktif
- [ ] Logs di-review regularly
- [ ] Patches diterapkan promptly
- [ ] Access logs di-audit
- [ ] Security team trained
- [ ] Backup tested monthly
- [ ] Penetration testing scheduled

### 7.2 OWASP Top 10 Coverage

| # | Vulnerability | Mitigation | Status |
|---|---|---|---|
| 1 | Broken Access Control | RBAC, Authorization checks | ✅ |
| 2 | Cryptographic Failures | AES-256 encryption, HTTPS | ✅ |
| 3 | Injection | Parameterized queries, Input validation | ✅ |
| 4 | Insecure Design | Security requirements, Threat modeling | ✅ |
| 5 | Security Misconfiguration | Secure defaults, Regular audits | ✅ |
| 6 | Vulnerable & Outdated Components | Dependency scanning, Updates | ✅ |
| 7 | Authentication Failures | MFA, Strong password policy | ✅ |
| 8 | Software & Data Integrity Failures | Signed releases, Verified dependencies | ✅ |
| 9 | Logging & Monitoring Failures | Comprehensive logging, Alerting | ✅ |
| 10 | SSRF | Input validation, Network segmentation | ✅ |

### 7.3 Vulnerability Scanning

```bash
# NPM dependencies scanning
npm audit

# SAST (Static Application Security Testing)
npm install -g snyk
snyk test

# Dependency check
npm install --save-dev npm-check-updates
npm-check-updates -u

# Code quality & security
npm install --save-dev sonarqube-scanner
sonar-scanner
```

---

## 📝 Checklist Implementasi

### Phase 1: Foundation (Minggu 1-2)
- [ ] Implementasi HTTPS/TLS
- [ ] Password policy enforcement
- [ ] Input validation & sanitization
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Basic logging

### Phase 2: Authentication (Minggu 3-4)
- [ ] MFA untuk admin
- [ ] Session management hardening
- [ ] RBAC implementation
- [ ] JWT tokens
- [ ] API security

### Phase 3: Data Protection (Minggu 5-6)
- [ ] Database encryption
- [ ] Field-level encryption untuk data sensitif
- [ ] File upload security
- [ ] Data masking
- [ ] Secure deletion

### Phase 4: Monitoring (Minggu 7-8)
- [ ] Comprehensive logging
- [ ] Audit trails
- [ ] Real-time monitoring
- [ ] Alert system
- [ ] Dashboard

### Phase 5: Compliance & Testing (Minggu 9-10)
- [ ] Vulnerability scanning
- [ ] Penetration testing
- [ ] Compliance audit
- [ ] Documentation
- [ ] Training

---

## 📚 Referensi & Resources

### Dokumentasi
- [OWASP Top 10](https://owasp.org/Top10/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

### Tools
- [npm audit](https://docs.npmjs.com/cli/audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite](https://portswigger.net/burp)

### Compliance
- Law: Undang-Undang Nomor 27 Tahun 2022 (PDP Indonesia)
- Standards: ISO 27001, ISO 27002
- Frameworks: NIST, CIS Controls

---

## 📞 Support & Feedback

**Security Team:** security@sdn1cempaka.sch.id  
**Last Updated:** 19 Mei 2026  
**Next Review:** 19 November 2026

---

**⚠️ IMPORTANT:** Dokumen ini harus dijaga ketat dan hanya dapat diakses oleh authorized personnel. Jika ada pertanyaan atau perlu klarifikasi, hubungi Security Lead.

