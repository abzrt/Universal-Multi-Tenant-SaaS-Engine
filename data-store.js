// ========================================================
// TECH SOLUTION - TICKETING SERVICES PLATFORM DATA STORE
// ========================================================

const STORAGE_KEYS = {
  COMPANIES: 'tech_companies_v6_clean',
  VESSELS: 'tech_vessels_v6_clean',
  SCHEDULES: 'tech_schedules_v6_clean',
  BOOKINGS: 'tech_bookings_v6_clean',
  CURRENT_USER_COMPANY: 'tech_current_tenant_v6',
  KSOP_SETTINGS: 'tech_ksop_settings_v6'
};

// Pembersihan total seluruh data lama saat inisialisasi versi bersih
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('tech_app_clean_reset_v6') !== 'true') {
    [
      'tech_companies_v5_live', 'tech_vessels_v5_live', 'tech_schedules_v5_live', 'tech_bookings_v5_live', 'tech_current_tenant_v5',
      STORAGE_KEYS.COMPANIES, STORAGE_KEYS.VESSELS, STORAGE_KEYS.SCHEDULES, STORAGE_KEYS.BOOKINGS, STORAGE_KEYS.CURRENT_USER_COMPANY
    ].forEach(k => {
      localStorage.removeItem(k);
    });
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    localStorage.setItem('tech_app_clean_reset_v6', 'true');
  }
} catch (e) {}

// Pengaturan Default Pejabat KSOP, Syahbandar, dan Regulasi Maritim
const DEFAULT_KSOP_SETTINGS = {
  // KSOP / Syahbandar
  ksopName: 'Capt. Agus Suherman, S.Si.T., M.Mar.',
  ksopNip: '19750812 200003 1 002',
  ksopRank: 'Pembina Utama Muda (IV/c)',
  ksopTitle: 'Kepala Kantor Kesyahbandaran dan Otoritas Pelabuhan',
  ksopOffice: 'Kantor KSOP Kelas IV Nunukan',
  ksopPort: 'Pelabuhan Tunon Taka Nunukan',

  // Petugas Keselamatan / Marine Inspector
  inspectorName: 'H. Faisal, M.M.Tr., M.Mar.Eng.',
  inspectorNip: '19820415 200604 1 008',
  inspectorTitle: 'Kasi Keselamatan Berlayar, Penjagaan & Patroli',

  // Nakhoda / Master Kapal (Default)
  masterName: 'Capt. Bambang Prakoso, M.Mar.',
  masterCertNo: 'ANT-II / 620019284',

  // Imigrasi (TPI)
  immigrationOfficer: 'Rahmat Hidayat, S.H.',
  immigrationNip: '19880920 201101 1 003',
  immigrationTitle: 'Kasubsi Lalu Lintas Keimigrasian TPI Nunukan',

  // Bea Cukai (Customs)
  customsOfficer: 'Budi Santoso, S.E.',
  customsNip: '19860314 200812 1 001',
  customsTitle: 'Pemeriksa Bea dan Cukai Pertama KPPBC Nunukan',

  // Karantina Kesehatan Pelabuhan (KKP)
  quarantineOfficer: 'dr. Siti Nurhaliza',
  quarantineNip: '19901105 201705 2 004',
  quarantineTitle: 'Dokter Karantina Kesehatan Wilker Tunon Taka',

  // Format Penomoran SPB & Regulasi
  spbPrefix: 'SPB.NNK/2026/X/',
  regulationNotice: 'Diterbitkan sesuai ketentuan Undang-Undang No. 17 Tahun 2008 tentang Pelayaran dan Peraturan Direktur Jenderal Perhubungan Laut.'
};

// Initial Registered Companies (Kosong / Tanpa Demo)
const DEFAULT_COMPANIES = [];

// Master Ports: HANYA Nunukan, Tawau (Luar Negeri), dan Parepare (Dalam Negeri)
const MASTER_PORTS = [
  {
    id: 'NNK',
    name: 'Pelabuhan Tunon Taka',
    city: 'Nunukan',
    province: 'Kalimantan Utara',
    country: 'Indonesia',
    type: 'DOMESTIC_INTERNATIONAL',
    description: 'Pelabuhan utama gerbang perbatasan Kalimantan Utara dan Selat Makassar.'
  },
  {
    id: 'TWU',
    name: 'Tawau Ferry Terminal (Pelabuhan Feri Antarabangsa)',
    city: 'Tawau',
    province: 'Sabah',
    country: 'Malaysia',
    type: 'INTERNATIONAL',
    description: 'Terminal feri internasional menghubungkan Sabah Malaysia dan Nunukan Indonesia.'
  },
  {
    id: 'PRE',
    name: 'Pelabuhan Nusantara Parepare',
    city: 'Parepare',
    province: 'Sulawesi Selatan',
    country: 'Indonesia',
    type: 'DOMESTIC',
    description: 'Pintu gerbang maritim utama menghubungkan Sulawesi Selatan dan Kalimantan Utara.'
  }
];

// Initial Vessels (Kosong / Tanpa Demo)
const DEFAULT_VESSELS = [];

// Initial Schedules (Kosong / Tanpa Demo)
const DEFAULT_SCHEDULES = [];

// Initial bookings (Kosong / Tanpa Demo)
const DEFAULT_BOOKINGS = [];

// Helper Store Functions with LocalStorage Persistence
const Store = {
  getCompanies() {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(DEFAULT_COMPANIES));
      return DEFAULT_COMPANIES;
    }
    return JSON.parse(raw);
  },

  saveCompanies(companies) {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  },

  addCompany(newComp) {
    const list = this.getCompanies();
    list.push(newComp);
    this.saveCompanies(list);
    return newComp;
  },

  getCompanyById(id) {
    return this.getCompanies().find(c => c.id === id);
  },

  updateCompany(id, updatedFields) {
    const list = this.getCompanies();
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      this.saveCompanies(list);
      const current = this.getCurrentTenant();
      if (current && current.id === id) {
        this.setCurrentTenant(list[idx]);
      }
      return list[idx];
    }
    return null;
  },

  // Vessels
  getVessels() {
    const raw = localStorage.getItem(STORAGE_KEYS.VESSELS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify(DEFAULT_VESSELS));
      return DEFAULT_VESSELS;
    }
    const list = JSON.parse(raw) || [];
    return list.map(v => {
      if (!Array.isArray(v.facilities) || v.facilities.length === 0) {
        v.facilities = ['AC Reclining', 'Toilet Bersih', 'Life Jacket KSOP'];
      }
      return v;
    });
  },

  saveVessels(vessels) {
    localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify(vessels));
  },

  addVessel(vessel) {
    if (!Array.isArray(vessel.facilities) || vessel.facilities.length === 0) {
      vessel.facilities = ['AC Reclining', 'Toilet Bersih', 'Life Jacket KSOP'];
    }
    const list = this.getVessels();
    list.push(vessel);
    this.saveVessels(list);
    return vessel;
  },

  getVesselsByCompany(companyId) {
    return this.getVessels().filter(v => v.companyId === companyId);
  },

  // Schedules
  getSchedules() {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(DEFAULT_SCHEDULES));
      return DEFAULT_SCHEDULES;
    }
    const list = JSON.parse(raw) || [];
    return list.map(s => {
      if (!Array.isArray(s.classes) || s.classes.length === 0) {
        s.classes = [
          { id: 'cls-eko', name: 'Ekonomi', price: s.priceEconomy || 250000, quota: s.quotaTotal || 200, available: 200 }
        ];
      }
      return s;
    });
  },

  saveSchedules(schedules) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  },

  addSchedule(schedule) {
    if (!Array.isArray(schedule.classes) || schedule.classes.length === 0) {
      schedule.classes = [
        { id: 'cls-eko', name: 'Ekonomi', price: schedule.priceEconomy || 250000, quota: schedule.quotaTotal || 200, available: 200 }
      ];
    }
    const list = this.getSchedules();
    list.push(schedule);
    this.saveSchedules(list);
    return schedule;
  },

  getSchedulesByCompany(companyId) {
    return this.getSchedules().filter(s => s.companyId === companyId);
  },

  // Bookings
  getBookings() {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
      return DEFAULT_BOOKINGS;
    }
    const list = JSON.parse(raw) || [];
    return list.map(b => {
      if (!Array.isArray(b.passengers)) {
        b.passengers = [];
      }
      return b;
    });
  },

  saveBookings(bookings) {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  },

  addBooking(booking) {
    const list = this.getBookings();
    list.unshift(booking);
    this.saveBookings(list);
    return booking;
  },

  getBookingsByCompany(companyId) {
    return this.getBookings().filter(b => b.companyId === companyId);
  },

  getBookingByPnr(pnr) {
    const clean = pnr.trim().toUpperCase();
    return this.getBookings().find(b => b.pnr === clean || b.barcode === clean);
  },

  updateBookingStatus(pnr, newStatus) {
    const list = this.getBookings();
    const item = list.find(b => b.pnr === pnr || b.barcode === pnr);
    if (item) {
      item.boardingStatus = newStatus;
      if (newStatus === 'BOARDED') {
        item.boardedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';
      }
      this.saveBookings(list);
      return item;
    }
    return null;
  },

  updateBooking(updatedBooking) {
    const list = this.getBookings();
    const idx = list.findIndex(b => b.pnr === updatedBooking.pnr);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedBooking };
      this.saveBookings(list);
      return list[idx];
    }
    return null;
  },

  updatePassenger(pnr, paxIndex, updatedPax) {
    const list = this.getBookings();
    const b = list.find(item => item.pnr === pnr);
    if (b && b.passengers && b.passengers[paxIndex]) {
      b.passengers[paxIndex] = { ...b.passengers[paxIndex], ...updatedPax };
      // Sync contact name if first passenger
      if (paxIndex === 0 && updatedPax.name && b.contact) {
        b.contact.name = updatedPax.name;
      }
      this.saveBookings(list);
      return b;
    }
    return null;
  },

  transferBookingVessel(pnr, transferData) {
    const list = this.getBookings();
    const b = list.find(item => item.pnr === pnr);
    if (b) {
      const oldVessel = b.vesselName;
      b.vesselId = transferData.vesselId || b.vesselId;
      b.vesselName = transferData.vesselName || b.vesselName;
      b.scheduleId = transferData.scheduleId || b.scheduleId;
      if (transferData.departTime) b.departTime = transferData.departTime;
      if (transferData.arrivalTime) b.arrivalTime = transferData.arrivalTime;
      if (transferData.pier) b.pier = transferData.pier;
      if (transferData.className) b.className = transferData.className;

      // Update seats if provided
      if (transferData.newSeat && b.passengers && b.passengers.length > 0) {
        b.passengers[0].seat = transferData.newSeat;
      }

      // Append transfer audit remark
      const transferAuditNote = `[TRANSFER KAPAL: Dari ${oldVessel} ke ${b.vesselName} (${new Date().toLocaleDateString('id-ID')}) - Ket: ${transferData.reason || 'Operasional'}]`;
      b.transferHistory = b.transferHistory || [];
      b.transferHistory.push({
        date: new Date().toISOString(),
        fromVessel: oldVessel,
        toVessel: b.vesselName,
        reason: transferData.reason || 'Operasional Pelabuhan'
      });

      if (b.passengers && b.passengers[0]) {
        b.passengers[0].remark = b.passengers[0].remark 
          ? `${b.passengers[0].remark} • ${transferAuditNote}` 
          : transferAuditNote;
      }

      this.saveBookings(list);
      return b;
    }
    return null;
  },

  batchTransferPassengers(pnrList, transferData) {
    if (!Array.isArray(pnrList) || pnrList.length === 0) return 0;
    const list = this.getBookings();
    let count = 0;

    list.forEach(b => {
      if (pnrList.includes(b.pnr)) {
        const oldVessel = b.vesselName;
        b.vesselId = transferData.vesselId || b.vesselId;
        b.vesselName = transferData.vesselName || b.vesselName;
        b.scheduleId = transferData.scheduleId || b.scheduleId;
        if (transferData.departTime) b.departTime = transferData.departTime;
        if (transferData.arrivalTime) b.arrivalTime = transferData.arrivalTime;
        if (transferData.pier) b.pier = transferData.pier;

        // Auto assign seat or preserve
        if (transferData.seatMode === 'PRESERVE') {
          // Keep current seat
        } else if (transferData.seatMode === 'AUTO') {
          // Sequential seat allocation in destination vessel
          if (b.passengers) {
            b.passengers.forEach((p, pIdx) => {
              const seatNum = String(count + pIdx + 1).padStart(2, '0');
              p.seat = `B-${seatNum}`;
            });
          }
        } else if (transferData.seatMap && transferData.seatMap[b.pnr]) {
          if (b.passengers && b.passengers[0]) {
            b.passengers[0].seat = transferData.seatMap[b.pnr];
          }
        }

        const transferAuditNote = `[TRANSFER KAPAL MASSAL: Dari ${oldVessel} ke ${b.vesselName} (${new Date().toLocaleDateString('id-ID')}) - Ket: ${transferData.reason || 'Operasional'}]`;
        b.transferHistory = b.transferHistory || [];
        b.transferHistory.push({
          date: new Date().toISOString(),
          fromVessel: oldVessel,
          toVessel: b.vesselName,
          reason: transferData.reason || 'Operasional Pelabuhan'
        });

        if (b.passengers) {
          b.passengers.forEach(p => {
            p.remark = p.remark ? `${p.remark} • ${transferAuditNote}` : transferAuditNote;
          });
        }
        count++;
      }
    });

    this.saveBookings(list);
    return count;
  },

  // Current Logged In Company Session
  getCurrentTenant() {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_COMPANY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setCurrentTenant(tenantObj) {
    if (!tenantObj) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_COMPANY);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_COMPANY, JSON.stringify(tenantObj));
    }
  },

  // Pengaturan Pejabat KSOP & Regulasi Maritim
  getKsopSettings() {
    const raw = localStorage.getItem(STORAGE_KEYS.KSOP_SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.KSOP_SETTINGS, JSON.stringify(DEFAULT_KSOP_SETTINGS));
      return { ...DEFAULT_KSOP_SETTINGS };
    }
    try {
      return { ...DEFAULT_KSOP_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT_KSOP_SETTINGS };
    }
  },

  saveKsopSettings(settings) {
    const merged = { ...DEFAULT_KSOP_SETTINGS, ...settings };
    localStorage.setItem(STORAGE_KEYS.KSOP_SETTINGS, JSON.stringify(merged));
    return merged;
  },

  // Hapus semua data transaksi & master data di aplikasi
  clearAllData() {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_COMPANY);
      localStorage.removeItem('tech_current_tenant_v5');
      return true;
    } catch (e) {
      console.error('Gagal menghapus data aplikasi:', e);
      return false;
    }
  }
};

// Format Rupiah Currency Helper
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Global window exposure
if (typeof window !== 'undefined') {
  window.Store = Store;
  window.logoutTenant = function() {
    try {
      if (window.Store && typeof window.Store.setCurrentTenant === 'function') {
        window.Store.setCurrentTenant(null);
      } else {
        localStorage.removeItem('tech_current_tenant_v5');
      }
    } catch (e) {
      localStorage.removeItem('tech_current_tenant_v5');
    }

    if (window.App && typeof window.App.logoutTenant === 'function') {
      window.App.logoutTenant();
    } else {
      document.body.classList.remove('in-company-portal');
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      const wp = document.getElementById('viewWeatherHome');
      if (wp) wp.classList.add('active');
      window.location.reload();
    }
  };
}
