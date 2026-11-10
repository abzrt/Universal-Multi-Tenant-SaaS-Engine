# TECH SOLUTION — TICKETING SERVICES PLATFORM
## Sistem Tiketing Khusus Perusahaan Pelayaran & Pantauan Cuaca Maritim BMKG

**TickyTECH** adalah platform ticketing *cloud* berskala *enterprise* dengan arsitektur **Multi-Tenant SaaS (Ticketing Services Platform)**. Aplikasi ini difokuskan secara eksklusif untuk **proses tiketing resmi sesuai ketentuan perusahaan pelayaran terdaftar**, dengan integrasi **Pusat Informasi Cuaca Maritim BMKG** pada halaman awal dan **Modal Masuk Mitra Operator** yang hanya muncul saat tombol login diklik.

---

## 🏛️ Alur Tampilan & Interaksi Pengguna

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HEADER NAVIGASI UTAMA                                       │
│  [ TECH SOLUTION ]      [ 🚢 Sistem Tiketing Perusahaan Pelayaran anda ]      [ Masuk Mitra Operator ] │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               │                                                               │
┌──────────────▼────────────────────────────────┐             ┌────────────────▼──────────────────────────────┐
│  HALAMAN AWAL: PANTAUAN CUACA MARITIM BMKG    │             │  MODAL LOGIN & REGISTRASI PERUSAHAAN          │
│  (Aktif Secara Default Pada Landing Page)     │             │  (Hanya Muncul Saat Klik 'Masuk Mitra Operator')│
└──────────────┬────────────────────────────────┘             └────────────────┬──────────────────────────────┘
               │                                                               │
  • Data Cuaca Maritim Resmi BMKG (maritim.bmkg.go.id)           • Masuk Instan Portal Operator Terdaftar
  • Rute 1: Nunukan ⇄ Tawau (Laut Sulawesi & Teluk Cowie)         • Form Login Admin Perusahaan (Email & Sandi)
  • Rute 2: Nunukan ⇄ Parepare (Selat Makassar)                  • Form Registrasi Perusahaan Baru:
  • Tinggi Gelombang Signifikan, Angin, Suhu, Pasang Surut         - Kapal Penumpang Internasional (Nunukan-Tawau)
  • Prakiraan Cuaca Pelayaran 3 Hari (72 Jam)                      - Kapal Penumpang Domestik (Nunukan-Parepare)
  • Rekomendasi Keselamatan Syahbandar Pelabuhan                 • Otomatisasi Pembuatan Portal Masuk Baru
                                                                               │
                                                                               ▼
                                                              ┌───────────────────────────────────────────────┐
                                                              │   DASHBOARD TIKETING PERUSAHAAN TERDAFTAR     │
                                                              │   • 🎫 Proses Tiket Baru (Loket Perusahaan)   │
                                                              │   • Kelola Armada Kapal & Jadwal Pelayaran    │
                                                              │   • Manifest Ditjen Hubla & Gate Scanner      │
                                                              └───────────────────────────────────────────────┘
```

---

## 🌊 Informasi Cuaca Maritim BMKG di Halaman Awal

Halaman awal menampilkan data cuaca maritim real-time berdasarkan web BMKG Maritim untuk 2 koridor resmi:

### 1. 🌏 Perjalanan Luar Negeri: Nunukan ⇄ Tawau (Sabah, Malaysia)
- **Wilayah Perairan**: Laut Sulawesi Bagian Barat & Teluk Cowie.
- **Tinggi Gelombang**: `0.25 - 0.75 Meter` (Kategori: Tenang / Rendah).
- **Kecepatan & Arah Angin**: `8 - 14 Knot` dari arah Timur Laut.
- **Kondisi Cuaca**: Cerah Berawan (`29°C - 31°C`), Kelembapan `76% - 82%`.
- **Jarak Pandang**: `> 10 KM` (Sangat Baik).
- **Pasang Surut**: Pasang `+2.3 m` / Surut `+0.7 m`.
- **Rekomendasi BMKG**: Sangat aman untuk Speedboat Katamaran dan Kapal Lintas Batas.

### 2. 🇮🇩 Perjalanan Dalam Negeri: Nunukan ⇄ Parepare (Sulawesi Selatan)
- **Wilayah Perairan**: Selat Makassar Bagian Utara & Tengah.
- **Tinggi Gelombang**: `0.75 - 1.25 Meter` (Kategori: Rendah).
- **Kecepatan & Arah Angin**: `10 - 16 Knot` dari arah Tenggara.
- **Kondisi Cuaca**: Berawan Sejuk (`28°C - 32°C`), Kelembapan `74% - 85%`.
- **Arus Permukaan Laut**: `0.2 - 0.4 m/s` mengarah ke Selatan.
- **Rekomendasi BMKG**: Aman & normal untuk Kapal Penumpang Samudera (KM Bukit Siguntang, KM Thalia).

---

## ⚡ Modal Masuk Mitra Operator & Registrasi Perusahaan

Login masuk portal dan pendaftaran perusahaan baru **tidak lagi memenuhi halaman awal**, melainkan diakses melalui **Modal Layer** (`#modalCompanyAuth`) yang hanya tampil ketika pengguna mengklik:
1. Tombol **"Masuk Mitra Operator"** di sudut kanan atas navbar.
2. Tombol **"Masuk Mitra Operator Perusahaan"** pada banner cuaca BMKG.
3. Tombol bergerak di navbar header.

Ketika modal dibuka:
- Operator terdaftar dapat masuk instan menggunakan tombol cepat (*One-Click Portal*).
- Operator dapat masuk menggunakan kredensial email & password perusahaan.
- Operator baru dapat mendaftar dengan 2 pilihan kategori resmi:
  1. `Kapal Penumpang Internasional (Nunukan - Tawau)`
  2. `Kapal Penumpang Domestik (Nunukan - Parepare)`

Setelah pendaftaran/login, modal tertutup secara otomatis dan operator langsung masuk ke dashboard kerja mereka.

---

## 🏢 Status Data Perusahaan

Seluruh **data demo perusahaan awal telah dihapus**. Sistem kini beroperasi dalam status bersih (*clean state*):
- Basis data perusahaan, armada, jadwal, dan manifest awal bernilai kosong (`[]`).
- Perusahaan baru dapat langsung didaftarkan melalui form **"Daftarkan Perusahaan Baru"** pada modal masuk operator.
- Setelah pendaftaran, portal login instan serta armada kapal perdana perusahaan tersebut akan langsung dibuat dan aktif secara otomatis.

---

## 📐 Penyesuaian Tampilan (Compact UI)

Sistem telah disesuaikan agar tampilan lebih ringkas, proporsional, dan nyaman dilihat di berbagai ukuran layar:
- **Base Root Font**: Disesuaikan ke `14px` (skala proporsional turun ~12.5% secara konsisten).
- **Hero & Banner BMKG**: Padding dikurangi dari `2rem 2.5rem` menjadi `1.35rem 1.75rem` dengan ukuran judul dan subjudul yang lebih padat.
- **Kartu Cuaca & Metrik**: Ukuran nilai ombak, ikon cuaca, dan kartu sub-informasi dirampingkan tanpa mengurangi keterbacaan.
- **Modal Masuk & Registrasi**: Lebar modal dan padding kartu formulir diringkas (`max-width: 860px`, padding input dan tombol lebih proporsional).
- **Dasbor Operator**: KPI card, baris tabel jadwal, dan manifest penumpang dirapikan agar memuat lebih banyak data dalam satu layar.

Aplikasi aktif dan dapat diakses pada:
- **Lokal Dev Server**: [http://localhost:8086](http://localhost:8086)
- **GitHub Repository**: [https://github.com/abzrt/universal-ticketing-saas](https://github.com/abzrt/universal-ticketing-saas)

---

## ⚓ Fitur Maritim 1 sampai 4 (Terapan Sesuai Standar Easybook & KSOP)

### 1. 📋 Alur Pemesanan & Manifest Penumpang
- **Rute Internasional (Nunukan ⇄ Tawau, Sabah)**:
  - Mewajibkan identitas resmi lintas batas: Paspor RI, Paspor Asing, atau Pas Lintas Batas (PLB).
  - Validasi otomatis masa berlaku paspor minimal **6 bulan** ke depan dari tanggal keberangkatan.
  - Perekaman kewarganegaraan, tanggal lahir, dan jenis kelamin untuk kebutuhan pelaporan TPI Imigrasi Nunukan.
- **Rute Domestik (Nunukan ⇄ Parepare)**:
  - Mewajibkan NIK KTP (16 digit) atau Kartu Identitas Anak (KIA) sesuai standar Ditjen Hubla.

### 2. 💺 Manajemen Kapasitas & Tata Letak Kursi (Seat Selection)
- **Pilihan Kelas Tiket Multi-Deck**:
  - `Ekonomi (Main Deck)`: Kursi standar nyaman dengan alur lorong utama.
  - `Bisnis (Upper Deck)`: Kursi lega dek atas dengan fasilitas sandaran rebah (+Rp 35.000 / +RM 15).
  - `VIP (Stateroom Cabin)`: Kabin ber-AC eksklusif dengan privasi (+Rp 85.000 / +RM 35).
- **Visual Deck & Aisle Grid**:
  - Visualisasi tata letak tempat duduk dengan pemisah lorong kapal (*aisle*).
  - Penandaan status: Kursi Tersedia, Terpilih, dan Terisi/Booked.
  - Kalkulasi subtotal biaya tiket secara *realtime* berdasarkan kelas yang dipilih.

### 3. 🎫 Penerbitan Boarding Pass & Validasi Tiket
- **E-Boarding Pass Resmi**:
  - Diterbitkan dengan QR Code vektor SVG mandiri murni matematika (tanpa library eksternal, 100% offline).
  - Barcode 1D estetis, Kode Booking PNR (6 digit), nomor kursi, kelas dek, dan data kapal.
  - Integrasi tombol kirim e-tiket instan via WhatsApp (`https://wa.me/`).
- **Gate Scanner Anti-Duplikasi**:
  - Scanner tiket di pelabuhan dengan deteksi anti-duplikasi ganda.
  - Jika tiket sudah pernah digunakan (*BOARDED*), sistem memberikan peringatan keras dengan waktu check-in (WITA) pertama.

### 4. 🚢 Laporan & Integrasi Syahbandar / Manifest Pelabuhan
- **Toolbar Manifest Penumpang**:
  - Filter pencarian cepat nama penumpang/PNR, rute pelayaran, dan status keberangkatan (*BOARDED* vs *CONFIRMED*).
  - Indikator ringkasan penumpang: Total Pax, Penumpang Naik, Belum Boarding, WNI, dan WNA.
- **Export CSV Manifest**:
  - Menghasilkan file CSV standar KSOP (`Manifest_KSOP_[KodeKapal]_[Tanggal].csv`) sekali klik.
- **Dokumen Resmi Port Clearance KSOP**:
  - Modal cetak dokumen izin berlayar lengkap dengan kop surat pelayaran, rincian nakhoda & IMO kapal, serta kolom tanda tangan tripel: Nakhoda Kapal (*Master*), Petugas Imigrasi, dan Pejabat Kesyahbandaran (KSOP).

