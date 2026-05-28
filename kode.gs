/**
 * Fungsi utama untuk mengatur rute halaman dan API.
 */
function doGet(e) {
  var page = e.parameter.p;
  var op = e.parameter.action;

  // --- LOGIKA NAVIGASI HALAMAN (HTML) ---
  if (page) {
    try {
      return HtmlService.createTemplateFromFile(page)
        .evaluate()
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setTitle(page === 'index' ? 'Formulir PPDB - SDN 1 Cempaka' : 'SDN 1 Cempaka - Beranda');
    } catch (err) {
      return HtmlService.createHtmlOutput("<h1>Error 404</h1><p>File HTML '" + page + "' tidak ditemukan.</p>");
    }
  }

  // --- LOGIKA API DATABASE (JSON) ---
  if (op) {
    var ss = SpreadsheetApp.openById("1DrIiuawc_qRYW3bo-FZJtPKOSkDkZ7O_4WjK4vOj4AE");
    var namasheet = e.parameter.sheet || "pendaftar"; 
    var sheet = ss.getSheetByName(namasheet);

    // Jika sheet belum ada, buat otomatis dengan header lengkap
    if (!sheet) {
      sheet = ss.insertSheet(namasheet);
      var headers = [
        "Waktu Daftar", "ID Pendaftaran", "NIK", "NISN", "Nama Lengkap", 
        "Jenis Kelamin", "Tempat Lahir", "Tanggal Lahir", "Umur", "Agama", 
        "No Akta", "No KK", "Alamat", "RT", "RW", "Dusun", "Provinsi", 
        "Kota/Kab", "Kecamatan", "Kelurahan", "Kode Pos", "Tempat Tinggal", 
        "Transportasi", "Anak Ke", "Asal Sekolah", "Nama Ayah", "NIK Ayah", 
        "Tahun Lahir Ayah", "Pendidikan Ayah", "Pekerjaan Ayah", "Penghasilan Ayah", 
        "Nama Ibu", "NIK Ibu", "Tahun Lahir Ibu", "Pendidikan Ibu", "Pekerjaan Ibu", 
        "Penghasilan Ibu", "No Telp/WA", "Email", "Berat Badan", "Tinggi Badan", 
        "Lingkar Kepala", "Jarak Sekolah", "Waktu Jam", "Waktu Menit", 
        "Jumlah Saudara", "Petugas Input", "Waktu Update"
      ];
      sheet.appendRow(headers);
    }

    if (op == "insert") return insert_value(e, sheet, ss);
    if (op == "update") return update_value(e, sheet, ss);
    if (op == "delete") return delete_value(e, sheet, ss);
    if (op == "readAll") return read_all_value(e, ss);
    if (op == "readValidation") {
      var statuses = get_all_validation_statuses();
      return ContentService.createTextOutput(JSON.stringify({"status": "sukses", "data": statuses})).setMimeType(ContentService.MimeType.JSON);
    }
    if (op == "submitValidation") {
      var nisn = e.parameter.nisn;
      return ContentService.createTextOutput(JSON.stringify({"status": submit_validation_to_gs(nisn)})).setMimeType(ContentService.MimeType.JSON);
    }
    if (op == "getNextID") return get_next_id(sheet);
    if (op == "getSingle") return get_single_value(e, sheet);
  }

  // Default jika tidak ada parameter sama sekali
  return HtmlService.createTemplateFromFile('beranda')
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('SDN 1 Cempaka - Beranda');
}

/**
 * Fungsi WAJIB untuk menangani request POST dari antarmuka Web (seperti Fetch API).
 * Semua parameter POST akan diteruskan ke logika doGet agar tidak perlu membuat logika ganda.
 */
function doPost(e) {
  return doGet(e);
}

/**
 * Fungsi untuk mengambil URL aplikasi secara otomatis
 */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * Fungsi Mengambil Data Tunggal (Cek ID atau Fitur Cetak)
 */
function get_single_value(e, sheet) {
  var id = e.parameter.id;
  var lr = sheet.getLastRow();
  if (lr <= 1) return ContentService.createTextOutput(JSON.stringify({"status": "kosong"})).setMimeType(ContentService.MimeType.JSON);
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var properties = headers.map(function(p) { 
    return p.toString().toLowerCase().replace(/\s+/g, '_'); 
  });
  
  var rows = sheet.getRange(2, 1, lr - 1, sheet.getLastColumn()).getValues();
  for (var i = rows.length - 1; i >= 0; i--) { 
    if (rows[i][1].toString() === id.toString()) {
      var record = {};
      for (var p = 0; p < properties.length; p++) {
        record[properties[p]] = rows[i][p];
      }
      return ContentService.createTextOutput(JSON.stringify({"status": "sukses", "data": record})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "tidak ditemukan"})).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menghasilkan ID Pendaftaran otomatis (PPDB-2627-01)
 */
function get_next_id(sheet) {
  var lastRow = sheet.getLastRow();
  var nextNum = 1;
  if (lastRow > 1) {
    var lastId = sheet.getRange(lastRow, 2).getValue().toString();
    var parts = lastId.split('-');
    if (parts.length === 3) {
      var lastNum = parseInt(parts[2]);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
  }
  var formattedNum = nextNum.toString().padStart(2, '0');
  return ContentService.createTextOutput(JSON.stringify({"status": "sukses", "nextID": "PPDB-2627-" + formattedNum})).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fungsi pembantu setelah operasi CRUD sukses
 */
function lanjutkan(ss) {
  var output = ContentService.createTextOutput();
  var data = { "status": "sukses", "records": readData_(ss, "pendaftar") };
  output.setContent(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Simpan Data Baru
 */
function insert_value(request, sheet, ss) {
  var id = request.parameter.id;
  var lr = sheet.getLastRow();
  
  if (lr > 1) {
    var data = sheet.getRange(2, 2, lr - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id) return ContentService.createTextOutput(JSON.stringify({"status": "duplikat"})).setMimeType(ContentService.MimeType.JSON);
    }
  }

  var d = new Date();
  var timeUpload = d.toLocaleString('id-ID');
  
  var rowData = [
    timeUpload, id, 
    request.parameter.nik || "", request.parameter.nisn || "", request.parameter.nama || "", 
    request.parameter.jk || "", request.parameter.tempat_lahir || "", request.parameter.tgl_lahir || "", 
    request.parameter.umur || "", request.parameter.agama || "", request.parameter.no_akta || "", 
    request.parameter.no_kk || "", request.parameter.alamat || "", request.parameter.rt_nya || "", 
    request.parameter.rw_nya || "", request.parameter.dusun || "", request.parameter.prov || "", 
    request.parameter.kota || "", request.parameter.kecamatan || "", request.parameter.kelurahan || "", 
    request.parameter.kode_pos || "", request.parameter.tinggal || "", request.parameter.transportasi || "", 
    request.parameter.anak_ke || "", request.parameter.asal_sekolah || "", request.parameter.ayah || "", 
    request.parameter.nik_ayah || "", request.parameter.tahun_ayah || "", request.parameter.pendidikan_ayah || "", 
    request.parameter.pekerjaan_ayah || "", request.parameter.penghasilan_ayah || "", request.parameter.ibu || "", 
    request.parameter.nik_ibu || "", request.parameter.tahun_ibu || "", request.parameter.pendidikan_ibu || "", 
    request.parameter.pekerjaan_ibu || "", request.parameter.penghasilan_ibu || "", request.parameter.telp || "", 
    request.parameter.email || "", request.parameter.berat || "", request.parameter.tinggi || "", 
    request.parameter.kepala || "", request.parameter.jarak || "", request.parameter.waktu_jam || "", 
    request.parameter.waktu_menit || "", request.parameter.saudara || "", request.parameter.added_by || "User", 
    timeUpload
  ];
  
  sheet.appendRow(rowData);
  return lanjutkan(ss);
}

/**
 * Update Data
 */
function update_value(request, sheet, ss) {
  var id = request.parameter.id;
  var lr = sheet.getLastRow();
  var data = sheet.getRange(1, 2, lr, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == id) {
      var row = i + 1;
      var timeUpdate = new Date().toLocaleString('id-ID');
      
      // Update mulai dari kolom NIK (Kolom 3)
      sheet.getRange(row, 3, 1, 44).setValues([[
        request.parameter.nik, request.parameter.nisn, request.parameter.nama, 
        request.parameter.jk, request.parameter.tempat_lahir, request.parameter.tgl_lahir, 
        request.parameter.umur, request.parameter.agama, request.parameter.no_akta, 
        request.parameter.no_kk, request.parameter.alamat, request.parameter.rt_nya, 
        request.parameter.rw_nya, request.parameter.dusun, request.parameter.prov, 
        request.parameter.kota, request.parameter.kecamatan, request.parameter.kelurahan, 
        request.parameter.kode_pos, request.parameter.tinggal, request.parameter.transportasi, 
        request.parameter.anak_ke, request.parameter.asal_sekolah, request.parameter.ayah, 
        request.parameter.nik_ayah, request.parameter.tahun_ayah, request.parameter.pendidikan_ayah, 
        request.parameter.pekerjaan_ayah, request.parameter.penghasilan_ayah, request.parameter.ibu, 
        request.parameter.nik_ibu, request.parameter.tahun_ibu, request.parameter.pendidikan_ibu, 
        request.parameter.pekerjaan_ibu, request.parameter.penghasilan_ibu, request.parameter.telp, 
        request.parameter.email, request.parameter.berat, request.parameter.tinggi, 
        request.parameter.kepala, request.parameter.jarak, request.parameter.waktu_jam, 
        request.parameter.waktu_menit, request.parameter.saudara
      ]]);
      sheet.getRange(row, 48).setValue(timeUpdate);
      return lanjutkan(ss);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "tidak ditemukan"})).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Hapus Data
 */
function delete_value(request, sheet, ss) {
  var id = request.parameter.id;
  var lr = sheet.getLastRow();
  var data = sheet.getRange(1, 2, lr, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return lanjutkan(ss);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "tidak ditemukan"})).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Baca Semua Data
 */
function read_all_value(request, ss) {
  var sheetName = request.parameter.sheet || "pendaftar";
  var data = { "status": "sukses", "records": readData_(ss, sheetName) };
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fungsi Internal Baca Data
 */
function readData_(ss, sheetname) {
  var sh = ss.getSheetByName(sheetname);
  var lastRow = sh.getLastRow();
  if (lastRow <= 1) return [];
  var properties = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(p) { 
    return p.toString().toLowerCase().replace(/\s+/g, '_'); 
  });
  var rows = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  var data = [];
  for (var r = 0; r < rows.length; r++) {
    var record = {};
    for (var p = 0; p < properties.length; p++) record[properties[p]] = rows[r][p];
    data.push(record);
  }
  return data;
}

/**
 * Fungsi untuk mengambil semua status validasi dari sheet "validasi_tka"
 */
function get_all_validation_statuses() {
  var ss = SpreadsheetApp.openById("1DrIiuawc_qRYW3bo-FZJtPKOSkDkZ7O_4WjK4vOj4AE");
  var sheet = ss.getSheetByName("validasi_tka");
  if (!sheet) return {};
  
  var data = sheet.getDataRange().getValues();
  var statuses = {};
  for (var i = 1; i < data.length; i++) { // Skip header
    statuses[data[i][0].toString()] = data[i][1];
  }
  return statuses;
}

/**
 * Fungsi untuk menyimpan status validasi per NISN ke sheet "validasi_tka"
 */
function submit_validation_to_gs(nisn) {
  var ss = SpreadsheetApp.openById("1DrIiuawc_qRYW3bo-FZJtPKOSkDkZ7O_4WjK4vOj4AE");
  var sheet = ss.getSheetByName("validasi_tka");
  
  if (!sheet) {
    sheet = ss.insertSheet("validasi_tka");
    sheet.appendRow(["NISN", "Status", "Waktu Validasi"]);
  }
  
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === nisn.toString()) {
      foundRow = i + 1;
      break;
    }
  }
  
  var now = new Date().toLocaleString('id-ID');
  if (foundRow > 0) {
    sheet.getRange(foundRow, 2).setValue("Sudah Validasi");
    sheet.getRange(foundRow, 3).setValue(now);
  } else {
    sheet.appendRow([nisn, "Sudah Validasi", now]);
  }
  return "sukses";
}
