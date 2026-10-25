// ========================================================
// TECH SOLUTION - TICKETING SERVICES PLATFORM ENGINE
// ========================================================

const App = {
  activeView: 'weatherHome', // 'weatherHome' | 'companyDashboard'
  selectedCompanyFilter: 'ALL',
  currentBookingSchedule: null,
  selectedSeats: [],

  init() {
    this.initDates();
    this.initPortDropdowns();
    this.renderCompanyFilterChips();
    this.initNavEvents();
    this.initCustomerEvents();
    this.initAuthEvents();
    this.initDashboardEvents();
    this.initModals();

    // Check if a company session already exists
    const loggedInTenant = Store.getCurrentTenant();
    if (loggedInTenant) {
      this.updateHeaderTenantUI(loggedInTenant);
      this.switchView('companyDashboard');
    } else {
      this.updateHeaderTenantUI(null);
      this.switchView('weatherHome');
    }

    this.renderCompanyAuthButtons();
  },

  // Dates initialization (Tomorrow)
  initDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const dateInput = document.getElementById('custInputDate');
    if (dateInput) {
      dateInput.min = today.toISOString().split('T')[0];
      dateInput.value = dateStr;
    }
  },

  // Ports initialization
  initPortDropdowns() {
    const origSel = document.getElementById('custSelectOrigin');
    const destSel = document.getElementById('custSelectDest');
    const schedOrigSel = document.getElementById('schedOriginSelect');
    const schedDestSel = document.getElementById('schedDestSelect');

    if (origSel && destSel) {
      origSel.innerHTML = '';
      destSel.innerHTML = '';
    }
    if (schedOrigSel) schedOrigSel.innerHTML = '';
    if (schedDestSel) schedDestSel.innerHTML = '';

    MASTER_PORTS.forEach(port => {
      if (origSel && destSel) {
        origSel.add(new Option(`${port.name} (${port.city})`, port.id));
        destSel.add(new Option(`${port.name} (${port.city})`, port.id));
      }

      if (schedOrigSel && schedDestSel) {
        schedOrigSel.add(new Option(`${port.name} (${port.city})`, port.id));
        schedDestSel.add(new Option(`${port.name} (${port.city})`, port.id));
      }
    });

    if (origSel && destSel) {
      origSel.value = 'NNK';
      destSel.value = 'TWU';
    }
    if (schedOrigSel && schedDestSel) {
      schedOrigSel.value = 'NNK';
      schedDestSel.value = 'TWU';
    }
  },

  // Company Filter Chips on Public Customer Portal
  renderCompanyFilterChips() {
    const container = document.getElementById('companyFilterChips');
    if (!container) return;

    const companies = Store.getCompanies();
    container.innerHTML = `
      <div class="comp-chip ${this.selectedCompanyFilter === 'ALL' ? 'active' : ''}" data-comp-id="ALL">
        <span class="comp-chip-dot" style="background: #38bdf8;"></span>
        <span>Semua Operator (${companies.length})</span>
      </div>
    `;

    companies.forEach(comp => {
      const chip = document.createElement('div');
      chip.className = `comp-chip ${this.selectedCompanyFilter === comp.id ? 'active' : ''}`;
      chip.setAttribute('data-comp-id', comp.id);
      chip.innerHTML = `
        <span class="comp-chip-dot" style="background: ${comp.brandColor};"></span>
        <span>${comp.shortName || comp.name}</span>
      `;
      chip.addEventListener('click', () => {
        this.selectedCompanyFilter = comp.id;
        this.renderCompanyFilterChips();
        this.renderCustomerSchedules();
      });
      container.appendChild(chip);
    });

    // Hook 'ALL' chip
    container.querySelector('[data-comp-id="ALL"]').addEventListener('click', () => {
      this.selectedCompanyFilter = 'ALL';
      this.renderCompanyFilterChips();
      this.renderCustomerSchedules();
    });
  },

  // Auth Modal Controls
  openCompanyAuthModal() {
    this.renderCompanyAuthButtons();
    const modal = document.getElementById('modalCompanyAuth');
    if (modal) modal.classList.add('show');
  },

  closeCompanyAuthModal() {
    const modal = document.getElementById('modalCompanyAuth');
    if (modal) modal.classList.remove('show');
  },

  // Navigation Controller
  initNavEvents() {
    const btnCust = document.getElementById('btnModeCustomer');
    const btnComp = document.getElementById('btnModeCompany');
    const brandHome = document.getElementById('brandHomeLink');
    const btnWeatherCta = document.getElementById('btnOpenAuthFromWeather');

    if (btnCust) btnCust.addEventListener('click', () => this.switchView('weatherHome'));
    if (btnComp) {
      btnComp.addEventListener('click', () => {
        const current = Store.getCurrentTenant();
        if (current) {
          this.switchView('companyDashboard');
        } else {
          this.openCompanyAuthModal();
        }
      });
    }

    if (btnWeatherCta) {
      btnWeatherCta.addEventListener('click', () => this.openCompanyAuthModal());
    }

    if (brandHome) {
      brandHome.addEventListener('click', (e) => {
        e.preventDefault();
        const current = Store.getCurrentTenant();
        if (current) {
          this.switchView('companyDashboard');
        } else {
          this.switchView('weatherHome');
        }
      });
    }

    // Swap ports
    const btnSwap = document.getElementById('custBtnSwap');
    if (btnSwap) {
      btnSwap.addEventListener('click', () => {
        const orig = document.getElementById('custSelectOrigin');
        const dest = document.getElementById('custSelectDest');
        if (orig && dest) {
          const tmp = orig.value;
          orig.value = dest.value;
          dest.value = tmp;
          this.renderCustomerSchedules();
        }
      });
    }
  },

  switchView(viewName) {
    this.activeView = viewName;
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

    const btnComp = document.getElementById('btnModeCompany');

    if (viewName === 'weatherHome') {
      document.body.classList.remove('in-company-portal');
      const weatherPanel = document.getElementById('viewWeatherHome');
      if (weatherPanel) weatherPanel.classList.add('active');
      if (btnComp) btnComp.classList.add('active');
      this.closeCompanyAuthModal();
    } else if (viewName === 'companyAuth') {
      this.openCompanyAuthModal();
    } else if (viewName === 'companyDashboard') {
      document.body.classList.add('in-company-portal');
      const dashPanel = document.getElementById('viewCompanyDashboard');
      if (dashPanel) dashPanel.classList.add('active');
      if (btnComp) btnComp.classList.add('active');
      this.closeCompanyAuthModal();
      this.refreshCompanyDashboard();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateHeaderTenantUI(tenant) {
    const box = document.getElementById('headerTenantBox');
    if (!box) return;

    if (!tenant) {
      box.innerHTML = `
        <button type="button" class="btn-login-tenant" id="btnHeaderLogin">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
          <span>Masuk Mitra Operator</span>
        </button>
      `;
      document.getElementById('btnHeaderLogin').addEventListener('click', () => this.openCompanyAuthModal());
    } else {
      box.innerHTML = `
        <div class="tenant-pill-badge" id="btnHeaderTenantBadge" title="Klik untuk membuka dashboard">
          <span class="dot" style="background: ${tenant.brandColor};"></span>
          <span class="tenant-pill-name">${tenant.shortName || tenant.name}</span>
        </div>
      `;
      document.getElementById('btnHeaderTenantBadge').addEventListener('click', () => this.switchView('companyDashboard'));
    }
  },

  // ================= CUSTOMER PORTAL =================
  initCustomerEvents() {
    const searchForm = document.getElementById('customerSearchForm');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const orig = document.getElementById('custSelectOrigin')?.value;
        const dest = document.getElementById('custSelectDest')?.value;
        if (orig === dest) {
          this.showToast('Rute Tidak Valid', 'Pelabuhan Asal dan Pelabuhan Tujuan tidak boleh sama.', 'warning');
          return;
        }
        this.renderCustomerSchedules();
      });
    }

    // Quick route buttons
    document.querySelectorAll('.btn-quick-route').forEach(btn => {
      btn.addEventListener('click', () => {
        const from = btn.getAttribute('data-from');
        const to = btn.getAttribute('data-to');
        const orig = document.getElementById('custSelectOrigin');
        const dest = document.getElementById('custSelectDest');
        if (orig && dest) {
          orig.value = from;
          dest.value = to;
        }
        this.renderCustomerSchedules();
      });
    });

    // Lookup PNR button
    const pnrBtn = document.getElementById('custBtnLookupPnr');
    if (pnrBtn) {
      pnrBtn.addEventListener('click', () => {
        const pnrInput = document.getElementById('custInputLookupPnr');
        const pnr = pnrInput ? pnrInput.value.trim().toUpperCase() : '';
        if (!pnr) {
          this.showToast('Input PNR', 'Masukkan kode booking terlebih dahulu.', 'warning');
          return;
        }
        const found = Store.getBookingByPnr(pnr);
        if (found) {
          this.openBoardingPassModal(found);
        } else {
          this.showToast('Tidak Ditemukan', `Kode Booking "${pnr}" tidak terdaftar di sistem.`, 'warning');
        }
      });
    }

    // Auto-calculate Age and Sync Pax Type (Dewasa / Anak / Bayi)
    const dobInput = document.getElementById('custPaxDob');
    const ageInput = document.getElementById('custPaxAge');
    const typeSelect = document.getElementById('custPaxType');

    if (dobInput && ageInput) {
      dobInput.addEventListener('change', () => {
        if (!dobInput.value) return;
        const bDate = new Date(dobInput.value);
        const today = new Date();
        let calcAge = today.getFullYear() - bDate.getFullYear();
        const m = today.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
          calcAge--;
        }
        calcAge = Math.max(0, calcAge);
        ageInput.value = calcAge;
        if (typeSelect) {
          if (calcAge < 2) typeSelect.value = 'Bayi';
          else if (calcAge < 12) typeSelect.value = 'Anak';
          else typeSelect.value = 'Dewasa';
        }
      });
    }

    if (ageInput && typeSelect) {
      ageInput.addEventListener('input', () => {
        const val = parseInt(ageInput.value, 10);
        if (!isNaN(val)) {
          if (val < 2) typeSelect.value = 'Bayi';
          else if (val < 12) typeSelect.value = 'Anak';
          else typeSelect.value = 'Dewasa';
        }
      });
    }
  },

  renderCustomerSchedules() {
    const listContainer = document.getElementById('custSchedulesList');
    if (!listContainer) return;

    const origId = document.getElementById('custSelectOrigin').value;
    const destId = document.getElementById('custSelectDest').value;
    const origPort = MASTER_PORTS.find(p => p.id === origId) || MASTER_PORTS[0];
    const destPort = MASTER_PORTS.find(p => p.id === destId) || MASTER_PORTS[1];

    let schedules = Store.getSchedules();

    // Filter by Company if chip selected
    if (this.selectedCompanyFilter !== 'ALL') {
      schedules = schedules.filter(s => s.companyId === this.selectedCompanyFilter);
    }

    // Filter by route match
    let filtered = schedules.filter(s => s.originId === origId && s.destinationId === destId);

    listContainer.innerHTML = '';

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="sched-card" style="padding: 2.5rem; text-align: center;">
          <h4 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: #f59e0b;">Rute Langsung Tidak Ditemukan</h4>
          <p class="text-dim" style="max-width: 600px; margin: 0 auto 1.5rem;">
            Saat ini platform melayani rute resmi eksklusif berikut:
          </p>
          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="btn-quick-route" data-from="NNK" data-to="TWU" onclick="App.setRoute('NNK', 'TWU')">🇲🇾 Nunukan ➔ Tawau</button>
            <button type="button" class="btn-quick-route" data-from="TWU" data-to="NNK" onclick="App.setRoute('TWU', 'NNK')">🇮🇩 Tawau ➔ Nunukan</button>
            <button type="button" class="btn-quick-route" data-from="NNK" data-to="PRE" onclick="App.setRoute('NNK', 'PRE')">🚢 Nunukan ➔ Parepare</button>
            <button type="button" class="btn-quick-route" data-from="PRE" data-to="NNK" onclick="App.setRoute('PRE', 'NNK')">🚢 Parepare ➔ Nunukan</button>
          </div>
        </div>
      `;
      return;
    }

    filtered.forEach(sch => {
      const comp = Store.getCompanyById(sch.companyId) || { name: 'Operator Resmi', brandColor: '#0284c7' };
      const vessel = Store.getVessels().find(v => v.id === sch.vesselId);
      const vesselName = vessel ? vessel.name : (sch.vesselNameCustom || 'Kapal Penyeberangan');
      const minPrice = Math.min(...sch.classes.map(c => c.price));
      const isIntl = sch.categoryType === 'INTERNATIONAL' || sch.originId === 'TWU' || sch.destinationId === 'TWU';

      const card = document.createElement('div');
      card.className = 'sched-card';
      card.innerHTML = `
        <div class="sched-header">
          <div class="sched-company-badge">
            <span class="comp-badge-dot" style="background: ${comp.brandColor};"></span>
            <span class="comp-badge-name">${comp.name}</span>
            <span class="vessel-badge-name">• ${vesselName}</span>
          </div>
          <span class="tag-badge" style="background: ${isIntl ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${isIntl ? '#38bdf8' : '#10b981'}; border-color: ${isIntl ? '#0284c7' : '#10b981'}; font-weight: 700;">
            ${isIntl ? '🌏 PERJALANAN LUAR NEGERI' : '🇮🇩 PERJALANAN DALAM NEGERI'}
          </span>
        </div>

        <div class="sched-body-grid">
          <div class="route-track">
            <div class="track-node">
              <span class="node-time">${sch.departTime}</span>
              <span class="node-city">${origPort.name} (${origPort.city})</span>
              <span class="node-pier">${sch.pier}</span>
            </div>

            <div class="track-progress">
              <span class="track-duration">${sch.durationText || 'Langsung (Direct)'}</span>
              <div class="track-line"></div>
              <small style="color: ${isIntl ? '#f59e0b' : '#94a3b8'}; font-size: 0.72rem; margin-top: 0.25rem;">
                ${isIntl ? 'Wajib Paspor / PLB' : 'KTP / NIK Resmi'}
              </small>
            </div>

            <div class="track-node right">
              <span class="node-time">${sch.arrivalTime}</span>
              <span class="node-city">${destPort.name} (${destPort.city})</span>
              <span class="node-pier">Terminal Kedatangan</span>
            </div>
          </div>

          <div class="sched-pricing-box">
            <span class="price-tag-sub">Tarif Mulai</span>
            <strong class="price-tag-val">${formatRupiah(minPrice)}</strong>
            <button type="button" class="btn-book-sched" data-sch-id="${sch.id}">
              Pilih Kursi & Beli
            </button>
          </div>
        </div>
      `;

      card.querySelector('.btn-book-sched').addEventListener('click', () => {
        this.openBookingModal(sch, comp, vesselName, origPort, destPort);
      });

      listContainer.appendChild(card);
    });
  },

  // SVG QR Code Generator (Pure JavaScript mathematical implementation)
  generateSvgQrCode(text) {
    const size = 21;
    const matrix = Array(size).fill(null).map(() => Array(size).fill(0));

    // Finder patterns at 3 corners: (0,0), (size-7, 0), (0, size-7)
    const drawFinder = (startX, startY) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[startY + r][startX + c] = 1;
          }
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    // Timing lines
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    // Deterministic pseudo-random pattern based on string hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    let seed = Math.abs(hash) || 54321;
    const nextRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
        const inTiming = (r === 6 || c === 6);
        if (!inFinder && !inTiming) {
          matrix[r][c] = nextRand() > 0.46 ? 1 : 0;
        }
      }
    }

    const cellSize = 3.6;
    const svgSize = size * cellSize;
    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === 1) {
          rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#0f172a" />`;
        }
      }
    }
    return `<svg viewBox="0 0 ${svgSize} ${svgSize}" width="72" height="72" xmlns="http://www.w3.org/2000/svg" style="display:block;">${rects}</svg>`;
  },

  // Open Customer Booking Modal
  openBookingModal(sch, comp, vesselName, origPort, destPort) {
    this.currentBookingSchedule = { sch, comp, vesselName, origPort, destPort };
    this.selectedSeats = [];
    this.selectedClassIndex = 0;

    const isIntl = (origPort.id === 'TWU' || destPort.id === 'TWU' || comp.category.toLowerCase().includes('tawau') || comp.category.toLowerCase().includes('internasional'));

    document.getElementById('bookModalVessel').innerText = `${vesselName}`;
    document.getElementById('bookModalCompany').innerText = `Operator Resmi: ${comp.name} • ${comp.category}`;

    document.getElementById('bookRouteStrip').innerHTML = `
      <div class="flex-between align-center" style="flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <strong style="font-size: 1.05rem;">${origPort.name} (${origPort.city}) ➔ ${destPort.name} (${destPort.city})</strong>
          <div class="text-dim" style="font-size: 0.8rem; margin-top: 0.2rem;">Waktu: ${sch.departTime} - ${sch.arrivalTime} WITA • ${sch.pier}</div>
        </div>
        <div class="tag-badge" style="background: ${comp.brandColor}22; color: ${comp.brandColor}; border-color: ${comp.brandColor}; font-weight: 700;">
          ${comp.shortName || comp.name}
        </div>
      </div>
    `;

    // Dynamic Route Compliance & Immigration Notice Banner
    const complianceBanner = document.getElementById('bookRouteComplianceBanner');
    const docTypeSelect = document.getElementById('custDocType');
    const passportExpBlock = document.getElementById('blockPassportExpiry');
    const nationalitySelect = document.getElementById('custPaxNationality');
    const docNumLabel = document.getElementById('lblDocNumber');

    if (complianceBanner) {
      complianceBanner.style.display = 'block';
      if (isIntl) {
        complianceBanner.className = 'route-compliance-banner intl';
        complianceBanner.innerHTML = `
          <strong style="color: #f59e0b;">🛂 KETENTUAN IMIGRASI LINTAS BATAS (NUNUKAN - TAWAU):</strong><br>
          Seluruh penumpang wajib memiliki <strong>Paspor RI / Paspor Asing yang masih berlaku minimal 6 bulan</strong> atau <strong>Pas Lintas Batas (PLB) resmi</strong>. Data manifest akan disetorkan langsung ke TPI Imigrasi Tunon Taka Nunukan & Tawau Port Authority.
        `;
        if (docTypeSelect) docTypeSelect.value = 'PASSPORT_RI';
        if (passportExpBlock) passportExpBlock.style.display = 'block';
        if (docNumLabel) docNumLabel.innerText = 'Nomor Paspor RI / PLB *';
      } else {
        complianceBanner.className = 'route-compliance-banner dom';
        complianceBanner.innerHTML = `
          <strong style="color: var(--primary-cyan);">🚢 KEPATUHAN PELAYARAN DOMESTIK (NUNUKAN - PAREPARE):</strong><br>
          Penumpang terdaftar wajib memiliki <strong>KTP Elektronik (NIK 16 Digit)</strong> atau <strong>Kartu Identitas Anak (KIA)</strong> resmi untuk kepatuhan manifes Kantor Kesyahbandaran dan Otoritas Pelabuhan (KSOP) Ditjen Hubla.
        `;
        if (docTypeSelect) docTypeSelect.value = 'KTP';
        if (passportExpBlock) passportExpBlock.style.display = 'none';
        if (docNumLabel) docNumLabel.innerText = 'Nomor Induk Kependudukan (NIK KTP 16 Digit) *';
      }
    }

    if (docTypeSelect) {
      docTypeSelect.onchange = () => {
        const val = docTypeSelect.value;
        const isPass = (val === 'PASSPORT_RI' || val === 'PASSPORT_FOREIGN' || val === 'PLB');
        if (passportExpBlock) passportExpBlock.style.display = isPass ? 'block' : 'none';
        if (docNumLabel) docNumLabel.innerText = isPass ? 'Nomor Paspor / Dokumen *' : 'Nomor NIK KTP / KIA *';
        if (nationalitySelect && val === 'PASSPORT_FOREIGN') nationalitySelect.value = 'MY';
        if (nationalitySelect && (val === 'PASSPORT_RI' || val === 'KTP' || val === 'PLB')) nationalitySelect.value = 'ID';
      };
    }

    // Configure Class Options (Ekonomi, Bisnis, VIP)
    const basePrice = sch.classes[0].price;
    this.bookingClasses = [
      { name: 'Ekonomi (Main Deck)', price: basePrice, sub: 'Kursi Nyaman Ber-AC, Free Bagasi 20kg' },
      { name: 'Bisnis / Executive (Upper Deck)', price: basePrice + 75000, sub: 'Upper Deck View, Snack & Reclining Seat' },
      { name: 'VIP Stateroom (Private Cabin)', price: basePrice + 175000, sub: 'Kabin Eksklusif Privat, Sofa Bed & Port Priority' }
    ];

    this.renderClassOptions();
    this.renderSeatPickerGrid();
    this.updateSeatPickerSummary();

    document.getElementById('modalCustomerBooking').classList.add('show');
  },

  renderClassOptions() {
    const grid = document.getElementById('custClassOptionsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    this.bookingClasses.forEach((cls, idx) => {
      const card = document.createElement('div');
      card.className = `class-pill-card ${this.selectedClassIndex === idx ? 'active' : ''}`;
      card.innerHTML = `
        <div class="cls-name">
          <span>${idx === 2 ? '👑' : (idx === 1 ? '⭐' : '🚢')}</span>
          <span>${cls.name}</span>
        </div>
        <div class="cls-price">${formatRupiah(cls.price)}</div>
        <div class="cls-sub">${cls.sub}</div>
      `;
      card.addEventListener('click', () => {
        this.selectedClassIndex = idx;
        this.renderClassOptions();
        this.renderSeatPickerGrid();
        this.updateSeatPickerSummary();
      });
      grid.appendChild(card);
    });
  },

  renderSeatPickerGrid() {
    const grid = document.getElementById('custSeatGrid');
    const deckName = document.getElementById('custDeckName');
    if (!grid) return;
    grid.innerHTML = '';

    const currentClass = this.bookingClasses[this.selectedClassIndex];
    if (deckName) deckName.innerText = currentClass.name;

    // Occupied seat simulation
    const occupiedSeats = ['A-02', 'B-03', 'C-01', 'D-04', 'VIP-02'];

    if (this.selectedClassIndex === 2) {
      // VIP Stateroom Layout (4 Exclusive Cabins)
      const deckHeader = document.createElement('div');
      deckHeader.className = 'seat-deck-header';
      deckHeader.innerText = '⚓ PRIVATE VIP STATEROOM CABIN DECK (DEK DEPAN)';
      grid.appendChild(deckHeader);

      const vipRow = document.createElement('div');
      vipRow.className = 'seat-row';
      for (let i = 1; i <= 4; i++) {
        const seatCode = `VIP-0${i}`;
        const isOccupied = occupiedSeats.includes(seatCode);
        const isSelected = this.selectedSeats.includes(seatCode);

        const seat = document.createElement('div');
        seat.className = `seat-box vip ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`;
        seat.style.width = '70px';
        seat.innerHTML = `👑 ${seatCode}`;

        if (!isOccupied) {
          seat.addEventListener('click', () => {
            this.toggleSeatSelection(seatCode);
          });
        }
        vipRow.appendChild(seat);
      }
      grid.appendChild(vipRow);
    } else {
      // Standard / Business Deck with Center Aisle (Baris A, B, C, D)
      const deckHeader = document.createElement('div');
      deckHeader.className = 'seat-deck-header';
      deckHeader.innerText = this.selectedClassIndex === 1 ? '⭐ UPPER BUSINESS DECK' : '🚢 MAIN PASSENGER DECK (DERMAGA SAMUDERA)';
      grid.appendChild(deckHeader);

      const rows = this.selectedClassIndex === 1 ? ['B1', 'B2'] : ['A', 'B', 'C', 'D'];

      rows.forEach(rPrefix => {
        const rowWrap = document.createElement('div');
        rowWrap.className = 'seat-row';

        // Left Window side (2 seats)
        for (let col = 1; col <= 2; col++) {
          const seatCode = `${rPrefix}-0${col}`;
          const isOccupied = occupiedSeats.includes(seatCode);
          const isSelected = this.selectedSeats.includes(seatCode);
          const seat = document.createElement('div');
          seat.className = `seat-box ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`;
          seat.innerText = seatCode;
          if (!isOccupied) seat.addEventListener('click', () => this.toggleSeatSelection(seatCode));
          rowWrap.appendChild(seat);
        }

        // Center Aisle
        const aisle = document.createElement('div');
        aisle.className = 'seat-aisle-gap';
        aisle.innerText = 'LORONG';
        rowWrap.appendChild(aisle);

        // Right Window side (2 seats)
        for (let col = 3; col <= 4; col++) {
          const seatCode = `${rPrefix}-0${col}`;
          const isOccupied = occupiedSeats.includes(seatCode);
          const isSelected = this.selectedSeats.includes(seatCode);
          const seat = document.createElement('div');
          seat.className = `seat-box ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`;
          seat.innerText = seatCode;
          if (!isOccupied) seat.addEventListener('click', () => this.toggleSeatSelection(seatCode));
          rowWrap.appendChild(seat);
        }

        grid.appendChild(rowWrap);
      });
    }
  },

  toggleSeatSelection(seatCode) {
    if (this.selectedSeats.includes(seatCode)) {
      this.selectedSeats = this.selectedSeats.filter(s => s !== seatCode);
    } else {
      if (this.selectedSeats.length >= 4) {
        this.showToast('Batas Kursi', 'Maksimal 4 kursi per satu kali reservasi tiket.', 'warning');
        return;
      }
      this.selectedSeats.push(seatCode);
    }
    this.renderSeatPickerGrid();
    this.updateSeatPickerSummary();
  },

  updateSeatPickerSummary() {
    const seatDisp = document.getElementById('custSelectedSeatDisplay');
    const priceDisp = document.getElementById('custSubtotalDisplay');
    const classDisp = document.getElementById('custSelectedClassName');
    if (!this.bookingClasses) return;

    const currentClass = this.bookingClasses[this.selectedClassIndex];
    if (classDisp) classDisp.innerText = currentClass.name;

    if (this.selectedSeats.length === 0) {
      if (seatDisp) seatDisp.innerText = 'Belum dipilih (Klik nomor kursi di denah)';
      if (priceDisp) priceDisp.innerText = formatRupiah(0);
    } else {
      if (seatDisp) seatDisp.innerText = this.selectedSeats.join(', ');
      if (priceDisp) priceDisp.innerText = formatRupiah(this.selectedSeats.length * currentClass.price);
    }
  },

  // Confirm Customer Payment & Generate E-Ticket
  confirmCustomerPayment() {
    if (!this.currentBookingSchedule) return;
    if (this.selectedSeats.length === 0) {
      this.showToast('Pilih Kursi', 'Silakan pilih minimal 1 nomor kursi di denah kapal.', 'warning');
      return;
    }

    const paxType = document.getElementById('custPaxType') ? document.getElementById('custPaxType').value : 'Dewasa';
    const paxName = document.getElementById('custPaxName').value.trim();
    const gender = document.getElementById('custPaxGender').value;
    const docNum = document.getElementById('custPaxDocNum').value.trim();
    const dob = document.getElementById('custPaxDob').value;
    const age = document.getElementById('custPaxAge') ? document.getElementById('custPaxAge').value : '';
    const nationality = document.getElementById('custPaxNationality').value;
    const remark = document.getElementById('custPaxRemark') ? document.getElementById('custPaxRemark').value.trim() : '-';
    const docType = document.getElementById('custDocType') ? document.getElementById('custDocType').value : 'PASSPORT_RI';
    const passportExp = document.getElementById('custPaxPassportExp') ? document.getElementById('custPaxPassportExp').value : '';
    const paxPhone = document.getElementById('custPaxPhone').value.trim();
    const paxEmail = document.getElementById('custPaxEmail').value.trim();

    if (!paxName || !docNum) {
      this.showToast('Lengkapi Data', 'Nama lengkap dan nomor dokumen identitas wajib diisi.', 'warning');
      return;
    }

    const { sch, comp, vesselName, origPort, destPort } = this.currentBookingSchedule;
    const isIntl = (origPort.id === 'TWU' || destPort.id === 'TWU' || comp.category.toLowerCase().includes('tawau') || comp.category.toLowerCase().includes('internasional'));

    if (isIntl && (docType === 'PASSPORT_RI' || docType === 'PASSPORT_FOREIGN') && passportExp) {
      const expDate = new Date(passportExp);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      if (expDate < sixMonthsFromNow) {
        this.showToast('Paspor Kurang dari 6 Bulan', 'Sesuai regulasi Imigrasi internasional, paspor wajib berlaku minimal 6 bulan.', 'warning');
        return;
      }
    }

    const currentClass = this.bookingClasses[this.selectedClassIndex];
    const totalAmount = this.selectedSeats.length * currentClass.price;
    const payMethod = document.querySelector('input[name="custPayMethod"]:checked')?.value || 'Loket Resmi Perusahaan';

    // Generate unique PNR and Barcode
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const pnr = `OMNI-${comp.code || 'TKT'}-${randomSuffix}`;
    const barcode = `8910${Math.floor(10000000 + Math.random() * 90000000)}`;

    const dateInput = document.getElementById('custInputDate');
    const departDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    const newBooking = {
      pnr,
      barcode,
      companyId: comp.id,
      scheduleId: sch.id,
      vesselName,
      originCity: origPort.city,
      originCode: origPort.id || 'NNK',
      destinationCity: destPort.city,
      destCode: destPort.id || 'TWU',
      departDate,
      departTime: `${sch.departTime} WITA`,
      className: currentClass.name,
      pier: sch.pier,
      isIntl,
      contact: { name: paxName, phone: paxPhone, email: paxEmail },
      passengers: this.selectedSeats.map(seat => ({
        paxType,
        name: paxName,
        gender,
        docType,
        passportNo: docNum,
        docNumber: docNum,
        nik: docNum,
        dob,
        age,
        nationality,
        remark,
        passportExp,
        seat,
        className: currentClass.name
      })),
      totalAmount,
      paymentMethod: payMethod,
      paymentStatus: 'PAID',
      boardingStatus: 'NOT_CHECKED_IN',
      createdAt: new Date().toISOString()
    };

    // Save to multi-tenant store
    Store.addBooking(newBooking);

    // Close booking modal
    document.getElementById('modalCustomerBooking').classList.remove('show');

    // Open Boarding Pass Modal
    this.refreshCompanyDashboard();
    this.openBoardingPassModal(newBooking);
    this.showToast('Tiket Berhasil Diterbitkan!', `Tiket resmi ${comp.name} berhasil diterbitkan (PNR: ${pnr}).`);
  },

  openBoardingPassModal(booking) {
    const comp = Store.getCompanyById(booking.companyId) || { name: 'Perusahaan Pelayaran', shortName: 'Operator' };
    const p0 = booking.passengers[0];

    document.getElementById('ticketCompName').innerText = comp.name;
    document.getElementById('ticketPnrVal').innerText = booking.pnr;
    document.getElementById('ticketOriginCity').innerText = `${booking.originCity}`;
    document.getElementById('ticketOriginCode').innerText = booking.originCode || 'NNK';
    document.getElementById('ticketDestCity').innerText = `${booking.destinationCity}`;
    document.getElementById('ticketDestCode').innerText = booking.destCode || 'TWU';
    document.getElementById('ticketDepartTime').innerText = booking.departTime;
    document.getElementById('ticketArrivalTime').innerText = 'Estimasi Tepat Waktu';
    document.getElementById('ticketVesselVal').innerText = booking.vesselName;

    const routeBadge = document.getElementById('ticketRouteTypeBadge');
    if (routeBadge) {
      routeBadge.innerText = booking.isIntl ? '🌏 RUTE INTERNASIONAL (TAWAU)' : '🚢 RUTE DOMESTIK (PAREPARE)';
      routeBadge.style.color = booking.isIntl ? '#f59e0b' : '#10b981';
    }

    document.getElementById('ticketPaxNameVal').innerText = p0.name;
    const docLabel = p0.docType === 'KTP' ? 'NIK KTP' : (p0.docType === 'PLB' ? 'PLB' : 'No. Paspor');
    document.getElementById('ticketPaxDocVal').innerText = `${docLabel}: ${p0.docNumber || p0.nik}`;

    const natLabel = p0.nationality === 'MY' ? '🇲🇾 WNA (Malaysia)' : (p0.nationality === 'OTHER' ? '🌏 WNA (Foreigner)' : '🇮🇩 WNI (Indonesia)');
    document.getElementById('ticketPaxNationalityVal').innerText = natLabel;
    document.getElementById('ticketPaxGenderDobVal').innerText = `${p0.gender === 'P' ? 'Perempuan' : 'Laki-laki'} • Lahir: ${p0.dob || '-'}`;

    document.getElementById('ticketSeatVal').innerText = booking.passengers.map(p => p.seat).join(', ');
    document.getElementById('ticketClassVal').innerText = booking.className;
    document.getElementById('ticketPierVal').innerText = booking.pier;
    document.getElementById('ticketTotalAmountDisplay').innerHTML = `Total Tarif: <strong>${formatRupiah(booking.totalAmount)}</strong>`;
    document.getElementById('ticketBarcodeNum').innerText = booking.barcode;

    // Render Crisp SVG QR Code
    const qrWrap = document.getElementById('ticketQrCodeContainer');
    if (qrWrap) {
      const qrPayload = `PNR:${booking.pnr};OP:${comp.code || 'SEA'};PAX:${p0.name};DOC:${p0.docNumber || p0.nik};ROUTE:${booking.originCode}-${booking.destCode};SEAT:${booking.passengers.map(p => p.seat).join(',')};STATUS:PAID`;
      qrWrap.innerHTML = this.generateSvgQrCode(qrPayload);
    }

    const statusPill = document.getElementById('ticketBoardingStatusPill');
    if (booking.boardingStatus === 'BOARDED') {
      statusPill.innerText = '✓ SUDAH BOARDING (CHECKED-IN)';
      statusPill.style.background = '#0284c7';
    } else {
      statusPill.innerText = 'READY FOR BOARDING';
      statusPill.style.background = '#10b981';
    }

    // Attach WhatsApp send handler
    const btnWa = document.getElementById('btnSendTicketWhatsapp');
    if (btnWa) {
      btnWa.onclick = () => {
        const phone = booking.contact?.phone || 'Nomor Penumpang';
        this.showToast('Kirim ke WhatsApp', `E-Boarding Pass & QR Code (PNR: ${booking.pnr}) berhasil disiapkan ke WhatsApp ${phone}.`);
      };
    }

    document.getElementById('modalCustomerTicket').classList.add('show');
  },

  // Render Dynamic Entry Portal Buttons for Registered Companies
  renderCompanyAuthButtons() {
    const grid = document.getElementById('demoButtonsGrid');
    if (!grid) return;
    const companies = Store.getCompanies();
    grid.innerHTML = '';

    if (companies.length === 0) {
      grid.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed var(--border-line); border-radius: var(--radius-md); padding: 0.85rem 1rem; color: var(--text-dim); font-size: 0.83rem; line-height: 1.5; grid-column: 1 / -1;">
          Belum ada perusahaan terdaftar. Silakan daftarkan perusahaan pelayaran Anda melalui formulir di samping untuk otomatis membuat portal masuk resmi.
        </div>
      `;
      return;
    }

    companies.forEach(comp => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-demo-company';
      btn.setAttribute('data-comp-id', comp.id);
      btn.innerHTML = `
        <span class="btn-demo-dot" style="background: ${comp.brandColor};"></span>
        <span class="btn-demo-text">
          <strong>${comp.shortName || comp.name}</strong>
          <small>Portal ${comp.category || 'Operator Resmi'}</small>
        </span>
      `;
      btn.addEventListener('click', () => {
        Store.setCurrentTenant(comp);
        this.updateHeaderTenantUI(comp);
        this.switchView('companyDashboard');
        this.showToast('Login Berhasil', `Selamat datang di portal ${comp.name}!`);
      });
      grid.appendChild(btn);
    });
  },

  // ================= COMPANY AUTHENTICATION =================
  initAuthEvents() {
    this.renderCompanyAuthButtons();

    // Login Form Submit
    document.getElementById('formCompanyLogin').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginCompEmail').value.trim();
      const pass = document.getElementById('loginCompPassword').value;

      const comp = Store.getCompanies().find(c => c.email.toLowerCase() === email.toLowerCase());
      if (comp) {
        Store.setCurrentTenant(comp);
        this.updateHeaderTenantUI(comp);
        this.switchView('companyDashboard');
        this.showToast('Login Berhasil', `Selamat datang kembali, ${comp.name}!`);
      } else {
        this.showToast('Gagal Masuk', 'Email perusahaan tidak ditemukan dalam sistem.', 'warning');
      }
    });

    // Register Form Submit - Otomatis buat portal masuk perusahaan
    document.getElementById('formCompanyRegister').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regCompName').value.trim();
      const category = document.getElementById('regCompCategory').value;
      const email = document.getElementById('regCompEmail').value.trim();
      const password = document.getElementById('regCompPassword').value;
      const phone = document.getElementById('regCompPhone').value.trim();
      const color = document.getElementById('regCompColor').value;

      const randomCode = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') || 'CO';
      const newComp = {
        id: `COMP-${Date.now().toString(36).toUpperCase()}`,
        name,
        shortName: name,
        code: randomCode,
        category,
        email,
        password,
        phone,
        brandColor: color,
        logoIcon: 'ship',
        verified: true,
        joinedDate: new Date().toISOString().split('T')[0],
        bankAccount: { bank: 'Bank Mandiri', number: '140-00-1284910-1', holder: name },
        description: `Perusahaan ${category} mitra resmi platform Tech Solution.`
      };

      // Add to store
      Store.addCompany(newComp);

      // Auto-provision starter fleet vessel for this company
      const newVessel = {
        id: `VES-${Date.now().toString(36).toUpperCase()}`,
        companyId: newComp.id,
        name: `${newComp.shortName} Express 01`,
        regNumber: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
        type: category,
        capacity: 120,
        facilities: ['AC Penuh', 'Kantin', 'Pelampung SNI'],
        status: 'Operasional'
      };
      Store.addVessel(newVessel);

      // Auto-provision starter schedule on standard routes
      const isIntl = category.toLowerCase().includes('internasional') || category.toLowerCase().includes('tawau');
      const newSched = {
        id: `SCH-${newComp.code}-${Math.floor(10 + Math.random() * 90)}`,
        companyId: newComp.id,
        vesselId: newVessel.id,
        vesselNameCustom: newVessel.name,
        categoryType: isIntl ? 'INTERNATIONAL' : 'DOMESTIC',
        originId: 'NNK',
        destinationId: isIntl ? 'TWU' : 'PRE',
        departTime: '08:30',
        arrivalTime: isIntl ? '10:00' : '18:30',
        durationText: isIntl ? '1.5 Jam (Lintas Batas)' : '27 Jam (Direct Sea)',
        pier: isIntl ? 'Dermaga Lintas Batas Internasional' : 'Dermaga Nusantara Domestik',
        status: 'Aktif',
        classes: [
          { name: 'Eksekutif', price: isIntl ? 350000 : 380000, quota: 60, available: 60 },
          { name: 'VIP', price: isIntl ? 450000 : 500000, quota: 30, available: 30 }
        ]
      };
      Store.addSchedule(newSched);

      // Update portal masuk perusahaan secara otomatis
      this.renderCompanyAuthButtons();
      this.renderCompanyFilterChips();

      // Langsung buka portal dashboard perusahaan
      Store.setCurrentTenant(newComp);
      this.updateHeaderTenantUI(newComp);
      this.switchView('companyDashboard');
      this.showToast('Portal Siap!', `Perusahaan "${name}" berhasil didaftarkan dan portal masuk resmi telah aktif!`);
    });
  },

  // ================= COMPANY DASHBOARD =================
  initDashboardEvents() {
    // Helper function to switch tabs
    const switchTab = (tabKey) => {
      document.querySelectorAll('.dash-pane').forEach(p => p.classList.remove('active'));
      if (tabKey === 'tabOverview') document.getElementById('paneOverview')?.classList.add('active');
      if (tabKey === 'tabFleet') document.getElementById('paneFleet')?.classList.add('active');
      if (tabKey === 'tabSchedules') document.getElementById('paneSchedules')?.classList.add('active');
      if (tabKey === 'tabManifest') document.getElementById('paneManifest')?.classList.add('active');
      if (tabKey === 'tabScanner') document.getElementById('paneScanner')?.classList.add('active');
      if (tabKey === 'tabTicketing') document.getElementById('paneTicketing')?.classList.add('active');
      if (tabKey === 'tabSettings') {
        document.getElementById('paneSettings')?.classList.add('active');
        this.loadKsopSettingsToForm();
      }
    };

    // Sub-tabs switching
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabKey = btn.getAttribute('data-tab');

        // Toggle accordion group if exists
        const parentGroup = btn.closest('.dash-nav-group');
        if (parentGroup) {
          const wasOpen = parentGroup.classList.contains('open');
          document.querySelectorAll('.dash-nav-group').forEach(g => {
            if (g !== parentGroup) g.classList.remove('open');
          });
          parentGroup.classList.toggle('open', !wasOpen);
        } else {
          document.querySelectorAll('.dash-nav-group').forEach(g => g.classList.remove('open'));
        }

        switchTab(tabKey);

        // Handle specific actions from Photo 2 navigation
        const action = btn.getAttribute('data-action');
        if (action === 'seat-focus') {
          const ticketingPane = document.getElementById('paneTicketing');
          if (ticketingPane) {
            ticketingPane.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (action === 'ksop-focus') {
          const btnExport = document.getElementById('btnExportManifestCsv');
          if (btnExport) {
            btnExport.scrollIntoView({ behavior: 'smooth' });
            btnExport.style.outline = '2px solid #10b981';
            setTimeout(() => { btnExport.style.outline = 'none'; }, 2000);
          }
        }
      });
    });

    // Sub-menu item click listener
    document.querySelectorAll('.dash-sub-item[data-tab]').forEach(sub => {
      sub.addEventListener('click', (e) => {
        e.preventDefault();
        const tabKey = sub.getAttribute('data-tab');
        switchTab(tabKey);
        
        // highlight parent button
        const group = sub.closest('.dash-nav-group');
        if (group) {
          const parentBtn = group.querySelector('.dash-tab-btn');
          if (parentBtn) {
            document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
            parentBtn.classList.add('active');
          }
          group.querySelectorAll('.dash-sub-item').forEach(s => s.classList.remove('active'));
          sub.classList.add('active');
        }
      });
    });

    // Submenu shortcuts
    document.getElementById('subBtnAddSchedule')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('btnOpenAddSchedule')?.click();
    });
    document.getElementById('subBtnAddVessel')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('btnOpenAddVessel')?.click();
    });
    document.getElementById('subBtnExportCsv')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('btnExportManifestCsv')?.click();
    });

    // Logout button
    document.getElementById('dashBtnLogout').addEventListener('click', () => {
      Store.setCurrentTenant(null);
      this.updateHeaderTenantUI(null);
      this.switchView('weatherHome');
      this.showToast('Logout Berhasil', 'Anda telah keluar dari portal perusahaan.');
    });

    // Scanner Check-in
    document.getElementById('btnScanCode').addEventListener('click', () => {
      const code = document.getElementById('scanInputCode').value.trim().toUpperCase();
      this.handleGateScan(code);
    });

    // Add Vessel Modal trigger
    document.getElementById('btnOpenAddVessel').addEventListener('click', () => {
      document.getElementById('modalAddVessel').classList.add('show');
    });

    // Add Schedule Modal trigger
    document.getElementById('btnOpenAddSchedule').addEventListener('click', () => {
      const tenant = Store.getCurrentTenant();
      const vessels = Store.getVesselsByCompany(tenant.id);
      const sel = document.getElementById('schedVesselSelect');
      sel.innerHTML = '';
      if (vessels.length === 0) {
        sel.add(new Option(`${tenant.shortName} Express 01`, 'VES-NEW'));
      } else {
        vessels.forEach(v => sel.add(new Option(`${v.name} (${v.type})`, v.id)));
      }
      document.getElementById('modalAddSchedule').classList.add('show');
    });

    // Submit Add Vessel Form
    document.getElementById('formAddVessel').addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      const name = document.getElementById('vesselNameInput').value.trim();
      const reg = document.getElementById('vesselRegInput').value.trim();
      const type = document.getElementById('vesselTypeInput').value;
      const capacity = parseInt(document.getElementById('vesselCapacityInput').value, 10);
      const facStr = document.getElementById('vesselFacInput').value;
      const facilities = facStr.split(',').map(s => s.trim()).filter(Boolean);

      const newVessel = {
        id: `VES-${Date.now().toString(36).toUpperCase()}`,
        companyId: tenant.id,
        name,
        regNumber: reg,
        type,
        capacity,
        facilities,
        status: 'ACTIVE'
      };

      Store.addVessel(newVessel);
      document.getElementById('modalAddVessel').classList.remove('show');
      document.getElementById('formAddVessel').reset();
      this.refreshCompanyDashboard();
      this.showToast('Armada Ditambahkan', `Kapal "${name}" berhasil terdaftar di bawah ${tenant.name}.`);
    });

    // Submit Add Schedule Form
    document.getElementById('formAddSchedule').addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      const vesselId = document.getElementById('schedVesselSelect').value;
      const originId = document.getElementById('schedOriginSelect').value;
      const destinationId = document.getElementById('schedDestSelect').value;
      const departTime = document.getElementById('schedDepartTime').value;
      const arrivalTime = document.getElementById('schedArrivalTime').value;
      const pier = document.getElementById('schedPierInput').value.trim();
      const priceVip = parseInt(document.getElementById('schedPriceVip').value, 10);
      const priceEko = parseInt(document.getElementById('schedPriceEko').value, 10);

      const newSched = {
        id: `SCH-${tenant.code || 'OP'}-${Date.now().toString(36).toUpperCase()}`,
        companyId: tenant.id,
        vesselId,
        originId,
        destinationId,
        departTime,
        arrivalTime,
        daysToAdd: 0,
        pier,
        status: 'ACTIVE',
        classes: [
          { id: 'cls-vip', name: 'VIP Suite Class', price: priceVip, quota: 20, booked: 0 },
          { id: 'cls-eko', name: 'Ekonomi Reclining', price: priceEko, quota: 100, booked: 0 }
        ]
      };

      Store.addSchedule(newSched);
      document.getElementById('modalAddSchedule').classList.remove('show');
      document.getElementById('formAddSchedule').reset();
      this.refreshCompanyDashboard();
      this.showToast('Jadwal Dipublikasikan', `Rute ${originId} ➔ ${destinationId} berhasil dibuka untuk umum.`);
    });

    // Initialize KSOP Settings Events
    this.initKsopSettingsEvents();
  },

  // Refresh Dashboard contents based on logged-in tenant
  refreshCompanyDashboard() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    // Header banner
    const elName = document.getElementById('dashTenantName');
    if (elName) elName.innerText = tenant.name;
    const elMeta = document.getElementById('dashTenantMeta');
    if (elMeta) elMeta.innerText = `Kategori: ${tenant.category} • ID: ${tenant.id} • Email: ${tenant.email}`;
    const elAvatar = document.getElementById('dashTenantAvatar');
    if (elAvatar) elAvatar.style.background = tenant.brandColor;

    // Fetch Tenant Isolated Data
    const fleet = Store.getVesselsByCompany(tenant.id);
    const schedules = Store.getSchedulesByCompany(tenant.id);
    const bookings = Store.getBookingsByCompany(tenant.id);

    // Update Badges Count (Safe Optional Chaining)
    const badgeFleet = document.getElementById('countFleetBadge');
    if (badgeFleet) badgeFleet.innerText = fleet.length;
    const badgeSched = document.getElementById('countSchedBadge');
    if (badgeSched) badgeSched.innerText = schedules.length;
    const badgeManifest = document.getElementById('countManifestBadge');
    if (badgeManifest) badgeManifest.innerText = bookings.reduce((sum, b) => sum + b.passengers.length, 0);

    // Calculate Financial KPIs
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalTickets = bookings.reduce((sum, b) => sum + b.passengers.length, 0);

    const elRev = document.getElementById('kpiRevenue');
    if (elRev) elRev.innerText = formatRupiah(totalRevenue);
    const elTix = document.getElementById('kpiTicketsSold');
    if (elTix) elTix.innerText = totalTickets;
    const elFleet = document.getElementById('kpiFleetCount');
    if (elFleet) elFleet.innerText = fleet.length;

    // Render Recent Bookings Table
    const tbodyRecent = document.getElementById('tbodyRecentBookings');
    tbodyRecent.innerHTML = '';
    if (bookings.length === 0) {
      tbodyRecent.innerHTML = `<tr><td colspan="8" class="text-center text-dim" style="padding: 2rem;">Belum ada tiket yang dipesan pada armada perusahaan Anda.</td></tr>`;
    } else {
      bookings.slice(0, 5).forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong style="color: var(--primary-cyan); font-family: var(--font-mono);">${b.pnr}</strong></td>
          <td>${b.departDate}</td>
          <td>${b.originCity} ➔ ${b.destinationCity}<br><small class="text-dim">${b.vesselName}</small></td>
          <td>${b.contact.name}</td>
          <td>${b.passengers.length} Kursi</td>
          <td class="text-gold"><strong>${formatRupiah(b.totalAmount)}</strong></td>
          <td><span class="status-pill ${b.boardingStatus === 'BOARDED' ? 'boarded' : 'waiting'}">${b.boardingStatus}</span></td>
          <td style="white-space: nowrap; text-align: center;">
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button type="button" class="btn-action-sm btn-edit-ticket" title="Edit Tiket & Kursi">
                🎫 Tiket
              </button>
              <button type="button" class="btn-action-sm btn-transfer-vessel" title="Transfer Penumpang ke Kapal Lain">
                🔄 Transfer
              </button>
            </div>
          </td>
        `;

        tr.querySelector('.btn-edit-ticket').addEventListener('click', () => {
          this.openEditTicketModal(b.pnr);
        });
        tr.querySelector('.btn-transfer-vessel').addEventListener('click', () => {
          this.openTransferVesselModal(b.pnr, 0);
        });

        tbodyRecent.appendChild(tr);
      });
    }

    // Render Fleet Table
    const tbodyFleet = document.getElementById('tbodyFleetList');
    tbodyFleet.innerHTML = '';
    if (fleet.length === 0) {
      tbodyFleet.innerHTML = `<tr><td colspan="6" class="text-center text-dim" style="padding: 2rem;">Belum ada armada yang didaftarkan. Klik "Tambah Armada Baru" di atas.</td></tr>`;
    } else {
      fleet.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${v.name}</strong></td>
          <td><code style="color: var(--primary-cyan);">${v.regNumber}</code></td>
          <td>${v.type}</td>
          <td>${v.capacity} Penumpang</td>
          <td><small class="text-dim">${v.facilities.join(', ')}</small></td>
          <td><span class="status-pill paid">${v.status}</span></td>
        `;
        tbodyFleet.appendChild(tr);
      });
    }

    // Render Schedules Table
    const tbodySched = document.getElementById('tbodySchedulesList');
    tbodySched.innerHTML = '';
    if (schedules.length === 0) {
      tbodySched.innerHTML = `<tr><td colspan="7" class="text-center text-dim" style="padding: 2rem;">Belum ada jadwal keberangkatan aktif. Klik "Buka Jadwal Baru" di atas.</td></tr>`;
    } else {
      schedules.forEach(s => {
        const v = fleet.find(item => item.id === s.vesselId);
        const vName = v ? v.name : 'Armada Reguler';
        const orig = MASTER_PORTS.find(p => p.id === s.originId);
        const dest = MASTER_PORTS.find(p => p.id === s.destinationId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${s.id}</code></td>
          <td><strong>${vName}</strong></td>
          <td>${orig ? orig.name : s.originId} ➔ ${dest ? dest.name : s.destinationId}</td>
          <td>${s.departTime} - ${s.arrivalTime} WIB</td>
          <td><small class="text-dim">${s.pier}</small></td>
          <td>${s.classes.map(c => `<div>${c.name}: <strong>${formatRupiah(c.price)}</strong></div>`).join('')}</td>
          <td><span class="status-pill paid">${s.status}</span></td>
        `;
        tbodySched.appendChild(tr);
      });
    }

    // Render Manifest Table with Realtime Filters & Port Clearance Stats
    this.renderManifestTable(bookings, tenant);

    // Attach Manifest Filter Listeners (once)
    if (!this.manifestFiltersInitialized) {
      this.manifestFiltersInitialized = true;
      const searchInput = document.getElementById('manifestSearchInput');
      const routeFilter = document.getElementById('manifestFilterRoute');
      const boardingFilter = document.getElementById('manifestFilterBoarding');

      const triggerFilter = () => {
        const currentTenant = Store.getCurrentTenant();
        const currentBookings = Store.getBookingsByCompany(currentTenant.id);
        this.renderManifestTable(currentBookings, currentTenant);
      };

      if (searchInput) searchInput.addEventListener('input', triggerFilter);
      if (routeFilter) routeFilter.addEventListener('change', triggerFilter);
      if (boardingFilter) boardingFilter.addEventListener('change', triggerFilter);

      const btnExportCsv = document.getElementById('btnExportManifestCsv');
      if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
          const currentTenant = Store.getCurrentTenant();
          const currentBookings = Store.getBookingsByCompany(currentTenant.id);
          this.exportManifestCsv(currentBookings, currentTenant);
        });
      }

      const btnPrintOfficial = document.getElementById('btnOpenOfficialManifestPrint');
      if (btnPrintOfficial) {
        btnPrintOfficial.addEventListener('click', () => {
          const currentTenant = Store.getCurrentTenant();
          const currentBookings = Store.getBookingsByCompany(currentTenant.id);
          this.openOfficialManifestPrintModal(currentBookings, currentTenant);
        });
      }
    }

    // Render Ticketing Counter Tab for Company (Proses Tiket Baru Loket Perusahaan)
    const ticketingList = document.getElementById('companyTicketingSchedulesList');
    const compBadge = document.getElementById('ticketingCompBadge');
    if (compBadge) {
      compBadge.innerText = `Ketentuan Resmi: ${tenant.shortName || tenant.name}`;
      compBadge.style.borderColor = tenant.brandColor;
      compBadge.style.color = tenant.brandColor;
    }

    if (ticketingList) {
      ticketingList.innerHTML = '';
      if (schedules.length === 0) {
        ticketingList.innerHTML = `
          <div class="sched-card" style="padding: 2.5rem; text-align: center;">
            <h4 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: #f59e0b;">Belum Ada Jadwal Aktif untuk Pemrosesan Tiket</h4>
            <p class="text-dim">Buka sub-tab "Kelola Rute & Jadwal" untuk membuka jadwal keberangkatan armada ${tenant.name}.</p>
          </div>
        `;
      } else {
        schedules.forEach(sch => {
          const v = fleet.find(item => item.id === sch.vesselId);
          const vName = v ? v.name : (sch.vesselNameCustom || 'Armada Resmi');
          const orig = MASTER_PORTS.find(p => p.id === sch.originId) || { name: sch.originId, city: '' };
          const dest = MASTER_PORTS.find(p => p.id === sch.destinationId) || { name: sch.destinationId, city: '' };
          const isIntl = sch.categoryType === 'INTERNATIONAL' || sch.originId === 'TWU' || sch.destinationId === 'TWU';
          const minPrice = Math.min(...sch.classes.map(c => c.price));

          const card = document.createElement('div');
          card.className = 'sched-card';
          card.innerHTML = `
            <div class="sched-header">
              <div class="sched-company-badge">
                <span class="comp-badge-dot" style="background: ${tenant.brandColor};"></span>
                <span class="comp-badge-name">${tenant.name}</span>
                <span class="vessel-badge-name">• ${vName}</span>
              </div>
              <span class="tag-badge" style="background: ${isIntl ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${isIntl ? '#38bdf8' : '#10b981'}; border-color: ${isIntl ? '#0284c7' : '#10b981'}; font-weight: 700;">
                ${isIntl ? '🌏 PERJALANAN LUAR NEGERI' : '🇮🇩 PERJALANAN DALAM NEGERI'}
              </span>
            </div>

            <div class="sched-body-grid">
              <div class="route-track">
                <div class="track-node">
                  <span class="node-time">${sch.departTime}</span>
                  <span class="node-city">${orig.name} (${orig.city})</span>
                  <span class="node-pier">${sch.pier}</span>
                </div>

                <div class="track-progress">
                  <span class="track-duration">${sch.durationText || 'Langsung'}</span>
                  <div class="track-line"></div>
                  <small style="color: ${isIntl ? '#f59e0b' : '#94a3b8'}; font-size: 0.72rem; margin-top: 0.25rem;">
                    ${isIntl ? 'Wajib Paspor / PLB Resmi' : 'KTP / NIK Resmi'}
                  </small>
                </div>

                <div class="track-node right">
                  <span class="node-time">${sch.arrivalTime}</span>
                  <span class="node-city">${dest.name} (${dest.city})</span>
                  <span class="node-pier">Terminal Kedatangan</span>
                </div>
              </div>

              <div class="sched-pricing-box">
                <span class="price-tag-sub">Tarif Resmi</span>
                <strong class="price-tag-val">${formatRupiah(minPrice)}</strong>
                <button type="button" class="btn-book-sched btn-ticketing-action" data-sch-id="${sch.id}">
                  🎫 Proses & Terbitkan Tiket
                </button>
              </div>
            </div>
          `;

          card.querySelector('.btn-ticketing-action').addEventListener('click', () => {
            this.openBookingModal(sch, tenant, vName, orig, dest);
          });

          ticketingList.appendChild(card);
        });
      }
    }

    // Render Quick Demo Scan Chips
    const scanChipsWrap = document.getElementById('quickScanChips');
    if (scanChipsWrap) {
      scanChipsWrap.innerHTML = '';
      bookings.forEach(b => {
        const chip = document.createElement('span');
        chip.className = 'scan-chip';
        chip.innerText = b.pnr;
        chip.addEventListener('click', () => {
          document.getElementById('scanInputCode').value = b.pnr;
          this.handleGateScan(b.pnr);
        });
        scanChipsWrap.appendChild(chip);
      });
    }
  },

  // Render Manifest Table with Filters and Stats
  renderManifestTable(bookings, tenant) {
    const tbody = document.getElementById('tbodyManifestList');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchKeyword = (document.getElementById('manifestSearchInput')?.value || '').toLowerCase().trim();
    const routeFilter = document.getElementById('manifestFilterRoute')?.value || 'ALL';
    const boardingFilter = document.getElementById('manifestFilterBoarding')?.value || 'ALL';

    // Flatten all passengers
    let paxList = [];
    bookings.forEach(b => {
      b.passengers.forEach((p, pIdx) => {
        paxList.push({
          booking: b,
          pax: p,
          paxIndex: pIdx
        });
      });
    });

    // Apply Filters
    if (routeFilter === 'TAWAU') {
      paxList = paxList.filter(item => item.booking.isIntl || item.booking.destCode === 'TWU' || item.booking.originCode === 'TWU');
    } else if (routeFilter === 'PAREPARE') {
      paxList = paxList.filter(item => !item.booking.isIntl && (item.booking.destCode === 'PRE' || item.booking.originCode === 'PRE'));
    }

    if (boardingFilter !== 'ALL') {
      paxList = paxList.filter(item => item.booking.boardingStatus === boardingFilter);
    }

    if (searchKeyword) {
      paxList = paxList.filter(item => {
        const p = item.pax;
        const b = item.booking;
        const searchStr = `${p.name} ${p.docNumber || p.nik} ${b.pnr} ${b.vesselName} ${p.seat}`.toLowerCase();
        return searchStr.includes(searchKeyword);
      });
    }

    // Update Quick Statistics
    let wniCount = 0;
    let wnaCount = 0;
    let boardedCount = 0;
    let waitingCount = 0;

    paxList.forEach(item => {
      if (item.pax.nationality === 'MY' || item.pax.nationality === 'OTHER') wnaCount++;
      else wniCount++;

      if (item.booking.boardingStatus === 'BOARDED') boardedCount++;
      else waitingCount++;
    });

    const statTotal = document.getElementById('statManifestTotalPax');
    const statWni = document.getElementById('statManifestWniWna');
    const statBoarding = document.getElementById('statManifestBoardingRatio');

    if (statTotal) statTotal.innerText = `${paxList.length} Penumpang`;
    if (statWni) statWni.innerText = `${wniCount} WNI • ${wnaCount} WNA`;
    if (statBoarding) statBoarding.innerText = `${boardedCount} Boarded • ${waitingCount} Menunggu`;

    // Render Table Rows
    if (paxList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center text-dim" style="padding: 2.5rem;">Tidak ada manifest penumpang yang sesuai dengan kriteria filter saat ini.</td></tr>`;
      return;
    }

    paxList.forEach((item, idx) => {
      const b = item.booking;
      const p = item.pax;
      const tr = document.createElement('tr');

      const isBoarded = b.boardingStatus === 'BOARDED';
      const docNum = p.passportNo || p.docNumber || p.nik || '-';
      const paxTypeBadge = p.paxType === 'Anak' 
        ? '<span class="tag-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border-color: #f59e0b;">Anak-Anak</span>' 
        : (p.paxType === 'Bayi' 
          ? '<span class="tag-badge" style="background: rgba(168, 85, 247, 0.15); color: #a855f7; border-color: #a855f7;">Bayi (Infant)</span>' 
          : '<span class="tag-badge" style="background: rgba(2, 132, 199, 0.15); color: #38bdf8; border-color: #0284c7;">Dewasa</span>');

      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="check-pax-item" data-pnr="${b.pnr}" data-pax-idx="${item.paxIndex}" style="cursor: pointer; width: 16px; height: 16px;">
        </td>
        <td style="color: var(--text-dim); text-align: center;">${idx + 1}</td>
        <td><strong style="color: var(--primary-cyan); font-family: var(--font-mono);">${b.pnr}</strong></td>
        <td>${paxTypeBadge}</td>
        <td><strong style="color: #fff;">${p.name}</strong></td>
        <td style="text-align: center; font-weight: 600;">${p.gender === 'P' ? '<span style="color: #ec4899;">P</span>' : '<span style="color: #38bdf8;">L</span>'}</td>
        <td><code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #f8fafc;">${docNum}</code></td>
        <td>${p.dob || '-'} <small class="text-dim">(${p.age ? p.age + ' th' : '-'})</small></td>
        <td>${p.nationality || 'Indonesia'}</td>
        <td style="font-size: 0.8rem; color: var(--text-dim); max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.remark || '-'}">${p.remark || '-'}</td>
        <td><strong>${b.vesselName}</strong> <span style="color: var(--accent-gold); font-family: var(--font-mono); font-weight: bold;">(${p.seat})</span></td>
        <td>
          <span class="status-pill ${isBoarded ? 'boarded' : 'waiting'}">
            ${isBoarded ? `✓ BOARDED (${b.boardedAt || 'ONBOARD'})` : 'MENUNGGU'}
          </span>
        </td>
        <td style="white-space: nowrap; text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
            <button type="button" class="btn-action-sm btn-edit-manifest" title="Edit Data Manifest Penumpang (Nama, Dokumen, Umur, Remark)">
              ✏️ Manifest
            </button>
            <button type="button" class="btn-action-sm btn-edit-ticket" title="Edit Tiket (Nomor Kursi, Status Bayar & Boarding)">
              🎫 Tiket
            </button>
            <button type="button" class="btn-action-sm btn-transfer-vessel" title="Alihkan / Transfer Penumpang ke Kapal Lain">
              🔄 Transfer
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-edit-manifest').addEventListener('click', () => {
        this.openEditManifestModal(b.pnr, item.paxIndex);
      });
      tr.querySelector('.btn-edit-ticket').addEventListener('click', () => {
        this.openEditTicketModal(b.pnr);
      });
      tr.querySelector('.btn-transfer-vessel').addEventListener('click', () => {
        this.openTransferVesselModal(b.pnr, item.paxIndex, 'SINGLE');
      });

      tbody.appendChild(tr);
    });

    // Check all checkbox listener in manifest table header
    const checkAllBox = document.getElementById('checkAllManifestTable');
    if (checkAllBox) {
      checkAllBox.checked = false;
      checkAllBox.onchange = () => {
        document.querySelectorAll('.check-pax-item').forEach(cb => {
          cb.checked = checkAllBox.checked;
        });
      };
    }

    // Bulk transfer button listener on manifest panel
    const btnBulkTransfer = document.getElementById('btnOpenBulkTransferModal');
    if (btnBulkTransfer) {
      btnBulkTransfer.onclick = () => {
        const checkedBoxes = Array.from(document.querySelectorAll('.check-pax-item:checked'));
        const checkedPnrs = Array.from(new Set(checkedBoxes.map(cb => cb.getAttribute('data-pnr'))));
        if (checkedPnrs.length > 0) {
          this.openTransferVesselModal(checkedPnrs, 0, 'SELECTED');
        } else {
          // If none checked, open modal with all passengers selected by default
          this.openTransferVesselModal(null, 0, 'ALL');
        }
      };
    }
  },

  // Export Manifest CSV (Standard KSOP / Port Clearance Format)
  exportManifestCsv(bookings, tenant) {
    if (!bookings || bookings.length === 0) {
      this.showToast('Manifest Kosong', 'Belum ada data penumpang terdaftar untuk diekspor.', 'warning');
      return;
    }

    const headers = [
      'No',
      'Kode PNR',
      'Jenis Penumpang',
      'Nama Lengkap',
      'Jenis Kelamin',
      'No. Passport',
      'Tanggal Lahir',
      'Umur (Tahun)',
      'Negara Asal',
      'Remark / Keterangan',
      'Nama Kapal',
      'Nomor Kursi',
      'Kelas Layanan',
      'Rute Keberangkatan',
      'Status Pembayaran',
      'Status Boarding'
    ];

    let rowIdx = 1;
    const rows = [];
    rows.push(headers.map(h => `"${h}"`).join(','));

    bookings.forEach(b => {
      b.passengers.forEach(p => {
        const row = [
          rowIdx++,
          b.pnr,
          p.paxType || 'Dewasa',
          p.name,
          p.gender === 'P' ? 'Perempuan' : 'Laki-laki',
          p.passportNo || p.docNumber || p.nik || '-',
          p.dob || '-',
          p.age ? `${p.age} th` : '-',
          p.nationality || 'Indonesia',
          p.remark || '-',
          b.vesselName,
          p.seat,
          p.className || b.className,
          `${b.originCity} ➔ ${b.destinationCity}`,
          b.paymentStatus,
          b.boardingStatus
        ];
        rows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Manifest_KSOP_${tenant.code || 'SEA'}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Ekspor CSV Berhasil', `File manifest resmi berhasil diunduh untuk KSOP & Imigrasi.`);
  },

  // Open Official KSOP Manifest Print Modal
  openOfficialManifestPrintModal(bookings, tenant) {
    const modal = document.getElementById('modalOfficialManifestPrint');
    if (!modal) return;

    const ksop = Store.getKsopSettings();
    document.getElementById('docPrintCompanyTitle').innerText = tenant.name.toUpperCase();
    document.getElementById('docPrintCompanySub').innerText = `Kategori: ${tenant.category} • Pangkalan Pelabuhan: ${ksop.ksopPort || 'Pelabuhan Tunon Taka Nunukan'}`;
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = ksop.spbPrefix || `MNF-${tenant.code || 'KSOP'}/`;
    document.getElementById('docPrintManifestRef').innerText = `${prefix}${dateCode}`;

    if (bookings.length > 0) {
      document.getElementById('docPrintVesselName').innerText = bookings[0].vesselName;
      document.getElementById('docPrintRoute').innerText = `${bookings[0].originCity} ➔ ${bookings[0].destinationCity}`;
      document.getElementById('docPrintDepTime').innerText = `${bookings[0].departDate || 'Hari Ini'} • ${bookings[0].departTime}`;
    }

    // Populate Official Signatures and Disclaimers
    const printMaster = document.getElementById('printMasterName');
    if (printMaster) printMaster.innerText = ksop.masterName || 'Capt. Bambang Prakoso, M.Mar.';
    const printMasterCert = document.getElementById('printMasterCert');
    if (printMasterCert) printMasterCert.innerText = `COC: ${ksop.masterCertNo || 'ANT-II / 620019284'}`;

    const printImmi = document.getElementById('printImmigrationOfficer');
    if (printImmi) printImmi.innerText = ksop.immigrationOfficer || 'Rahmat Hidayat, S.H.';
    const printImmiNip = document.getElementById('printImmigrationNip');
    if (printImmiNip) printImmiNip.innerText = ksop.immigrationNip ? `NIP. ${ksop.immigrationNip}` : '-';

    const printKsop = document.getElementById('printKsopOfficer');
    if (printKsop) printKsop.innerText = ksop.ksopName || 'Capt. Agus Suherman, S.Si.T., M.Mar.';
    const printKsopNip = document.getElementById('printKsopNip');
    if (printKsopNip) printKsopNip.innerText = ksop.ksopNip ? `NIP. ${ksop.ksopNip}` : '-';

    const printNotice = document.getElementById('printRegulationNotice');
    if (printNotice) printNotice.innerText = ksop.regulationNotice || 'Diterbitkan sesuai ketentuan Undang-Undang No. 17 Tahun 2008 tentang Pelayaran dan Peraturan Direktur Jenderal Perhubungan Laut.';

    const tbody = document.getElementById('tbodyOfficialManifestPrintList');
    tbody.innerHTML = '';

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding: 1.5rem; text-align: center; color: #64748b;">Belum ada penumpang terdaftar di manifest pelayaran ini.</td></tr>`;
    } else {
      let count = 1;
      bookings.forEach(b => {
        b.passengers.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cbd5e1;">${count++}</td>
            <td style="padding: 5px 8px; font-family: monospace; border: 1px solid #cbd5e1;">${b.pnr}</td>
            <td style="padding: 5px 8px; font-weight: bold; border: 1px solid #cbd5e1;">${p.name}</td>
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cbd5e1;">${p.nationality === 'MY' ? 'Malaysia' : (p.nationality === 'OTHER' ? 'Asing' : 'Indonesia')}</td>
            <td style="padding: 5px 8px; font-family: monospace; border: 1px solid #cbd5e1;">${p.docType || 'DOC'}: ${p.docNumber || p.nik}</td>
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cbd5e1;">${p.gender === 'P' ? 'P' : 'L'}</td>
            <td style="padding: 5px 8px; text-align: center; font-weight: bold; border: 1px solid #cbd5e1;">${p.seat}</td>
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: ${b.boardingStatus === 'BOARDED' ? '#047857' : '#b45309'};">
              ${b.boardingStatus === 'BOARDED' ? 'ONBOARD' : 'CHECK-IN'}
            </td>
          `;
          tbody.appendChild(tr);
        });
      });
    }

    modal.classList.add('show');
  },

  // Gate Scanner Execution (Anti-Duplicate Check-in Verification)
  handleGateScan(code) {
    const card = document.getElementById('scanResultCard');
    if (!code) {
      this.showToast('Input Kosong', 'Masukkan Kode Booking atau Barcode terlebih dahulu.', 'warning');
      return;
    }

    const booking = Store.getBookingByPnr(code);
    if (!booking) {
      card.innerHTML = `
        <div class="scan-empty-state" style="color: var(--accent-rose);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
          <h4 style="color: var(--accent-rose);">Tiket Tidak Terdaftar / Palsu!</h4>
          <p>Kode "${code}" tidak ditemukan dalam manifest kapal perusahaan ini.</p>
        </div>
      `;
      return;
    }

    const p0 = booking.passengers[0];
    const isAlreadyBoarded = booking.boardingStatus === 'BOARDED';
    const natBadge = p0.nationality === 'MY' ? '🇲🇾 WNA (Malaysia)' : (p0.nationality === 'OTHER' ? '🌏 WNA (Foreigner)' : '🇮🇩 WNI (Indonesia)');
    const docLabel = p0.docType === 'KTP' ? 'NIK KTP' : (p0.docType === 'PLB' ? 'PLB' : 'No. Paspor');

    card.innerHTML = `
      <div style="border-left: 4px solid ${isAlreadyBoarded ? '#0284c7' : '#10b981'}; padding-left: 1.25rem;">
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
          <span class="tag-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 800;">✓ TIKET VALID & RESMI</span>
          <span class="tag-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${natBadge}</span>
        </div>

        <h3 style="font-size: 1.35rem; margin: 0.25rem 0;">${p0.name}</h3>
        <p class="text-dim" style="font-size: 0.85rem;">
          ${docLabel}: <code style="color: #fff; font-weight: bold;">${p0.docNumber || p0.nik}</code> • Kursi: <strong style="color: var(--primary-cyan);">${booking.passengers.map(p => p.seat).join(', ')}</strong> (${booking.className})
        </p>

        <div style="margin: 0.85rem 0; font-size: 0.84rem; background: rgba(7, 14, 27, 0.5); padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid var(--border-line);">
          <div>Kapal: <strong>${booking.vesselName}</strong></div>
          <div>Rute: <strong>${booking.originCity} ➔ ${booking.destinationCity}</strong> (${booking.departTime})</div>
          <div>Dermaga: <strong>${booking.pier}</strong></div>
          <div>Status Pembayaran: <strong style="color: var(--accent-green);">${booking.paymentStatus} (LUNAS)</strong></div>
        </div>

        <div style="margin-top: 1rem;">
          ${isAlreadyBoarded ? `
            <div style="background: rgba(2, 132, 199, 0.15); border: 1px solid #0284c7; padding: 0.75rem 1rem; border-radius: 8px; color: #38bdf8; font-weight: 700; font-size: 0.85rem;">
              ⚠️ PERINGATAN: Tiket ini SUDAH DIGUNAKAN (BOARDED) pada ${booking.boardedAt || 'Hari Ini'}. Mencegah boarding ganda!
            </div>
          ` : `
            <button type="button" class="btn-submit-action btn-green" id="btnConfirmBoarding" style="width: 100%; padding: 0.75rem; font-size: 0.9rem;">
              ✓ Verifikasi & Izinkan Boarding Masuk Kapal
            </button>
          `}
        </div>
      </div>
    `;

    const btnConfirm = document.getElementById('btnConfirmBoarding');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
        Store.updateBookingStatus(booking.pnr, 'BOARDED');
        this.showToast('Boarding Berhasil', `Penumpang ${p0.name} telah diverifikasi masuk kapal!`);
        this.refreshCompanyDashboard();
        this.handleGateScan(booking.pnr);
      });
    }
  },

  // Modal Closures and Universal Listeners
  initModals() {
    // Add Vessel Modal
    document.getElementById('btnCloseAddVessel').addEventListener('click', () => {
      document.getElementById('modalAddVessel').classList.remove('show');
    });
    document.getElementById('btnCancelAddVessel').addEventListener('click', () => {
      document.getElementById('modalAddVessel').classList.remove('show');
    });

    // Add Schedule Modal
    document.getElementById('btnCloseAddSchedule').addEventListener('click', () => {
      document.getElementById('modalAddSchedule').classList.remove('show');
    });
    document.getElementById('btnCancelAddSchedule').addEventListener('click', () => {
      document.getElementById('modalAddSchedule').classList.remove('show');
    });

    // Customer Booking Modal
    document.getElementById('btnCloseCustomerBooking').addEventListener('click', () => {
      document.getElementById('modalCustomerBooking').classList.remove('show');
    });
    document.getElementById('btnCancelCustomerBooking').addEventListener('click', () => {
      document.getElementById('modalCustomerBooking').classList.remove('show');
    });
    document.getElementById('btnConfirmPayCustomer').addEventListener('click', () => {
      this.confirmCustomerPayment();
    });

    // Company Auth Modal
    const btnCloseAuth = document.getElementById('btnCloseCompanyAuth');
    if (btnCloseAuth) {
      btnCloseAuth.addEventListener('click', () => {
        this.closeCompanyAuthModal();
      });
    }
    const modalAuth = document.getElementById('modalCompanyAuth');
    if (modalAuth) {
      modalAuth.addEventListener('click', (e) => {
        if (e.target === modalAuth) this.closeCompanyAuthModal();
      });
    }

    // Boarding Pass Modal
    document.getElementById('btnCloseCustomerTicket').addEventListener('click', () => {
      document.getElementById('modalCustomerTicket').classList.remove('show');
    });
    document.getElementById('btnDoneTicket').addEventListener('click', () => {
      document.getElementById('modalCustomerTicket').classList.remove('show');
    });

    // Official Manifest KSOP Print Modal
    const btnCloseManifestPrint = document.getElementById('btnCloseOfficialManifestPrint');
    if (btnCloseManifestPrint) {
      btnCloseManifestPrint.addEventListener('click', () => {
        document.getElementById('modalOfficialManifestPrint').classList.remove('show');
      });
    }
    const btnCancelManifestPrint = document.getElementById('btnCancelOfficialManifestPrint');
    if (btnCancelManifestPrint) {
      btnCancelManifestPrint.addEventListener('click', () => {
        document.getElementById('modalOfficialManifestPrint').classList.remove('show');
      });
    }

    // Modal 1: Edit Manifest Listeners
    document.getElementById('btnCloseEditManifest')?.addEventListener('click', () => {
      document.getElementById('modalEditManifest').classList.remove('show');
    });
    document.getElementById('btnCancelEditManifest')?.addEventListener('click', () => {
      document.getElementById('modalEditManifest').classList.remove('show');
    });
    document.getElementById('formEditManifest')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pnr = document.getElementById('editManifestPnr').value;
      const paxIndex = parseInt(document.getElementById('editManifestPaxIndex').value, 10) || 0;

      const updatedPax = {
        paxType: document.getElementById('editPaxType').value,
        name: document.getElementById('editPaxName').value.trim(),
        gender: document.getElementById('editPaxGender').value,
        docType: 'PASSPORT',
        passportNo: document.getElementById('editPaxDocNum').value.trim(),
        docNumber: document.getElementById('editPaxDocNum').value.trim(),
        nik: document.getElementById('editPaxDocNum').value.trim(),
        dob: document.getElementById('editPaxDob').value,
        age: document.getElementById('editPaxAge').value,
        nationality: document.getElementById('editPaxNationality').value,
        remark: document.getElementById('editPaxRemark').value.trim()
      };

      Store.updatePassenger(pnr, paxIndex, updatedPax);
      document.getElementById('modalEditManifest').classList.remove('show');
      this.refreshCompanyDashboard();
      this.showToast('Manifest Diperbarui', `Data manifest penumpang "${updatedPax.name}" (PNR: ${pnr}) berhasil disimpan.`);
    });

    // Modal 2: Edit Ticket Listeners
    document.getElementById('btnCloseEditTicket')?.addEventListener('click', () => {
      document.getElementById('modalEditTicket').classList.remove('show');
    });
    document.getElementById('btnCancelEditTicket')?.addEventListener('click', () => {
      document.getElementById('modalEditTicket').classList.remove('show');
    });
    document.getElementById('formEditTicket')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pnr = document.getElementById('editTicketPnr').value;
      const booking = Store.getBookingByPnr(pnr);
      if (!booking) return;

      const newSeat = document.getElementById('editTicketSeat').value.trim().toUpperCase();
      const newClass = document.getElementById('editTicketClass').value;
      const newPayment = document.getElementById('editTicketPaymentStatus').value;
      const newBoarding = document.getElementById('editTicketBoardingStatus').value;
      const contactName = document.getElementById('editTicketContactName').value.trim();
      const contactPhone = document.getElementById('editTicketContactPhone').value.trim();

      booking.className = newClass;
      booking.paymentStatus = newPayment;
      booking.boardingStatus = newBoarding;
      if (newBoarding === 'BOARDED' && !booking.boardedAt) {
        booking.boardedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';
      }
      if (booking.contact) {
        booking.contact.name = contactName || booking.contact.name;
        booking.contact.phone = contactPhone || booking.contact.phone;
      }
      if (booking.passengers && booking.passengers[0]) {
        booking.passengers[0].seat = newSeat;
        booking.passengers[0].className = newClass;
      }

      Store.updateBooking(booking);
      document.getElementById('modalEditTicket').classList.remove('show');
      this.refreshCompanyDashboard();
      this.showToast('Tiket Diperbarui', `Tiket ${pnr} berhasil diupdate: Kursi ${newSeat}, Status ${newPayment}.`);
    });

    // Modal 3: Transfer Vessel Listeners
    document.getElementById('btnCloseTransferVessel')?.addEventListener('click', () => {
      document.getElementById('modalTransferVessel').classList.remove('show');
    });
    document.getElementById('btnCancelTransferVessel')?.addEventListener('click', () => {
      document.getElementById('modalTransferVessel').classList.remove('show');
    });
    document.getElementById('formTransferVessel')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      const targetSchedId = document.getElementById('transferTargetScheduleSelect').value;
      const checkedBoxes = Array.from(document.querySelectorAll('#transferPaxListContainer .check-transfer-modal-pax:checked'));
      const pnrList = Array.from(new Set(checkedBoxes.map(cb => cb.getAttribute('data-pnr'))));
      const newSeatVal = document.getElementById('transferNewSeatInput').value.trim().toUpperCase();
      const reason = document.getElementById('transferReasonSelect').value;
      const extraRemark = document.getElementById('transferRemarkInput').value.trim();

      if (!targetSchedId) {
        this.showToast('Jadwal Kosong', 'Pilih jadwal kapal tujuan transfer terlebih dahulu.', 'warning');
        return;
      }

      if (pnrList.length === 0) {
        this.showToast('Belum Ada Penumpang', 'Pilih minimal satu penumpang untuk dialihkan.', 'warning');
        return;
      }

      const schedules = Store.getSchedulesByCompany(tenant.id);
      const targetSched = schedules.find(s => s.id === targetSchedId);
      const fleet = Store.getVesselsByCompany(tenant.id);

      let targetVesselName = 'Armada Baru';
      let targetVesselId = '';
      let departTime = '';
      let arrivalTime = '';
      let pier = '';

      if (targetSched) {
        targetVesselId = targetSched.vesselId;
        const v = fleet.find(f => f.id === targetSched.vesselId);
        targetVesselName = v ? v.name : (targetSched.vesselNameCustom || 'Armada Baru');
        departTime = targetSched.departTime;
        arrivalTime = targetSched.arrivalTime;
        pier = targetSched.pier;
      }

      const finalReason = extraRemark ? `${reason} (${extraRemark})` : reason;

      if (pnrList.length === 1) {
        // Single passenger transfer
        const transferData = {
          scheduleId: targetSchedId,
          vesselId: targetVesselId,
          vesselName: targetVesselName,
          departTime,
          arrivalTime,
          pier,
          newSeat: newSeatVal || 'A-01',
          reason: finalReason
        };
        Store.transferBookingVessel(pnrList[0], transferData);
        this.showToast('Transfer Berhasil!', `Penumpang tiket ${pnrList[0]} resmi dialihkan ke ${targetVesselName} (Kursi: ${transferData.newSeat}).`);
      } else {
        // Batch / All passengers transfer
        const transferData = {
          scheduleId: targetSchedId,
          vesselId: targetVesselId,
          vesselName: targetVesselName,
          departTime,
          arrivalTime,
          pier,
          seatMode: newSeatVal.includes('OTOMATIS') ? 'AUTO' : 'PRESERVE',
          reason: finalReason
        };
        const count = Store.batchTransferPassengers(pnrList, transferData);
        this.showToast('Transfer Massal Berhasil!', `${count} Penumpang resmi dialihkan serentak ke ${targetVesselName}.`);
      }

      document.getElementById('modalTransferVessel').classList.remove('show');
      this.refreshCompanyDashboard();
    });
  },

  // Open Modal 1: Edit Manifest
  openEditManifestModal(pnr, paxIndex = 0) {
    const booking = Store.getBookingByPnr(pnr);
    if (!booking || !booking.passengers || !booking.passengers[paxIndex]) {
      this.showToast('Data Tidak Ditemukan', 'Data penumpang tidak ditemukan.', 'warning');
      return;
    }

    const p = booking.passengers[paxIndex];
    document.getElementById('editManifestPnr').value = pnr;
    document.getElementById('editManifestPaxIndex').value = paxIndex;
    document.getElementById('editManifestPnrLabel').innerText = `${pnr} (Kursi: ${p.seat})`;

    document.getElementById('editPaxType').value = p.paxType || 'Dewasa';
    document.getElementById('editPaxName').value = p.name || '';
    document.getElementById('editPaxGender').value = p.gender || 'L';
    document.getElementById('editPaxDocNum').value = p.passportNo || p.docNumber || p.nik || '';
    document.getElementById('editPaxDob').value = p.dob || '';
    document.getElementById('editPaxAge').value = p.age || '';
    document.getElementById('editPaxNationality').value = p.nationality || 'Indonesia';
    document.getElementById('editPaxRemark').value = p.remark || '';

    // Auto-calculate age listener for edit form
    const dobInput = document.getElementById('editPaxDob');
    const ageInput = document.getElementById('editPaxAge');
    const typeInput = document.getElementById('editPaxType');

    dobInput.onchange = () => {
      if (dobInput.value) {
        const birthDate = new Date(dobInput.value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age >= 0) {
          ageInput.value = age;
          if (age < 2) typeInput.value = 'Bayi';
          else if (age < 12) typeInput.value = 'Anak';
          else typeInput.value = 'Dewasa';
        }
      }
    };

    document.getElementById('modalEditManifest').classList.add('show');
  },

  // Open Modal 2: Edit Ticket
  openEditTicketModal(pnr) {
    const booking = Store.getBookingByPnr(pnr);
    if (!booking) {
      this.showToast('Tiket Tidak Ditemukan', `Tiket ${pnr} tidak ditemukan.`, 'warning');
      return;
    }

    document.getElementById('editTicketPnr').value = pnr;
    document.getElementById('editTicketPnrLabel').innerText = `${pnr} • ${booking.vesselName}`;

    const p0 = booking.passengers && booking.passengers[0] ? booking.passengers[0] : {};
    document.getElementById('editTicketSeat').value = p0.seat || '';
    document.getElementById('editTicketClass').value = booking.className || 'Ekonomi (Main Deck)';
    document.getElementById('editTicketPaymentStatus').value = booking.paymentStatus || 'PAID';
    document.getElementById('editTicketBoardingStatus').value = booking.boardingStatus || 'NOT_CHECKED_IN';
    document.getElementById('editTicketContactName').value = booking.contact ? booking.contact.name : (p0.name || '');
    document.getElementById('editTicketContactPhone').value = booking.contact ? booking.contact.phone : '';

    document.getElementById('modalEditTicket').classList.add('show');
  },

  // Open Modal 3: Transfer Vessel (Dengan Opsi Pilih Semua vs Pilih Satu-Satu)
  openTransferVesselModal(pnrOrList = null, paxIndex = 0, initialMode = 'SINGLE') {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const allBookings = Store.getBookingsByCompany(tenant.id);
    if (allBookings.length === 0) {
      this.showToast('Data Kosong', 'Belum ada data penumpang terdaftar untuk ditransfer.', 'warning');
      return;
    }

    // Determine target PNR list
    let selectedPnrs = [];
    if (Array.isArray(pnrOrList)) {
      selectedPnrs = pnrOrList;
    } else if (typeof pnrOrList === 'string') {
      selectedPnrs = [pnrOrList];
    } else {
      // Default to all PNRs
      selectedPnrs = allBookings.map(b => b.pnr);
    }

    // Determine initial active vessel and route for origin display
    const firstBooking = allBookings.find(b => selectedPnrs.includes(b.pnr)) || allBookings[0];
    document.getElementById('transferCurrentVessel').innerText = firstBooking ? firstBooking.vesselName : 'Armada Perusahaan';
    document.getElementById('transferCurrentRoute').innerText = firstBooking 
      ? `${firstBooking.originCity} ➔ ${firstBooking.destinationCity} • ${firstBooking.departTime || 'Jadwal Reguler'}` 
      : 'Rute Pelayaran';

    // Populate schedules of company
    const schedules = Store.getSchedulesByCompany(tenant.id);
    const fleet = Store.getVesselsByCompany(tenant.id);
    const select = document.getElementById('transferTargetScheduleSelect');
    select.innerHTML = '';

    if (schedules.length === 0) {
      select.add(new Option(`Belum ada jadwal lain milik ${tenant.name}. Tambahkan jadwal baru terlebih dahulu.`, ''));
    } else {
      schedules.forEach(s => {
        const v = fleet.find(f => f.id === s.vesselId);
        const vName = v ? v.name : (s.vesselNameCustom || 'Armada Reguler');
        const orig = MASTER_PORTS.find(pt => pt.id === s.originId) || { city: s.originId };
        const dest = MASTER_PORTS.find(pt => pt.id === s.destinationId) || { city: s.destinationId };
        const label = `${vName} — ${orig.city} ➔ ${dest.city} (${s.departTime} WITA) [${s.status}]`;
        const opt = new Option(label, s.id);
        if (firstBooking && s.id === firstBooking.scheduleId) {
          opt.text += ' (Jadwal Saat Ini)';
        }
        select.add(opt);
      });
    }

    // Render Checklist Penumpang Asal
    const container = document.getElementById('transferPaxListContainer');
    container.innerHTML = '';

    allBookings.forEach(b => {
      b.passengers.forEach((p, pIdx) => {
        const isChecked = selectedPnrs.includes(b.pnr);
        const row = document.createElement('label');
        row.className = 'transfer-pax-row';
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.8rem; padding: 6px 10px; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: all 0.2s;';
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" class="check-transfer-modal-pax" data-pnr="${b.pnr}" data-seat="${p.seat}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
            <div>
              <strong style="color: #fff;">${p.name}</strong>
              <small class="text-dim" style="margin-left: 6px;">(${p.paxType || 'Dewasa'})</small>
              <div style="font-size: 0.72rem; color: #94a3b8;">
                PNR: <code style="color: var(--primary-cyan); font-weight: bold;">${b.pnr}</code> • Paspor/NIK: <code>${p.passportNo || p.docNumber || p.nik || '-'}</code>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="tag-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-gold); border-color: var(--accent-gold);">
              Kursi: ${p.seat}
            </span>
            <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 2px;">${b.vesselName}</div>
          </div>
        `;
        container.appendChild(row);
      });
    });

    // Update Counter Function
    const updateSelectedCount = () => {
      const checkedBoxes = container.querySelectorAll('.check-transfer-modal-pax:checked');
      const count = checkedBoxes.length;
      const badge = document.getElementById('transferSelectedCountBadge');
      const submitText = document.getElementById('btnTransferSubmitText');
      const seatInput = document.getElementById('transferNewSeatInput');
      const helper = document.getElementById('transferSeatHelper');

      if (badge) badge.innerText = `${count} Penumpang Dipilih`;
      if (submitText) submitText.innerText = count > 1 
        ? `Konfirmasi Transfer (${count} Penumpang Sekaligus)` 
        : (count === 1 ? `Konfirmasi Transfer 1 Penumpang` : `Pilih Penumpang untuk Ditransfer`);

      if (count > 1) {
        seatInput.value = 'OTOMATIS (Berurutan)';
        seatInput.placeholder = 'OTOMATIS (Berurutan)';
        if (helper) helper.innerText = 'Untuk transfer banyak penumpang, sistem otomatis mengalokasikan kursi berurutan di kapal baru.';
      } else if (count === 1) {
        const firstChecked = checkedBoxes[0];
        seatInput.value = firstChecked ? (firstChecked.getAttribute('data-seat') || 'A-01') : 'A-01';
        if (helper) helper.innerText = 'Nomor kursi spesifik untuk penumpang terpilih di kapal baru.';
      } else {
        seatInput.value = '';
      }
    };

    // Attach checkbox changes
    container.querySelectorAll('.check-transfer-modal-pax').forEach(cb => {
      cb.addEventListener('change', updateSelectedCount);
    });

    // Button Select All & Unselect All inside modal
    const btnSelectAll = document.getElementById('btnSelectAllTransferPax');
    if (btnSelectAll) {
      btnSelectAll.onclick = () => {
        container.querySelectorAll('.check-transfer-modal-pax').forEach(cb => { cb.checked = true; });
        const rAll = document.querySelector('input[name="transferScopeMode"][value="ALL"]');
        if (rAll) rAll.checked = true;
        document.getElementById('pillTransferModeAll')?.classList.add('active');
        document.getElementById('pillTransferModeSingle')?.classList.remove('active');
        updateSelectedCount();
      };
    }

    const btnUnselectAll = document.getElementById('btnUnselectAllTransferPax');
    if (btnUnselectAll) {
      btnUnselectAll.onclick = () => {
        container.querySelectorAll('.check-transfer-modal-pax').forEach(cb => { cb.checked = false; });
        const rSingle = document.querySelector('input[name="transferScopeMode"][value="SINGLE"]');
        if (rSingle) rSingle.checked = true;
        document.getElementById('pillTransferModeSingle')?.classList.add('active');
        document.getElementById('pillTransferModeAll')?.classList.remove('active');
        updateSelectedCount();
      };
    }

    // Radio Scope Modes (Single vs All)
    const radioSingle = document.querySelector('input[name="transferScopeMode"][value="SINGLE"]');
    const radioAll = document.querySelector('input[name="transferScopeMode"][value="ALL"]');
    const pillSingle = document.getElementById('pillTransferModeSingle');
    const pillAll = document.getElementById('pillTransferModeAll');

    if (initialMode === 'ALL' || selectedPnrs.length > 1) {
      if (radioAll) radioAll.checked = true;
      if (pillAll) pillAll.classList.add('active');
      if (pillSingle) pillSingle.classList.remove('active');
    } else {
      if (radioSingle) radioSingle.checked = true;
      if (pillSingle) pillSingle.classList.add('active');
      if (pillAll) pillAll.classList.remove('active');
    }

    if (pillSingle && pillAll) {
      pillSingle.onclick = () => {
        if (radioSingle) radioSingle.checked = true;
        pillSingle.classList.add('active');
        pillAll.classList.remove('active');
        // Uncheck all except first
        const boxes = container.querySelectorAll('.check-transfer-modal-pax');
        boxes.forEach((cb, i) => { cb.checked = (i === 0); });
        updateSelectedCount();
      };
      pillAll.onclick = () => {
        if (radioAll) radioAll.checked = true;
        pillAll.classList.add('active');
        pillSingle.classList.remove('active');
        // Check all
        container.querySelectorAll('.check-transfer-modal-pax').forEach(cb => { cb.checked = true; });
        updateSelectedCount();
      };
    }

    updateSelectedCount();
    document.getElementById('transferRemarkInput').value = `Pengalihan resmi penumpang kapal`;
    document.getElementById('modalTransferVessel').classList.add('show');
  },

  // Load KSOP & Maritime Settings to Form
  loadKsopSettingsToForm() {
    const s = Store.getKsopSettings();
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('settingKsopName', s.ksopName);
    setVal('settingKsopNip', s.ksopNip);
    setVal('settingKsopRank', s.ksopRank);
    setVal('settingKsopOffice', s.ksopOffice);
    setVal('settingKsopPort', s.ksopPort);

    setVal('settingInspectorName', s.inspectorName);
    setVal('settingInspectorNip', s.inspectorNip);
    setVal('settingInspectorTitle', s.inspectorTitle);

    setVal('settingMasterName', s.masterName);
    setVal('settingMasterCertNo', s.masterCertNo);

    setVal('settingImmigrationOfficer', s.immigrationOfficer);
    setVal('settingImmigrationNip', s.immigrationNip);

    setVal('settingCustomsOfficer', s.customsOfficer);
    setVal('settingQuarantineOfficer', s.quarantineOfficer);

    setVal('settingSpbPrefix', s.spbPrefix);
    setVal('settingRegulationNotice', s.regulationNotice);
  },

  // Initialize KSOP Settings Submit & Reset
  initKsopSettingsEvents() {
    const form = document.getElementById('formKsopSettings');
    if (form && !this.ksopSettingsInitialized) {
      this.ksopSettingsInitialized = true;

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const getVal = (id) => (document.getElementById(id)?.value || '').trim();

        const updatedSettings = {
          ksopName: getVal('settingKsopName'),
          ksopNip: getVal('settingKsopNip'),
          ksopRank: getVal('settingKsopRank'),
          ksopOffice: getVal('settingKsopOffice'),
          ksopPort: getVal('settingKsopPort'),

          inspectorName: getVal('settingInspectorName'),
          inspectorNip: getVal('settingInspectorNip'),
          inspectorTitle: getVal('settingInspectorTitle'),

          masterName: getVal('settingMasterName'),
          masterCertNo: getVal('settingMasterCertNo'),

          immigrationOfficer: getVal('settingImmigrationOfficer'),
          immigrationNip: getVal('settingImmigrationNip'),

          customsOfficer: getVal('settingCustomsOfficer'),
          quarantineOfficer: getVal('settingQuarantineOfficer'),

          spbPrefix: getVal('settingSpbPrefix'),
          regulationNotice: getVal('settingRegulationNotice')
        };

        Store.saveKsopSettings(updatedSettings);
        this.showToast('Pengaturan KSOP Tersimpan', 'Identitas Kepala KSOP, Syahbandar, Nakhoda, dan Otoritas Maritim resmi diperbarui.');
      });

      const btnReset = document.getElementById('btnResetKsopDefaults');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (confirm('Kembalikan pengaturan pejabat ke data standar resmi KSOP Nunukan & Ditjen Hubla?')) {
            Store.saveKsopSettings(DEFAULT_KSOP_SETTINGS);
            this.loadKsopSettingsToForm();
            this.showToast('Standar KSOP Dipulihkan', 'Pengaturan berhasil direset ke standar resmi KSOP.');
          }
        });
      }
    }
  },

  setRoute(from, to) {
    document.getElementById('custSelectOrigin').value = from;
    document.getElementById('custSelectDest').value = to;
    this.renderCustomerSchedules();
  },

  // Global Toast
  showToast(title, body, type = 'success') {
    const toast = document.getElementById('toastPopup');
    const ic = document.getElementById('toastIcon');
    document.getElementById('toastTitle').innerText = title;
    document.getElementById('toastBody').innerText = body;

    if (type === 'warning') {
      ic.innerText = '!';
      ic.style.background = '#f59e0b';
    } else {
      ic.innerText = '✓';
      ic.style.background = '#10b981';
    }

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
};

// Initialize app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
