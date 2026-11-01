// ========================================================
// TECH SOLUTION - TICKETING SERVICES PLATFORM DATA STORE
// ========================================================

const STORAGE_KEYS = {
  COMPANIES: 'tech_companies_v6_clean',
  VESSELS: 'tech_vessels_v6_clean',
  SCHEDULES: 'tech_schedules_v6_clean',
  BOOKINGS: 'tech_bookings_v6_clean',
  CURRENT_USER_COMPANY: 'tech_current_tenant_v6',
  KSOP_SETTINGS: 'tech_ksop_settings_v6',
  AGENTS: 'tech_agents_v6',
  CARGO_RECORDS: 'tech_cargo_v6',
  PEAK_SEASON: 'tech_peak_season_v6',
  OFFLINE_SCAN_QUEUE: 'tech_offline_scans_v6',
  IMMIGRATION_WATCHLIST: 'tech_watchlist_v6',
  PORT_PASS: 'tech_port_pass_v6'
};

// Pembersihan total seluruh data lama saat inisialisasi versi bersih
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('tech_app_clean_reset_v7') !== 'true') {
    [
      'tech_companies_v5_live', 'tech_vessels_v5_live', 'tech_schedules_v5_live', 'tech_bookings_v5_live', 'tech_current_tenant_v5',
      STORAGE_KEYS.COMPANIES, STORAGE_KEYS.VESSELS, STORAGE_KEYS.SCHEDULES, STORAGE_KEYS.BOOKINGS, STORAGE_KEYS.CURRENT_USER_COMPANY,
      STORAGE_KEYS.KSOP_SETTINGS, STORAGE_KEYS.AGENTS, STORAGE_KEYS.CARGO_RECORDS, STORAGE_KEYS.PEAK_SEASON, STORAGE_KEYS.IMMIGRATION_WATCHLIST, STORAGE_KEYS.PORT_PASS
    ].forEach(k => {
      localStorage.removeItem(k);
    });
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PORT_PASS, JSON.stringify([]));
    localStorage.setItem('tech_app_clean_reset_v7', 'true');
  }
} catch (e) {}

// Pengaturan Default Pejabat KSOP, Syahbandar, dan Regulasi Maritim (Kosong / Tanpa Default)
const DEFAULT_KSOP_SETTINGS = {
  ksopName: '',
  ksopNip: '',
  ksopRank: '',
  ksopTitle: '',
  ksopOffice: '',
  ksopPort: '',
  inspectorName: '',
  inspectorNip: '',
  inspectorTitle: '',
  masterName: '',
  masterCertNo: '',
  immigrationOfficer: '',
  immigrationNip: '',
  immigrationTitle: '',
  customsOfficer: '',
  customsNip: '',
  customsTitle: '',
  quarantineOfficer: '',
  quarantineNip: '',
  quarantineTitle: '',
  spbPrefix: '',
  regulationNotice: ''
};

// Default Mitra Agen & Calo Resmi Pelabuhan (Kosong / Tanpa Default)
const DEFAULT_AGENTS = [];

// Default Peak Season & Dynamic Pricing (Kosong / Tanpa Default)
const DEFAULT_PEAK_SEASON = {
  enabled: false,
  name: '',
  surchargePercent: 0,
  startDate: '',
  endDate: '',
  notice: ''
};

// Default Tarif Pas Pelabuhan (Kosong / Tanpa Default)
const DEFAULT_PORT_PASS = [];

// Default Immigration Watchlist / Red-List (Kosong / Tanpa Default)
const DEFAULT_WATCHLIST = [];

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

// Master Daftar Mata Uang Dunia untuk Pengecekan Kurs Realtime & Konversi
const MASTER_WORLD_CURRENCIES = [
  { code: 'MYR', name: 'Ringgit Malaysia', flag: '🇲🇾', country: 'Malaysia', symbol: 'RM' },
  { code: 'IDR', name: 'Rupiah Indonesia', flag: '🇮🇩', country: 'Indonesia', symbol: 'Rp' },
  { code: 'USD', name: 'Dolar Amerika Serikat', flag: '🇺🇸', country: 'Amerika Serikat', symbol: '$' },
  { code: 'SGD', name: 'Dolar Singapura', flag: '🇸🇬', country: 'Singapura', symbol: 'S$' },
  { code: 'EUR', name: 'Euro Uni Eropa', flag: '🇪🇺', country: 'Uni Eropa', symbol: '€' },
  { code: 'SAR', name: 'Riyal Arab Saudi', flag: '🇸🇦', country: 'Arab Saudi', symbol: '﷼' },
  { code: 'GBP', name: 'Poundsterling Inggris', flag: '🇬🇧', country: 'Inggris Britania', symbol: '£' },
  { code: 'AUD', name: 'Dolar Australia', flag: '🇦🇺', country: 'Australia', symbol: 'A$' },
  { code: 'JPY', name: 'Yen Jepang', flag: '🇯🇵', country: 'Jepang', symbol: '¥' },
  { code: 'CNY', name: 'Yuan Tiongkok', flag: '🇨🇳', country: 'Tiongkok', symbol: '¥' },
  { code: 'HKD', name: 'Dolar Hong Kong', flag: '🇭🇰', country: 'Hong Kong', symbol: 'HK$' },
  { code: 'THB', name: 'Baht Thailand', flag: '🇹🇭', country: 'Thailand', symbol: '฿' },
  { code: 'PHP', name: 'Peso Filipina', flag: '🇵🇭', country: 'Filipina', symbol: '₱' },
  { code: 'BND', name: 'Dolar Brunei', flag: '🇧🇳', country: 'Brunei Darussalam', symbol: 'B$' },
  { code: 'KRW', name: 'Won Korea Selatan', flag: '🇰🇷', country: 'Korea Selatan', symbol: '₩' },
  { code: 'AED', name: 'Dirham Uni Emirat Arab', flag: '🇦🇪', country: 'Uni Emirat Arab', symbol: 'د.إ' },
  { code: 'TWD', name: 'Dolar Baru Taiwan', flag: '🇹🇼', country: 'Taiwan', symbol: 'NT$' },
  { code: 'VND', name: 'Dong Vietnam', flag: '🇻🇳', country: 'Vietnam', symbol: '₫' },
  { code: 'INR', name: 'Rupee India', flag: '🇮🇳', country: 'India', symbol: '₹' },
  { code: 'CAD', name: 'Dolar Kanada', flag: '🇨🇦', country: 'Kanada', symbol: 'CA$' },
  { code: 'CHF', name: 'Franc Swiss', flag: '🇨🇭', country: 'Swiss', symbol: 'CHF' },
  { code: 'NZD', name: 'Dolar Selandia Baru', flag: '🇳🇿', country: 'Selandia Baru', symbol: 'NZ$' }
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

  approveCompany(id) {
    return this.updateCompany(id, {
      verified: true,
      frozen: false,
      approvalStatus: 'APPROVED',
      approvedAt: new Date().toISOString()
    });
  },

  rejectCompany(id) {
    return this.updateCompany(id, {
      verified: false,
      frozen: false,
      approvalStatus: 'REJECTED',
      rejectedAt: new Date().toISOString()
    });
  },

  freezeCompany(id) {
    const updated = this.updateCompany(id, {
      frozen: true,
      approvalStatus: 'FROZEN',
      frozenAt: new Date().toISOString()
    });
    const current = this.getCurrentTenant();
    if (current && current.id === id) {
      this.setCurrentTenant(null);
    }
    return updated;
  },

  unfreezeCompany(id) {
    return this.updateCompany(id, {
      frozen: false,
      verified: true,
      approvalStatus: 'APPROVED',
      unfrozenAt: new Date().toISOString()
    });
  },

  deleteCompany(id) {
    const list = this.getCompanies().filter(c => c.id !== id);
    this.saveCompanies(list);
    const current = this.getCurrentTenant();
    if (current && current.id === id) {
      this.setCurrentTenant(null);
    }
    return true;
  },

  isDevAdminLoggedIn() {
    return sessionStorage.getItem('tech_dev_admin_session_v1') === 'ACTIVE';
  },

  setDevAdminSession(active) {
    if (active) {
      sessionStorage.setItem('tech_dev_admin_session_v1', 'ACTIVE');
    } else {
      sessionStorage.removeItem('tech_dev_admin_session_v1');
    }
  },

  getDevAdminCredentials() {
    const defaultCreds = {
      email: 'dev@techsolution.id',
      username: 'superadmin',
      password: 'devadmin123',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      totpEnabled: true
    };
    const raw = localStorage.getItem('tech_dev_admin_credentials_v1');
    if (!raw) return defaultCreds;
    try {
      const parsed = JSON.parse(raw);
      return {
        email: (parsed.email || defaultCreds.email).trim(),
        username: (parsed.username || defaultCreds.username).trim(),
        password: parsed.password || defaultCreds.password,
        totpSecret: (parsed.totpSecret || defaultCreds.totpSecret).trim().toUpperCase(),
        totpEnabled: parsed.totpEnabled !== undefined ? Boolean(parsed.totpEnabled) : true
      };
    } catch (e) {
      return defaultCreds;
    }
  },

  saveDevAdminCredentials(newCreds) {
    const current = this.getDevAdminCredentials();
    const updated = {
      email: (newCreds.email !== undefined ? newCreds.email : current.email).trim(),
      username: (newCreds.username !== undefined ? newCreds.username : current.username).trim(),
      password: newCreds.password !== undefined && newCreds.password !== '' ? newCreds.password : current.password,
      totpSecret: (newCreds.totpSecret !== undefined && newCreds.totpSecret !== '' ? newCreds.totpSecret : current.totpSecret).trim().toUpperCase(),
      totpEnabled: newCreds.totpEnabled !== undefined ? Boolean(newCreds.totpEnabled) : current.totpEnabled,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('tech_dev_admin_credentials_v1', JSON.stringify(updated));
    return updated;
  },

  // Pure JS SHA-1 & HMAC-SHA1 for RFC 6238 Google Authenticator TOTP
  _sha1Bytes(msgBytes) {
    function rol(n, s) { return (n << s) | (n >>> (32 - s)); }
    const ml = msgBytes.length;
    const words = [];
    for (let i = 0; i < ml; i++) {
      words[i >>> 2] |= (msgBytes[i] & 0xff) << (24 - (i % 4) * 8);
    }
    words[ml >>> 2] |= 0x80 << (24 - (ml % 4) * 8);
    words[(((ml + 8) >>> 6) << 4) + 15] = ml * 8;

    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const w = new Array(80);
    for (let i = 0; i < words.length; i += 16) {
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let j = 0; j < 80; j++) {
        if (j < 16) w[j] = words[i + j] | 0;
        else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
        const f = j < 20 ? ((b & c) | (~b & d)) + 0x5a827999
                : j < 40 ? (b ^ c ^ d) + 0x6ed9eba1
                : j < 60 ? ((b & c) | (b & d) | (c & d)) + 0x8f1bbcdc
                : (b ^ c ^ d) + 0xca62c1d6;
        const t = (rol(a, 5) + f + e + w[j]) | 0;
        e = d; d = c; c = rol(b, 30); b = a; a = t;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }
    const out = [];
    [h0, h1, h2, h3, h4].forEach(h => {
      out.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
    });
    return out;
  },

  _base32ToBytes(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = (base32 || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (let i = 0; i < clean.length; i++) {
      const val = alphabet.indexOf(clean[i]);
      if (val >= 0) bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return bytes;
  },

  generateDevTotpCode(secretOverride = null, stepOffset = 0) {
    const creds = this.getDevAdminCredentials();
    const secret = secretOverride || creds.totpSecret || 'JBSWY3DPEHPK3PXP';
    const key = this._base32ToBytes(secret);
    const blockKey = key.length > 64 ? this._sha1Bytes(key) : key.slice();
    while (blockKey.length < 64) blockKey.push(0);

    const ipad = blockKey.map(b => b ^ 0x36);
    const opad = blockKey.map(b => b ^ 0x5c);

    const epochSec = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epochSec / 30) + stepOffset;
    const msg = [0, 0, 0, 0, (counter >>> 24) & 0xff, (counter >>> 16) & 0xff, (counter >>> 8) & 0xff, counter & 0xff];

    const innerHash = this._sha1Bytes(ipad.concat(msg));
    const hmac = this._sha1Bytes(opad.concat(innerHash));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
    return String(binary % 1000000).padStart(6, '0');
  },

  verifyDevTotpCode(inputCode) {
    const clean = (inputCode || '').trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(clean)) return false;
    // Allow current 30s window and +/- 1 window for clock drift
    return (
      clean === this.generateDevTotpCode(null, 0) ||
      clean === this.generateDevTotpCode(null, -1) ||
      clean === this.generateDevTotpCode(null, 1)
    );
  },

  verifyDevAdminCredentials(identifier, password) {
    const idClean = (identifier || '').trim().toLowerCase();
    const creds = this.getDevAdminCredentials();
    const matchId =
      idClean === (creds.email || '').toLowerCase() ||
      idClean === (creds.username || '').toLowerCase();
    return matchId && password === creds.password;
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
      if (!Array.isArray(v.facilities)) {
        v.facilities = [];
      }
      return v;
    });
  },

  saveVessels(vessels) {
    localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify(vessels));
  },

  addVessel(vessel) {
    if (!Array.isArray(vessel.facilities)) {
      vessel.facilities = [];
    }
    const list = this.getVessels();
    list.push(vessel);
    this.saveVessels(list);
    return vessel;
  },

  updateVessel(id, updatedFields) {
    const list = this.getVessels();
    const idx = list.findIndex(v => v.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      this.saveVessels(list);
      return list[idx];
    }
    return null;
  },

  getVesselsByCompany(companyId) {
    return this.getVessels().filter(v => v.companyId === companyId);
  },

  deleteVessel(id) {
    const list = this.getVessels().filter(v => v.id !== id);
    this.saveVessels(list);
    const schedules = this.getSchedules().filter(s => s.vesselId !== id);
    this.saveSchedules(schedules);
    return true;
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
        const isTwu = s.originId === 'TWU' || s.destinationId === 'TWU';
        const defaultPrice = isTwu ? 480000 : (s.priceEconomy || 690000);
        s.classes = [
          { id: 'cls-eko', name: 'Tiket Reguler', price: defaultPrice, quota: s.quotaTotal || 200, available: 200 }
        ];
      } else if (s.classes.length > 1) {
        const eko = s.classes.find(c => c.id === 'cls-eko' || (c.name && !c.name.toLowerCase().includes('vip'))) || s.classes[0];
        s.classes = [{ ...eko, id: eko.id || 'cls-eko', name: 'Tiket Reguler' }];
      }
      return s;
    });
  },

  saveSchedules(schedules) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  },

  addSchedule(schedule) {
    if (!Array.isArray(schedule.classes) || schedule.classes.length === 0) {
      const isTwu = schedule.originId === 'TWU' || schedule.destinationId === 'TWU';
      const defaultPrice = isTwu ? 480000 : (schedule.priceEconomy || 690000);
      schedule.classes = [
        { id: 'cls-eko', name: 'Main Deck', price: defaultPrice, quota: schedule.quotaTotal || 200, available: 200 }
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

  getScheduleById(id) {
    return this.getSchedules().find(s => s.id === id);
  },

  updateSchedule(id, updatedFields) {
    const list = this.getSchedules();
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      this.saveSchedules(list);
      return list[idx];
    }
    return null;
  },

  deleteSchedule(id) {
    const list = this.getSchedules().filter(s => s.id !== id);
    this.saveSchedules(list);
    return true;
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

  // Cek Data Penumpang Ganda (Duplicate Passenger Check)
  checkDuplicatePassenger(name, scheduleId = null, excludePnr = null) {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim().toLowerCase();
    const bookings = this.getBookings();
    for (const b of bookings) {
      if (excludePnr && b.pnr === excludePnr) continue;
      if (scheduleId && b.scheduleId !== scheduleId) continue;
      if (b.passengers && Array.isArray(b.passengers)) {
        const found = b.passengers.find(p => p && p.name && p.name.trim().toLowerCase() === cleanName);
        if (found) {
          return {
            booking: b,
            passenger: found,
            pnr: b.pnr,
            seat: found.seat || '-',
            scheduleId: b.scheduleId,
            vesselName: b.vesselName,
            departDate: b.departDate
          };
        }
      }
    }
    return null;
  },

  getAllDuplicatePassengers(companyId = null, scheduleId = null) {
    let bookings = companyId ? this.getBookingsByCompany(companyId) : this.getBookings();
    if (scheduleId) {
      bookings = bookings.filter(b => b.scheduleId === scheduleId);
    }
    const nameMap = new Map();
    const duplicates = [];

    bookings.forEach(b => {
      (b.passengers || []).forEach((p, idx) => {
        if (!p.name || !p.name.trim()) return;
        const norm = p.name.trim().toLowerCase();
        if (!nameMap.has(norm)) {
          nameMap.set(norm, []);
        }
        nameMap.get(norm).push({
          pnr: b.pnr,
          paxIndex: idx,
          name: p.name,
          docNum: p.docNumber || p.passportNo || p.nik || '',
          seat: p.seat || '-',
          vesselName: b.vesselName,
          scheduleId: b.scheduleId,
          departDate: b.departDate,
          boardingStatus: b.boardingStatus
        });
      });
    });

    nameMap.forEach((list) => {
      if (list.length > 1) {
        duplicates.push({ name: list[0].name, count: list.length, items: list });
      }
    });

    return duplicates;
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

  // 1. Mitra Agen & Calo Resmi (Agent Reseller System)
  getAgents() {
    const raw = localStorage.getItem(STORAGE_KEYS.AGENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(DEFAULT_AGENTS));
      return [...DEFAULT_AGENTS];
    }
    try {
      return JSON.parse(raw) || [...DEFAULT_AGENTS];
    } catch (e) {
      return [...DEFAULT_AGENTS];
    }
  },

  saveAgents(agents) {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
    return agents;
  },

  addAgent(agent) {
    const list = this.getAgents();
    list.push(agent);
    this.saveAgents(list);
    return agent;
  },

  updateAgentBalance(agentId, deltaAmount) {
    const list = this.getAgents();
    const agt = list.find(a => a.id === agentId);
    if (agt) {
      agt.balance = (agt.balance || 0) + deltaAmount;
      this.saveAgents(list);
      return agt;
    }
    return null;
  },

  // 2. Cargo & Excess Baggage (Kalkulator DWT)
  getCargoRecords() {
    const raw = localStorage.getItem(STORAGE_KEYS.CARGO_RECORDS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  },

  saveCargoRecords(records) {
    localStorage.setItem(STORAGE_KEYS.CARGO_RECORDS, JSON.stringify(records));
    return records;
  },

  addCargoRecord(record) {
    const list = this.getCargoRecords();
    list.unshift(record);
    this.saveCargoRecords(list);
    return record;
  },

  // 3. Dynamic Pricing & Peak Season Engine
  getPeakSeasonSettings() {
    const raw = localStorage.getItem(STORAGE_KEYS.PEAK_SEASON);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PEAK_SEASON, JSON.stringify(DEFAULT_PEAK_SEASON));
      return { ...DEFAULT_PEAK_SEASON };
    }
    try {
      return { ...DEFAULT_PEAK_SEASON, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT_PEAK_SEASON };
    }
  },

  savePeakSeasonSettings(settings) {
    const merged = { ...DEFAULT_PEAK_SEASON, ...settings };
    localStorage.setItem(STORAGE_KEYS.PEAK_SEASON, JSON.stringify(merged));
    return merged;
  },

  // 4. Offline Scan Queue (PWA & Offline Gate Scanner)
  getOfflineScanQueue() {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_SCAN_QUEUE);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  },

  addOfflineScan(scanItem) {
    const queue = this.getOfflineScanQueue();
    queue.push(scanItem);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_SCAN_QUEUE, JSON.stringify(queue));
    return queue;
  },

  clearOfflineScanQueue() {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_SCAN_QUEUE, JSON.stringify([]));
    return [];
  },

  // 5. Immigration Watchlist / Red-List
  getWatchlist() {
    const raw = localStorage.getItem(STORAGE_KEYS.IMMIGRATION_WATCHLIST);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.IMMIGRATION_WATCHLIST, JSON.stringify(DEFAULT_WATCHLIST));
      return [...DEFAULT_WATCHLIST];
    }
    try {
      return JSON.parse(raw) || [...DEFAULT_WATCHLIST];
    } catch (e) {
      return [...DEFAULT_WATCHLIST];
    }
  },

  checkWatchlist(docNum, name) {
    const list = this.getWatchlist();
    const cleanDoc = (docNum || '').trim().toUpperCase();
    const cleanName = (name || '').trim().toUpperCase();
    return list.find(w => 
      (cleanDoc && w.docNum.toUpperCase() === cleanDoc) ||
      (cleanName && w.name.toUpperCase() === cleanName)
    ) || null;
  },

  // 6. Manajemen Tarif Pas Pelabuhan (Port Pass / Retribusi Pelabuhan)
  getPortPasses() {
    const raw = localStorage.getItem(STORAGE_KEYS.PORT_PASS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PORT_PASS, JSON.stringify(DEFAULT_PORT_PASS));
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  savePortPasses(list) {
    localStorage.setItem(STORAGE_KEYS.PORT_PASS, JSON.stringify(list));
    return list;
  },

  addPortPass(item) {
    const list = this.getPortPasses();
    list.push(item);
    this.savePortPasses(list);
    return item;
  },

  updatePortPass(id, updatedFields) {
    const list = this.getPortPasses();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      this.savePortPasses(list);
      return list[idx];
    }
    return null;
  },

  // 7. Master Penetapan Tarif Resmi Seluruh Rute Kapal (Developer Tariff Authority)
  getMasterRouteTariffs() {
    const defaultRoutes = [
      {
        id: 'ROUTE-NNK-TWU',
        originId: 'NNK',
        destinationId: 'TWU',
        originName: 'Nunukan',
        destinationName: 'Tawau',
        category: 'Internasional',
        ticketPrice: 430000,
        portPassFee: 50000,
        notes: 'Rute Lintas Batas RI - Malaysia'
      },
      {
        id: 'ROUTE-NNK-PRE',
        originId: 'NNK',
        destinationId: 'PRE',
        originName: 'Nunukan',
        destinationName: 'Parepare',
        category: 'Domestik',
        ticketPrice: 690000,
        portPassFee: 30000,
        notes: 'Rute Antar Pulau Domestik'
      }
    ];

    try {
      const raw = localStorage.getItem('tech_master_route_tariffs_v1');
      if (!raw) {
        localStorage.setItem('tech_master_route_tariffs_v1', JSON.stringify(defaultRoutes));
        return defaultRoutes;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Hapus rute parepare - nunukan dan tawau - nunukan di developer mode
        const filtered = parsed.filter(r => {
          const isTawauToNunukan = (r.originId === 'TWU' && r.destinationId === 'NNK') || r.id === 'ROUTE-TWU-NNK';
          const isParepareToNunukan = (r.originId === 'PRE' && r.destinationId === 'NNK') || r.id === 'ROUTE-PRE-NNK';
          return !isTawauToNunukan && !isParepareToNunukan;
        });

        let updatedStorage = filtered.length !== parsed.length;
        filtered.forEach(r => {
          if ((r.id === 'ROUTE-NNK-PRE' || (r.originId === 'NNK' && r.destinationId === 'PRE')) && (r.ticketPrice === 250000 || r.portPassFee === 10000)) {
            r.ticketPrice = 690000;
            r.portPassFee = 30000;
            updatedStorage = true;
          }
        });

        if (updatedStorage) {
          localStorage.setItem('tech_master_route_tariffs_v1', JSON.stringify(filtered));
        }

        return filtered.map(r => {
          const origPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.originId) : null;
          const destPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.destinationId) : null;
          const origCity = origPort ? origPort.city.split(' ')[0] : (r.originName ? r.originName.split(' ')[0].replace(/\(.*$/, '').trim() : r.originId);
          const destCity = destPort ? destPort.city.split(' ')[0] : (r.destinationName ? r.destinationName.split(' ')[0].replace(/\(.*$/, '').trim() : r.destinationId);
          return {
            ...r,
            originName: origCity,
            destinationName: destCity
          };
        });
      }
      return defaultRoutes;
    } catch (e) {
      return defaultRoutes;
    }
  },

  getMasterRouteTariff(originId, destinationId) {
    const list = this.getMasterRouteTariffs();
    return list.find(r => r.originId === originId && r.destinationId === destinationId) || null;
  },

  getMasterRouteTariffById(routeId) {
    const list = this.getMasterRouteTariffs();
    return list.find(r => r.id === routeId) || null;
  },

  saveMasterRouteTariff(routeId, updatedFields) {
    const list = this.getMasterRouteTariffs();
    const idx = list.findIndex(r => r.id === routeId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      localStorage.setItem('tech_master_route_tariffs_v1', JSON.stringify(list));
      return list[idx];
    }
    return null;
  },

  addMasterRouteTariff(newRoute) {
    const list = this.getMasterRouteTariffs();
    list.push(newRoute);
    localStorage.setItem('tech_master_route_tariffs_v1', JSON.stringify(list));
    return newRoute;
  },

  deleteMasterRouteTariff(routeId) {
    const list = this.getMasterRouteTariffs().filter(r => r.id !== routeId);
    localStorage.setItem('tech_master_route_tariffs_v1', JSON.stringify(list));
    return list;
  },

  // Hapus semua data transaksi & master data di aplikasi
  clearAllData() {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PORT_PASS, JSON.stringify([]));
      localStorage.removeItem(STORAGE_KEYS.KSOP_SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.PEAK_SEASON);
      localStorage.removeItem(STORAGE_KEYS.AGENTS);
      localStorage.removeItem(STORAGE_KEYS.CARGO_RECORDS);
      localStorage.removeItem(STORAGE_KEYS.IMMIGRATION_WATCHLIST);
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

// Format Ringgit Malaysia Helper & Real-Time Live Foreign Exchange Rate
let MYR_RATE = 3500;
try {
  const savedRate = localStorage.getItem('tech_live_myr_rate');
  if (savedRate && !isNaN(Number(savedRate)) && Number(savedRate) > 0) {
    MYR_RATE = Number(savedRate);
  }
} catch (_) {}

function setMyrRate(rate) {
  if (rate && !isNaN(Number(rate)) && Number(rate) > 0) {
    MYR_RATE = Number(rate);
    try {
      localStorage.setItem('tech_live_myr_rate', String(rate));
      localStorage.setItem('tech_live_myr_updated', new Date().toISOString());
    } catch (_) {}
  }
  return MYR_RATE;
}

function getMyrRate() {
  return MYR_RATE;
}

function formatRinggit(amount) {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(amount);
}

function convertIdrToMyr(idrAmount) {
  return parseFloat(((idrAmount || 0) / MYR_RATE).toFixed(2));
}

function convertMyrToIdr(myrAmount) {
  return Math.round((myrAmount || 0) * MYR_RATE);
}

// Global window exposure
if (typeof window !== 'undefined') {
  window.Store = Store;
  window.formatRupiah = formatRupiah;
  window.formatRinggit = formatRinggit;
  window.convertIdrToMyr = convertIdrToMyr;
  window.convertMyrToIdr = convertMyrToIdr;
  window.getMyrRate = getMyrRate;
  window.setMyrRate = setMyrRate;
  window.MASTER_WORLD_CURRENCIES = MASTER_WORLD_CURRENCIES;
  window.WORLD_CURRENCIES = MASTER_WORLD_CURRENCIES;
  try {
    Object.defineProperty(window, 'MYR_RATE', {
      get() { return getMyrRate(); },
      set(val) { setMyrRate(val); },
      configurable: true
    });
  } catch (_) {
    window.MYR_RATE = MYR_RATE;
  }
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
