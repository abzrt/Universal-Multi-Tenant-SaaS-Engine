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
      const weatherPanel = document.getElementById('viewWeatherHome');
      if (weatherPanel) weatherPanel.classList.add('active');
      if (btnComp) btnComp.classList.add('active');
      this.closeCompanyAuthModal();
    } else if (viewName === 'companyAuth') {
      this.openCompanyAuthModal();
    } else if (viewName === 'companyDashboard') {
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

    const paxName = document.getElementById('custPaxName').value.trim();
    const docType = document.getElementById('custDocType').value;
    const docNum = document.getElementById('custPaxDocNum').value.trim();
    const passportExp = document.getElementById('custPaxPassportExp') ? document.getElementById('custPaxPassportExp').value : '';
    const nationality = document.getElementById('custPaxNationality').value;
    const gender = document.getElementById('custPaxGender').value;
    const dob = document.getElementById('custPaxDob').value;
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
        name: paxName,
        docType,
        nik: docNum,
        docNumber: docNum,
        passportExp,
        nationality,
        gender,
        dob,
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
    // Sub-tabs switching
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabKey = btn.getAttribute('data-tab');

        document.querySelectorAll('.dash-pane').forEach(p => p.classList.remove('active'));
        if (tabKey === 'tabOverview') document.getElementById('paneOverview').classList.add('active');
        if (tabKey === 'tabFleet') document.getElementById('paneFleet').classList.add('active');
        if (tabKey === 'tabSchedules') document.getElementById('paneSchedules').classList.add('active');
        if (tabKey === 'tabManifest') document.getElementById('paneManifest').classList.add('active');
        if (tabKey === 'tabScanner') document.getElementById('paneScanner').classList.add('active');
        if (tabKey === 'tabTicketing') document.getElementById('paneTicketing').classList.add('active');
      });
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
  },

  // Refresh Dashboard contents based on logged-in tenant
  refreshCompanyDashboard() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    // Header banner
    document.getElementById('dashTenantName').innerText = tenant.name;
    document.getElementById('dashTenantMeta').innerText = `Kategori: ${tenant.category} • ID: ${tenant.id} • Email: ${tenant.email}`;
    document.getElementById('dashTenantAvatar').style.background = tenant.brandColor;

    // Fetch Tenant Isolated Data
    const fleet = Store.getVesselsByCompany(tenant.id);
    const schedules = Store.getSchedulesByCompany(tenant.id);
    const bookings = Store.getBookingsByCompany(tenant.id);

    // Update Badges Count
    document.getElementById('countFleetBadge').innerText = fleet.length;
    document.getElementById('countSchedBadge').innerText = schedules.length;
    document.getElementById('countManifestBadge').innerText = bookings.reduce((sum, b) => sum + b.passengers.length, 0);

    // Calculate Financial KPIs
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalTickets = bookings.reduce((sum, b) => sum + b.passengers.length, 0);

    document.getElementById('kpiRevenue').innerText = formatRupiah(totalRevenue);
    document.getElementById('kpiTicketsSold').innerText = totalTickets;
    document.getElementById('kpiFleetCount').innerText = fleet.length;

    // Render Recent Bookings Table
    const tbodyRecent = document.getElementById('tbodyRecentBookings');
    tbodyRecent.innerHTML = '';
    if (bookings.length === 0) {
      tbodyRecent.innerHTML = `<tr><td colspan="7" class="text-center text-dim" style="padding: 2rem;">Belum ada tiket yang dipesan pada armada perusahaan Anda.</td></tr>`;
    } else {
      bookings.slice(0, 5).forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${b.pnr}</strong></td>
          <td>${b.departDate}</td>
          <td>${b.originCity} ➔ ${b.destinationCity}<br><small class="text-dim">${b.vesselName}</small></td>
          <td>${b.contact.name}</td>
          <td>${b.passengers.length} Kursi</td>
          <td class="text-gold"><strong>${formatRupiah(b.totalAmount)}</strong></td>
          <td><span class="status-pill ${b.boardingStatus === 'BOARDED' ? 'boarded' : 'waiting'}">${b.boardingStatus}</span></td>
        `;
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
      b.passengers.forEach(p => {
        paxList.push({
          booking: b,
          pax: p
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
      tbody.innerHTML = `<tr><td colspan="11" class="text-center text-dim" style="padding: 2.5rem;">Tidak ada manifest penumpang yang sesuai dengan kriteria filter saat ini.</td></tr>`;
      return;
    }

    paxList.forEach((item, idx) => {
      const b = item.booking;
      const p = item.pax;
      const tr = document.createElement('tr');

      const natBadge = p.nationality === 'MY' ? '<span style="color:#38bdf8;">🇲🇾 Malaysia</span>' : (p.nationality === 'OTHER' ? '🌏 WNA Lain' : '<span style="color:#10b981;">🇮🇩 Indonesia</span>');
      const docBadge = p.docType === 'KTP' ? `KTP: <code>${p.docNumber || p.nik}</code>` : (p.docType === 'PLB' ? `PLB: <code>${p.docNumber || p.nik}</code>` : `PASPOR: <strong>${p.docNumber || p.nik}</strong>`);
      const isBoarded = b.boardingStatus === 'BOARDED';

      tr.innerHTML = `
        <td style="color: var(--text-dim); text-align: center;">${idx + 1}</td>
        <td><strong style="color: var(--primary-cyan); font-family: var(--font-mono);">${b.pnr}</strong></td>
        <td><strong>${p.name}</strong></td>
        <td>${natBadge}</td>
        <td>${docBadge}</td>
        <td>${p.gender === 'P' ? 'P' : 'L'} • <small class="text-dim">${p.dob || '-'}</small></td>
        <td><strong>${b.vesselName}</strong><br><small class="text-dim">${p.className || b.className}</small></td>
        <td>${b.originCity} ➔ ${b.destinationCity}</td>
        <td><strong style="color: var(--accent-gold); font-family: var(--font-mono);">${p.seat}</strong></td>
        <td><span class="status-pill paid">${b.paymentStatus}</span></td>
        <td>
          <span class="status-pill ${isBoarded ? 'boarded' : 'waiting'}">
            ${isBoarded ? `✓ BOARDED (${b.boardedAt || 'ONBOARD'})` : 'MENUNGGU'}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
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
      'Nama Penumpang',
      'Kewarganegaraan',
      'Jenis Dokumen',
      'Nomor Dokumen',
      'Masa Berlaku Paspor',
      'Jenis Kelamin',
      'Tanggal Lahir',
      'Nama Kapal',
      'Kelas Layanan',
      'Pelabuhan Asal',
      'Pelabuhan Tujuan',
      'Waktu Keberangkatan',
      'Nomor Kursi',
      'Status Pembayaran',
      'Status Boarding',
      'Waktu Boarding'
    ];

    let rowIdx = 1;
    const rows = [];
    rows.push(headers.map(h => `"${h}"`).join(','));

    bookings.forEach(b => {
      b.passengers.forEach(p => {
        const row = [
          rowIdx++,
          b.pnr,
          p.name,
          p.nationality === 'MY' ? 'Malaysia' : (p.nationality === 'OTHER' ? 'Asing' : 'Indonesia'),
          p.docType || 'KTP',
          p.docNumber || p.nik,
          p.passportExp || '-',
          p.gender === 'P' ? 'Perempuan' : 'Laki-laki',
          p.dob || '-',
          b.vesselName,
          p.className || b.className,
          b.originCity,
          b.destinationCity,
          b.departTime,
          p.seat,
          b.paymentStatus,
          b.boardingStatus,
          b.boardedAt || '-'
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

    document.getElementById('docPrintCompanyTitle').innerText = tenant.name.toUpperCase();
    document.getElementById('docPrintCompanySub').innerText = `Kategori: ${tenant.category} • Pangkalan Pelabuhan: Tunon Taka Nunukan`;
    document.getElementById('docPrintManifestRef').innerText = `MNF-${tenant.code || 'KSOP'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

    if (bookings.length > 0) {
      document.getElementById('docPrintVesselName').innerText = bookings[0].vesselName;
      document.getElementById('docPrintRoute').innerText = `${bookings[0].originCity} ➔ ${bookings[0].destinationCity}`;
      document.getElementById('docPrintDepTime').innerText = `${bookings[0].departDate || 'Hari Ini'} • ${bookings[0].departTime}`;
    }

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
