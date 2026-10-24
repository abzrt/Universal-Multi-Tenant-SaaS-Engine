// ========================================================
// TECH SOLUTION - TICKETING SERVICES PLATFORM DATA STORE
// ========================================================

const STORAGE_KEYS = {
  COMPANIES: 'tech_companies_v5_live',
  VESSELS: 'tech_vessels_v5_live',
  SCHEDULES: 'tech_schedules_v5_live',
  BOOKINGS: 'tech_bookings_v5_live',
  CURRENT_USER_COMPANY: 'tech_current_tenant_v5'
};

// Initial Registered Companies (Kosong / Tanpa Demo - Siap didaftarkan oleh pengguna)
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

  // Vessels
  getVessels() {
    const raw = localStorage.getItem(STORAGE_KEYS.VESSELS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify(DEFAULT_VESSELS));
      return DEFAULT_VESSELS;
    }
    return JSON.parse(raw);
  },

  saveVessels(vessels) {
    localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify(vessels));
  },

  addVessel(vessel) {
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
    return JSON.parse(raw);
  },

  saveSchedules(schedules) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  },

  addSchedule(schedule) {
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
    return JSON.parse(raw);
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

  // Current Logged In Company Session
  getCurrentTenant() {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_COMPANY);
    if (!raw) return null;
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
