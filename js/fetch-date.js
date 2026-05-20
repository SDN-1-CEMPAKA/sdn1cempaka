/**
 * INTEGRASI PENGAMBILAN TANGGAL DARI GOOGLE SHEETS
 * File: js/fetch-date.js
 * Fungsi untuk mengambil tanggal terakhir dari Google Sheet
 * dan mengisikan ke form pendaftaran
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwO2f1gpvDBxQM3b9CR5FqSdTP5vtazDgdU0w-zR5CbRJ4OllYHHHxxrq8veX5_sqOF/exec";

/**
 * Fetch tanggal terakhir dari Google Sheets
 * Mengambil data dari kolom time_added (waktu pendaftaran)
 */
async function fetchLatestDateFromSheet() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=readAll&sheet=pendaftar`);
        const data = await response.json();
        
        if (data.status === "sukses" && data.records && data.records.length > 0) {
            // Ambil record terakhir
            const lastRecord = data.records[data.records.length - 1];
            
            // Ambil time_added dari record terakhir
            if (lastRecord.time_added) {
                return parseSheetDate(lastRecord.time_added);
            }
        }
        
        // Fallback ke tanggal hari ini
        return new Date();
    } catch (error) {
        console.error('Error fetching date from Google Sheets:', error);
        return new Date(); // Fallback ke tanggal hari ini
    }
}

/**
 * Parse tanggal dari format Google Sheets
 * Format: "DD/MM/YYYY, HH:MM:SS" atau "YYYY-MM-DD HH:MM:SS"
 */
function parseSheetDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return new Date();
    }
    
    // Bersihkan string
    const cleanDate = dateString.trim();
    
    try {
        // Format: "20/5/2026, 10:30:45" (dari toLocaleString('id-ID'))
        if (cleanDate.includes('/') && cleanDate.includes(',')) {
            const parts = cleanDate.split(',')[0].split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // 0-indexed
                const year = parseInt(parts[2], 10);
                const parsed = new Date(year, month, day);
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
        }
        
        // Format: "2026-05-20 10:30:45"
        if (cleanDate.includes('-') && cleanDate.includes(' ')) {
            const parts = cleanDate.split(' ')[0].split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const parsed = new Date(year, month, day);
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
        }
        
        // Coba parse langsung
        const parsed = new Date(cleanDate);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    } catch (e) {
        console.error('Error parsing date:', dateString, e);
    }
    
    return new Date(); // Fallback
}

/**
 * Set nilai tanggal ke input field form
 * Format yang diharapkan: YYYY-MM-DD (untuk input type="date")
 */
function setDateToFormField(dateObj, fieldId = 'f-tgl-lahir') {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        dateObj = new Date();
    }
    
    // Format untuk input type="date": YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day}`;
    
    const field = document.getElementById(fieldId);
    if (field) {
        field.value = formattedDate;
        
        // Trigger change event untuk calculate age
        if (typeof calculateAge === 'function') {
            calculateAge();
        }
        
        return true;
    }
    
    return false;
}

/**
 * Initialize: Fetch dan set tanggal saat halaman dimuat
 */
async function initializeDateFromSheet() {
    const date = await fetchLatestDateFromSheet();
    setDateToFormField(date, 'f-tgl-lahir');
}

/**
 * Refresh tanggal dengan tombol (optional)
 */
async function refreshDateFromSheet() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.remove('hidden');
    }
    
    try {
        const date = await fetchLatestDateFromSheet();
        const success = setDateToFormField(date, 'f-tgl-lahir');
        
        // Tampilkan notifikasi
        if (success) {
            showNotification('Tanggal berhasil diambil dari Google Sheet!', 'success');
        }
    } catch (error) {
        console.error('Error refreshing date:', error);
        showNotification('Gagal mengambil tanggal dari Google Sheet', 'error');
    } finally {
        if (loader) {
            loader.classList.add('hidden');
        }
    }
}

/**
 * Helper: Tampilkan notifikasi ke user
 */
function showNotification(message, type = 'info') {
    // Gunakan modal yang sudah ada atau alert
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalIcon = document.getElementById('modal-icon');
    
    if (modalTitle && modalMessage) {
        modalTitle.textContent = type === 'success' ? '✓ Berhasil' : '⚠ Informasi';
        modalMessage.textContent = message;
        
        // Update warna berdasarkan tipe
        const modal = document.getElementById('modal-ui');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 3000);
        }
    } else {
        alert(message);
    }
}

/**
 * Auto-trigger saat DOM ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDateFromSheet);
} else {
    initializeDateFromSheet();
}

// Export untuk digunakan di file lain
window.fetchLatestDateFromSheet = fetchLatestDateFromSheet;
window.setDateToFormField = setDateToFormField;
window.refreshDateFromSheet = refreshDateFromSheet;
window.initializeDateFromSheet = initializeDateFromSheet;
