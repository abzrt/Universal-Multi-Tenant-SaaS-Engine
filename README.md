# Universal Maritime Ticketing SaaS Platform 🚢⚓

Sistem Tiketing & Manajemen Operasional Perusahaan Pelayaran Terdaftar yang terintegrasi dengan Stasiun Cuaca Maritim BMKG.

## 🌟 Fitur Utama

- **Integrasi Cuaca Maritim BMKG (Halaman Depan)**:
  - Informasi prakiraan tinggi gelombang laut, kecepatan angin, pasang surut, dan kelayakan berlayar resmi BMKG Maritim.
  - Mendukung 2 rute operasional perusahaan terdaftar:
    1. **Kapal Penumpang Internasional (Nunukan - Tawau)**
    2. **Kapal Penumpang Domestik (Nunukan - Parepare)**
- **Portal & Registrasi Mitra Operator**:
  - Akses modal eksklusif melalui tombol *"Masuk Mitra Operator"*.
  - Pendaftaran perusahaan pelayaran baru dengan otomatisasi provisi armada kapal dan jadwal perdana.
  - Login cepat (*One-Click Portal*) untuk mitra terdaftar maupun login kredensial email.
- **Dasbor Manajemen Pelayaran**:
  - Manajemen armada kapal (nama, IMO/registrasi, fasilitas, status).
  - Manajemen jadwal pelayaran (jadwal berangkat, kedatangan, harga tiket, kuota kursi).
  - Manajemen manifest dan penerbitan tiket penumpang.
  - Ringkasan KPI dan analitik pendapatan.
- **Desain Modern & Compact**:
  - Antarmuka bertema maritim modern dengan tipografi terkalibrasi (*Plus Jakarta Sans* & *Space Grotesk*).
  - Desain responsif dan proporsional untuk operasional harian operator pelayaran.

## 📁 Struktur Direktori

```
├── index.html       # Halaman utama aplikasi (BMKG Weather & Operator Modals)
├── app.js           # Controller & logika interaksi antarmuka
├── data-store.js    # Store manajemen data (localStorage persisten)
├── style.css        # Desain sistem & styling compact UI
└── assets/          # Aset grafis armada dan interior kapal
```

## 🚀 Menjalankan Secara Lokal

Buka terminal pada direktori proyek dan jalankan server lokal:

```bash
# Menggunakan Python
python -m http.server 8086

# Atau menggunakan Node.js (npx serve / http-server)
npx serve -l 8086
```

Buka peramban di `http://localhost:8086`.

## 📜 Lisensi
Hak Cipta © 2026 Platform Tiketing Perusahaan Pelayaran.
