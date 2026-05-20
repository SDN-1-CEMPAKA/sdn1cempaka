# PANDUAN PERBAIKAN TOMBOL PRINTER YANG TIDAK RESPONSIF

## ❌ PENYEBAB MASALAH

Tombol printer tidak bisa diklik biasanya karena:

1. **Event handler tidak terdaftar** - Fungsi `printTicket()` tidak ditemukan
2. **DOM belum ready** - Lucide icons belum diinisialisasi saat data dimuat
3. **Click event tertutup** - Ada elemen yang menghalangi tombol
4. **Syntax error** - JSON.stringify() error saat passing object

---

## ✅ SOLUSI

### **LANGKAH 1: Pastikan Fungsi printTicket Exists**

Di bagian `<script>` di pendaftaran.html, cari fungsi `printTicket`. Jika tidak ada atau tidak lengkap, ganti dengan kode ini:

```javascript
function printTicket(item) {
    if (!item || !item.id) {
        alert('Data tidak valid. Silakan refresh halaman.');
        return;
    }
    
    try {
        // Format tanggal lahir
        const formatTgl = (str) => {
            if (!str || str === '-' || str === '0') return '-';
            const d = new Date(toYMD(str));
            if (isNaN(d.getTime())) return str.split('T')[0];
            const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
        };
        
        const tglLahirFormatted = formatTgl(item.tgl_lahir);

        // Isi data ke print area
        document.getElementById('p-id').innerText = item.id;
        document.getElementById('p-nik').innerText = item.nik;
        document.getElementById('p-nisn').innerText = item.nisn || '0';
        document.getElementById('p-nama').innerText = item.nama;
        document.getElementById('p-jk').innerText = item.jk === 'L' ? 'Laki-laki' : 'Perempuan';
        document.getElementById('p-ttl').innerText = `${item.tempat_lahir || '-'}, ${tglLahirFormatted}`;
        document.getElementById('p-alamat').innerText = item.alamat || '0';
        document.getElementById('p-rtrw').innerText = `${item.rt_nya || '0'} / ${item.rw_nya || '0'}`;
        document.getElementById('p-kecamatan').innerText = item.kecamatan || '0';
        document.getElementById('p-kelurahan').innerText = item.kelurahan || '0';
        document.getElementById('p-asal').innerText = item.asal_sekolah || '0';
        document.getElementById('p-ibu').innerText = item.ibu || '0';
        document.getElementById('p-telp').innerText = item.telp || '0';
        
        // Isi SPTJM
        document.getElementById('s-id').innerText = item.id;

        let oNama = "-", oTahun = "-", oKerja = "-";
        if (item.ayah && item.ayah.trim() !== "") {
            oNama = item.ayah;
            oTahun = item.tahun_ayah || "-";
            oKerja = item.pekerjaan_ayah || "-";
        } else if (item.ibu && item.ibu.trim() !== "") {
            oNama = item.ibu;
            oTahun = item.tahun_ibu || "-";
            oKerja = item.pekerjaan_ibu || "-";
        }

        document.getElementById('s-ortu-nama').innerText = oNama;
        document.getElementById('s-ortu-ttl').innerText = oTahun;
        document.getElementById('s-ortu-kerja').innerText = oKerja;
        document.getElementById('s-ortu-alamat').innerText = item.alamat || '-';
        document.getElementById('s-ortu-hp').innerText = item.telp || '-';
        document.getElementById('s-anak-nama').innerText = item.nama;
        document.getElementById('s-anak-ttl').innerText = `${item.tempat_lahir || '-'}, ${tglLahirFormatted}`;
        document.getElementById('s-anak-asal').innerText = item.asal_sekolah || '-';
        document.getElementById('s-anak-alamat').innerText = item.alamat || '-';
        document.getElementById('s-ortu-nama-bawah').innerText = oNama;
        document.getElementById('p-ortu-nama-bawah').innerText = oNama;

        // Set tanggal
        const now = new Date();
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        document.getElementById('p-date').innerText = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        document.getElementById('s-date').innerText = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        
        // Trigger cetak
        setTimeout(() => {
            window.print();
        }, 500);
        
    } catch (error) {
        console.error('Error in printTicket:', error);
        alert('Gagal mempersiapkan dokumen untuk cetak. Cek console untuk detail error.');
    }
}
```

---

### **LANGKAH 2: Perbaiki HTML Tombol Printer**

Ganti kode tombol printer di table dengan yang sudah diperbaiki:

```html
<!-- YANG LAMA (BERMASALAH) -->
<button onclick='printTicket(${JSON.stringify(item)})' ...>

<!-- YANG BARU (PERBAIKAN) -->
<button onclick="handlePrintClick(this)" data-json='${JSON.stringify(item)}' ...>
```

**Contoh lengkap:**
```javascript
function renderRecords(records) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    records.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-4 flex gap-2">
                <button 
                    type="button"
                    onclick="handlePrintClick(this)" 
                    data-json='${JSON.stringify(item)}'
                    class="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-black hover:text-white transition-all" 
                    title="Cetak">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                </button>
                <!-- Tombol edit lain jika ada -->
            </td>
            <td class="p-4 font-mono font-bold text-blue-700">${item.id}</td>
            <td class="p-4 font-bold uppercase">${item.nama}</td>
            <td class="p-4 text-gray-600">${item.umur || '-'}</td>
            <td class="p-4 text-xs uppercase text-gray-500">${item.asal_sekolah || '-'}</td>
            <td class="p-4 font-medium text-green-700">${item.telp || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Handler untuk print click
function handlePrintClick(button) {
    try {
        const jsonString = button.getAttribute('data-json');
        const item = JSON.parse(jsonString);
        printTicket(item);
    } catch (error) {
        console.error('Error parsing print data:', error);
        alert('Gagal membuka data. Silakan coba lagi.');
    }
}
```

---

### **LANGKAH 3: Buat Helper Function untuk Validasi**

Tambahkan di awal `<script>`:

```javascript
// Validasi element exists sebelum set value
function safeSetInnerText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = value || '-';
    } else {
        console.warn(`Element ${elementId} tidak ditemukan`);
    }
}

// Ganti semua document.getElementById('xxx').innerText = 
// dengan safeSetInnerText('xxx', value)
```

---

### **LANGKAH 4: Buat Versi Minimal yang Dijamin Bekerja**

Tambahkan fungsi ini untuk fallback:

```javascript
// Minimal print yang dijamin bekerja
function printQuick(item) {
    if (!item) {
        alert('Data tidak tersedia');
        return;
    }
    
    // Hanya isi field yang pasti exist
    const fields = ['p-id', 'p-nik', 'p-nama', 'p-telp'];
    
    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) {
            if (fieldId === 'p-id') el.innerText = item.id || '-';
            if (fieldId === 'p-nik') el.innerText = item.nik || '-';
            if (fieldId === 'p-nama') el.innerText = item.nama || '-';
            if (fieldId === 'p-telp') el.innerText = item.telp || '-';
        }
    });
    
    // Cetak langsung tanpa tunggu gambar
    window.print();
}
```

---

## 🔍 CHECKLIST DEBUGGING

- [ ] Console browser tidak ada error (F12 > Console)
- [ ] Fungsi `printTicket` ada di dalam `<script>`
- [ ] Element `#print-area` ada di HTML
- [ ] Button memiliki event handler yang tepat
- [ ] Data tabel loading dengan benar
- [ ] Lucide icons sudah initialized (`lucide.createIcons()`)

---

## 📝 TESTING

1. **Buka browser console** (F12)
2. **Buka tab Pendaftar** untuk load data
3. **Klik tombol printer** - harus muncul preview cetak
4. **Jika error** - copy error text dari console

---

## 🚀 QUICK FIX (JIKA MASIH BERMASALAH)

Ganti seluruh tombol printer dengan versi sederhana:

```html
<button type="button" onclick="alert('ID: ' + this.parentElement.parentElement.cells[1].innerText)" 
        class="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-black hover:text-white">
    <i data-lucide="printer" class="w-4 h-4"></i>
</button>
```

Jika ini bekerja, berarti masalahnya di `printTicket()` function.
