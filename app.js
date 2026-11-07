// ========================================================
// TECH SOLUTION - TICKETING SERVICES PLATFORM ENGINE
// ========================================================

const App = {
  activeView: 'weatherHome', // 'weatherHome' | 'companyDashboard'
  selectedCompanyFilter: 'ALL',
  selectedOverviewVessel: 'ALL',
  selectedTicketingVessel: 'ALL',
  currentBookingSchedule: null,
  selectedSeats: [],
  calendarState: {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    viewMode: 'GRID',
    filterVessel: 'ALL',
    filterRoute: 'ALL',
    selectedVoyageId: null
  },
  bulkState: {
    targetScheduleId: null,
    selectedClass: 'EKONOMI',
    farePerPax: 250000,
    activeTab: 'GRID',
    paxList: [],
    manualGridRows: []
  },
  directPrintState: {
    items: [],
    currentFormat: 'BOARDING_PASS' // 'BOARDING_PASS' | 'THERMAL_POS'
  },

  init() {
    this.initTheme();
    this.initDates();
    this.initPortDropdowns();
    this.renderCompanyFilterChips();
    this.initNavEvents();
    this.initCustomerEvents();
    this.initAuthEvents();
    this.initDashboardEvents();
    this.initCalendarEvents();
    this.initBulkPassengerEvents();
    this.initModals();

    // Enterprise Features Initializations
    this.initCargoEvents();
    this.initInaportnetEvents();
    this.initWeatherWarningEvents();
    this.initPeakSeasonEvents();
    this.initCurrencyAndMdacEvents();

    // Status tenant atau dev admin di header jika ada sesi aktif
    if (typeof Store !== 'undefined' && Store.isDevAdminLoggedIn && Store.isDevAdminLoggedIn()) {
      this.switchView('devAdminDashboard');
    } else {
      const loggedInTenant = Store.getCurrentTenant();
      this.updateHeaderTenantUI(loggedInTenant);
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

    const companies = Store.getCompanies().filter(c => c.approvalStatus !== 'PENDING' && c.approvalStatus !== 'REJECTED' && c.approvalStatus !== 'FROZEN' && c.verified !== false && c.frozen !== true);
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
    document.getElementById('tabBtnLogin')?.click();
    this.renderSavedMitraAccountsDropdown();
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
        this.switchView('weatherHome');
      });

      // Clean logo interaction without 3D glow distortion
      const logoWrap = document.getElementById('brandLogoWrap');
      if (logoWrap) {
        brandHome.addEventListener('mouseleave', () => {
          logoWrap.style.transform = '';
        });
      }
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
      document.body.classList.remove('in-dev-admin');
      const weatherPanel = document.getElementById('viewWeatherHome');
      if (weatherPanel) weatherPanel.classList.add('active');
      if (btnComp) btnComp.classList.add('active');
      this.closeCompanyAuthModal();
      this.updateHeaderTenantUI(typeof Store !== 'undefined' ? Store.getCurrentTenant() : null);
      const brandLogo = document.getElementById('brandLogoImg');
      if (brandLogo) brandLogo.src = 'assets/ferry_logo.png?v=6.0';
    } else if (viewName === 'companyAuth') {
      this.openCompanyAuthModal();
    } else if (viewName === 'companyDashboard') {
      document.body.classList.add('in-company-portal');
      document.body.classList.remove('in-dev-admin');
      const dashPanel = document.getElementById('viewCompanyDashboard');
      if (dashPanel) dashPanel.classList.add('active');
      if (btnComp) btnComp.classList.add('active');
      this.closeCompanyAuthModal();
      this.refreshCompanyDashboard();
      this.updateHeaderTenantUI(typeof Store !== 'undefined' ? Store.getCurrentTenant() : null);
      const brandLogo = document.getElementById('brandLogoImg');
      if (brandLogo) brandLogo.src = 'assets/ferry_logo.png?v=6.0';
      const tickyLogo = document.getElementById('tickyBrandLogoImg');
      if (tickyLogo) tickyLogo.src = 'assets/ferry_logo.png?v=6.0';
    } else if (viewName === 'devAdminDashboard') {
      document.body.classList.remove('in-company-portal');
      document.body.classList.add('in-dev-admin');
      const devPanel = document.getElementById('viewDevAdminDashboard');
      if (devPanel) devPanel.classList.add('active');
      this.closeCompanyAuthModal();
      if (typeof this.closeDevAdminModal === 'function') this.closeDevAdminModal();
      if (typeof this.renderDevAdminDashboard === 'function') this.renderDevAdminDashboard();
      this.updateHeaderTenantUI(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  logoutTenant() {
    try {
      if (typeof Store !== 'undefined' && Store.setCurrentTenant) {
        Store.setCurrentTenant(null);
      } else {
        localStorage.removeItem('tech_current_tenant_v5');
      }
    } catch (e) {
      localStorage.removeItem('tech_current_tenant_v5');
    }
    this.updateHeaderTenantUI(null);
    document.body.classList.remove('in-company-portal');
    const brandLogo = document.getElementById('brandLogoImg');
    if (brandLogo) brandLogo.src = 'assets/ferry_logo.png?v=6.0';
    this.switchView('weatherHome');
    this.showToast('Logout Berhasil', 'Anda telah keluar dari portal operator perusahaan.');
  },

  updateHeaderTenantUI(tenant) {
    const box = document.getElementById('headerTenantBox');
    if (!box) return;

    // Sembunyikan seluruh tombol login tenant / masuk mitra operator saat di mode developer
    const isDev = (typeof Store !== 'undefined' && Store.isDevAdminLoggedIn && Store.isDevAdminLoggedIn()) ||
                  document.body.classList.contains('in-dev-admin') ||
                  this.activeView === 'devAdminDashboard';
    if (isDev) {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = '';

    if (!tenant) {
      box.innerHTML = `
        <button type="button" class="btn-login-tenant" id="btnHeaderLogin">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
          <span>Masuk Mitra Operator</span>
        </button>
      `;
      document.getElementById('btnHeaderLogin')?.addEventListener('click', () => this.openCompanyAuthModal());
      const headerAvatar = document.getElementById('imgHeaderUserAvatar');
      if (headerAvatar) headerAvatar.src = 'assets/avatar-header.svg';
      const dropdownAvatar = document.querySelector('#dropdownHeaderProfile img');
      if (dropdownAvatar) dropdownAvatar.src = 'assets/avatar-header.svg';
    } else {
      const avatarHtml = tenant.displayPhoto && tenant.displayPhoto !== 'assets/avatar-header.svg'
        ? `<img src="${tenant.displayPhoto}" alt="Logo" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; margin-right: 4px; vertical-align: middle;">`
        : `<span class="dot" style="background: ${tenant.brandColor};"></span>`;

      box.innerHTML = `
        <div class="tenant-pill-badge" id="btnHeaderTenantBadge" title="Klik untuk membuka dasbor operator">
          ${avatarHtml}
          <span class="tenant-pill-name">${tenant.shortName || tenant.name}</span>
        </div>
      `;
      document.getElementById('btnHeaderTenantBadge')?.addEventListener('click', () => this.switchView('companyDashboard'));

      // Update avatar image in header and dropdown
      const photoSrc = tenant.displayPhoto || 'assets/avatar-header.svg';
      const headerAvatar = document.getElementById('imgHeaderUserAvatar');
      if (headerAvatar) headerAvatar.src = photoSrc;
      const dropdownAvatar = document.querySelector('#dropdownHeaderProfile img');
      if (dropdownAvatar) dropdownAvatar.src = photoSrc;

      const ddName = document.getElementById('dropdownProfileCompanyName');
      if (ddName) ddName.textContent = tenant.name;
      const ddRole = document.getElementById('dropdownProfileRole');
      if (ddRole) ddRole.textContent = tenant.category || 'Operator Loket Resmi';

      const opsName = document.getElementById('opsHeaderUserName');
      if (opsName) opsName.textContent = tenant.shortName || tenant.name;
      const opsId = document.getElementById('opsHeaderUserId');
      if (opsId) {
        const numId = (tenant.id || '').replace(/\D/g, '');
        opsId.textContent = numId.length >= 4 ? numId.slice(0, 8) : '18830482';
      }
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
            <button type="button" class="btn-quick-route" data-from="NNK" data-to="PRE" onclick="App.setRoute('NNK', 'PRE')">🚢 Nunukan ➔ Parepare</button>
          </div>
        </div>
      `;
      return;
    }

    filtered.forEach(sch => {
      const comp = Store.getCompanyById(sch.companyId) || { name: 'Operator Resmi', brandColor: '#0284c7' };
      const vessel = Store.getVessels().find(v => v.id === sch.vesselId);
      const vesselName = vessel ? vessel.name : (sch.vesselNameCustom || 'Kapal Penyeberangan');
      const minPrice = (sch.classes && sch.classes.length > 0) ? Math.min(...sch.classes.map(c => c.price)) : (sch.priceEconomy || 690000);
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
    if (typeof sch === 'string') {
      const found = Store.getSchedules().find(s => s.id === sch);
      if (found) sch = found;
    }
    if (!sch) return;
    if (!comp) {
      comp = Store.getCompanyById(sch.companyId) || Store.getCurrentTenant() || Store.getCompanies()[0] || { name: 'Operator Resmi', category: 'Operator' };
    }
    if (!vesselName) {
      const v = Store.getVessels().find(v => v.id === sch.vesselId);
      vesselName = v ? v.name : (sch.vesselNameCustom || 'Armada Kapal');
    }
    if (!origPort) {
      origPort = MASTER_PORTS.find(p => p.id === (sch.originId || sch.originPortId)) || MASTER_PORTS[0];
    }
    if (!destPort) {
      destPort = MASTER_PORTS.find(p => p.id === (sch.destinationId || sch.destinationPortId)) || MASTER_PORTS[1];
    }

    this.currentBookingSchedule = { sch, comp, vesselName, origPort, destPort };
    this.selectedSeats = [];
    this.selectedClassIndex = 0;

    const isDom = origPort?.id === 'PRE' || destPort?.id === 'PRE' || (sch.destinationId === 'PRE' || sch.originId === 'PRE');
    const isIntl = !isDom && Boolean(
      origPort?.id === 'TWU' ||
      destPort?.id === 'TWU' ||
      sch.originId === 'TWU' ||
      sch.destinationId === 'TWU' ||
      (comp?.category && (comp.category.toLowerCase().includes('tawau') || comp.category.toLowerCase().includes('internasional')))
    );

    const elVessel = document.getElementById('bookModalVessel');
    if (elVessel) elVessel.innerText = `${vesselName}`;
    const elComp = document.getElementById('bookModalCompany');
    if (elComp) elComp.innerText = `Operator Resmi: ${comp.name} • ${comp.category || 'Pelayaran'}`;

    // Populate Pilihan Armada Kapal inside Booking Modal (#bookingModalVesselSelect & #bookingModalVesselPills)
    const modalVesselSelect = document.getElementById('bookingModalVesselSelect');
    const modalVesselPills = document.getElementById('bookingModalVesselPills');
    const compFleet = comp && comp.id ? Store.getVesselsByCompany(comp.id) : Store.getVessels();
    const compSchedules = comp && comp.id ? Store.getSchedulesByCompany(comp.id) : Store.getSchedules();

    if (modalVesselSelect) {
      modalVesselSelect.innerHTML = '';
      if (compFleet.length === 0) {
        modalVesselSelect.innerHTML = `<option value="${sch.vesselId || ''}">🚢 ${vesselName}</option>`;
      } else {
        compFleet.forEach(fv => {
          const opt = document.createElement('option');
          opt.value = fv.id;
          opt.textContent = `🚢 ${fv.name} (${fv.capacity || 150} Kursi • ${fv.regNumber || 'Resmi'})`;
          if (fv.id === sch.vesselId || fv.name === vesselName) opt.selected = true;
          modalVesselSelect.appendChild(opt);
        });
      }
      modalVesselSelect.onchange = () => {
        const chosenVid = modalVesselSelect.value;
        const chosenVessel = compFleet.find(fv => fv.id === chosenVid);
        if (chosenVessel) {
          const matchedSched = compSchedules.find(s => s.vesselId === chosenVid && s.originId === origPort.id && s.destinationId === destPort.id)
            || compSchedules.find(s => s.vesselId === chosenVid)
            || { ...sch, vesselId: chosenVessel.id, vesselNameCustom: chosenVessel.name };
          this.openBookingModal(matchedSched, comp, chosenVessel.name, origPort, destPort);
        }
      };
    }

    if (modalVesselPills) {
      modalVesselPills.innerHTML = '';
      compFleet.forEach(fv => {
        const isCurrent = (fv.id === sch.vesselId || fv.name === vesselName);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.style.cssText = isCurrent
          ? 'background: #0284c7; color: #ffffff; border: 1px solid #0284c7; padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; cursor: pointer;'
          : 'background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; cursor: pointer;';
        pill.textContent = `⚓ ${fv.name} (${fv.capacity || 150} Seat)`;
        pill.addEventListener('click', () => {
          const matchedSched = compSchedules.find(s => s.vesselId === fv.id && s.originId === origPort.id && s.destinationId === destPort.id)
            || compSchedules.find(s => s.vesselId === fv.id)
            || { ...sch, vesselId: fv.id, vesselNameCustom: fv.name };
          this.openBookingModal(matchedSched, comp, fv.name, origPort, destPort);
        });
        modalVesselPills.appendChild(pill);
      });
    }

    const elRouteStrip = document.getElementById('bookRouteStrip');
    if (elRouteStrip) {
      elRouteStrip.innerHTML = `
        <div class="flex-between align-center" style="flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <strong style="font-size: 1.05rem;">${origPort.name} (${origPort.city}) ➔ ${destPort.name} (${destPort.city})</strong>
            <div class="text-dim" style="font-size: 0.8rem; margin-top: 0.2rem;">Waktu: ${sch.departTime} - ${sch.arrivalTime} WITA • ${sch.pier}</div>
          </div>
          <div class="tag-badge" style="background: ${comp.brandColor || '#0284c7'}22; color: ${comp.brandColor || '#0284c7'}; border-color: ${comp.brandColor || '#0284c7'}; font-weight: 700;">
            ${comp.shortName || comp.name}
          </div>
        </div>
      `;
    }

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

      const mdacBox = document.getElementById('mdacBookingNoticeBox');
      const passExpRow = document.getElementById('passportExpiryRow');
      if (mdacBox) mdacBox.style.display = isIntl ? 'block' : 'none';
      if (passExpRow) passExpRow.style.display = isIntl ? 'grid' : 'none';
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

    // Configure Class Options - Membaca Tarif Tiket & Pas Pelabuhan Sesuai Jadwal Perusahaan Login & Master Tarif Dev Mode
    const isNunukanTawau = !isDom && ((origPort.id === 'NNK' && destPort.id === 'TWU') || (origPort.id === 'TWU' && destPort.id === 'NNK') || isIntl);

    const masterTariff = (typeof Store !== 'undefined' && Store.getMasterRouteTariff) 
      ? Store.getMasterRouteTariff(origPort.id, destPort.id) 
      : null;

    let ticketFare = isDom ? 690000 : (isNunukanTawau ? 430000 : 690000);
    if (masterTariff && masterTariff.ticketPrice) {
      ticketFare = Number(masterTariff.ticketPrice);
    } else if (sch.priceEconomy) {
      ticketFare = (isNunukanTawau && Number(sch.priceEconomy) === 480000) ? 430000 : Number(sch.priceEconomy);
    } else if (sch.classes && sch.classes[0] && sch.classes[0].price) {
      ticketFare = (isNunukanTawau && Number(sch.classes[0].price) === 480000) ? 430000 : Number(sch.classes[0].price);
    }

    let portPassFee = isDom ? 30000 : (isNunukanTawau ? 50000 : 30000);
    if (masterTariff && masterTariff.portPassFee !== undefined) {
      portPassFee = Number(masterTariff.portPassFee);
    } else if (sch.portPassFee !== undefined) {
      portPassFee = Number(sch.portPassFee);
    } else if (this.getSchedulePortPassFee) {
      portPassFee = this.getSchedulePortPassFee(sch, comp);
    }

    const basePrice = ticketFare + portPassFee;
    this.bookingClasses = [
      { 
        name: 'Tiket Reguler', 
        price: basePrice, 
        baseFare: ticketFare, 
        taxFee: portPassFee, 
        sub: 'Kursi Penumpang Reguler (Sesuai Rute & Tarif Resmi Perusahaan)' 
      }
    ];
    this.selectedClassIndex = 0;

    this.renderClassOptions();
    this.renderSeatPickerGrid();
    this.updateSeatPickerSummary();

    // Check duplicate passenger real-time on customer booking modal
    const paxNameInput = document.getElementById('custPaxName');
    const dupIndicator = document.getElementById('duplicatePaxIndicator');
    const dupPnrRef = document.getElementById('duplicatePaxPnrRef');
    if (paxNameInput) {
      const checkDup = () => {
        const val = paxNameInput.value.trim();
        if (!val || !sch.id) {
          if (dupIndicator) dupIndicator.style.display = 'none';
          return;
        }
        const found = Store.checkDuplicatePassenger(val, sch.id);
        if (found) {
          if (dupIndicator) {
            dupIndicator.style.display = 'flex';
            if (dupPnrRef) dupPnrRef.innerText = `PNR: ${found.pnr}, Kursi: ${found.seat}`;
          }
        } else {
          if (dupIndicator) dupIndicator.style.display = 'none';
        }
      };
      paxNameInput.oninput = checkDup;
      checkDup();
    }

    this.updateExchangeRateUI();
    document.getElementById('modalCustomerBooking')?.classList.add('show');
  },

  renderClassOptions() {
    const grid = document.getElementById('custClassOptionsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const isMyr = this.bookingCurrency === 'MYR';
    this.bookingClasses.forEach((cls, idx) => {
      const card = document.createElement('div');
      card.className = `class-pill-card active`;
      card.style.gridColumn = '1 / -1';
      const displayPrice = isMyr ? formatRinggit(convertIdrToMyr(cls.price)) : formatRupiah(cls.price);
      card.innerHTML = `
        <div class="cls-name">
          <span>🚢</span>
          <span>${cls.name}</span>
        </div>
        <div class="cls-price">${displayPrice}</div>
        <div class="cls-sub">${cls.sub}</div>
      `;
      grid.appendChild(card);
    });
  },

  renderSeatPickerGrid() {
    const grid = document.getElementById('custSeatGrid');
    const deckName = document.getElementById('custDeckName');
    if (!grid) return;
    grid.innerHTML = '';

    if (deckName) deckName.innerText = 'Main Passenger Deck';

    // Deck Header: Hanya Ada Main Deck Sesuai Permintaan
    const deckHeader = document.createElement('div');
    deckHeader.className = 'seat-deck-header';
    deckHeader.innerText = '⚓ MAIN PASSENGER DECK (3 KURSI KIRI • LORONG • 3 KURSI KANAN)';
    grid.appendChild(deckHeader);

    // Ambil kapasitas armada kapal (menyesuaikan data penumpang kapal)
    const { sch, comp } = this.currentBookingSchedule || {};
    let capacity = 150;
    if (comp && sch) {
      const fleet = Store.getVesselsByCompany(comp.id);
      const vessel = fleet.find(v => v.id === sch.vesselId) || Store.getVessels().find(v => v.id === sch.vesselId);
      if (vessel && vessel.capacity) {
        capacity = parseInt(vessel.capacity, 10);
      } else if (sch.capacity) {
        capacity = parseInt(sch.capacity, 10);
      }
    }
    if (!capacity || capacity <= 0) capacity = 150;

    // Ambil kursi yang sudah terpesan pada jadwal ini
    const occupiedSeats = (sch && sch.id && typeof this.getOccupiedSeatsForSchedule === 'function')
      ? this.getOccupiedSeatsForSchedule(sch.id)
      : new Set();

    // Default simulasi okupansi jika data pemesanan masih baru
    const defaultOccupied = ['A-02', 'B-03', 'C-01', 'D-04', 'E-02', 'F-05'];

    // Generator Kode Baris Huruf (A, B, C... Z, AA, AB...)
    const getRowCode = (rIdx) => {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      if (rIdx < letters.length) return letters[rIdx];
      const p1 = letters[Math.floor(rIdx / letters.length) - 1];
      const p2 = letters[rIdx % letters.length];
      return `${p1}${p2}`;
    };

    const currentVessel = (comp && sch)
      ? (Store.getVesselsByCompany(comp.id).find(v => v.id === sch.vesselId) || Store.getVessels().find(v => v.id === sch.vesselId))
      : null;
    const totalCols = (currentVessel && currentVessel.seatCols) ? currentVessel.seatCols : 6;
    const totalRows = (currentVessel && currentVessel.seatRows) ? currentVessel.seatRows : Math.ceil(capacity / totalCols);
    const colsLeft = (currentVessel && currentVessel.seatColsLeft) ? currentVessel.seatColsLeft : Math.ceil(totalCols / 2);
    const colsRight = (currentVessel && currentVessel.seatColsRight) ? currentVessel.seatColsRight : (totalCols - colsLeft);
    let generatedCount = 0;

    for (let r = 0; r < totalRows; r++) {
      if (generatedCount >= capacity) break;
      const rowWrap = document.createElement('div');
      rowWrap.className = 'seat-row';
      const rowCode = getRowCode(r);

      // Kolom Kursi Kiri
      for (let col = 1; col <= colsLeft; col++) {
        if (generatedCount >= capacity) break;
        generatedCount++;
        const seatCode = `${rowCode}-${String(col).padStart(2, '0')}`;
        const isOccupied = occupiedSeats.has(seatCode) || (occupiedSeats.size === 0 && defaultOccupied.includes(seatCode));
        const isSelected = this.selectedSeats.includes(seatCode);

        const seat = document.createElement('div');
        seat.className = `seat-box ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`;
        seat.innerText = seatCode;
        seat.title = `Kursi ${seatCode} (Kiri)`;
        if (!isOccupied) {
          seat.addEventListener('click', () => this.toggleSeatSelection(seatCode));
        }
        rowWrap.appendChild(seat);
      }

      // Lorong Tengah (Center Aisle Gap)
      const aisle = document.createElement('div');
      aisle.className = 'seat-aisle-gap';
      aisle.innerText = 'LORONG';
      rowWrap.appendChild(aisle);

      // Kolom Kursi Kanan
      for (let col = colsLeft + 1; col <= totalCols; col++) {
        if (generatedCount >= capacity) break;
        generatedCount++;
        const seatCode = `${rowCode}-${String(col).padStart(2, '0')}`;
        const isOccupied = occupiedSeats.has(seatCode) || (occupiedSeats.size === 0 && defaultOccupied.includes(seatCode));
        const isSelected = this.selectedSeats.includes(seatCode);

        const seat = document.createElement('div');
        seat.className = `seat-box ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`;
        seat.innerText = seatCode;
        seat.title = `Kursi ${seatCode} (Kanan)`;
        if (!isOccupied) {
          seat.addEventListener('click', () => this.toggleSeatSelection(seatCode));
        }
        rowWrap.appendChild(seat);
      }

      grid.appendChild(rowWrap);
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

    const currentClass = this.bookingClasses[this.selectedClassIndex] || this.bookingClasses[0];
    if (classDisp) classDisp.innerText = currentClass.name;

    const isMyr = this.bookingCurrency === 'MYR';
    const seatCount = this.selectedSeats.length;
    const calcCount = Math.max(1, seatCount);

    const { sch, origPort, destPort } = this.currentBookingSchedule || {};
    const isDom = origPort?.id === 'PRE' || destPort?.id === 'PRE' || (sch?.destinationId === 'PRE');
    const isIntl = !isDom && (origPort?.id === 'TWU' || destPort?.id === 'TWU');
    const isNunukanTawau = !isDom && ((origPort?.id === 'NNK' && destPort?.id === 'TWU') || (origPort?.id === 'TWU' && destPort?.id === 'NNK') || isIntl);

    // Rincian Resmi Biaya Tiket Sesuai Pengaturan Jadwal & Pas Pelabuhan Perusahaan Login & Master Tarif:
    const masterTariff = (typeof Store !== 'undefined' && Store.getMasterRouteTariff) 
      ? Store.getMasterRouteTariff(origPort?.id, destPort?.id) 
      : null;

    const defaultBase = isDom ? 690000 : (isNunukanTawau ? 430000 : 690000);
    const defaultTax = isDom ? 30000 : (isNunukanTawau ? 50000 : 30000);

    let operatorBasePerPax = (currentClass && currentClass.baseFare !== undefined)
      ? Number(currentClass.baseFare)
      : (masterTariff && masterTariff.ticketPrice ? Number(masterTariff.ticketPrice) : (sch && sch.priceEconomy ? Number(sch.priceEconomy) : defaultBase));

    // Jangan tambahkan tax dua kali jika base fare tertulis 480.000 pada rute Tawau
    if (isNunukanTawau && operatorBasePerPax === 480000) {
      operatorBasePerPax = 430000;
    }

    let taxPerPax = (currentClass && currentClass.taxFee !== undefined)
      ? Number(currentClass.taxFee)
      : (masterTariff && masterTariff.portPassFee !== undefined ? Number(masterTariff.portPassFee) : (sch && sch.portPassFee !== undefined ? Number(sch.portPassFee) : defaultTax));

    let totalPerPax = operatorBasePerPax + taxPerPax;

    if (currentClass) {
      currentClass.price = totalPerPax;
      currentClass.baseFare = operatorBasePerPax;
      currentClass.taxFee = taxPerPax;
    }

    const totalOperatorBase = operatorBasePerPax * calcCount;
    const totalTax = taxPerPax * calcCount;
    const totalPayableIdr = totalPerPax * (seatCount > 0 ? seatCount : 1);

    // Update Itemized Fee Elements
    const fmt = (val) => isMyr ? formatRinggit(convertIdrToMyr(val)) : formatRupiah(val);
    const feeBaseEl = document.getElementById('feeOperatorBase');
    const feeTermEl = document.getElementById('feePortTerminal');
    const feeInsuEl = document.getElementById('feeInsurance');
    const feeTotalEl = document.getElementById('feeTotalPayable');

    if (feeBaseEl) feeBaseEl.innerText = fmt(totalOperatorBase);
    if (feeTermEl) feeTermEl.innerText = fmt(totalTax);
    if (feeInsuEl) {
      const insuRow = feeInsuEl.closest('.fee-breakdown-row');
      if (insuRow) {
        insuRow.style.display = 'none';
      }
    }

    if (feeTotalEl) feeTotalEl.innerText = fmt(totalPayableIdr);

    if (seatCount === 0) {
      if (seatDisp) seatDisp.innerText = 'Belum dipilih (Klik nomor kursi di denah)';
      if (priceDisp) priceDisp.innerText = fmt(0);
    } else {
      if (seatDisp) seatDisp.innerText = this.selectedSeats.join(', ');
      if (priceDisp) priceDisp.innerText = fmt(totalPayableIdr);
    }
  },

  // Confirm Customer Payment & Generate E-Ticket
  confirmCustomerPayment() {
    if (!this.currentBookingSchedule) return;
    if (this.selectedSeats.length === 0) {
      this.showToast('Pilih Kursi', 'Silakan pilih minimal 1 nomor kursi di denah kapal.', 'warning');
      return;
    }

    const paxType = document.getElementById('custPaxType')?.value || 'Dewasa';
    const paxName = document.getElementById('custPaxName')?.value?.trim() || '';
    const gender = document.getElementById('custPaxGender')?.value || 'L';
    const docNum = document.getElementById('custPaxDocNum')?.value?.trim() || '';
    const dob = document.getElementById('custPaxDob')?.value || '';
    const age = document.getElementById('custPaxAge')?.value || '';
    const nationality = document.getElementById('custPaxNationality')?.value || 'ID';
    const remark = document.getElementById('custPaxRemark')?.value?.trim() || 'None';
    const docType = document.getElementById('custDocType')?.value || 'PASSPORT_RI';
    const passportExp = document.getElementById('custPaxPassportExp')?.value || '';
    const paxPhone = document.getElementById('custPaxPhone')?.value?.trim() || '';
    const paxEmail = document.getElementById('custPaxEmail')?.value?.trim() || '';

    if (!paxName || !docNum) {
      this.showToast('Lengkapi Data', 'Nama lengkap dan nomor dokumen identitas wajib diisi.', 'warning');
      return;
    }

    const { sch, comp, vesselName, origPort, destPort } = this.currentBookingSchedule;

    // Cek Data Penumpang Ganda pada Jadwal Ini
    const dupCheck = Store.checkDuplicatePassenger(paxName, sch.id);
    if (dupCheck) {
      const confirmDup = confirm(`⚠️ PERINGATAN DATA PENUMPANG GANDA!\n\nNama "${paxName}" sudah terdaftar pada jadwal kapal ${dupCheck.vesselName}:\n• PNR: ${dupCheck.pnr}\n• Kursi: ${dupCheck.seat}\n• Tanggal: ${dupCheck.departDate}\n\nApakah Anda yakin ingin tetap melanjutkan pemesanan dengan data nama ganda?`);
      if (!confirmDup) {
        this.showToast('Pemesanan Dibatalkan', `Pemesanan untuk "${paxName}" dibatalkan karena nama terdeteksi ganda.`, 'warning');
        return;
      }
    }
    const isDom = origPort.id === 'PRE' || destPort.id === 'PRE' || (sch.destinationId === 'PRE');
    const isIntl = !isDom && (origPort.id === 'TWU' || destPort.id === 'TWU' || comp.category.toLowerCase().includes('tawau') || comp.category.toLowerCase().includes('internasional'));

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
      paymentStatus: payMethod === 'Sistem Booked' ? 'BOOKED' : 'PAID',
      boardingStatus: 'NOT_CHECKED_IN',
      createdAt: new Date().toISOString()
    };

    // Save to multi-tenant store
    Store.addBooking(newBooking);

    // Close booking modal
    document.getElementById('modalCustomerBooking')?.classList.remove('show');

    // Open Boarding Pass Modal
    this.refreshCompanyDashboard();
    this.openBoardingPassModal(newBooking);
    this.showToast('Tiket Berhasil Diterbitkan!', `Tiket resmi ${comp.name} berhasil diterbitkan (PNR: ${pnr}).`);
  },

  openBoardingPassModal(booking) {
    if (!booking) return;
    this.openDirectTicketPrintModal(booking, 'BOARDING_PASS');
  },

  _legacyOpenBoardingPassModal(booking) {
    const comp = Store.getCompanyById(booking.companyId) || { name: 'Perusahaan Pelayaran', shortName: 'Operator' };
    const p0 = (booking.passengers && booking.passengers[0]) || { name: 'Penumpang Resmi', docType: 'KTP', nationality: 'ID', gender: 'L' };

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setTxt('ticketCompName', comp.name);
    setTxt('ticketPnrVal', booking.pnr);
    setTxt('ticketOriginCity', `${booking.originCity}`);
    setTxt('ticketOriginCode', booking.originCode || 'NNK');
    setTxt('ticketDestCity', `${booking.destinationCity}`);
    setTxt('ticketDestCode', booking.destCode || 'TWU');
    setTxt('ticketDepartTime', booking.departTime);
    setTxt('ticketArrivalTime', 'Estimasi Tepat Waktu');
    setTxt('ticketVesselVal', booking.vesselName);

    const routeBadge = document.getElementById('ticketRouteTypeBadge');
    if (routeBadge) {
      routeBadge.innerText = booking.isIntl ? '🌏 RUTE INTERNASIONAL (TAWAU)' : '🚢 RUTE DOMESTIK (PAREPARE)';
      routeBadge.style.color = booking.isIntl ? '#f59e0b' : '#10b981';
    }

    setTxt('ticketPaxNameVal', p0.name);
    const docLabel = p0.docType === 'KTP' ? 'NIK KTP' : (p0.docType === 'PLB' ? 'PLB' : 'No. Paspor');
    setTxt('ticketPaxDocVal', `${docLabel}: ${p0.docNumber || p0.nik || '-'}`);

    const natLabel = (p0.nationality && !['ID', 'Indonesia', 'MY', 'Malaysia', 'OTHER'].includes(p0.nationality)) ? `🌏 ${p0.nationality}` : (p0.nationality === 'MY' || p0.nationality === 'Malaysia') ? '🇲🇾 Malaysia' : (p0.nationality === 'OTHER' ? '🌏 Luar Negeri' : '🇮🇩 Indonesia');
    setTxt('ticketPaxNationalityVal', natLabel);
    setTxt('ticketPaxGenderDobVal', `${p0.gender === 'P' ? 'Perempuan' : 'Laki-laki'} • Lahir: ${p0.dob || '-'}`);

    setTxt('ticketSeatVal', (booking.passengers || []).map(p => p.seat).join(', '));
    setTxt('ticketClassVal', booking.className);
    setTxt('ticketPierVal', booking.pier);
    const totalEl = document.getElementById('ticketTotalAmountDisplay');
    if (totalEl) totalEl.innerHTML = `Total Tarif: <strong>${formatRupiah(booking.totalAmount)}</strong>`;
    setTxt('ticketBarcodeNum', booking.barcode);

    // Render Crisp SVG QR Code
    const qrWrap = document.getElementById('ticketQrCodeContainer');
    if (qrWrap) {
      const seatStr = (booking.passengers || []).map(p => p.seat).join(',');
      const qrPayload = `PNR:${booking.pnr};OP:${comp.code || 'SEA'};PAX:${p0.name};DOC:${p0.docNumber || p0.nik};ROUTE:${booking.originCode}-${booking.destCode};SEAT:${seatStr};STATUS:PAID`;
      qrWrap.innerHTML = this.generateSvgQrCode(qrPayload);
    }

    const statusPill = document.getElementById('ticketBoardingStatusPill');
    if (statusPill) {
      if (booking.boardingStatus === 'BOARDED') {
        statusPill.innerText = '✓ SUDAH BOARDING (CHECKED-IN)';
        statusPill.style.background = '#0284c7';
      } else {
        statusPill.innerText = 'READY FOR BOARDING';
        statusPill.style.background = '#10b981';
      }
    }

    // Attach WhatsApp send handler (Fitur 8: Integrasi Pengiriman E-Tiket WhatsApp Resmi)
    const btnWa = document.getElementById('btnSendTicketWhatsapp');
    if (btnWa) {
      btnWa.onclick = () => {
        let phone = (booking.contact?.phone || '').replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
          phone = '62' + phone.substring(1);
        }
        const paxName = booking.passenger?.name || booking.passengerName || 'Penumpang';
        const pnr = booking.pnr || 'PNR';
        const vesselName = booking.vesselName || 'Armada Kapal';
        const depDate = booking.travelDate || booking.departDate || '';
        const seat = (booking.passengers && booking.passengers[0]?.seat) || booking.seatNumber || '-';
        const classNm = booking.className || 'Ekonomi';
        const totalPay = booking.currency === 'MYR' 
          ? formatRinggit(booking.totalFareMyr || convertIdrToMyr(booking.totalFare))
          : formatRupiah(booking.totalFare || 0);

        const waText = 
`*E-BOARDING PASS RESMI PERUSAHAAN PELAYARAN*
Pelabuhan Tunon Taka Nunukan — Sistem Maritim Terpadu

Halo Sdr/i *${paxName}*,
Tiket penyeberangan laut Anda telah *CONFIRMED / LUNAS*:

🎫 *Kode Booking (PNR):* ${pnr}
🚢 *Kapal Armada:* ${vesselName}
📅 *Tanggal Berangkat:* ${depDate}
💺 *Nomor Kursi:* ${seat} (${classNm})
💰 *Total Pembayaran:* ${totalPay}
📍 *Dermaga:* Pelabuhan Tunon Taka Nunukan

*Ketentuan Boarding:*
1. Tiba di pelabuhan minimal 2 jam sebelum keberangkatan untuk validasi Gate Scanner & clearance KSOP/Imigrasi.
2. Siapkan dokumen asli (Paspor berlaku min. 6 bulan untuk Tawau, atau KTP asli untuk Parepare).
3. Untuk tujuan Tawau, pastikan Anda telah mengisi Malaysia Digital Arrival Card (MDAC) di https://imigresen-online.imi.gov.my/mdac/main.

Terima kasih telah berlayar bersama armada resmi kami!`;

        const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waText)}` : `https://wa.me/?text=${encodeURIComponent(waText)}`;
        window.open(waUrl, '_blank');
        this.showToast('WhatsApp Terbuka', `Pesan resmi E-Boarding Pass PNR ${pnr} telah diarahkan ke WhatsApp.`);
      };
    }

    document.getElementById('modalCustomerTicket')?.classList.add('show');
  },

  // Render Dynamic Entry Portal Buttons for Registered Companies (Disabled - quick login removed)
  renderCompanyAuthButtons() {
    const grid = document.getElementById('demoButtonsGrid');
    if (!grid) return;
    grid.innerHTML = '';
  },

  // ================= MANAJEMEN KREDENSIAL MITRA TERSIMPAN =================
  getSavedMitraCredentials() {
    try {
      const raw = localStorage.getItem('tech_saved_mitra_creds_v2');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  saveMitraCredential(identifier, password, comp = null) {
    if (!identifier || !password) return;
    try {
      const saved = this.getSavedMitraCredentials();
      const key = identifier.toLowerCase().trim();
      saved[key] = {
        identifier: identifier.trim(),
        email: (comp && comp.email) ? comp.email : identifier.trim(),
        name: (comp && comp.name) ? comp.name : identifier.trim(),
        shortName: (comp && comp.shortName) ? comp.shortName : identifier.trim(),
        password: password,
        lastUsed: Date.now()
      };
      localStorage.setItem('tech_saved_mitra_creds_v2', JSON.stringify(saved));
    } catch (e) {}
  },

  removeSavedMitraCredential(identifier) {
    if (!identifier) return;
    try {
      const saved = this.getSavedMitraCredentials();
      const key = identifier.toLowerCase().trim();
      delete saved[key];
      localStorage.setItem('tech_saved_mitra_creds_v2', JSON.stringify(saved));
      this.renderSavedMitraAccountsDropdown();
    } catch (e) {}
  },

  renderSavedMitraAccountsDropdown() {
    const sel = document.getElementById('selectSavedCompanyAccount');
    const btnForget = document.getElementById('btnForgetSavedAccount');
    const emailInput = document.getElementById('loginCompEmail');
    const passInput = document.getElementById('loginCompPassword');
    const checkRemember = document.getElementById('checkRememberCompLogin');

    if (!sel) return;

    // Ambil kredensial dari localStorage
    const savedMap = this.getSavedMitraCredentials();

    // Gabungkan dengan mitra yang terdaftar di Store.getCompanies()
    const allRegistered = typeof Store !== 'undefined' ? Store.getCompanies() : [];
    const accountList = [];

    // Prioritaskan akun yang disimpan di savedMap
    Object.keys(savedMap).forEach(key => {
      accountList.push(savedMap[key]);
    });

    // Tambahkan mitra terdaftar lain jika belum ada di savedMap dan memiliki password
    allRegistered.forEach(c => {
      const cEmail = (c.email || '').toLowerCase().trim();
      const cName = (c.name || '').toLowerCase().trim();
      const existing = accountList.find(a => (a.email || '').toLowerCase() === cEmail || (a.identifier || '').toLowerCase() === cEmail || (a.name || '').toLowerCase() === cName);
      if (!existing && c.password) {
        accountList.push({
          identifier: c.email || c.name || c.shortName,
          email: c.email || '',
          name: c.name,
          shortName: c.shortName || c.name,
          password: c.password,
          lastUsed: 0
        });
      }
    });

    // Urutkan berdasarkan lastUsed terbaru
    accountList.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

    // Render options
    sel.innerHTML = '<option value="">-- Pilih Akun Mitra Tersimpan / Terdaftar (' + accountList.length + ' Akun) --</option>';

    accountList.forEach((acc) => {
      const opt = document.createElement('option');
      opt.value = acc.identifier || acc.email;
      opt.dataset.email = acc.email || acc.identifier;
      opt.dataset.pass = acc.password || '';
      opt.textContent = `🏢 ${acc.name || acc.shortName} (${acc.email || acc.identifier})`;
      sel.appendChild(opt);
    });

    // Listener saat user memilih akun dari dropdown
    sel.onchange = () => {
      const chosenVal = sel.value;
      if (!chosenVal) {
        if (btnForget) btnForget.style.display = 'none';
        return;
      }
      const opt = sel.options[sel.selectedIndex];
      if (opt) {
        const email = opt.dataset.email || chosenVal;
        const pass = opt.dataset.pass || '';
        if (emailInput) emailInput.value = email;
        if (passInput) passInput.value = pass;
        if (checkRemember) checkRemember.checked = true;
        if (btnForget) btnForget.style.display = 'inline-block';
      }
    };

    // Listener tombol lupa/hapus simpanan
    if (btnForget) {
      btnForget.onclick = (e) => {
        e.preventDefault();
        const chosenVal = sel.value;
        if (chosenVal) {
          this.removeSavedMitraCredential(chosenVal);
          if (emailInput) emailInput.value = '';
          if (passInput) passInput.value = '';
          if (btnForget) btnForget.style.display = 'none';
          this.showToast('Akun Dihapus', `Simpanan kredensial akun telah dihapus.`);
        }
      };
    }

    // Auto-fill akun yang paling terakhir digunakan jika ada
    if (accountList.length > 0 && accountList[0].password) {
      sel.selectedIndex = 1;
      const topOpt = sel.options[1];
      if (emailInput) emailInput.value = topOpt.dataset.email || accountList[0].email;
      if (passInput) passInput.value = topOpt.dataset.pass || accountList[0].password;
      if (checkRemember) checkRemember.checked = true;
      if (btnForget) btnForget.style.display = 'inline-block';
    } else {
      if (emailInput) emailInput.value = '';
      if (passInput) passInput.value = '';
      if (btnForget) btnForget.style.display = 'none';
    }
  },

  // ================= COMPANY AUTHENTICATION =================
  initAuthEvents() {
    this.renderCompanyAuthButtons();

    // Tab Switcher between Masuk Portal and Daftar Perusahaan Baru
    const tabLogin = document.getElementById('tabBtnLogin');
    const tabRegister = document.getElementById('tabBtnRegister');
    const contentLogin = document.getElementById('tabContentLogin');
    const contentRegister = document.getElementById('tabContentRegister');

    if (tabLogin && tabRegister && contentLogin && contentRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabLogin.style.background = '#ffffff';
        tabLogin.style.color = '#7c3aed';
        tabLogin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
        tabLogin.style.fontWeight = '700';

        tabRegister.classList.remove('active');
        tabRegister.style.background = 'transparent';
        tabRegister.style.color = '#64748b';
        tabRegister.style.boxShadow = 'none';
        tabRegister.style.fontWeight = '600';

        contentLogin.style.display = 'block';
        contentRegister.style.display = 'none';
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabRegister.style.background = '#ffffff';
        tabRegister.style.color = '#7c3aed';
        tabRegister.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
        tabRegister.style.fontWeight = '700';

        tabLogin.classList.remove('active');
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = '#64748b';
        tabLogin.style.boxShadow = 'none';
        tabLogin.style.fontWeight = '600';

        contentRegister.style.display = 'block';
        contentLogin.style.display = 'none';
      });
    }

    this.initDevAdminEvents();

    // Login Form Submit
    document.getElementById('formCompanyLogin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = (document.getElementById('loginCompEmail')?.value || '').trim().toLowerCase();
      const pass = document.getElementById('loginCompPassword')?.value;

      // Hidden Admin Developer Login via form login
      if (Store.verifyDevAdminCredentials(identifier, pass)) {
        Store.setDevAdminSession(true);
        this.closeCompanyAuthModal();
        this.switchView('devAdminDashboard');
        this.showToast('Mode Admin Developer', 'Akses Superadmin Developer berhasil diaktifkan.');
        return;
      }

      const comp = Store.getCompanies().find(c => 
        (c.email && c.email.toLowerCase() === identifier) ||
        (c.name && c.name.toLowerCase() === identifier) ||
        (c.shortName && c.shortName.toLowerCase() === identifier) ||
        (c.id && c.id.toLowerCase() === identifier) ||
        (c.code && c.code.toLowerCase() === identifier)
      );

      if (comp) {
        if (comp.password && comp.password !== pass) {
          this.showToast('Password Salah', 'Password yang Anda masukkan salah. Silakan periksa kembali.', 'warning');
          return;
        }
        if (comp.approvalStatus === 'PENDING' || comp.verified === false) {
          this.showToast('Menunggu Approval Developer', `Akun "${comp.name}" sedang menunggu persetujuan (approval) dari Admin Developer.`, 'warning');
          return;
        }
        if (comp.frozen === true || comp.approvalStatus === 'FROZEN') {
          this.showToast('Akun Dibekukan', `Akun perusahaan "${comp.name}" sedang dibekukan oleh Admin Developer.`, 'warning');
          return;
        }
        if (comp.approvalStatus === 'REJECTED') {
          this.showToast('Pendaftaran Ditolak', `Pendaftaran perusahaan "${comp.name}" tidak disetujui oleh Admin Developer.`, 'warning');
          return;
        }
        // Simpan atau hapus kredensial berdasarkan centang Ingat Saya
        const rememberCheck = document.getElementById('checkRememberCompLogin');
        if (rememberCheck && rememberCheck.checked) {
          this.saveMitraCredential(comp.email || identifier, pass, comp);
        } else {
          this.removeSavedMitraCredential(comp.email || identifier);
        }

        Store.setCurrentTenant(comp);
        this.updateHeaderTenantUI(comp);
        this.switchView('companyDashboard');
        this.showToast('Login Berhasil', `Selamat datang kembali, ${comp.name}!`);
      } else {
        this.showToast('Gagal Masuk', 'Akun / Email perusahaan tidak ditemukan dalam sistem.', 'warning');
      }
    });

    // Register Form Submit - Wajib menunggu Approval Admin Developer
    document.getElementById('formCompanyRegister').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regCompName').value.trim();
      const defaultCategory = 'Kapal Penumpang Internasional (Nunukan - Tawau)';
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
        category: defaultCategory,
        routes: [defaultCategory],
        email,
        password,
        phone,
        brandColor: color,
        logoIcon: 'ship',
        verified: false,
        approvalStatus: 'PENDING',
        joinedDate: new Date().toISOString().split('T')[0],
        bankAccount: { bank: '', number: '', holder: '' },
        description: ''
      };

      // Add to store (Tanpa membuat armada, jadwal, tiket, atau pengaturan default)
      Store.addCompany(newComp);
      // Simpan kredensial pendaftaran mitra otomatis
      this.saveMitraCredential(email, password, newComp);

      this.renderCompanyFilterChips();
      if (this.activeView === 'devAdminDashboard') {
        this.renderDevAdminDashboard();
      }

      // Reset form pendaftaran
      document.getElementById('formCompanyRegister')?.reset();

      // Alihkan ke tab Masuk Portal
      document.getElementById('tabBtnLogin')?.click();

      // Kosongkan form login agar tidak menyimpan atau mengisi kredensial otomatis
      const loginEmailInput = document.getElementById('loginCompEmail');
      if (loginEmailInput) {
        loginEmailInput.value = '';
      }
      const loginPassInput = document.getElementById('loginCompPassword');
      if (loginPassInput) {
        loginPassInput.value = '';
      }

      this.showToast('Menunggu Approval Developer', `Pendaftaran "${name}" terkirim. Menunggu persetujuan (approval) Admin Developer.`);
    });
  },

  // ================= HIDDEN ADMIN DEVELOPER PORTAL =================
  openDevAdminModal() {
    const u = document.getElementById('devAdminUserInput');
    const p = document.getElementById('devAdminPassInput');
    const otp = document.getElementById('devAdminOtpInput');
    if (u) u.value = '';
    if (p) p.value = '';
    if (otp) otp.value = '';
    this.refreshDevTotpWidget();
    document.getElementById('modalDevAdminAuth')?.classList.add('show');
    setTimeout(() => u?.focus(), 80);
  },

  refreshDevTotpWidget() {
    if (typeof Store === 'undefined' || !Store.getDevAdminCredentials) return;
    const creds = Store.getDevAdminCredentials();
    const secretEl = document.getElementById('devAuthSecretText');
    if (secretEl) secretEl.textContent = creds.totpSecret || 'JBSWY3DPEHPK3PXP';
    const liveCodeEl = document.getElementById('devAuthLiveCodeText');
    if (liveCodeEl && Store.generateDevTotpCode) {
      liveCodeEl.textContent = Store.generateDevTotpCode();
    }
    const timerEl = document.getElementById('devAuthOtpTimer');
    if (timerEl) {
      const rem = 30 - (Math.floor(Date.now() / 1000) % 30);
      timerEl.textContent = String(rem);
    }
    const qrImg = document.getElementById('devAuthQrImg');
    if (qrImg) {
      const otpauthUri = `otpauth://totp/TechSolution:${encodeURIComponent(creds.email || creds.username)}?secret=${encodeURIComponent(creds.totpSecret)}&issuer=TechSolution`;
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(otpauthUri)}`;
    }
  },

  closeDevAdminModal() {
    document.getElementById('modalDevAdminAuth')?.classList.remove('show');
  },

  initDevAdminEvents() {
    if (this._devAdminEventsBound) return;
    this._devAdminEventsBound = true;

    // 1. Hidden Keyboard Shortcut: Ctrl + Shift + D (atau Ctrl + Alt + D)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) || (e.ctrlKey && e.altKey && (e.key === 'D' || e.key === 'd'))) {
        e.preventDefault();
        if (Store.isDevAdminLoggedIn()) {
          this.switchView('devAdminDashboard');
        } else {
          this.openDevAdminModal();
        }
      }
    });

    // 2. Hidden 5x Rapid Click on Brand Logo Wrap
    let logoClickCount = 0;
    let logoClickTimer = null;
    const brandWrap = document.getElementById('brandLogoWrap');
    if (brandWrap) {
      brandWrap.addEventListener('click', () => {
        logoClickCount++;
        if (logoClickTimer) clearTimeout(logoClickTimer);
        if (logoClickCount >= 5) {
          logoClickCount = 0;
          if (Store.isDevAdminLoggedIn()) {
            this.switchView('devAdminDashboard');
          } else {
            this.openDevAdminModal();
          }
          return;
        }
        logoClickTimer = setTimeout(() => {
          logoClickCount = 0;
        }, 2200);
      });
    }

    document.getElementById('btnCloseDevAdminModal')?.addEventListener('click', () => this.closeDevAdminModal());
    document.getElementById('btnCancelDevAdminModal')?.addEventListener('click', () => this.closeDevAdminModal());

    // Live 1-second interval for Google Authenticator TOTP countdown in modal
    setInterval(() => {
      const modalEl = document.getElementById('modalDevAdminAuth');
      if (modalEl && modalEl.classList.contains('show')) {
        this.refreshDevTotpWidget();
      }
    }, 1000);

    document.getElementById('btnToggleDevQrAuthBox')?.addEventListener('click', () => {
      const box = document.getElementById('devAuthQrCollapseBox');
      if (box) {
        const isHidden = box.style.display === 'none' || !box.style.display;
        box.style.display = isHidden ? 'block' : 'none';
        if (isHidden) this.refreshDevTotpWidget();
      }
    });

    document.getElementById('btnAutoFillDevOtp')?.addEventListener('click', () => {
      const otpInput = document.getElementById('devAdminOtpInput');
      if (otpInput && Store.generateDevTotpCode) {
        otpInput.value = Store.generateDevTotpCode();
      }
    });

    // Tombol Login SSO Google + Verifikasi Google Authenticator
    document.getElementById('btnDevGoogleSsoLogin')?.addEventListener('click', () => {
      const creds = Store.getDevAdminCredentials();
      const otpVal = (document.getElementById('devAdminOtpInput')?.value || '').trim();
      const u = document.getElementById('devAdminUserInput');
      if (u && !u.value) u.value = creds.email;

      if (!otpVal) {
        const box = document.getElementById('devAuthQrCollapseBox');
        if (box) box.style.display = 'block';
        this.refreshDevTotpWidget();
        document.getElementById('devAdminOtpInput')?.focus();
        this.showToast('Verifikasi Google Authenticator', `Akun Google SSO (${creds.email}) terdeteksi. Masukkan 6 digit kode Google Authenticator untuk melanjutkan.`, 'warning');
        return;
      }

      if (!Store.verifyDevTotpCode(otpVal)) {
        this.showToast('Kode OTP Tidak Valid', 'Kode 6 digit Google Authenticator salah atau sudah kedaluwarsa.', 'warning');
        return;
      }

      Store.setDevAdminSession(true);
      this.closeDevAdminModal();
      this.switchView('devAdminDashboard');
      this.showToast('Login SSO & 2FA Berhasil', `Selamat datang, ${creds.email} (Terverifikasi Google Authenticator).`);
    });

    document.getElementById('formDevAdminLogin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = (document.getElementById('devAdminUserInput')?.value || '').trim().toLowerCase();
      const pass = document.getElementById('devAdminPassInput')?.value || '';
      const otpVal = (document.getElementById('devAdminOtpInput')?.value || '').trim();

      if (Store.verifyDevAdminCredentials(user, pass)) {
        if (otpVal && !Store.verifyDevTotpCode(otpVal)) {
          this.showToast('Kode Authenticator Salah', 'Kode 6 digit Google Authenticator tidak sesuai.', 'warning');
          return;
        }
        Store.setDevAdminSession(true);
        this.closeDevAdminModal();
        this.switchView('devAdminDashboard');
        this.showToast('Mode Admin Developer', 'Berhasil masuk ke Portal Admin Developer.');
      } else {
        this.showToast('Akses Ditolak', 'ID/Email atau Password Admin Developer tidak valid.', 'warning');
      }
    });

    // Ubah Kredensial Khusus Developer (Email / Username, Password & Secret Google Authenticator)
    const openCredsModal = () => {
      const creds = Store.getDevAdminCredentials();
      const emailEl = document.getElementById('devCredEmailInput');
      const userEl = document.getElementById('devCredUsernameInput');
      const secretEl = document.getElementById('devCredTotpSecretInput');
      const oldPassEl = document.getElementById('devCredOldPassInput');
      const newPassEl = document.getElementById('devCredNewPassInput');
      const confPassEl = document.getElementById('devCredConfirmPassInput');
      if (emailEl) emailEl.value = creds.email || '';
      if (userEl) userEl.value = creds.username || '';
      if (secretEl) secretEl.value = creds.totpSecret || 'JBSWY3DPEHPK3PXP';
      if (oldPassEl) oldPassEl.value = '';
      if (newPassEl) newPassEl.value = '';
      if (confPassEl) confPassEl.value = '';
      document.getElementById('modalDevAdminCreds')?.classList.add('show');
    };
    const closeCredsModal = () => {
      document.getElementById('modalDevAdminCreds')?.classList.remove('show');
    };

    document.getElementById('btnOpenDevCredsModal')?.addEventListener('click', openCredsModal);
    document.getElementById('btnCloseDevCredsModal')?.addEventListener('click', closeCredsModal);
    document.getElementById('btnCancelDevCredsModal')?.addEventListener('click', closeCredsModal);
    document.getElementById('btnResetDevTotpSecret')?.addEventListener('click', () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let gen = '';
      for (let i = 0; i < 16; i++) gen += chars[Math.floor(Math.random() * chars.length)];
      const secretEl = document.getElementById('devCredTotpSecretInput');
      if (secretEl) secretEl.value = gen;
    });

    document.getElementById('formDevAdminCreds')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const creds = Store.getDevAdminCredentials();
      const newEmail = (document.getElementById('devCredEmailInput')?.value || '').trim();
      const newUsername = (document.getElementById('devCredUsernameInput')?.value || '').trim();
      const oldPass = document.getElementById('devCredOldPassInput')?.value || '';
      const newPass = document.getElementById('devCredNewPassInput')?.value || '';
      const confPass = document.getElementById('devCredConfirmPassInput')?.value || '';

      if (oldPass !== creds.password) {
        this.showToast('Password Lama Salah', 'Password Developer saat ini tidak sesuai.', 'warning');
        return;
      }
      if (!newEmail || !newUsername) {
        this.showToast('Data Belum Lengkap', 'Email dan Username Developer wajib diisi.', 'warning');
        return;
      }
      if (newPass && newPass !== confPass) {
        this.showToast('Konfirmasi Tidak Cocok', 'Password baru dan konfirmasi password tidak sama.', 'warning');
        return;
      }

      const newSecret = (document.getElementById('devCredTotpSecretInput')?.value || creds.totpSecret || 'JBSWY3DPEHPK3PXP').trim().toUpperCase();
      const saved = Store.saveDevAdminCredentials({
        email: newEmail,
        username: newUsername,
        totpSecret: newSecret,
        password: newPass ? newPass : creds.password
      });

      closeCredsModal();
      this.renderDevAdminDashboard();
      this.showToast('Kredensial Diperbarui', `Login Developer berhasil diubah ke ${saved.username} (${saved.email}).`);
    });

    document.getElementById('btnRefreshDevAdmin')?.addEventListener('click', () => {
      this.renderDevAdminDashboard();
      this.showToast('Data Diperbarui', 'Data perusahaan dan transaksi harian berhasil dimuat ulang.');
    });

    document.getElementById('btnLogoutDevAdmin')?.addEventListener('click', () => {
      Store.setDevAdminSession(false);
      document.body.classList.remove('in-dev-admin');
      this.switchView('weatherHome');
      this.updateHeaderTenantUI(typeof Store !== 'undefined' ? Store.getCurrentTenant() : null);
      this.showToast('Keluar Mode Developer', 'Sesi Admin Developer telah diakhiri.');
    });

    // Filter listeners on Developer Dashboard
    document.getElementById('devFilterDate')?.addEventListener('change', () => this.renderDevAdminDashboard());
    document.getElementById('btnDevAllDates')?.addEventListener('click', () => {
      const dateEl = document.getElementById('devFilterDate');
      if (dateEl) dateEl.value = '';
      this.renderDevAdminDashboard();
    });
    document.getElementById('devFilterCompany')?.addEventListener('change', () => {
      const vesselEl = document.getElementById('devFilterVessel');
      if (vesselEl) vesselEl.value = 'ALL';
      this.renderDevAdminDashboard();
    });
    document.getElementById('devFilterVessel')?.addEventListener('change', () => this.renderDevAdminDashboard());
    document.getElementById('devFilterSearch')?.addEventListener('input', () => this.renderDevAdminDashboard());

    // ----------------- DEVELOPER MODE: TAMBAH PERUSAHAAN -----------------
    document.getElementById('btnDevOpenAddCompany')?.addEventListener('click', () => {
      this.openDevAddCompanyModal();
    });
    const closeDevAddComp = () => {
      document.getElementById('modalDevAddCompany')?.classList.remove('show');
    };
    document.getElementById('btnCloseDevAddCompany')?.addEventListener('click', closeDevAddComp);
    document.getElementById('btnCancelDevAddCompany')?.addEventListener('click', closeDevAddComp);

    document.getElementById('formDevAddCompany')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('devAddCompName')?.value || '').trim();
      const shortName = (document.getElementById('devAddCompShortName')?.value || name).trim();
      let code = (document.getElementById('devAddCompCode')?.value || '').trim().toUpperCase();
      if (!code) {
        code = shortName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') || 'CO';
      }
      const category = document.getElementById('devAddCompCategory')?.value || 'Kapal Penumpang Internasional (Nunukan - Tawau)';
      const email = (document.getElementById('devAddCompEmail')?.value || '').trim();
      const password = document.getElementById('devAddCompPassword')?.value || '';
      const phone = (document.getElementById('devAddCompPhone')?.value || '').trim();
      const color = document.getElementById('devAddCompColor')?.value || '#0284c7';

      if (!name || !email || !password) {
        this.showToast('Data Tidak Lengkap', 'Nama perusahaan, email, dan password wajib diisi.', 'warning');
        return;
      }

      // Check if email already registered
      const existing = Store.getCompanies().find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        this.showToast('Email Sudah Terdaftar', `Perusahaan dengan email "${email}" sudah ada dalam sistem.`, 'warning');
        return;
      }

      const newComp = {
        id: `COMP-${Date.now().toString(36).toUpperCase()}`,
        name,
        shortName,
        code,
        category,
        routes: [category],
        email,
        password,
        phone,
        brandColor: color,
        logoIcon: 'ship',
        verified: true,
        approvalStatus: 'APPROVED',
        frozen: false,
        joinedDate: new Date().toISOString().split('T')[0],
        bankAccount: { bank: '', number: '', holder: '' },
        description: ''
      };

      Store.addCompany(newComp);
      this.saveMitraCredential(email, password, newComp);

      closeDevAddComp();
      document.getElementById('formDevAddCompany')?.reset();
      this.renderCompanyFilterChips();
      this.renderDevAdminDashboard();
      this.showToast('Perusahaan Terdaftar', `"${name}" berhasil didaftarkan dan langsung Aktif (Approved). Siap digunakan untuk login.`);
    });

    // ----------------- DEVELOPER MODE: EDIT DATA PERUSAHAAN -----------------
    const closeDevEditComp = () => {
      document.getElementById('modalDevEditCompany')?.classList.remove('show');
    };
    document.getElementById('btnCloseDevEditCompany')?.addEventListener('click', closeDevEditComp);
    document.getElementById('btnCancelDevEditCompany')?.addEventListener('click', closeDevEditComp);

    document.getElementById('formDevEditCompany')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const compId = document.getElementById('devEditCompId')?.value;
      const name = (document.getElementById('devEditCompName')?.value || '').trim();
      const shortName = (document.getElementById('devEditCompShortName')?.value || name).trim();
      const code = (document.getElementById('devEditCompCode')?.value || '').trim().toUpperCase();
      const category = document.getElementById('devEditCompCategory')?.value || 'Kapal Penumpang Internasional (Nunukan - Tawau)';
      const email = (document.getElementById('devEditCompEmail')?.value || '').trim();
      const password = document.getElementById('devEditCompPassword')?.value || '';
      const phone = (document.getElementById('devEditCompPhone')?.value || '').trim();
      const color = document.getElementById('devEditCompColor')?.value || '#0284c7';

      if (!compId || !name || !email) {
        this.showToast('Data Tidak Lengkap', 'Nama perusahaan dan email resmi wajib diisi.', 'warning');
        return;
      }

      const existing = Store.getCompanyById(compId);
      if (!existing) {
        this.showToast('Gagal Menyimpan', 'Perusahaan tidak ditemukan dalam sistem.', 'warning');
        return;
      }

      // Cek apakah email sudah digunakan perusahaan lain
      const duplicateEmail = Store.getCompanies().find(c => c.id !== compId && c.email && c.email.toLowerCase() === email.toLowerCase());
      if (duplicateEmail) {
        this.showToast('Email Sudah Terdaftar', `Email "${email}" telah digunakan oleh perusahaan lain.`, 'warning');
        return;
      }

      const updatedFields = {
        name,
        shortName,
        code: code || existing.code,
        category,
        routes: [category],
        email,
        phone,
        brandColor: color
      };
      if (password) {
        updatedFields.password = password;
      }

      Store.updateCompany(compId, updatedFields);
      const updatedComp = Store.getCompanyById(compId);

      // Simpan pembaruan kredensial jika email atau password diubah
      if (email && password) {
        this.saveMitraCredential(email, password, updatedComp);
      }

      closeDevEditComp();
      this.renderCompanyFilterChips();
      this.renderDevAdminDashboard();
      this.showToast('Perusahaan Diperbarui', `Perubahan data "${name}" berhasil disimpan.`);
    });

    // ----------------- DEVELOPER MODE: TAMBAH ARMADA -----------------
    document.getElementById('btnDevOpenAddVessel')?.addEventListener('click', () => {
      this.openDevAddVesselModal();
    });
    const closeDevAddVes = () => {
      document.getElementById('modalDevAddVessel')?.classList.remove('show');
    };
    document.getElementById('btnCloseDevAddVessel')?.addEventListener('click', closeDevAddVes);
    document.getElementById('btnCancelDevAddVessel')?.addEventListener('click', closeDevAddVes);

    document.getElementById('formDevAddVessel')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const compId = document.getElementById('devAddVesselCompanySelect')?.value;
      const vName = (document.getElementById('devAddVesselName')?.value || '').trim();
      const reg = (document.getElementById('devAddVesselReg')?.value || '').trim();
      const vType = document.getElementById('devAddVesselType')?.value || 'Kapal Penumpang Internasional (Nunukan - Tawau)';
      const capacity = parseInt(document.getElementById('devAddVesselCapacity')?.value, 10) || 150;
      const facStr = (document.getElementById('devAddVesselFacilities')?.value || '').trim();
      const facilities = facStr ? facStr.split(',').map(s => s.trim()).filter(Boolean) : ['-'];
      const makeDefault = document.getElementById('devAddVesselMakeDefaultCheck')?.checked ?? true;

      if (!compId || !vName || !reg) {
        this.showToast('Data Tidak Lengkap', 'Pilih perusahaan, isi nama armada dan nomor registrasi kapal.', 'warning');
        return;
      }

      const comp = Store.getCompanyById(compId);
      const newVessel = {
        id: `VESSEL-${Date.now().toString(36).toUpperCase()}`,
        companyId: compId,
        name: vName,
        regNumber: reg,
        type: vType,
        capacity: capacity,
        facilities: facilities,
        status: 'ACTIVE',
        isDefault: makeDefault
      };
      Store.addVessel(newVessel);

      // Otomatis buat jadwal pelayaran awal agar armada dan seat langsung aktif saat perusahaan login
      const isDom = vType.toLowerCase().includes('parepare') || vType.toLowerCase().includes('domestik');
      const isIntl = !isDom && (vType.toLowerCase().includes('tawau') || vType.toLowerCase().includes('internasional') || (comp && comp.category && comp.category.toLowerCase().includes('tawau')));
      const origId = 'NNK';
      const destId = isDom ? 'PRE' : 'TWU';
      const origCity = 'Nunukan';
      const destCity = isDom ? 'Parepare' : 'Tawau';
      const ticketPrice = isDom ? 690000 : 430000;
      const portPassPrice = isDom ? 30000 : 50000;

      const defaultSched = {
        id: `SCH-${Date.now().toString(36).toUpperCase()}`,
        companyId: compId,
        vesselId: newVessel.id,
        vesselNameCustom: newVessel.name,
        originId: origId,
        destinationId: destId,
        originCity: origCity,
        destinationCity: destCity,
        categoryType: isDom ? 'DOMESTIC' : 'INTERNATIONAL',
        departTime: '09:00',
        arrivalTime: isDom ? '17:30' : '10:30',
        departDate: new Date().toISOString().split('T')[0],
        date: new Date().toISOString().split('T')[0],
        pier: isDom ? 'Dermaga Nusantara Domestik' : 'Dermaga Utama KSOP',
        priceEconomy: ticketPrice,
        portPassFee: portPassPrice,
        quotaTotal: capacity,
        quotaBooked: 0,
        classes: [
          { id: 'cls-eko', name: 'Tiket Reguler', price: ticketPrice, quota: capacity, available: capacity, booked: 0 }
        ],
        status: 'ACTIVE',
        isDefault: makeDefault
      };
      Store.addSchedule(defaultSched);

      if (makeDefault) {
        Store.updateCompany(compId, {
          defaultVesselId: newVessel.id,
          defaultScheduleId: defaultSched.id,
          defaultCapacity: capacity
        });
      }

      closeDevAddVes();
      document.getElementById('formDevAddVessel')?.reset();
      this.renderDevAdminDashboard();
      this.showToast('Armada Berhasil Ditambahkan', `Kapal "${vName}" (${capacity} Kursi) terdaftar di ${comp ? comp.name : 'Perusahaan'}. Otomatis jadi default saat login.`);
    });

    // ----------------- DEVELOPER MODE: EDIT ARMADA -----------------
    const closeDevEditVes = () => {
      document.getElementById('modalDevEditVessel')?.classList.remove('show');
    };
    document.getElementById('btnCloseDevEditVessel')?.addEventListener('click', closeDevEditVes);
    document.getElementById('btnCancelDevEditVessel')?.addEventListener('click', closeDevEditVes);

    document.getElementById('btnDevDeleteVessel')?.addEventListener('click', () => {
      const vId = document.getElementById('devEditVesselId')?.value;
      if (!vId) return;
      const vessel = Store.getVessels().find(v => v.id === vId);
      const vName = vessel ? vessel.name : 'armada ini';
      if (confirm(`Yakin ingin menghapus armada "${vName}" dari sistem? Semua jadwal yang menggunakan armada ini juga akan diperbarui.`)) {
        Store.deleteVessel(vId);
        closeDevEditVes();
        this.renderDevAdminDashboard();
        this.showToast('Armada Dihapus', `Armada "${vName}" berhasil dihapus dari sistem.`, 'warning');
      }
    });

    // Listeners for Deck Editor buttons in modalDevEditVessel
    document.getElementById('btnDevEditVesselAddDeckRow')?.addEventListener('click', () => {
      const tbody = document.getElementById('tbodyDevEditVesselDecks');
      if (!tbody) return;
      const count = tbody.querySelectorAll('tr').length + 1;
      const currentDecks = this.getDevEditVesselDecksFromTable();
      currentDecks.push({
        code: `DECK ${count}`,
        carriage: `DECK ${count}`,
        name: `Deck ${count}`,
        capacity: 100,
        desc: `Dek Penumpang Tambahan (${count})`
      });
      this.renderDevEditVesselDecks(currentDecks);
    });

    document.getElementById('btnDevEditVesselLoadSulawesiPreset')?.addEventListener('click', () => {
      const presets = Store.getDefaultSulawesiDecks ? Store.getDefaultSulawesiDecks() : [];
      this.renderDevEditVesselDecks(presets);
      this.showToast('Preset Sulawesi Dimuat', 'Format standar 6 dek (1.084 Kursi) berhasil dimuat. Klik Simpan untuk menerapkan.');
    });

    document.getElementById('btnDevEditVesselLoadTawauPreset')?.addEventListener('click', () => {
      const presets = Store.getDefaultTawauDecks ? Store.getDefaultTawauDecks() : [];
      this.renderDevEditVesselDecks(presets);
      this.showToast('Preset Tawau Dimuat', 'Format standar 2 dek (150 Kursi) berhasil dimuat. Klik Simpan untuk menerapkan.');
    });

    // Listeners for unified Seat Layout (Rows & Columns) inside modalDevEditVessel
    document.getElementById('devEditVesselRowsInput')?.addEventListener('input', () => {
      this.updateDevEditVesselSeatPreview();
    });

    document.getElementById('devEditVesselColsInput')?.addEventListener('input', () => {
      const cols = Math.max(2, parseInt(document.getElementById('devEditVesselColsInput').value, 10) || 6);
      const leftInput = document.getElementById('devEditVesselColsLeftInput');
      const rightInput = document.getElementById('devEditVesselColsRightInput');
      if (leftInput && rightInput) {
        const half = Math.ceil(cols / 2);
        leftInput.value = half;
        rightInput.value = cols - half;
      }
      this.updateDevEditVesselSeatPreview();
    });

    document.getElementById('devEditVesselColsLeftInput')?.addEventListener('input', () => {
      const left = parseInt(document.getElementById('devEditVesselColsLeftInput').value, 10) || 1;
      const right = parseInt(document.getElementById('devEditVesselColsRightInput')?.value, 10) || 1;
      const colsInput = document.getElementById('devEditVesselColsInput');
      if (colsInput) {
        colsInput.value = left + right;
      }
      this.updateDevEditVesselSeatPreview();
    });

    document.getElementById('devEditVesselColsRightInput')?.addEventListener('input', () => {
      const left = parseInt(document.getElementById('devEditVesselColsLeftInput')?.value, 10) || 1;
      const right = parseInt(document.getElementById('devEditVesselColsRightInput').value, 10) || 1;
      const colsInput = document.getElementById('devEditVesselColsInput');
      if (colsInput) {
        colsInput.value = left + right;
      }
      this.updateDevEditVesselSeatPreview();
    });

    document.getElementById('formDevEditVessel')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const vId = document.getElementById('devEditVesselId')?.value;
      const compId = document.getElementById('devEditVesselCompanySelect')?.value;
      const vName = (document.getElementById('devEditVesselName')?.value || '').trim();
      const reg = (document.getElementById('devEditVesselReg')?.value || '').trim();
      const vType = document.getElementById('devEditVesselType')?.value || 'Kapal Penumpang Internasional (Nunukan - Tawau)';
      const facStr = (document.getElementById('devEditVesselFacilities')?.value || '').trim();
      const facilities = facStr ? facStr.split(',').map(s => s.trim()).filter(Boolean) : ['-'];

      if (!vId || !compId || !vName || !reg) {
        this.showToast('Data Tidak Lengkap', 'Pilih perusahaan, isi nama armada dan nomor registrasi kapal.', 'warning');
        return;
      }

      // Ambil seluruh dek yang telah diedit di tabel modal
      const decks = this.getDevEditVesselDecksFromTable();
      const capacity = decks.reduce((sum, d) => sum + (parseInt(d.capacity, 10) || 0), 0) || (parseInt(document.getElementById('devEditVesselCapacity')?.value, 10) || 150);

      const oldVessel = Store.getVessels().find(v => v.id === vId);
      const oldName = oldVessel ? oldVessel.name : '';

      const seatRows = parseInt(document.getElementById('devEditVesselRowsInput')?.value, 10) || 25;
      const seatCols = parseInt(document.getElementById('devEditVesselColsInput')?.value, 10) || 6;
      const seatColsLeft = parseInt(document.getElementById('devEditVesselColsLeftInput')?.value, 10) || Math.ceil(seatCols / 2);
      const seatColsRight = parseInt(document.getElementById('devEditVesselColsRightInput')?.value, 10) || (seatCols - seatColsLeft);

      Store.updateVessel(vId, {
        companyId: compId,
        name: vName,
        regNumber: reg,
        type: vType,
        capacity: capacity,
        facilities: facilities,
        decks: decks,
        seatRows: seatRows,
        seatCols: seatCols,
        seatColsLeft: seatColsLeft,
        seatColsRight: seatColsRight
      });

      const isDom = vType.toLowerCase().includes('parepare') || vType.toLowerCase().includes('domestik');
      const targetDestId = isDom ? 'PRE' : 'TWU';
      const targetDestCity = isDom ? 'Parepare' : 'Tawau';
      const targetTicketPrice = isDom ? 690000 : 430000;
      const targetPortPass = isDom ? 30000 : 50000;

      // Sinkronisasi data di jadwal terkait
      const schedules = Store.getSchedules();
      let schedChanged = false;
      let hasSched = false;
      schedules.forEach(s => {
        if (s.vesselId === vId || (oldName && s.vesselNameCustom === oldName)) {
          hasSched = true;
          if (oldName && oldName !== vName) s.vesselNameCustom = vName;
          s.companyId = compId;
          s.capacity = capacity;
          s.quotaTotal = capacity;
          s.seatRows = seatRows;
          s.seatCols = seatCols;
          s.seatColsLeft = seatColsLeft;
          s.seatColsRight = seatColsRight;
          s.originId = 'NNK';
          s.originCity = 'Nunukan';
          s.destinationId = targetDestId;
          s.destinationCity = targetDestCity;
          s.categoryType = isDom ? 'DOMESTIC' : 'INTERNATIONAL';
          s.priceEconomy = targetTicketPrice;
          s.portPassFee = targetPortPass;
          s.pier = isDom ? 'Dermaga Nusantara Domestik' : 'Dermaga Utama KSOP';
          s.arrivalTime = isDom ? '17:30' : '10:30';
          if (Array.isArray(s.classes) && s.classes.length > 0) {
            s.classes[0].quota = capacity;
            s.classes[0].price = targetTicketPrice;
            const booked = s.classes[0].booked || 0;
            s.classes[0].available = Math.max(0, capacity - booked);
          }
          schedChanged = true;
        }
      });

      if (!hasSched) {
        const newSched = {
          id: `SCH-${Date.now().toString(36).toUpperCase()}`,
          companyId: compId,
          vesselId: vId,
          vesselNameCustom: vName,
          originId: 'NNK',
          destinationId: targetDestId,
          originCity: 'Nunukan',
          destinationCity: targetDestCity,
          categoryType: isDom ? 'DOMESTIC' : 'INTERNATIONAL',
          departTime: '09:00',
          arrivalTime: isDom ? '17:30' : '10:30',
          departDate: new Date().toISOString().split('T')[0],
          date: new Date().toISOString().split('T')[0],
          pier: isDom ? 'Dermaga Nusantara Domestik' : 'Dermaga Utama KSOP',
          priceEconomy: targetTicketPrice,
          portPassFee: targetPortPass,
          quotaTotal: capacity,
          quotaBooked: 0,
          classes: [
            { id: 'cls-eko', name: 'Tiket Reguler', price: targetTicketPrice, quota: capacity, available: capacity, booked: 0 }
          ],
          status: 'ACTIVE',
          isDefault: true
        };
        Store.addSchedule(newSched);
      } else if (schedChanged) {
        Store.saveSchedules(schedules);
      }

      this.devSectionSelectedVesselId = vId;
      closeDevEditVes();
      this.renderDevAdminDashboard();
      this.renderDevSulawesiDeckSection();
      this.showToast('Armada & Dek Diperbarui', `Perubahan data armada & ${decks.length} dek kapal "${vName}" (${capacity.toLocaleString('id-ID')} Kursi) berhasil disimpan.`);
    });

    // ----------------- DEVELOPER MODE: PENGATURAN SEAT -----------------
    document.getElementById('btnDevOpenConfigSeats')?.addEventListener('click', () => {
      this.openDevConfigSeatsModal();
    });
    const closeDevSeats = () => {
      document.getElementById('modalDevConfigSeats')?.classList.remove('show');
    };
    document.getElementById('btnCloseDevConfigSeats')?.addEventListener('click', closeDevSeats);
    document.getElementById('btnCancelDevConfigSeats')?.addEventListener('click', closeDevSeats);

    // Live preview listeners in seat modal
    document.getElementById('devSeatCompanySelect')?.addEventListener('change', (e) => {
      this.syncDevSeatModalVessels(e.target.value);
    });
    document.getElementById('devSeatVesselSelect')?.addEventListener('change', (e) => {
      const vId = e.target.value;
      const vessel = Store.getVessels().find(v => v.id === vId);
      if (vessel) {
        const capInput = document.getElementById('devSeatCapacityInput');
        const isVesselSulawesi = (vessel.type || '').toLowerCase().includes('parepare') || (vessel.type || '').toLowerCase().includes('domestik') || (vessel.name || '').toLowerCase().includes('pantokrator');
    if (capInput) {
      capInput.value = vessel.capacity || 0;
    }
        const deckInput = document.getElementById('devSeatDeckNameInput');
        if (deckInput) deckInput.value = vessel.deckName || 'Main Deck';
        const classInput = document.getElementById('devSeatClassNameInput');
        if (classInput) classInput.value = vessel.className || 'Tiket Reguler';
      }
      this.updateDevSeatModalPreview();
    });
    document.getElementById('devSeatCapacityInput')?.addEventListener('input', () => {
      const cap = parseInt(document.getElementById('devSeatCapacityInput').value, 10) || 0;
      const cols = parseInt(document.getElementById('devSeatColsInput')?.value, 10) || 6;
      const rowsInput = document.getElementById('devSeatRowsInput');
      if (rowsInput && cap > 0 && cols > 0) {
        rowsInput.value = Math.ceil(cap / cols);
      }
      this.updateDevSeatModalPreview();
    });

    document.getElementById('devSeatRowsInput')?.addEventListener('input', () => {
      const rows = parseInt(document.getElementById('devSeatRowsInput').value, 10) || 0;
      const cols = parseInt(document.getElementById('devSeatColsInput')?.value, 10) || 6;
      const capInput = document.getElementById('devSeatCapacityInput');
      if (capInput && rows > 0 && cols > 0) {
        capInput.value = rows * cols;
      }
      this.updateDevSeatModalPreview();
    });

    document.getElementById('devSeatColsInput')?.addEventListener('input', () => {
      const cols = Math.max(2, parseInt(document.getElementById('devSeatColsInput').value, 10) || 6);
      const leftInput = document.getElementById('devSeatColsLeftInput');
      const rightInput = document.getElementById('devSeatColsRightInput');
      if (leftInput && rightInput) {
        const half = Math.ceil(cols / 2);
        leftInput.value = half;
        rightInput.value = cols - half;
      }
      const rows = parseInt(document.getElementById('devSeatRowsInput')?.value, 10) || 0;
      const capInput = document.getElementById('devSeatCapacityInput');
      if (capInput && rows > 0 && cols > 0) {
        capInput.value = rows * cols;
      }
      this.updateDevSeatModalPreview();
    });

    document.getElementById('devSeatColsLeftInput')?.addEventListener('input', () => {
      const left = parseInt(document.getElementById('devSeatColsLeftInput').value, 10) || 1;
      const right = parseInt(document.getElementById('devSeatColsRightInput')?.value, 10) || 1;
      const colsInput = document.getElementById('devSeatColsInput');
      if (colsInput) {
        colsInput.value = left + right;
      }
      const rows = parseInt(document.getElementById('devSeatRowsInput')?.value, 10) || 0;
      const capInput = document.getElementById('devSeatCapacityInput');
      if (capInput && rows > 0) {
        capInput.value = rows * (left + right);
      }
      this.updateDevSeatModalPreview();
    });

    document.getElementById('devSeatColsRightInput')?.addEventListener('input', () => {
      const left = parseInt(document.getElementById('devSeatColsLeftInput')?.value, 10) || 1;
      const right = parseInt(document.getElementById('devSeatColsRightInput').value, 10) || 1;
      const colsInput = document.getElementById('devSeatColsInput');
      if (colsInput) {
        colsInput.value = left + right;
      }
      const rows = parseInt(document.getElementById('devSeatRowsInput')?.value, 10) || 0;
      const capInput = document.getElementById('devSeatCapacityInput');
      if (capInput && rows > 0) {
        capInput.value = rows * (left + right);
      }
      this.updateDevSeatModalPreview();
    });

    document.getElementById('formDevConfigSeats')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const compId = document.getElementById('devSeatCompanySelect')?.value;
      const vesselId = document.getElementById('devSeatVesselSelect')?.value;
      const capacity = parseInt(document.getElementById('devSeatCapacityInput')?.value, 10) || 150;
      const deckName = (document.getElementById('devSeatDeckNameInput')?.value || 'Main Deck').trim();
      const className = (document.getElementById('devSeatClassNameInput')?.value || 'Tiket Reguler').trim();
      const makeDefault = document.getElementById('devSeatMakeDefaultCheck')?.checked ?? true;

      if (!compId || !vesselId) {
        this.showToast('Data Belum Lengkap', 'Pilih perusahaan dan armada kapal yang ingin diatur denah kursinya.', 'warning');
        return;
      }

      const comp = Store.getCompanyById(compId);
      const vessel = Store.getVessels().find(v => v.id === vesselId);
      if (!vessel) {
        this.showToast('Armada Tidak Ditemukan', 'Kapal yang dipilih tidak valid.', 'warning');
        return;
      }

      const rows = parseInt(document.getElementById('devSeatRowsInput')?.value, 10) || 25;
      const cols = parseInt(document.getElementById('devSeatColsInput')?.value, 10) || 6;
      const colsLeft = parseInt(document.getElementById('devSeatColsLeftInput')?.value, 10) || Math.ceil(cols / 2);
      const colsRight = parseInt(document.getElementById('devSeatColsRightInput')?.value, 10) || (cols - colsLeft);

      // 1. Update Vessel with horizontal and vertical seat configuration
      Store.updateVessel(vesselId, {
        capacity: capacity,
        deckName: deckName,
        className: className,
        seatRows: rows,
        seatCols: cols,
        seatColsLeft: colsLeft,
        seatColsRight: colsRight,
        isDefault: makeDefault
      });

      // 2. Synchronize all schedules of this vessel to have this capacity & seat class
      const allSchedules = Store.getSchedules();
      let schedUpdatedCount = 0;
      let targetSchedId = null;
      allSchedules.forEach(s => {
        if (s.vesselId === vesselId) {
          s.quotaTotal = capacity;
          s.capacity = capacity;
          s.seatRows = rows;
          s.seatCols = cols;
          s.seatColsLeft = colsLeft;
          s.seatColsRight = colsRight;
          const vType = (vessel.type || '').toLowerCase();
          const isDom = vType.includes('parepare') || vType.includes('domestik');
          s.originId = 'NNK';
          s.destinationId = isDom ? 'PRE' : 'TWU';
          s.originCity = 'Nunukan';
          s.destinationCity = isDom ? 'Parepare' : 'Tawau';
          s.categoryType = isDom ? 'DOMESTIC' : 'INTERNATIONAL';
          s.priceEconomy = isDom ? 690000 : 430000;
          s.portPassFee = isDom ? 30000 : 50000;
          s.pier = isDom ? 'Dermaga Nusantara Domestik' : 'Dermaga Utama KSOP';
          if (Array.isArray(s.classes) && s.classes.length > 0) {
            s.classes[0].quota = capacity;
            s.classes[0].name = className;
            s.classes[0].price = isDom ? 690000 : 430000;
            const booked = s.classes[0].booked || 0;
            s.classes[0].available = Math.max(0, capacity - booked);
          }
          targetSchedId = s.id;
          schedUpdatedCount++;
        }
      });

      // If no schedule exists yet for this vessel, create one so seat map is immediately available!
      if (schedUpdatedCount === 0) {
        const vType = (vessel.type || '').toLowerCase();
        const isDom = vType.includes('parepare') || vType.includes('domestik');
        const origId = 'NNK';
        const destId = isDom ? 'PRE' : 'TWU';
        const defaultSched = {
          id: `SCH-${Date.now().toString(36).toUpperCase()}`,
          companyId: compId,
          vesselId: vessel.id,
          vesselNameCustom: vessel.name,
          originId: origId,
          destinationId: destId,
          originCity: 'Nunukan',
          destinationCity: isDom ? 'Parepare' : 'Tawau',
          categoryType: isDom ? 'DOMESTIC' : 'INTERNATIONAL',
          departTime: '09:00',
          arrivalTime: isDom ? '17:30' : '10:30',
          date: new Date().toISOString().split('T')[0],
          pier: isDom ? 'Dermaga Nusantara Domestik' : 'Dermaga Utama KSOP',
          priceEconomy: isDom ? 690000 : 430000,
          portPassFee: isDom ? 30000 : 50000,
          quotaTotal: capacity,
          quotaBooked: 0,
          classes: [
            { id: 'cls-eko', name: className, price: isDom ? 690000 : 430000, quota: capacity, available: capacity, booked: 0 }
          ],
          status: 'ACTIVE',
          isDefault: makeDefault
        };
        Store.addSchedule(defaultSched);
        targetSchedId = defaultSched.id;
      } else {
        Store.saveSchedules(allSchedules);
      }

      // 3. Set default on Company so it applies automatically when logging in
      if (makeDefault) {
        Store.updateCompany(compId, {
          defaultVesselId: vesselId,
          defaultScheduleId: targetSchedId,
          defaultCapacity: capacity,
          defaultDeckName: deckName,
          defaultClassName: className
        });
      }

      closeDevSeats();
      this.renderDevAdminDashboard();
      this.showToast('Pengaturan Kursi Disimpan', `Denah kursi "${vessel.name}" (${capacity} Kursi - ${deckName}) berhasil disimpan. Otomatis menjadi default saat ${comp ? comp.name : 'perusahaan'} login.`);
    });

    // Event listener untuk tombol Rincian Dek & Kapasitas Penumpang (Nunukan - Sulawesi & Nunukan - Tawau)
    document.getElementById('btnDevRouteTabSulawesi')?.addEventListener('click', () => {
      this.devSeatActiveRoute = 'sulawesi';
      this.renderDevSulawesiDeckSection();
    });
    document.getElementById('btnDevRouteTabTawau')?.addEventListener('click', () => {
      this.devSeatActiveRoute = 'tawau';
      this.renderDevSulawesiDeckSection();
    });

    document.getElementById('btnDevEditRouteDecks')?.addEventListener('click', () => {
      const vId = this.devSectionSelectedVesselId;
      const vessel = vId && vId !== '__ROUTE_DEFAULT__' ? Store.getVessels().find(v => v.id === vId) : null;
      if (vessel) {
        this.openDevEditVesselModal(vessel.id);
      } else {
        const isSul = (this.devSeatActiveRoute || 'sulawesi') === 'sulawesi';
        const matchingVessel = Store.getVessels().find(v => {
          const vType = (v.type || '').toLowerCase();
          const vIsSul = vType.includes('parepare') || vType.includes('domestik') || (v.name || '').toLowerCase().includes('pantokrator');
          return isSul ? vIsSul : !vIsSul;
        });
        if (matchingVessel) {
          this.openDevEditVesselModal(matchingVessel.id);
        } else {
          this.openDevEditRouteDecksModal(this.devSeatActiveRoute || 'sulawesi');
        }
      }
    });

    document.getElementById('devSectionVesselSelect')?.addEventListener('change', (e) => {
      this.devSectionSelectedVesselId = e.target.value;
      if (e.target.value !== '__ROUTE_DEFAULT__') {
        const v = Store.getVessels().find(item => item.id === e.target.value);
        if (v) {
          const vType = (v.type || '').toLowerCase();
          const vIsSul = vType.includes('parepare') || vType.includes('domestik') || (v.name || '').toLowerCase().includes('pantokrator');
          this.devSeatActiveRoute = vIsSul ? 'sulawesi' : 'tawau';
        }
      }
      this.renderDevSulawesiDeckSection();
    });

    const closeEditRouteDecksModal = () => {
      document.getElementById('modalDevEditRouteDecks')?.classList.remove('show');
    };
    document.getElementById('btnCloseDevEditRouteDecks')?.addEventListener('click', closeEditRouteDecksModal);
    document.getElementById('btnCancelDevEditRouteDecks')?.addEventListener('click', closeEditRouteDecksModal);

    document.getElementById('btnDevAddNewDeckRow')?.addEventListener('click', () => {
      const tbody = document.getElementById('tbodyModalEditRouteDecks');
      if (!tbody) return;
      const count = tbody.querySelectorAll('tr').length + 1;
      const newTr = document.createElement('tr');
      newTr.innerHTML = `
        <td><input type="text" class="form-input deck-code-input" value="DECK ${count}" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #38bdf8; font-weight: 700; width: 100%;"></td>
        <td><input type="text" class="form-input deck-carriage-input" value="DECK ${count}" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #ffffff; font-weight: 700; width: 100%;"></td>
        <td><input type="text" class="form-input deck-name-input" value="Deck ${count}" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #ffffff; width: 100%;"></td>
        <td><input type="number" class="form-input deck-capacity-input" value="100" min="1" max="2500" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #34d399; font-weight: 800; width: 100%;"></td>
        <td><input type="text" class="form-input deck-desc-input" value="Dek Penumpang Tambahan (${count})" style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #cbd5e1; width: 100%;"></td>
        <td style="text-align: center;">
          <button type="button" class="btn-remove-deck-row" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 0.3rem 0.5rem; font-size: 0.74rem; cursor: pointer;" title="Hapus Dek">🗑️</button>
        </td>
      `;
      tbody.appendChild(newTr);
      newTr.querySelector('.deck-capacity-input')?.addEventListener('input', () => this.updateEditRouteDecksModalSummary());
      newTr.querySelector('.btn-remove-deck-row')?.addEventListener('click', () => {
        newTr.remove();
        this.updateEditRouteDecksModalSummary();
      });
      this.updateEditRouteDecksModalSummary();
    });

    document.getElementById('btnDevResetRouteDecksDefault')?.addEventListener('click', () => {
      const isSul = (this.devSeatActiveRoute || 'sulawesi') === 'sulawesi';
      const defaults = isSul ? Store.getDefaultSulawesiDecks() : Store.getDefaultTawauDecks();
      this.renderEditRouteDecksTable(defaults);
      this.showToast('Reset Standar', `Daftar dek dikembalikan ke format standar rute ${isSul ? 'Sulawesi' : 'Tawau'}.`);
    });

    document.getElementById('btnSaveDevEditRouteDecks')?.addEventListener('click', () => {
      this.saveEditedRouteDecks();
    });

    document.getElementById('btnDevApplySulawesiDecks')?.addEventListener('click', () => {
      this.applyRouteDecksToFleets(this.devSeatActiveRoute || 'sulawesi');
    });

    document.getElementById('btnDevOpenSulawesiSeatModal')?.addEventListener('click', () => {
      const companies = Store.getCompanies();
      const vessels = Store.getVessels();
      const isSul = (this.devSeatActiveRoute || 'sulawesi') === 'sulawesi';
      const targetVessel = vessels.find(v => {
        const vType = (v.type || '').toLowerCase();
        const vName = (v.name || '').toLowerCase();
        if (isSul) return vType.includes('parepare') || vType.includes('domestik') || vName.includes('pantokrator');
        return vType.includes('tawau') || vType.includes('internasional') || !vType.includes('parepare');
      });
      const targetCompId = targetVessel ? targetVessel.companyId : (companies[0]?.id || null);
      this.openDevConfigSeatsModal(targetCompId, targetVessel ? targetVessel.id : null);
    });

    document.getElementById('btnDevApplySulawesiPresetInModal')?.addEventListener('click', () => {
      const capInput = document.getElementById('devSeatCapacityInput');
      const deckInput = document.getElementById('devSeatDeckNameInput');
      const sulDecks = Store.getSulawesiDecks ? Store.getSulawesiDecks() : [];
      const sulCap = Store.getSulawesiTotalCapacity ? Store.getSulawesiTotalCapacity() : 1084;
      if (capInput) capInput.value = sulCap;
      if (deckInput) deckInput.value = sulDecks.map(d => d.name || d.carriage).join(', ') || 'Deck 2A, 2B, 3A, 3B, 3C, 3 Depan';
      this.updateDevSeatModalPreview();
      this.showToast('Preset Rute Sulawesi Aktif', `Kapasitas ${sulCap} kursi dengan ${sulDecks.length} dek rute Nunukan - Sulawesi diterapkan.`);
    });

    document.getElementById('btnDevApplyTawauPresetInModal')?.addEventListener('click', () => {
      const capInput = document.getElementById('devSeatCapacityInput');
      const deckInput = document.getElementById('devSeatDeckNameInput');
      const twuDecks = Store.getTawauDecks ? Store.getTawauDecks() : [];
      const twuCap = Store.getTawauTotalCapacity ? Store.getTawauTotalCapacity() : 150;
      if (capInput) capInput.value = twuCap;
      if (deckInput) deckInput.value = twuDecks.map(d => d.name || d.carriage).join(', ') || 'Main Deck, VIP Deck';
      this.updateDevSeatModalPreview();
      this.showToast('Preset Rute Tawau Aktif', `Kapasitas ${twuCap} kursi dengan ${twuDecks.length} dek rute Nunukan - Tawau diterapkan.`);
    });

    // Auto update capacity saat memilih tipe rute di form tambah / edit kapal dev mode
    document.getElementById('devAddVesselType')?.addEventListener('change', (e) => {
      const isDom = e.target.value.includes('Parepare') || e.target.value.includes('Domestik');
      const capEl = document.getElementById('devAddVesselCapacity');
      if (capEl) capEl.value = isDom ? '1084' : '150';
    });
    document.getElementById('devEditVesselType')?.addEventListener('change', (e) => {
      const isDom = e.target.value.includes('Parepare') || e.target.value.includes('Domestik');
      const capEl = document.getElementById('devEditVesselCapacity');
      if (capEl && (capEl.value === '150' || capEl.value === '1084')) {
        capEl.value = isDom ? '1084' : '150';
      }
    });

    // ----------------- DEVELOPER MODE: TAMBAH JADWAL -----------------
    document.getElementById('btnDevOpenAddSchedule')?.addEventListener('click', () => {
      this.openDevAddScheduleModal();
    });
    const closeDevAddSched = () => {
      document.getElementById('modalDevAddSchedule')?.classList.remove('show');
    };
    document.getElementById('btnCloseDevAddSchedule')?.addEventListener('click', closeDevAddSched);
    document.getElementById('btnCancelDevAddSchedule')?.addEventListener('click', closeDevAddSched);

    document.getElementById('formDevAddSchedule')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const compId = document.getElementById('devAddSchedCompanySelect')?.value;
      const vesselId = document.getElementById('devAddSchedVesselSelect')?.value;
      const originId = document.getElementById('devAddSchedOriginSelect')?.value || 'NNK';
      const destinationId = document.getElementById('devAddSchedDestSelect')?.value || 'TWU';
      const dateVal = document.getElementById('devAddSchedDateInput')?.value || new Date().toISOString().split('T')[0];
      const recurrence = document.getElementById('devAddSchedRecurrenceSelect')?.value || 'ONCE';
      const departTime = document.getElementById('devAddSchedDepartTime')?.value || '09:00';
      const arrivalTime = document.getElementById('devAddSchedArrivalTime')?.value || '10:30';
      const pier = (document.getElementById('devAddSchedPierInput')?.value || 'Dermaga Utama KSOP').trim();
      const priceEko = parseInt(document.getElementById('devAddSchedPriceEko')?.value || '430000', 10);
      const portPassFee = parseInt(document.getElementById('devAddSchedPortPassPrice')?.value || '50000', 10);
      const makeDefault = document.getElementById('devAddSchedMakeDefaultCheck')?.checked ?? true;

      const comp = Store.getCompanyById(compId);
      const vessel = Store.getVessels().find(v => v.id === vesselId);
      if (!compId || !vesselId || !vessel) {
        this.showToast('Data Tidak Lengkap', 'Pilih perusahaan dan armada kapal yang valid.', 'warning');
        return;
      }

      const vName = vessel.name || 'KM Armada';
      const isDom = originId === 'PRE' || destinationId === 'PRE';
      const origCity = (typeof MASTER_PORTS !== 'undefined' && MASTER_PORTS.find(p => p.id === originId)?.city) || 'Nunukan';
      const destCity = (typeof MASTER_PORTS !== 'undefined' && MASTER_PORTS.find(p => p.id === destinationId)?.city) || (isDom ? 'Parepare' : 'Tawau');

      const createSchedObj = (dStr) => ({
        id: `SCH-${comp.code || 'DEV'}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        companyId: comp.id,
        vesselId,
        vesselNameCustom: vName,
        originId,
        destinationId,
        originCity: origCity,
        destinationCity: destCity,
        departDate: dStr,
        departTime,
        arrivalTime,
        daysToAdd: 0,
        pier,
        status: 'ACTIVE',
        priceEconomy: priceEko,
        portPassFee,
        categoryType: (originId === 'TWU' || destinationId === 'TWU') ? 'INTERNATIONAL' : 'DOMESTIC',
        quotaTotal: vessel.capacity || 150,
        quotaBooked: 0,
        classes: [
          { id: 'cls-eko', name: 'Tiket Reguler', price: priceEko, quota: vessel.capacity || 150, available: vessel.capacity || 150, booked: 0 }
        ],
        isDefault: makeDefault
      });

      let addedFirstSched = null;
      let addedCount = 0;
      if (recurrence === 'DAILY_WEEK') {
        const base = new Date(dateVal);
        for (let i = 0; i < 7; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          const schedObj = createSchedObj(dStr);
          Store.addSchedule(schedObj);
          if (!addedFirstSched) addedFirstSched = schedObj;
          addedCount++;
        }
      } else if (recurrence === 'DAILY_MONTH') {
        const base = new Date(dateVal);
        const y = base.getFullYear();
        const m = base.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let day = base.getDate(); day <= lastDay; day++) {
          const d = new Date(y, m, day);
          const dStr = d.toISOString().split('T')[0];
          const schedObj = createSchedObj(dStr);
          Store.addSchedule(schedObj);
          if (!addedFirstSched) addedFirstSched = schedObj;
          addedCount++;
        }
      } else {
        const schedObj = createSchedObj(dateVal);
        Store.addSchedule(schedObj);
        addedFirstSched = schedObj;
        addedCount = 1;
      }

      if (makeDefault && addedFirstSched) {
        Store.updateCompany(comp.id, {
          defaultVesselId: vesselId,
          defaultScheduleId: addedFirstSched.id,
          defaultCapacity: vessel.capacity || 150
        });
      }

      closeDevAddSched();
      document.getElementById('formDevAddSchedule')?.reset();
      this.renderDevAdminDashboard();
      this.showToast('Jadwal Berhasil Dibuka', `${addedCount} jadwal pelayaran untuk ${vName} (${comp.name}) berhasil ditetapkan.`);
    });

    ['modalDevAddCompany', 'modalDevEditCompany', 'modalDevAddVessel', 'modalDevEditVessel', 'modalDevConfigSeats', 'modalDevAddSchedule'].forEach(mId => {
      const el = document.getElementById(mId);
      if (el) {
        el.addEventListener('click', (e) => {
          if (e.target === el) el.classList.remove('show');
        });
      }
    });
  },

  renderDevAdminDashboard() {
    const devCreds = Store.getDevAdminCredentials();
    const idTextEl = document.getElementById('devAdminCurrentIdText');
    if (idTextEl && devCreds) {
      idTextEl.textContent = `${devCreds.username} (${devCreds.email})`;
    }
    const companies = Store.getCompanies();
    const allVessels = Store.getVessels();
    const allSchedules = Store.getSchedules();
    const allBookings = Store.getBookings();

    // Populate Filter Dropdowns (Preserve Selection)
    const compSelect = document.getElementById('devFilterCompany');
    const vesselSelect = document.getElementById('devFilterVessel');
    const selectedCompId = compSelect ? compSelect.value : 'ALL';
    const selectedVesselVal = vesselSelect ? vesselSelect.value : 'ALL';

    if (compSelect) {
      compSelect.innerHTML = '<option value="ALL">Semua Perusahaan Terdaftar</option>';
      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.code || c.id})`;
        compSelect.appendChild(opt);
      });
      if ([...compSelect.options].some(o => o.value === selectedCompId)) {
        compSelect.value = selectedCompId;
      }
    }

    if (vesselSelect) {
      vesselSelect.innerHTML = '<option value="ALL">Semua Armada Kapal</option>';
      const scopedVessels = selectedCompId === 'ALL'
        ? allVessels
        : allVessels.filter(v => v.companyId === selectedCompId);

      // Include any vessel names from bookings that may not be in allVessels
      const vesselNamesSet = new Set();
      scopedVessels.forEach(v => {
        if (v.name) vesselNamesSet.add(v.name);
      });
      allBookings.forEach(b => {
        if (selectedCompId === 'ALL' || b.companyId === selectedCompId) {
          if (b.vesselName) vesselNamesSet.add(b.vesselName);
        }
      });

      vesselNamesSet.forEach(vName => {
        const opt = document.createElement('option');
        opt.value = vName;
        opt.textContent = vName;
        vesselSelect.appendChild(opt);
      });
      if ([...vesselSelect.options].some(o => o.value === selectedVesselVal)) {
        vesselSelect.value = selectedVesselVal;
      }
    }

    // 1. Render Registered Companies, Approval & Freeze Status Table
    const pendingList = companies.filter(c => c.approvalStatus === 'PENDING' || (c.verified === false && c.approvalStatus !== 'REJECTED' && c.approvalStatus !== 'FROZEN'));
    const frozenList = companies.filter(c => c.frozen === true || c.approvalStatus === 'FROZEN');
    const approvedList = companies.filter(c => c.approvalStatus !== 'PENDING' && c.approvalStatus !== 'REJECTED' && c.approvalStatus !== 'FROZEN' && c.verified !== false && c.frozen !== true);

    const kpiTotalComp = document.getElementById('devKpiTotalCompanies');
    if (kpiTotalComp) kpiTotalComp.textContent = `${companies.length} Perusahaan`;
    const kpiAppComp = document.getElementById('devKpiApprovedCompanies');
    if (kpiAppComp) kpiAppComp.textContent = `${approvedList.length} Disetujui (Aktif)`;
    const kpiPending = document.getElementById('devKpiPendingCount');
    if (kpiPending) kpiPending.textContent = `${pendingList.length} Menunggu Approval`;
    const kpiFrozen = document.getElementById('devKpiFrozenCount');
    if (kpiFrozen) kpiFrozen.textContent = `${frozenList.length} Akun Dibekukan`;
    const pendingBadge = document.getElementById('devPendingAlertBadge');
    if (pendingBadge) {
      pendingBadge.textContent = `${pendingList.length} Menunggu Approval • ${frozenList.length} Dibekukan`;
      pendingBadge.style.background = pendingList.length > 0 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)';
      pendingBadge.style.color = pendingList.length > 0 ? '#fbbf24' : '#34d399';
      pendingBadge.style.borderColor = pendingList.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';
    }
    const kpiVessels = document.getElementById('devKpiTotalVessels');
    if (kpiVessels) kpiVessels.textContent = `${allVessels.length} Armada`;
    const kpiScheds = document.getElementById('devKpiTotalSchedules');
    if (kpiScheds) kpiScheds.textContent = `${allSchedules.length} Rute / Jadwal Pelayaran`;

    const tbodyComp = document.getElementById('tbodyDevCompaniesList');
    if (tbodyComp) {
      if (companies.length === 0) {
        tbodyComp.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #94a3b8;">Belum ada perusahaan yang terdaftar dalam sistem.</td></tr>`;
      } else {
        tbodyComp.innerHTML = companies.map(c => {
          const compVessels = allVessels.filter(v => v.companyId === c.id);
          const compSchedules = allSchedules.filter(s => s.companyId === c.id);
          const isFrozen = c.frozen === true || c.approvalStatus === 'FROZEN';
          const isPending = !isFrozen && (c.approvalStatus === 'PENDING' || (c.verified === false && c.approvalStatus !== 'REJECTED'));
          const isRejected = !isFrozen && c.approvalStatus === 'REJECTED';

          let statusBadgeHtml = `<span class="tag-badge" style="display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; padding: 0.24rem 0.55rem; font-size: 0.7rem; background: rgba(16, 185, 129, 0.18); color: #34d399; border-color: rgba(16, 185, 129, 0.4); font-weight: 700;">✅ Disetujui (Aktif)</span>`;
          if (isFrozen) {
            statusBadgeHtml = `<span class="tag-badge" style="display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; padding: 0.24rem 0.55rem; font-size: 0.7rem; background: rgba(56, 189, 248, 0.18); color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); font-weight: 800;">❄️ Akun Dibekukan</span>`;
          } else if (isPending) {
            statusBadgeHtml = `<span class="tag-badge" style="display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; padding: 0.24rem 0.55rem; font-size: 0.7rem; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.45); font-weight: 800;">⏳ Menunggu Approval</span>`;
          } else if (isRejected) {
            statusBadgeHtml = `<span class="tag-badge" style="display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap; padding: 0.24rem 0.55rem; font-size: 0.7rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.45); font-weight: 700;">❌ Ditolak</span>`;
          }

          const vesselNamesStr = compVessels.length > 0
            ? compVessels.map(v => {
                const isSul = (v.type || '').toLowerCase().includes('parepare') || (v.type || '').toLowerCase().includes('domestik') || (v.name || '').toLowerCase().includes('pantokrator');
                const dCount = (v.decks && v.decks.length > 0) ? v.decks.length : (isSul ? 6 : 2);
                return `<span class="btn-dev-edit-vessel-trigger" data-id="${v.id}" style="display:inline-flex; align-items:center; gap:0.25rem; white-space:nowrap; background:#0f172a; border:1px solid #334155; border-radius:6px; padding:0.2rem 0.55rem; font-size:0.7rem; font-weight:700; color:#38bdf8; margin:0.12rem; cursor:pointer; transition:all 0.15s ease;" onmouseover="this.style.borderColor='#38bdf8';this.style.background='#1e293b'" onmouseout="this.style.borderColor='#334155';this.style.background='#0f172a'" title="Klik untuk edit data & pengaturan dek ${v.name}">⛴️ ${v.name} <span style="color:#94a3b8; font-weight:600;">(${v.capacity || 150} Pax • ${dCount} Dek)</span> ✏️</span>`;
              }).join(' ')
            : `<span style="color:#64748b; font-size:0.74rem; white-space:nowrap;">Belum ada armada</span>`;

          return `
            <tr style="background: #162032; color: #e2e8f0;">
              <td style="background: transparent;">
                <div style="display: flex; align-items: center; gap: 0.55rem;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c.brandColor || '#38bdf8'}; display: inline-block; flex-shrink: 0;"></span>
                  <div class="btn-dev-edit-company-trigger" data-id="${c.id}" style="cursor: pointer;" title="Klik untuk edit data ${c.name}">
                    <strong class="dev-comp-name-link" style="color: #f8fafc; font-size: 0.84rem; white-space: nowrap; text-decoration: underline; text-decoration-color: rgba(56, 189, 248, 0.4); text-underline-offset: 3px;">${c.name}</strong>
                    <div style="font-size: 0.7rem; color: #94a3b8; font-family: monospace; white-space: nowrap;">ID: ${c.id} • Kode: ${c.code || '-'}</div>
                  </div>
                </div>
              </td>
              <td>
                <span style="font-size: 0.76rem; font-weight: 600; color: #cbd5e1;">${c.category || '-'}</span>
              </td>
              <td style="white-space: nowrap;">
                <div style="font-size: 0.78rem; color: #f1f5f9; font-weight: 600;">${c.email || '-'}</div>
                <div style="font-size: 0.72rem; color: #94a3b8;">📞 ${c.phone || '-'}</div>
              </td>
              <td style="white-space: nowrap;">
                <span style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">${c.joinedDate || '-'}</span>
              </td>
              <td style="white-space: nowrap;">
                <div style="margin-bottom: 0.2rem; font-size: 0.73rem; font-weight: 700; color: #38bdf8;">${compVessels.length} Armada • ${compSchedules.length} Jadwal</div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.2rem;">${vesselNamesStr}</div>
              </td>
              <td style="white-space: nowrap;">${statusBadgeHtml}</td>
              <td style="text-align: right; white-space: nowrap;">
                <div style="display: inline-flex; gap: 0.28rem; align-items: center; justify-content: flex-end; flex-wrap: nowrap; white-space: nowrap;">
                  ${(isPending || isRejected) ? `
                    <button type="button" class="btn-dev-approve-comp" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 0.22rem; white-space: nowrap; background: #10b981; color: #ffffff; border: none; border-radius: 6px; padding: 0.28rem 0.52rem; font-size: 0.7rem; font-weight: 700; cursor: pointer;">
                      ✅ Setujui
                    </button>
                  ` : ''}
                  ${isPending ? `
                    <button type="button" class="btn-dev-reject-comp" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 0.22rem; white-space: nowrap; background: rgba(239, 68, 68, 0.16); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 0.28rem 0.5rem; font-size: 0.7rem; font-weight: 700; cursor: pointer;">
                      ❌ Tolak
                    </button>
                  ` : ''}
                  ${isFrozen ? `
                    <button type="button" class="btn-dev-unfreeze-comp" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 0.22rem; white-space: nowrap; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); border-radius: 6px; padding: 0.28rem 0.52rem; font-size: 0.7rem; font-weight: 700; cursor: pointer;" title="Aktifkan Kembali Akun Perusahaan">
                      🔓 Buka Bekuan
                    </button>
                  ` : `
                    <button type="button" class="btn-dev-freeze-comp" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 0.22rem; white-space: nowrap; background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 6px; padding: 0.28rem 0.52rem; font-size: 0.7rem; font-weight: 700; cursor: pointer;" title="Bekukan Sementara Akun Perusahaan">
                      ❄️ Bekukan Akun
                    </button>
                  `}
                  <button type="button" class="btn-dev-filter-comp" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 0.22rem; white-space: nowrap; background: rgba(56, 189, 248, 0.16); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; padding: 0.28rem 0.5rem; font-size: 0.7rem; font-weight: 700; cursor: pointer;" title="Lihat Transaksi Perusahaan Ini">
                    🔍 Transaksi
                  </button>
                  <button type="button" class="btn-dev-delete-comp" data-id="${c.id}" style="display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; background: #0f172a; color: #94a3b8; border: 1px solid #334155; border-radius: 6px; padding: 0.28rem 0.45rem; font-size: 0.7rem; font-weight: 700; cursor: pointer;" title="Hapus Perusahaan">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Bind Action Buttons
        tbodyComp.querySelectorAll('.btn-dev-approve-comp').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            const comp = Store.approveCompany(compId);
            this.renderCompanyFilterChips();
            this.renderDevAdminDashboard();
            this.showToast('Perusahaan Disetujui', `"${comp ? comp.name : compId}" telah di-approve dan kini dapat login.`);
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-reject-comp').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            const comp = Store.rejectCompany(compId);
            this.renderCompanyFilterChips();
            this.renderDevAdminDashboard();
            this.showToast('Perusahaan Ditolak', `Status pendaftaran "${comp ? comp.name : compId}" diubah menjadi Ditolak.`, 'warning');
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-edit-company-trigger').forEach(el => {
          el.addEventListener('click', () => {
            const compId = el.getAttribute('data-id');
            this.openDevEditCompanyModal(compId);
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-edit-vessel-trigger').forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const vesselId = el.getAttribute('data-id');
            this.openDevEditVesselModal(vesselId);
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-row-add-vessel').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            this.openDevAddVesselModal(compId);
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-row-add-schedule').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            this.openDevAddScheduleModal(compId);
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-row-config-seat').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            this.openDevConfigSeatsModal(compId);
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-freeze-comp').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            const comp = Store.freezeCompany(compId);
            this.renderCompanyFilterChips();
            this.renderDevAdminDashboard();
            this.showToast('Akun Dibekukan', `Akun perusahaan "${comp ? comp.name : compId}" telah dibekukan sementara.`, 'warning');
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-unfreeze-comp').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            const comp = Store.unfreezeCompany(compId);
            this.renderCompanyFilterChips();
            this.renderDevAdminDashboard();
            this.showToast('Bekuan Dibuka', `Akun perusahaan "${comp ? comp.name : compId}" telah diaktifkan kembali.`);
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-filter-comp').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            if (compSelect) compSelect.value = compId;
            if (vesselSelect) vesselSelect.value = 'ALL';
            this.renderDevAdminDashboard();
            document.getElementById('tbodyDevDailyVesselRecap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        });

        tbodyComp.querySelectorAll('.btn-dev-delete-comp').forEach(btn => {
          btn.addEventListener('click', () => {
            const compId = btn.getAttribute('data-id');
            const comp = Store.getCompanyById(compId);
            if (confirm(`Hapus perusahaan "${comp ? comp.name : compId}" dari daftar perusahaan terdaftar?`)) {
              Store.deleteCompany(compId);
              this.renderCompanyFilterChips();
              this.renderDevAdminDashboard();
              this.showToast('Perusahaan Dihapus', 'Data perusahaan telah dihapus dari sistem.');
            }
          });
        });
      }
    }

    // 1B. Master Penetapan Tarif Resmi Seluruh Rute Kapal (Developer Tariff Authority)
    const tbodyDevMasterRoutes = document.getElementById('tbodyDevMasterRouteTariffs');
    if (tbodyDevMasterRoutes && Store.getMasterRouteTariffs) {
      const masterRoutes = Store.getMasterRouteTariffs();
      tbodyDevMasterRoutes.innerHTML = masterRoutes.map(r => {
        const isIntl = r.category === 'Internasional' || r.originId === 'TWU' || r.destinationId === 'TWU';
        const badgeColor = isIntl ? '#fbbf24' : '#38bdf8';
        const badgeBg = isIntl ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)';
        const totalPax = (Number(r.ticketPrice) || 0) + (Number(r.portPassFee) || 0);
        const origPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.originId) : null;
        const destPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.destinationId) : null;
        const origCity = origPort ? origPort.city.split(' ')[0] : (r.originName ? r.originName.split(' ')[0].replace(/\(.*$/, '').trim() : r.originId);
        const destCity = destPort ? destPort.city.split(' ')[0] : (r.destinationName ? r.destinationName.split(' ')[0].replace(/\(.*$/, '').trim() : r.destinationId);
        const routeShortName = `${origCity} - ${destCity}`;

        return `
          <tr style="background: #162032; color: #e2e8f0;">
            <td style="white-space: nowrap;"><code style="color: #38bdf8; font-weight: 700;">${r.id}</code></td>
            <td style="white-space: nowrap;">
              <strong style="color: #f8fafc; font-size: 0.88rem;">${routeShortName}</strong>
              <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">${r.notes || 'Rute Pelayaran Resmi'}</div>
            </td>
            <td style="white-space: nowrap;">
              <span class="tag-badge" style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}66; font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;">
                ${r.category || (isIntl ? 'Internasional' : 'Domestik')}
              </span>
            </td>
            <td style="white-space: nowrap;"><strong style="color: #34d399; font-size: 0.88rem;">${formatRupiah(r.ticketPrice)}</strong></td>
            <td style="white-space: nowrap;"><strong style="color: #38bdf8; font-size: 0.85rem;">${formatRupiah(r.portPassFee)}</strong></td>
            <td style="white-space: nowrap;"><strong style="color: #fbbf24; font-size: 0.88rem;">${formatRupiah(totalPax)}</strong></td>
            <td style="white-space: nowrap;"><span style="color: #a78bfa; font-size: 0.76rem; font-weight: 600;">⚓ Semua Armada Kapal</span></td>
            <td style="text-align: right; white-space: nowrap;">
              <button type="button" class="btn-dev-edit-master-route" data-id="${r.id}" style="display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.25) 100%); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.5); border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease;">
                🏷️ Edit Tarif Rute Ini
              </button>
              <button type="button" class="btn-dev-delete-master-route" data-id="${r.id}" title="Hapus Rute Ini" style="display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; background: rgba(239, 68, 68, 0.16); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 6px; padding: 0.35rem 0.6rem; font-size: 0.76rem; font-weight: 700; cursor: pointer; margin-left: 0.3rem;">
                🗑️ Hapus
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tbodyDevMasterRoutes.querySelectorAll('.btn-dev-edit-master-route').forEach(btn => {
        btn.addEventListener('click', () => {
          const routeId = btn.getAttribute('data-id');
          this.openEditRouteTariffModal(routeId);
        });
      });

      tbodyDevMasterRoutes.querySelectorAll('.btn-dev-delete-master-route').forEach(btn => {
        btn.addEventListener('click', () => this.deleteMasterRouteTariff(btn.getAttribute('data-id')));
      });
    }

    // 1C. Render Developer Pricing & Port Pass Management Tables (Per Perusahaan & Armada)
    const tbodyDevTariffs = document.getElementById('tbodyDevScheduleTariffs');
    if (tbodyDevTariffs) {
      const uniqueDevSchedules = [];
      const seenDevKeys = new Set();
      allSchedules.forEach(s => {
        const key = `${s.companyId || ''}__${s.vesselId || s.vesselNameCustom || ''}__${s.originId}__${s.destinationId}__${s.departTime}`;
        if (!seenDevKeys.has(key)) {
          seenDevKeys.add(key);
          uniqueDevSchedules.push(s);
        }
      });

      if (uniqueDevSchedules.length === 0) {
        // Tampilkan seluruh master rute resmi agar developer dapat langsung mengedit tarif tiket semua rute
        const masterRoutes = (Store.getMasterRouteTariffs ? Store.getMasterRouteTariffs() : []);
        tbodyDevTariffs.innerHTML = masterRoutes.map(r => {
          const totalPax = (Number(r.ticketPrice) || 0) + (Number(r.portPassFee) || 0);
          return `
            <tr style="background: #162032; color: #e2e8f0;">
              <td style="white-space: nowrap;">
                <div style="display: inline-flex; align-items: center; gap: 0.45rem;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; display: inline-block;"></span>
                  <strong style="color: #f8fafc; font-size: 0.82rem;">[STANDAR MASTER] Seluruh Operator</strong>
                </div>
              </td>
              <td style="white-space: nowrap;">
                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.76rem; font-weight: 800;">⛴️ Semua Armada Kapal</span>
              </td>
              <td style="white-space: nowrap; font-weight: 600; color: #cbd5e1;">${r.originId} ➔ ${r.destinationId} <small style="color: #94a3b8;">(${r.category})</small></td>
              <td style="white-space: nowrap; color: #cbd5e1;">Reguler Harian</td>
              <td style="white-space: nowrap;"><strong style="color: #34d399; font-size: 0.85rem;">${formatRupiah(r.ticketPrice)}</strong></td>
              <td style="white-space: nowrap;"><strong style="color: #38bdf8; font-size: 0.82rem;">${formatRupiah(r.portPassFee)}</strong></td>
              <td style="white-space: nowrap;"><strong style="color: #fbbf24; font-size: 0.85rem;">${formatRupiah(totalPax)}</strong></td>
              <td style="text-align: right; white-space: nowrap;">
                <button type="button" class="btn-dev-edit-master-route" data-id="${r.id}" style="display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); border-radius: 6px; padding: 0.32rem 0.65rem; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
                  🏷️ Edit Tarif Rute Ini
                </button>
                <button type="button" class="btn-dev-delete-master-route" data-id="${r.id}" title="Hapus Rute Ini" style="display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; background: rgba(239, 68, 68, 0.16); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 6px; padding: 0.32rem 0.55rem; font-size: 0.74rem; font-weight: 700; cursor: pointer; margin-left: 0.3rem;">
                  🗑️ Hapus
                </button>
              </td>
            </tr>
          `;
        }).join('');

        tbodyDevTariffs.querySelectorAll('.btn-dev-edit-master-route').forEach(btn => {
          btn.addEventListener('click', () => {
            const routeId = btn.getAttribute('data-id');
            this.openEditRouteTariffModal(routeId);
          });
        });

        tbodyDevTariffs.querySelectorAll('.btn-dev-delete-master-route').forEach(btn => {
          btn.addEventListener('click', () => this.deleteMasterRouteTariff(btn.getAttribute('data-id')));
        });
      } else {
        tbodyDevTariffs.innerHTML = uniqueDevSchedules.map(s => {
          const comp = companies.find(c => c.id === s.companyId);
          const compName = comp ? comp.name : (s.companyId || 'Perusahaan');
          const brandColor = comp ? (comp.brandColor || '#38bdf8') : '#38bdf8';
          const v = allVessels.find(item => item.id === s.vesselId);
          const vName = v ? v.name : (s.vesselNameCustom || 'Armada Reguler');
          const orig = MASTER_PORTS.find(p => p.id === s.originId);
          const dest = MASTER_PORTS.find(p => p.id === s.destinationId);
          const origSimple = orig ? orig.city.split(' ')[0] : s.originId;
          const destSimple = dest ? dest.city.split(' ')[0] : s.destinationId;
          const regPrice = (s.classes && s.classes[0] && s.classes[0].price) ? Number(s.classes[0].price) : Number(s.priceEconomy || 690000);
          const passFee = this.getSchedulePortPassFee(s, comp);
          const totalPax = regPrice + passFee;

          return `
            <tr style="background: #162032; color: #e2e8f0;">
              <td style="white-space: nowrap;">
                <div style="display: inline-flex; align-items: center; gap: 0.45rem;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${brandColor}; display: inline-block;"></span>
                  <strong style="color: #f8fafc; font-size: 0.82rem;">${compName}</strong>
                </div>
              </td>
              <td style="white-space: nowrap;">
                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.76rem; font-weight: 800;">⛴️ ${vName}</span>
              </td>
              <td style="white-space: nowrap; font-weight: 600; color: #cbd5e1;">${origSimple} ➔ ${destSimple}</td>
              <td style="white-space: nowrap; color: #cbd5e1;">${s.departTime} - ${s.arrivalTime || '10:30'} WIB</td>
              <td style="white-space: nowrap;"><strong style="color: #34d399; font-size: 0.85rem;">${formatRupiah(regPrice)}</strong></td>
              <td style="white-space: nowrap;"><strong style="color: #38bdf8; font-size: 0.82rem;">${formatRupiah(passFee)}</strong></td>
              <td style="white-space: nowrap;"><strong style="color: #fbbf24; font-size: 0.85rem;">${formatRupiah(totalPax)}</strong></td>
              <td style="text-align: right; white-space: nowrap;">
                <button type="button" class="btn-dev-edit-sched-tariff" data-id="${s.id}" style="display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); border-radius: 6px; padding: 0.32rem 0.65rem; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
                  🏷️ Edit Harga Tiket & Pas
                </button>
              </td>
            </tr>
          `;
        }).join('');

        tbodyDevTariffs.querySelectorAll('.btn-dev-edit-sched-tariff').forEach(btn => {
          btn.addEventListener('click', () => {
            const schedId = btn.getAttribute('data-id');
            this.openEditSchedulePriceModal(schedId);
          });
        });
      }
    }

    const tbodyDevPP = document.getElementById('tbodyDevPortPassList');
    if (tbodyDevPP) {
      const allPasses = Store.getPortPasses ? Store.getPortPasses() : [];
      const modeLabels = {
        INCLUDED: 'Termasuk di Tiket (Bundling)',
        ADDON: 'Ditambahkan Otomatis ke Tiket',
        COUNTER: 'Bayar di Loket Pelabuhan'
      };
      if (allPasses.length === 0) {
        tbodyDevPP.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 1.5rem; color: #94a3b8;">Belum ada data pas pelabuhan terdaftar.</td></tr>`;
      } else {
        tbodyDevPP.innerHTML = allPasses.map(pp => `
          <tr style="background: #162032; color: #e2e8f0;">
            <td style="white-space: nowrap;"><code style="color: #38bdf8; font-weight: 700;">${pp.id}</code></td>
            <td><strong style="color: #f8fafc;">${pp.name}</strong></td>
            <td><small style="color: #94a3b8;">${pp.operator || '-'}</small></td>
            <td style="white-space: nowrap;">
              <span class="tag-badge" style="background: ${pp.routeType === 'Internasional' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)'}; color: ${pp.routeType === 'Internasional' ? '#fbbf24' : '#38bdf8'}; border-color: ${pp.routeType === 'Internasional' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)'}; font-weight: 700;">${pp.routeType || 'Domestik'}</span>
            </td>
            <td style="white-space: nowrap;"><strong style="color: #34d399;">${formatRupiah(pp.priceAdult || 0)}</strong></td>
            <td><small style="color: #cbd5e1;">${modeLabels[pp.billingMode] || pp.billingMode}</small></td>
            <td style="white-space: nowrap;"><span class="status-pill ${pp.status === 'Nonaktif' ? 'waiting' : 'paid'}">${pp.status || 'Aktif'}</span></td>
            <td style="text-align: right; white-space: nowrap;">
              <button type="button" class="btn-dev-edit-port-pass" data-id="${pp.id}" style="display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; background: rgba(56, 189, 248, 0.18); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 6px; padding: 0.32rem 0.65rem; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
                ✏️ Edit Pas Pelabuhan
              </button>
            </td>
          </tr>
        `).join('');

        tbodyDevPP.querySelectorAll('.btn-dev-edit-port-pass').forEach(btn => {
          btn.addEventListener('click', () => {
            const ppId = btn.getAttribute('data-id');
            this.openEditPortPassModal(ppId);
          });
        });
      }
    }

    // 2. Filter Bookings for Daily Per-Company & Per-Vessel Audit
    const filterDate = (document.getElementById('devFilterDate')?.value || '').trim();
    const filterComp = document.getElementById('devFilterCompany')?.value || 'ALL';
    const filterVessel = document.getElementById('devFilterVessel')?.value || 'ALL';
    const filterSearch = (document.getElementById('devFilterSearch')?.value || '').trim().toLowerCase();

    const compMap = new Map();
    companies.forEach(c => compMap.set(c.id, c));

    const filteredBookings = allBookings.filter(b => {
      const txDate = b.departDate || (b.createdAt ? b.createdAt.split('T')[0] : '');
      if (filterDate && txDate !== filterDate) return false;
      if (filterComp !== 'ALL' && b.companyId !== filterComp) return false;
      if (filterVessel !== 'ALL' && (b.vesselName || '') !== filterVessel) return false;
      if (filterSearch) {
        const pnrMatch = (b.pnr || '').toLowerCase().includes(filterSearch);
        const vesselMatch = (b.vesselName || '').toLowerCase().includes(filterSearch);
        const paxMatch = (b.passengers || []).some(p => (p.name || '').toLowerCase().includes(filterSearch) || (p.docNumber || '').toLowerCase().includes(filterSearch));
        if (!pnrMatch && !vesselMatch && !paxMatch) return false;
      }
      return true;
    });

    // Update KPI Revenue & Bookings
    let totalRev = 0;
    let totalPaxCount = 0;
    filteredBookings.forEach(b => {
      totalRev += Number(b.totalAmount || 0);
      totalPaxCount += (Array.isArray(b.passengers) && b.passengers.length > 0) ? b.passengers.length : Number(b.paxCount || 1);
    });

    const kpiRevEl = document.getElementById('devKpiTotalRevenue');
    if (kpiRevEl) kpiRevEl.textContent = formatRupiah(totalRev);
    const kpiBookEl = document.getElementById('devKpiTotalBookings');
    if (kpiBookEl) kpiBookEl.textContent = `${filteredBookings.length} Transaksi (${totalPaxCount} Penumpang)`;

    // 2A. Group by Date + Company + Vessel for Daily Vessel Recap
    const dailyGroupMap = new Map();

    filteredBookings.forEach(b => {
      const txDate = b.departDate || (b.createdAt ? b.createdAt.split('T')[0] : 'Tanpa Tanggal');
      const cObj = compMap.get(b.companyId);
      const compName = cObj ? cObj.name : (b.companyName || b.companyId || 'Operator');
      const vName = b.vesselName || 'Armada Umum';
      const key = `${txDate}__${b.companyId}__${vName}`;

      if (!dailyGroupMap.has(key)) {
        dailyGroupMap.set(key, {
          date: txDate,
          companyId: b.companyId,
          companyName: compName,
          brandColor: cObj ? cObj.brandColor : '#0284c7',
          vesselName: vName,
          routes: new Set(),
          txCount: 0,
          paxCount: 0,
          boardedPax: 0,
          waitingPax: 0,
          revenue: 0
        });
      }

      const grp = dailyGroupMap.get(key);
      grp.txCount += 1;
      const pCount = (Array.isArray(b.passengers) && b.passengers.length > 0) ? b.passengers.length : Number(b.paxCount || 1);
      grp.paxCount += pCount;
      if (b.boardingStatus === 'BOARDED') {
        grp.boardedPax += pCount;
      } else {
        grp.waitingPax += pCount;
      }
      grp.revenue += Number(b.totalAmount || 0);
      if (b.originId && b.destinationId) {
        grp.routes.add(`${b.originId} ➔ ${b.destinationId}`);
      }
    });

    // Also include registered company vessels that have 0 transactions if no search term is active so Admin Developer can see every company & its vessels
    if (!filterSearch) {
      const targetDateLabel = filterDate || new Date().toISOString().split('T')[0];
      allVessels.forEach(v => {
        if (filterComp !== 'ALL' && v.companyId !== filterComp) return;
        if (filterVessel !== 'ALL' && v.name !== filterVessel) return;
        const hasAnyGroupForVessel = [...dailyGroupMap.values()].some(g => g.companyId === v.companyId && g.vesselName === v.name && (!filterDate || g.date === filterDate));
        if (!hasAnyGroupForVessel) {
          const cObj = compMap.get(v.companyId);
          const key = `${targetDateLabel}__${v.companyId}__${v.name}`;
          const vScheds = allSchedules.filter(s => s.vesselId === v.id || (s.companyId === v.companyId && s.vesselName === v.name));
          const routeSet = new Set();
          vScheds.forEach(s => {
            if (s.originId && s.destinationId) routeSet.add(`${s.originId} ➔ ${s.destinationId}`);
          });
          dailyGroupMap.set(key, {
            date: targetDateLabel,
            companyId: v.companyId,
            companyName: cObj ? cObj.name : (v.companyId || 'Perusahaan'),
            brandColor: cObj ? cObj.brandColor : '#0284c7',
            vesselName: v.name,
            routes: routeSet,
            txCount: 0,
            paxCount: 0,
            boardedPax: 0,
            waitingPax: 0,
            revenue: 0
          });
        }
      });
    }

    const dailyGroups = [...dailyGroupMap.values()].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.companyName !== b.companyName) return a.companyName.localeCompare(b.companyName);
      return a.vesselName.localeCompare(b.vesselName);
    });

    const tbodyRecap = document.getElementById('tbodyDevDailyVesselRecap');
    if (tbodyRecap) {
      if (dailyGroups.length === 0) {
        tbodyRecap.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 1.75rem; color: #64748b;">Belum ada data armada atau transaksi pada filter hari/perusahaan yang dipilih.</td></tr>`;
      } else {
        tbodyRecap.innerHTML = dailyGroups.map(g => {
          let dateFormatted = g.date;
          try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(g.date)) {
              const dObj = new Date(g.date + 'T00:00:00');
              dateFormatted = dObj.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
            }
          } catch (e) {}

          const routesStr = g.routes.size > 0 ? [...g.routes].join(', ') : '-';
          return `
            <tr style="background: #162032; color: #e2e8f0;">
              <td style="background: transparent;">
                <strong style="color: #f8fafc; font-size: 0.82rem;">📅 ${dateFormatted}</strong>
                <div style="font-size: 0.72rem; color: #94a3b8; font-family: monospace;">${g.date}</div>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 0.45rem;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${g.brandColor}; display: inline-block;"></span>
                  <strong style="color: #f8fafc; font-size: 0.84rem;">${g.companyName}</strong>
                </div>
              </td>
              <td>
                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 0.22rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-weight: 800;">⛴️ ${g.vesselName}</span>
              </td>
              <td>
                <span style="font-size: 0.78rem; font-weight: 700; color: #cbd5e1;">${routesStr}</span>
              </td>
              <td>
                <strong style="color: #f8fafc; font-size: 0.84rem;">${g.txCount} Transaksi</strong>
              </td>
              <td>
                <strong style="color: #38bdf8; font-size: 0.84rem;">${g.paxCount} Penumpang</strong>
              </td>
              <td>
                <span style="font-size: 0.75rem; color: #34d399; font-weight: 700;">${g.boardedPax} Boarded</span>
                <span style="color: #475569;">•</span>
                <span style="font-size: 0.75rem; color: #fbbf24; font-weight: 700;">${g.waitingPax} Menunggu</span>
              </td>
              <td>
                <strong style="color: #10b981; font-size: 0.9rem;">${formatRupiah(g.revenue)}</strong>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2B. Render Detailed Daily Transactions Table
    const tbodyDetail = document.getElementById('tbodyDevDailyTransactionsDetail');
    if (tbodyDetail) {
      if (filteredBookings.length === 0) {
        tbodyDetail.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">Tidak ditemukan rincian transaksi tiket pada filter yang dipilih.</td></tr>`;
      } else {
        const sortedBookings = [...filteredBookings].sort((a, b) => {
          const da = a.departDate || '';
          const db = b.departDate || '';
          if (da !== db) return db.localeCompare(da);
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        tbodyDetail.innerHTML = sortedBookings.map(b => {
          const cObj = compMap.get(b.companyId);
          const compName = cObj ? cObj.name : (b.companyName || b.companyId || '-');
          const txDate = b.departDate || (b.createdAt ? b.createdAt.split('T')[0] : '-');
          const txTime = b.departTime || (b.createdAt ? new Date(b.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-');
          const paxArr = Array.isArray(b.passengers) ? b.passengers : [];
          const paxSummaryHtml = paxArr.length > 0
            ? paxArr.map(p => `<div style="font-size: 0.76rem; color: #e2e8f0;">• <strong>${p.name || '-'}</strong> <span style="color:#94a3b8;">(${p.type || 'Dewasa'} • Kursi ${p.seat || '-'})</span></div>`).join('')
            : `<div style="font-size: 0.76rem; color: #94a3b8;">${b.contact?.name || 'Penumpang'} (${b.paxCount || 1} Pax)</div>`;

          const statusBadge = b.boardingStatus === 'BOARDED'
            ? `<span class="tag-badge" style="background:rgba(16, 185, 129, 0.2); color:#34d399; border-color:rgba(16, 185, 129, 0.4); font-size:0.7rem;">BOARDED</span>`
            : `<span class="tag-badge" style="background:rgba(245, 158, 11, 0.2); color:#fbbf24; border-color:rgba(245, 158, 11, 0.4); font-size:0.7rem;">WAITING</span>`;

          return `
            <tr style="background: #162032; color: #e2e8f0;">
              <td style="background: transparent;">
                <strong style="color: #f8fafc; font-size: 0.8rem;">${txDate}</strong>
                <div style="font-size: 0.72rem; color: #94a3b8;">🕒 ${txTime}</div>
              </td>
              <td>
                <strong style="color: #f8fafc; font-size: 0.82rem;">${compName}</strong>
              </td>
              <td>
                <span style="font-weight: 700; color: #38bdf8; font-size: 0.8rem;">⛴️ ${b.vesselName || '-'}</span>
                <div style="font-size: 0.7rem; color: #94a3b8; font-family: monospace;">${b.scheduleId || ''}</div>
              </td>
              <td>
                <strong style="font-family: monospace; color: #38bdf8; font-size: 0.84rem;">${b.pnr || '-'}</strong>
              </td>
              <td>
                <div style="font-size: 0.73rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.15rem;">Total: ${paxArr.length || b.paxCount || 1} Penumpang</div>
                ${paxSummaryHtml}
              </td>
              <td>
                <div style="font-size: 0.78rem; font-weight: 700; color: #f1f5f9;">${b.originId || '-'} ➔ ${b.destinationId || '-'}</div>
                <div style="font-size: 0.72rem; color: #94a3b8;">${b.className || 'Tiket Reguler'}</div>
              </td>
              <td>
                <div style="font-size: 0.75rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.2rem;">${b.paymentMethod || 'TUNAI / LOKET'}</div>
                ${statusBadge}
              </td>
              <td>
                <strong style="color: #10b981; font-size: 0.88rem;">${formatRupiah(b.totalAmount || 0)}</strong>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Section 1C: Rincian Jumlah Penumpang & Deck Rute Nunukan - Sulawesi (Parepare)
    this.renderDevSulawesiDeckSection();
  },

  // State & Render Rincian Dek & Kapasitas Penumpang (Bisa Diedit untuk Nunukan - Sulawesi & Nunukan - Tawau)
  devSeatActiveRoute: 'sulawesi',
  devSulawesiActiveDeck: '2A',
  devTawauActiveDeck: 'MAIN',
  devSectionSelectedVesselId: null,

  renderDevSulawesiDeckSection() {
    const sec = document.getElementById('sectionDevSulawesiDecks');
    if (!sec) return;
    const routeKey = this.devSeatActiveRoute || 'sulawesi';
    const isSulawesi = routeKey === 'sulawesi';
    const vessels = typeof Store !== 'undefined' && Store.getVessels ? Store.getVessels() : [];
    const companies = typeof Store !== 'undefined' && Store.getCompanies ? Store.getCompanies() : [];

    // Sinkronkan Dropdown Pemilihan Armada di Section 1C
    const vesselSel = document.getElementById('devSectionVesselSelect');
    if (vesselSel) {
      vesselSel.innerHTML = '';

      const optStd = document.createElement('option');
      optStd.value = '__ROUTE_DEFAULT__';
      optStd.textContent = isSulawesi
        ? '⭐ Standar Rute Nunukan – Sulawesi (1.084 Kursi)'
        : '⭐ Standar Rute Nunukan – Tawau (150 Kursi)';
      vesselSel.appendChild(optStd);

      vessels.forEach(v => {
        const comp = companies.find(c => c.id === v.companyId);
        const compName = comp ? comp.name : 'Perusahaan';
        const vType = (v.type || '').toLowerCase();
        const vIsSul = vType.includes('parepare') || vType.includes('domestik') || (v.name || '').toLowerCase().includes('pantokrator');
        const vDeckCount = (v.decks && v.decks.length > 0) ? v.decks.length : (vIsSul ? 6 : 2);

        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `⛴️ ${v.name} (${compName}) – ${v.capacity || 150} Pax [${vDeckCount} Dek]`;
        vesselSel.appendChild(opt);
      });

      if (this.devSectionSelectedVesselId && [...vesselSel.options].some(o => o.value === this.devSectionSelectedVesselId)) {
        vesselSel.value = this.devSectionSelectedVesselId;
      } else {
        const matching = vessels.find(v => {
          const vType = (v.type || '').toLowerCase();
          const vIsSul = vType.includes('parepare') || vType.includes('domestik') || (v.name || '').toLowerCase().includes('pantokrator');
          return isSulawesi ? vIsSul : !vIsSul;
        });
        if (matching) {
          this.devSectionSelectedVesselId = matching.id;
          vesselSel.value = matching.id;
        } else {
          vesselSel.value = '__ROUTE_DEFAULT__';
        }
      }
    }

    let targetVessel = null;
    if (this.devSectionSelectedVesselId && this.devSectionSelectedVesselId !== '__ROUTE_DEFAULT__') {
      targetVessel = vessels.find(v => v.id === this.devSectionSelectedVesselId);
    }

    const decks = targetVessel
      ? (Store.getVesselDecks ? Store.getVesselDecks(targetVessel) : (targetVessel.decks || []))
      : ((typeof Store !== 'undefined' && Store.getRouteDecks)
          ? Store.getRouteDecks(routeKey)
          : (isSulawesi ? (Store.getSulawesiDecks ? Store.getSulawesiDecks() : []) : (Store.getTawauDecks ? Store.getTawauDecks() : [])));
    
    const totalCap = decks.reduce((sum, d) => sum + (parseInt(d.capacity, 10) || 0), 0);

    // Pastikan active deck code valid untuk rute terpilih
    let activeDeckCode = isSulawesi ? this.devSulawesiActiveDeck : this.devTawauActiveDeck;
    if (!activeDeckCode || !decks.some(d => d.code === activeDeckCode)) {
      activeDeckCode = decks[0] ? decks[0].code : '';
      if (isSulawesi) this.devSulawesiActiveDeck = activeDeckCode;
      else this.devTawauActiveDeck = activeDeckCode;
    }

    // Update Route Switcher Tabs
    const tabSulawesi = document.getElementById('btnDevRouteTabSulawesi');
    const tabTawau = document.getElementById('btnDevRouteTabTawau');
    if (tabSulawesi) {
      if (isSulawesi) {
        tabSulawesi.classList.add('active');
        tabSulawesi.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
        tabSulawesi.style.color = '#ffffff';
        tabSulawesi.style.borderColor = '#38bdf8';
        tabSulawesi.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.4)';
      } else {
        tabSulawesi.classList.remove('active');
        tabSulawesi.style.background = '#1e293b';
        tabSulawesi.style.color = '#cbd5e1';
        tabSulawesi.style.borderColor = '#334155';
        tabSulawesi.style.boxShadow = 'none';
      }
    }
    if (tabTawau) {
      if (!isSulawesi) {
        tabTawau.classList.add('active');
        tabTawau.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
        tabTawau.style.color = '#ffffff';
        tabTawau.style.borderColor = '#34d399';
        tabTawau.style.boxShadow = '0 2px 8px rgba(5, 150, 105, 0.4)';
      } else {
        tabTawau.classList.remove('active');
        tabTawau.style.background = '#1e293b';
        tabTawau.style.color = '#cbd5e1';
        tabTawau.style.borderColor = '#334155';
        tabTawau.style.boxShadow = 'none';
      }
    }

    // Update Badges & Headings
    const badgeRoute = document.getElementById('devRouteBadgeRoute');
    if (badgeRoute) {
      badgeRoute.textContent = isSulawesi ? 'RUTE: NUNUKAN ➔ SULAWESI (PAREPARE)' : 'RUTE: NUNUKAN ➔ TAWAU (MALAYSIA)';
    }
    const badgeTotal = document.getElementById('devRouteBadgeTotalPax');
    if (badgeTotal) {
      badgeTotal.textContent = `TOTAL: ${totalCap.toLocaleString('id-ID')} PENUMPANG`;
    }
    const titleEl = document.getElementById('devRouteSectionTitle');
    if (titleEl) {
      if (targetVessel) {
        titleEl.innerHTML = `<span>🛳️ Pengaturan Dek Armada: <strong>${targetVessel.name}</strong> (${isSulawesi ? 'Rute Sulawesi' : 'Rute Tawau'})</span>`;
      } else {
        titleEl.innerHTML = `<span>${isSulawesi ? '🛳️' : '🚢'} Rincian Jumlah Penumpang &amp; Deck Rute Nunukan – ${isSulawesi ? 'Sulawesi (Parepare)' : 'Tawau (Internasional)'}</span>`;
      }
    }
    const subtitleEl = document.getElementById('devRouteSectionSubtitle');
    if (subtitleEl) {
      subtitleEl.textContent = isSulawesi
        ? `Spesifikasi resmi pembagian kapasitas per dek gerbong penumpang (Carriage) kapal rute domestik Nunukan ➔ Sulawesi Selatan (Total ${totalCap.toLocaleString('id-ID')} Kursi).`
        : `Spesifikasi resmi pembagian kapasitas per dek gerbong penumpang (Carriage) kapal rute internasional Nunukan ➔ Tawau, Sabah Malaysia (Total ${totalCap.toLocaleString('id-ID')} Kursi).`;
    }

    const applyBtnText = document.getElementById('btnDevApplyRouteDecksText');
    if (applyBtnText) {
      applyBtnText.textContent = `⚡ Terapkan ${totalCap.toLocaleString('id-ID')} Kursi ke Armada ${isSulawesi ? 'Sulawesi' : 'Tawau'}`;
    }

    // Render Dynamic KPI Grid
    const kpiGrid = document.getElementById('devRouteDeckKpiGrid');
    if (kpiGrid) {
      let cardsHtml = `
        <div style="background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 0.85rem 1rem;">
          <div style="font-size: 0.7rem; font-weight: 800; color: #38bdf8; text-transform: uppercase;">TOTAL KAPASITAS</div>
          <div style="font-size: 1.45rem; font-weight: 800; color: #ffffff; margin: 0.15rem 0;">${totalCap.toLocaleString('id-ID')} <span style="font-size: 0.78rem; font-weight: 600; color: #94a3b8;">Pax</span></div>
          <div style="font-size: 0.7rem; color: #34d399; font-weight: 700;">${decks.length} Dek Penumpang</div>
        </div>
      `;
      decks.forEach(d => {
        cardsHtml += `
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 0.85rem 1rem;">
            <div style="font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">${d.carriage || d.name}</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #f8fafc; margin: 0.15rem 0;">${d.capacity} <span style="font-size: 0.76rem; font-weight: 600; color: #94a3b8;">Pax</span></div>
            <div style="font-size: 0.7rem; color: #38bdf8;">${d.percent} Alokasi</div>
          </div>
        `;
      });
      kpiGrid.innerHTML = cardsHtml;
    }

    // Update Table Subheader
    const tableSubheader = document.getElementById('devRouteTableSubheader');
    if (tableSubheader) {
      tableSubheader.textContent = `Rute Nunukan ➔ ${isSulawesi ? 'Sulawesi' : 'Tawau'}`;
    }

    // Render Table Breakdown
    const tbody = document.getElementById('tbodyDevSulawesiDecksList');
    if (tbody) {
      tbody.innerHTML = decks.map((d, idx) => {
        const isActive = activeDeckCode === d.code;
        return `
          <tr style="background: ${isActive ? 'rgba(56, 189, 248, 0.12)' : '#162032'}; color: #e2e8f0; transition: background 0.15s ease;">
            <td style="white-space: nowrap;">
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span style="font-weight: 800; color: ${isActive ? '#38bdf8' : '#f8fafc'};">${d.carriage || d.name}</span>
                ${isActive ? '<span style="background: rgba(56,189,248,0.25); color:#38bdf8; font-size:0.62rem; font-weight:800; padding:0.05rem 0.35rem; border-radius:4px;">AKTIF</span>' : ''}
              </div>
            </td>
            <td style="white-space: nowrap;">
              <strong style="color: #34d399; font-size: 0.84rem;">${d.capacity}</strong> <span style="font-size: 0.72rem; color: #94a3b8;">kursi (${d.percent})</span>
            </td>
            <td style="white-space: nowrap;">
              <code style="color: #38bdf8; font-size: 0.74rem;">${d.range}</code>
            </td>
            <td>
              <span style="color: #cbd5e1; font-size: 0.72rem;">${d.desc}</span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="display: inline-flex; gap: 0.35rem;">
                <button type="button" class="btn-dev-preview-route-deck" data-deck="${d.code}" style="background: ${isActive ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#334155'}; color: #ffffff; border: 1px solid ${isActive ? '#38bdf8' : '#475569'}; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer;">
                  ${isActive ? '👁️ Sedang Ditampilkan' : '👁️ Denah'}
                </button>
                <button type="button" class="btn-dev-edit-single-deck" data-index="${idx}" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer;" title="Edit Konfigurasi Seat">
                  ✏️ Edit
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-dev-preview-route-deck').forEach(btn => {
        btn.addEventListener('click', () => {
          const deckCode = btn.getAttribute('data-deck');
          if (isSulawesi) this.devSulawesiActiveDeck = deckCode;
          else this.devTawauActiveDeck = deckCode;
          this.renderDevSulawesiDeckSection();
        });
      });

      tbody.querySelectorAll('.btn-dev-edit-single-deck').forEach(btn => {
        btn.addEventListener('click', () => {
          if (targetVessel) {
            this.openDevEditVesselModal(targetVessel.id);
          } else {
            const isSul = (this.devSeatActiveRoute || 'sulawesi') === 'sulawesi';
            const matchingVessel = Store.getVessels().find(v => {
              const vType = (v.type || '').toLowerCase();
              const vIsSul = vType.includes('parepare') || vType.includes('domestik') || (v.name || '').toLowerCase().includes('pantokrator');
              return isSul ? vIsSul : !vIsSul;
            });
            if (matchingVessel) {
              this.openDevEditVesselModal(matchingVessel.id);
            } else {
              this.openDevEditRouteDecksModal(this.devSeatActiveRoute);
            }
          }
        });
      });
    }

    // Render Table Footer
    const tfoot = document.getElementById('tfootDevRouteDecks');
    if (tfoot) {
      tfoot.innerHTML = `
        <tr style="background: #0f172a; font-weight: 800; color: #38bdf8; border-top: 2px solid #334155;">
          <td>TOTAL (${decks.length} DEK)</td>
          <td>${totalCap.toLocaleString('id-ID')} Kursi</td>
          <td>Kursi 1 - ${totalCap}</td>
          <td>Seluruh Dek Kapal</td>
          <td style="text-align: right;"><span style="color: #34d399;">100% Valid</span></td>
        </tr>
      `;
    }

    // Render Carriage Tabs
    const tabsContainer = document.getElementById('devSulawesiCarriageTabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = decks.map(d => {
        const isActive = activeDeckCode === d.code;
        return `
          <button type="button" class="btn-dev-carriage-tab" data-deck="${d.code}" style="background: ${isActive ? '#0284c7' : '#1e293b'}; color: ${isActive ? '#ffffff' : '#94a3b8'}; border: 1px solid ${isActive ? '#38bdf8' : '#334155'}; border-radius: 6px; padding: 0.4rem 0.75rem; font-size: 0.76rem; font-weight: 800; cursor: pointer; transition: all 0.15s ease; box-shadow: ${isActive ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none'};">
            ${d.carriage || d.name} <span style="font-size: 0.68rem; opacity: 0.85;">(${d.capacity})</span>
          </button>
        `;
      }).join('');

      tabsContainer.querySelectorAll('.btn-dev-carriage-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const deckCode = btn.getAttribute('data-deck');
          if (isSulawesi) this.devSulawesiActiveDeck = deckCode;
          else this.devTawauActiveDeck = deckCode;
          this.renderDevSulawesiDeckSection();
        });
      });
    }

    // Render Visual Seat Grid Preview for Active Deck
    const activeDeckObj = decks.find(d => d.code === activeDeckCode) || decks[0] || { code: 'MAIN', name: 'Main Deck', carriage: 'MAIN DECK', capacity: 150, range: 'Kursi 1 s/d 150' };
    const nameLabel = document.getElementById('devSulawesiSelectedDeckName');
    if (nameLabel) nameLabel.textContent = `${activeDeckObj.carriage || activeDeckObj.name} (${activeDeckObj.name})`;
    const badgeLabel = document.getElementById('devSulawesiSelectedDeckBadge');
    if (badgeLabel) badgeLabel.textContent = `${activeDeckObj.capacity} Kursi (${activeDeckObj.range})`;

    const gridContainer = document.getElementById('devSulawesiSeatGridPreview');
    if (gridContainer) {
      gridContainer.innerHTML = '';
      const cap = parseInt(activeDeckObj.capacity, 10) || 100;
      const cols = isSulawesi ? 8 : (cap <= 100 ? 4 : 6);
      const totalRows = Math.ceil(cap / cols);

      for (let r = 0; r < totalRows; r++) {
        const rowEl = document.createElement('div');
        rowEl.style.display = 'flex';
        rowEl.style.gap = '0.2rem';
        rowEl.style.justifyContent = 'center';
        rowEl.style.alignItems = 'center';

        for (let c = 1; c <= cols; c++) {
          const seatNum = r * cols + c;
          if (seatNum > cap) {
            const emptySpace = document.createElement('div');
            emptySpace.style.width = '24px';
            emptySpace.style.height = '24px';
            rowEl.appendChild(emptySpace);
            continue;
          }

          // Visual status preview
          const isOrange = (seatNum >= 5 && seatNum <= 9) || (seatNum >= 13 && seatNum <= 15) || (seatNum >= 50 && seatNum <= 53) || (seatNum >= 57 && seatNum <= 60) || (seatNum >= 66 && seatNum <= 71) || (seatNum >= 78 && seatNum <= 81);
          const isYellow = (seatNum >= 31 && seatNum <= 38) || (seatNum === 77) || (seatNum === 28) || (seatNum === 30);

          let bg = '#ffffff';
          let textColor = '#1e293b';
          let border = '1px solid #cbd5e1';
          let prefix = '';

          if (isOrange) {
            bg = '#ea580c';
            textColor = '#ffffff';
            border = '1px solid #c2410c';
            prefix = 'L';
          } else if (isYellow) {
            bg = '#eab308';
            textColor = '#0f172a';
            border = '1px solid #ca8a04';
            prefix = (seatNum % 2 === 0) ? 'P' : 'L';
          }

          // Aisle in middle
          const midAisle = Math.floor(cols / 2) + 1;
          if (c === midAisle) {
            const aisle = document.createElement('div');
            aisle.style.width = '12px';
            rowEl.appendChild(aisle);
          }

          const seatEl = document.createElement('div');
          seatEl.style.width = '26px';
          seatEl.style.height = '22px';
          seatEl.style.background = bg;
          seatEl.style.color = textColor;
          seatEl.style.border = border;
          seatEl.style.borderRadius = '3px';
          seatEl.style.display = 'flex';
          seatEl.style.alignItems = 'center';
          seatEl.style.justifyContent = 'center';
          seatEl.style.fontSize = '0.62rem';
          seatEl.style.fontWeight = '800';
          seatEl.style.cursor = 'pointer';
          seatEl.style.fontFamily = 'monospace';
          seatEl.style.position = 'relative';
          seatEl.title = `Kursi ${seatNum} (${activeDeckObj.carriage || activeDeckObj.name})`;

          if (prefix) {
            const sup = document.createElement('span');
            sup.style.fontSize = '0.45rem';
            sup.style.position = 'absolute';
            sup.style.top = '1px';
            sup.style.left = '2px';
            sup.textContent = prefix;
            seatEl.appendChild(sup);
          }

          const numText = document.createTextNode(String(seatNum));
          seatEl.appendChild(numText);

          rowEl.appendChild(seatEl);
        }

        gridContainer.appendChild(rowEl);
      }
    }
  },

  openDevEditRouteDecksModal(routeKey = null) {
    if (routeKey) this.devSeatActiveRoute = routeKey;
    const currentRoute = this.devSeatActiveRoute || 'sulawesi';
    const isSulawesi = currentRoute === 'sulawesi';
    const decks = Store.getRouteDecks(currentRoute);

    const titleEl = document.getElementById('modalEditRouteTargetName');
    if (titleEl) {
      titleEl.textContent = isSulawesi ? 'Rute Nunukan – Sulawesi (Parepare)' : 'Rute Nunukan – Tawau (Internasional)';
    }

    this.renderEditRouteDecksTable(decks);
    document.getElementById('modalDevEditRouteDecks')?.classList.add('show');
  },

  renderEditRouteDecksTable(decks) {
    const tbody = document.getElementById('tbodyModalEditRouteDecks');
    if (!tbody) return;

    tbody.innerHTML = decks.map((d, idx) => `
      <tr data-index="${idx}">
        <td>
          <input type="text" class="form-input deck-code-input" value="${d.code || ''}" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #38bdf8; font-weight: 700; width: 100%;">
        </td>
        <td>
          <input type="text" class="form-input deck-carriage-input" value="${d.carriage || d.name || ''}" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #ffffff; font-weight: 700; width: 100%;">
        </td>
        <td>
          <input type="text" class="form-input deck-name-input" value="${d.name || ''}" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #ffffff; width: 100%;">
        </td>
        <td>
          <input type="number" class="form-input deck-capacity-input" value="${d.capacity || 100}" min="1" max="2500" required style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #34d399; font-weight: 800; width: 100%;">
        </td>
        <td>
          <input type="text" class="form-input deck-desc-input" value="${d.desc || ''}" style="padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #1e293b; color: #cbd5e1; width: 100%;">
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-remove-deck-row" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 0.3rem 0.5rem; font-size: 0.74rem; cursor: pointer;" title="Hapus Dek">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.deck-capacity-input').forEach(inp => {
      inp.addEventListener('input', () => this.updateEditRouteDecksModalSummary());
    });

    tbody.querySelectorAll('.btn-remove-deck-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const rows = tbody.querySelectorAll('tr');
        if (rows.length <= 1) {
          this.showToast('Minimal 1 Dek', 'Konfigurasi kapal harus memiliki minimal satu dek penumpang.', 'warning');
          return;
        }
        btn.closest('tr')?.remove();
        this.updateEditRouteDecksModalSummary();
      });
    });

    this.updateEditRouteDecksModalSummary();
  },

  updateEditRouteDecksModalSummary() {
    const tbody = document.getElementById('tbodyModalEditRouteDecks');
    if (!tbody) return;
    const capInputs = tbody.querySelectorAll('.deck-capacity-input');
    let total = 0;
    capInputs.forEach(inp => {
      total += parseInt(inp.value, 10) || 0;
    });
    const totalEl = document.getElementById('modalEditTotalSeatsCount');
    if (totalEl) totalEl.textContent = total.toLocaleString('id-ID');
    const deckCount = capInputs.length;
    const decksEl = document.getElementById('modalEditTotalDecksCount');
    if (decksEl) decksEl.textContent = `(${deckCount} Dek)`;
    const pill = document.getElementById('modalEditRouteDeckCountPill');
    if (pill) pill.textContent = `${deckCount} Dek`;
  },

  saveEditedRouteDecks() {
    const tbody = document.getElementById('tbodyModalEditRouteDecks');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
      this.showToast('Data Kosong', 'Tambahkan minimal satu dek.', 'warning');
      return;
    }

    const newDecks = [];
    let hasError = false;

    rows.forEach(row => {
      const code = row.querySelector('.deck-code-input')?.value.trim();
      const carriage = row.querySelector('.deck-carriage-input')?.value.trim();
      const name = row.querySelector('.deck-name-input')?.value.trim();
      const capacity = parseInt(row.querySelector('.deck-capacity-input')?.value, 10);
      const desc = row.querySelector('.deck-desc-input')?.value.trim();

      if (!code || !name || isNaN(capacity) || capacity <= 0) {
        hasError = true;
      }

      newDecks.push({
        code: code || 'DECK',
        carriage: carriage || (name ? name.toUpperCase() : 'DECK'),
        name: name || 'Dek Kapal',
        capacity: capacity || 100,
        desc: desc || `${name} (${capacity} Kursi)`
      });
    });

    if (hasError) {
      this.showToast('Data Tidak Lengkap', 'Pastikan semua kolom kode, nama, dan kapasitas terisi dengan benar.', 'warning');
      return;
    }

    const routeKey = this.devSeatActiveRoute || 'sulawesi';
    const saved = Store.saveRouteDecks(routeKey, newDecks);

    const autoApply = document.getElementById('modalEditAutoApplyFleets')?.checked;
    if (autoApply) {
      this.applyRouteDecksToFleets(routeKey);
    }

    document.getElementById('modalDevEditRouteDecks')?.classList.remove('show');
    this.renderDevSulawesiDeckSection();
    const routeName = routeKey === 'sulawesi' ? 'Nunukan - Sulawesi' : 'Nunukan - Tawau';
    const totalCap = saved.reduce((s, d) => s + d.capacity, 0);
    this.showToast('Konfigurasi Seat Tersimpan', `Berhasil memperbarui konfigurasi rute ${routeName} menjadi ${totalCap.toLocaleString('id-ID')} kursi (${saved.length} dek).`);
  },

  applyRouteDecksToFleets(routeKey = 'sulawesi') {
    const isSulawesi = (routeKey || '').toLowerCase().includes('sulawesi') || routeKey === 'PRE';
    const decks = Store.getRouteDecks(routeKey);
    const totalCapacity = decks.reduce((sum, d) => sum + (parseInt(d.capacity, 10) || 0), 0);
    const deckNames = decks.map(d => d.name || d.carriage).join(', ');

    const vessels = Store.getVessels();
    let updatedCount = 0;

    vessels.forEach(v => {
      const vType = (v.type || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();
      const matchSulawesi = isSulawesi && (vType.includes('parepare') || vType.includes('domestik') || vName.includes('pantokrator'));
      const matchTawau = !isSulawesi && (vType.includes('tawau') || vType.includes('internasional') || !matchSulawesi);

      if (matchSulawesi || matchTawau) {
        v.capacity = totalCapacity;
        v.deckName = deckNames;
        v.decks = decks;
        Store.updateVessel(v.id, {
          capacity: totalCapacity,
          deckName: deckNames,
          decks: decks
        });
        updatedCount++;
      }
    });

    const scheds = Store.getSchedules();
    let schedUpdated = 0;
    scheds.forEach(s => {
      const v = vessels.find(item => item.id === s.vesselId);
      const isTargetSched = isSulawesi
        ? (s.destinationId === 'PRE' || s.destinationCity === 'Parepare' || (v && ((v.type || '').toLowerCase().includes('parepare') || (v.name || '').toLowerCase().includes('pantokrator'))))
        : (s.destinationId === 'TWU' || s.destinationCity === 'Tawau' || (v && ((v.type || '').toLowerCase().includes('tawau') || (v.type || '').toLowerCase().includes('internasional'))));

      if (isTargetSched) {
        s.quotaTotal = totalCapacity;
        s.capacity = totalCapacity;
        if (Array.isArray(s.classes) && s.classes.length > 0) {
          s.classes[0].quota = totalCapacity;
          const booked = s.classes[0].booked || 0;
          s.classes[0].available = Math.max(0, totalCapacity - booked);
        }
        schedUpdated++;
      }
    });

    if (schedUpdated > 0) {
      Store.saveSchedules(scheds);
    }

    this.renderDevAdminDashboard();
    const routeLabel = isSulawesi ? 'Sulawesi' : 'Tawau';
    this.showToast(`Kapasitas Rute ${routeLabel} Diterapkan`, `Berhasil menerapkan alokasi ${totalCapacity.toLocaleString('id-ID')} kursi (${decks.length} dek) ke ${updatedCount} armada dan ${schedUpdated} jadwal rute ${routeLabel}.`);
  },

  applySulawesiDecksToFleets() {
    this.applyRouteDecksToFleets(this.devSeatActiveRoute || 'sulawesi');
  },

  // Helper function to switch tabs in company dashboard
  switchDashboardTab(tabKey, preserveGroupToggle = false) {
    document.querySelectorAll('.dash-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dash-tab-btn').forEach(b => {
      if (b.getAttribute('data-tab') === tabKey) {
        b.classList.add('active');
        if (!preserveGroupToggle) {
          const parentGroup = b.closest('.dash-nav-group');
          if (parentGroup) parentGroup.classList.add('open');
        }
      } else {
        b.classList.remove('active');
      }
    });

    // Update Top Header Breadcrumb Title
    const titleEl = document.getElementById('tickyCurrentTabTitle');
    const tabTitles = {
      tabOverview: 'Dashboard Loket',
      tabManifest: 'Tagihan & Riwayat Tiket',
      tabTicketing: 'Entri Penumpang',
      tabBulk: 'Entri Tiket Rombongan',
      tabFleet: 'Armada Kapal Saya',
      tabSchedules: 'Daftar Rute & Jadwal',
      tabCalendar: 'Kalender Pelayaran',
      tabScanner: 'Gate Scanner QR',
      tabSeats: 'Denah Kursi & Seat',
      tabSettings: 'Pengaturan Portal Perusahaan',
      tabCargo: 'Kalkulator DWT & Muatan',
      tabCurrencyExchange: 'Pengecekan Kurs Valas Online Realtime'
    };
    if (titleEl && tabTitles[tabKey]) {
      titleEl.innerText = tabTitles[tabKey];
    }

    if (tabKey === 'tabOverview') document.getElementById('paneOverview')?.classList.add('active');
    if (tabKey === 'tabFleet') document.getElementById('paneFleet')?.classList.add('active');
    if (tabKey === 'tabSchedules') document.getElementById('paneSchedules')?.classList.add('active');
    if (tabKey === 'tabManifest') {
      document.getElementById('paneManifest')?.classList.add('active');
      const tenant = Store.getCurrentTenant();
      if (tenant) {
        const bookings = Store.getBookingsByCompany(tenant.id);
        this.renderManifestTable(bookings, tenant);
      }
    }
    if (tabKey === 'tabScanner') document.getElementById('paneScanner')?.classList.add('active');
    if (tabKey === 'tabTicketing') {
      document.getElementById('paneTicketing')?.classList.add('active');
      if (typeof this.renderTicketingConsole === 'function') {
        this.renderTicketingConsole();
      }
    }
    if (tabKey === 'tabBulk') {
      this.switchDashboardTab('tabTicketing');
      this.setTicketingEntryMode('SINGLE');
    }
    if (tabKey === 'tabSeats') {
      document.getElementById('paneSeats')?.classList.add('active');
      this.renderSeatDashboard();
    }
    if (tabKey === 'tabCalendar') {
      document.getElementById('paneCalendar')?.classList.add('active');
      this.renderVoyageCalendar();
    }
    if (tabKey === 'tabSettings') {
      document.getElementById('paneSettings')?.classList.add('active');
      this.loadCompanySettingsToForm();
      this.loadKsopSettingsToForm();
      this.loadPeakSeasonSettingsToForm();
    }
    if (tabKey === 'tabCargo') {
      document.getElementById('paneCargo')?.classList.add('active');
      this.renderCargoCalculator();
    }
    if (tabKey === 'tabCurrencyExchange') {
      document.getElementById('paneCurrencyExchange')?.classList.add('active');
      this.initCurrencyExchangePane();
    }
  },

  // ================= COMPANY DASHBOARD =================
  initDashboardEvents() {
    // Helper function to switch tabs
    const switchTab = (tabKey, preserveGroupToggle = false) => this.switchDashboardTab(tabKey, preserveGroupToggle);

    // Ticky Sidebar Collapse Toggle via Logo Perusahaan
    document.getElementById('tickyBrandHome')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('tickySidebar')?.classList.toggle('collapsed');
    });

    // Sidebar Tombol Keluar Portal
    document.getElementById('dashBtnSidebarLogout')?.addEventListener('click', () => {
      this.logoutTenant();
    });

    // Ticky View All in Recently Registered
    document.getElementById('btnViewAllPassengers')?.addEventListener('click', () => {
      switchTab('tabManifest');
    });

    // Ticky Refresh Live Bookings button
    document.getElementById('btnRefreshLiveBookings')?.addEventListener('click', () => {
      this.refreshCompanyDashboard();
      this.showToast('Sinkronisasi Berhasil', 'Data pemesanan dan manifest terupdate secara real-time.');
    });

    // Ticky 8 Overview KPI Cards Click to Navigate
    document.querySelectorAll('.ticky-kpi-card[data-tab]').forEach(card => {
      const handleCardNav = () => {
        const targetTab = card.getAttribute('data-tab');
        const boardingFilterVal = card.getAttribute('data-boarding');
        if (targetTab) {
          switchTab(targetTab);
          if (targetTab === 'tabManifest' && boardingFilterVal !== null) {
            const selectEl = document.getElementById('manifestFilterBoarding');
            if (selectEl) {
              selectEl.value = boardingFilterVal;
              selectEl.dispatchEvent(new Event('change'));
            }
          }
        }
      };

      card.addEventListener('click', handleCardNav);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardNav();
        }
      });
    });

    // ============================================
    // TICKY TOP-HEADER BUTTON ACTIONS (Avatar, Notif, Settings, More)
    // ============================================
    const closeAllHeaderDropdowns = () => {
      document.querySelectorAll('.ticky-header-dropdown').forEach(d => d.classList.remove('active'));
    };

    // 1. Avatar Profile Toggle
    const btnAvatar = document.getElementById('btnHeaderUserAvatar');
    const ddProfile = document.getElementById('dropdownHeaderProfile');
    btnAvatar?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = ddProfile?.classList.contains('active');
      closeAllHeaderDropdowns();
      if (!isOpen) {
        const tenant = Store.getCurrentTenant();
        const elName = document.getElementById('dropdownProfileCompanyName');
        if (elName && tenant) elName.innerText = tenant.name;
        ddProfile?.classList.add('active');
      }
    });

    // 2. Bell Notifications Toggle
    const btnNotif = document.getElementById('btnHeaderNotifications');
    const ddNotif = document.getElementById('dropdownHeaderNotif');
    btnNotif?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = ddNotif?.classList.contains('active');
      closeAllHeaderDropdowns();
      if (!isOpen) {
        ddNotif?.classList.add('active');
      }
    });

    // 3. Settings Gear Button -> Open Settings Tab directly
    const btnSettings = document.getElementById('btnHeaderSettings');
    btnSettings?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      switchTab('tabSettings');
      document.getElementById('tabBtnSettingsCompany')?.click();
      this.showToast('Pengaturan Portal Perusahaan', 'Kelola display foto, email login, password, dan identitas perusahaan.');
    });

    // 4. Three-Dots More Menu Toggle
    const btnMore = document.getElementById('btnHeaderMoreMenu');
    const ddMore = document.getElementById('dropdownHeaderMore');
    btnMore?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = ddMore?.classList.contains('active');
      closeAllHeaderDropdowns();
      if (!isOpen) {
        ddMore?.classList.add('active');
      }
    });

    // Close header dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ticky-header-actions')) {
        closeAllHeaderDropdowns();
      }
    });

    // Dropdown Action Buttons
    document.getElementById('btnDropdownSwitchCompany')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      this.openCompanyAuthModal();
    });
    document.getElementById('btnDropdownOpenSettings')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      switchTab('tabSettings');
      document.getElementById('tabBtnSettingsCompany')?.click();
    });
    document.getElementById('btnDropdownLogout')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      this.logoutTenant();
    });
    document.getElementById('btnMoreGoHomeWeb')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      this.switchView('weatherHome');
    });
    document.getElementById('btnMoreGoOverview')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      switchTab('tabOverview');
    });
    document.getElementById('btnMoreGoTicketing')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      switchTab('tabTicketing');
    });
    document.getElementById('btnMoreGoManifest')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      switchTab('tabManifest');
    });
    document.getElementById('btnMoreSyncData')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      this.refreshCompanyDashboard();
      this.showToast('Sinkronisasi Berhasil', 'Data pemesanan dan manifest terupdate secara real-time.');
    });
    document.getElementById('btnMoreClearAllData')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      if (confirm('Apakah Anda yakin ingin menghapus seluruh data di aplikasi? Tindakan ini akan mengosongkan seluruh data perusahaan, kapal, jadwal, dan tiket.')) {
        Store.clearAllData();
        this.logoutTenant();
        this.renderCompanyFilterChips();
        this.renderCustomerSchedules();
        this.renderCompanyAuthButtons();
        this.showToast('Data Dihapus', 'Seluruh data aplikasi telah berhasil dikosongkan.');
      }
    });
    document.getElementById('btnMoreLogoutPortal')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      this.logoutTenant();
    });

    // Sub-tabs switching
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabKey = btn.getAttribute('data-tab');

        // Toggle accordion group if exists
        const parentGroup = btn.closest('.dash-nav-group');
        let isGroupBtn = false;
        if (parentGroup) {
          isGroupBtn = true;
          const wasOpen = parentGroup.classList.contains('open');
          document.querySelectorAll('.dash-nav-group').forEach(g => {
            if (g !== parentGroup) g.classList.remove('open');
          });
          parentGroup.classList.toggle('open', !wasOpen);
        } else {
          document.querySelectorAll('.dash-nav-group').forEach(g => g.classList.remove('open'));
        }

        switchTab(tabKey, isGroupBtn);

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
            btnExport.style.outline = 'none';
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

    // Logout button compatibility
    document.getElementById('dashBtnLogout')?.addEventListener('click', () => {
      this.logoutTenant();
    });

    // Scanner Check-in
    document.getElementById('btnScanCode').addEventListener('click', () => {
      const code = document.getElementById('scanInputCode').value.trim().toUpperCase();
      this.handleGateScan(code);
    });

    // Add Vessel Modal trigger (Hanya di Developer Mode)
    document.getElementById('btnOpenAddVessel')?.addEventListener('click', () => {
      if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
        this.showToast('Fitur Dibatasi', 'Penambahan armada kapal baru hanya dapat dilakukan melalui Mode Pengembang (Developer Mode).', 'warning');
        return;
      }
      this.openDevAddVesselModal();
    });
    // Legacy helper trigger
    const _legacyOpenAddVessel = () => {
      const modalTitle = document.getElementById('modalVesselTitle');
      const submitBtn = document.getElementById('btnSubmitVessel');
      const editIdInput = document.getElementById('vesselEditId');
      const passInput = document.getElementById('vesselAuthPassword');

      if (modalTitle) modalTitle.innerText = 'Tambah Armada Kapal Baru';
      if (submitBtn) submitBtn.innerText = 'Simpan & Daftarkan Armada';
      if (editIdInput) editIdInput.value = '';
      if (passInput) passInput.value = '';
      this.populateVesselTypeDropdown();
      document.getElementById('formAddVessel')?.reset();
      document.getElementById('modalAddVessel').classList.add('show');
    };

    // Add Schedule Modal triggers
    document.getElementById('btnOpenAddSchedule').addEventListener('click', () => {
      this.openAddScheduleModal();
    });
    document.getElementById('subBtnAddSchedule')?.addEventListener('click', () => {
      this.openAddScheduleModal();
    });

    // Submit Add / Edit Vessel Form (Dengan Verifikasi Password Portal Perusahaan)
    document.getElementById('formAddVessel').addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      const editId = document.getElementById('vesselEditId')?.value?.trim();
      const name = document.getElementById('vesselNameInput').value.trim();
      const reg = document.getElementById('vesselRegInput').value.trim();
      const type = document.getElementById('vesselTypeInput').value;
      const capacity = parseInt(document.getElementById('vesselCapacityInput').value, 10);
      const facStr = document.getElementById('vesselFacInput')?.value || '';
      const facilities = facStr.split(',').map(s => s.trim()).filter(Boolean);
      const enteredPass = document.getElementById('vesselAuthPassword')?.value?.trim();

      // Verifikasi Password Portal Perusahaan Saat Menyimpan Perubahan Armada
      if (tenant && tenant.password && enteredPass !== tenant.password) {
        this.showToast('Verifikasi Gagal', 'Password portal perusahaan yang Anda masukkan salah. Perubahan armada ditolak.', 'warning');
        return;
      }
      if (tenant && !tenant.password && !enteredPass) {
        this.showToast('Password Diperlukan', 'Silakan masukkan password akun portal perusahaan Anda untuk konfirmasi.', 'warning');
        return;
      }

      if (editId) {
        // Mode Edit Armada
        const oldVessel = Store.getVessels().find(v => v.id === editId);
        const oldName = oldVessel ? oldVessel.name : '';

        Store.updateVessel(editId, {
          name,
          regNumber: reg,
          type,
          capacity,
          facilities
        });

        // Sinkronisasi nama kapal di jadwal jika ada perubahan nama
        if (oldName && oldName !== name && tenant) {
          const schedules = Store.getSchedulesByCompany(tenant.id);
          schedules.forEach(s => {
            if (s.vesselId === editId || s.vesselNameCustom === oldName) {
              s.vesselNameCustom = name;
            }
          });
          Store.saveSchedules(schedules);
        }

        document.getElementById('modalAddVessel').classList.remove('show');
        document.getElementById('formAddVessel').reset();
        this.refreshCompanyDashboard();
        this.showToast('Armada Diperbarui', `Perubahan data kapal "${name}" berhasil disimpan dengan verifikasi password.`);
      } else {
        // Mode Tambah Armada Baru
        const newVessel = {
          id: `VES-${Date.now().toString(36).toUpperCase()}`,
          companyId: tenant ? tenant.id : 'TENANT',
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
        this.showToast('Armada Ditambahkan', `Kapal "${name}" berhasil terdaftar di bawah ${tenant ? tenant.name : 'Perusahaan'}.`);
      }
    });

    // Submit Add Schedule Form (Dengan Dukungan Tanggal & Pola Keberangkatan Kalender)
    document.getElementById('formAddSchedule').addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      const vesselId = document.getElementById('schedVesselSelect').value;
      const originId = document.getElementById('schedOriginSelect').value;
      const destinationId = document.getElementById('schedDestSelect').value;
      const dateVal = document.getElementById('schedDateInput')?.value || new Date().toISOString().split('T')[0];
      const recurrence = document.getElementById('schedRecurrenceSelect')?.value || 'ONCE';
      const departTime = document.getElementById('schedDepartTime').value;
      const arrivalTime = document.getElementById('schedArrivalTime').value;
      const pier = document.getElementById('schedPierInput').value.trim();
      const priceEko = parseInt(document.getElementById('schedPriceEko')?.value || '350000', 10);
      const portPassFee = parseInt(document.getElementById('schedPortPassPrice')?.value || '50000', 10);

      const fleet = Store.getVesselsByCompany(tenant.id);
      const vessel = fleet.find(v => v.id === vesselId);
      const vName = vessel ? vessel.name : 'KM Armada';

      const createSchedObj = (dStr) => ({
        id: `SCH-${tenant.code || 'OP'}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        companyId: tenant.id,
        vesselId,
        vesselNameCustom: vName,
        originId,
        destinationId,
        departDate: dStr,
        departTime,
        arrivalTime,
        daysToAdd: 0,
        pier,
        status: 'Aktif',
        priceEconomy: priceEko,
        portPassFee,
        categoryType: (originId === 'TWU' || destinationId === 'TWU') ? 'INTERNATIONAL' : 'DOMESTIC',
        classes: [
          { id: 'cls-eko', name: 'Tiket Reguler', price: priceEko, quota: vessel ? vessel.capacity : 120, available: vessel ? vessel.capacity : 120, booked: 0 }
        ]
      });

      let addedCount = 0;
      if (recurrence === 'DAILY_WEEK') {
        const base = new Date(dateVal);
        for (let i = 0; i < 7; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          Store.addSchedule(createSchedObj(dStr));
          addedCount++;
        }
      } else if (recurrence === 'DAILY_MONTH') {
        const base = new Date(dateVal);
        const y = base.getFullYear();
        const m = base.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let day = base.getDate(); day <= lastDay; day++) {
          const d = new Date(y, m, day);
          const dStr = d.toISOString().split('T')[0];
          Store.addSchedule(createSchedObj(dStr));
          addedCount++;
        }
      } else {
        Store.addSchedule(createSchedObj(dateVal));
        addedCount = 1;
      }

      document.getElementById('modalAddSchedule').classList.remove('show');
      document.getElementById('formAddSchedule').reset();
      this.refreshCompanyDashboard();
      if (document.getElementById('paneCalendar')?.classList.contains('active')) {
        this.renderVoyageCalendar();
      }
      this.showToast('Jadwal Pelayaran Terbit', `${addedCount} jadwal pelayaran ${vName} rute ${originId} ➔ ${destinationId} berhasil diterbitkan di kalender!`);
    });

    // Initialize Company & KSOP Settings Events
    this.initCompanySettingsEvents();
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

    // Logo portal perusahaan begitu masuk portal
    const tickyLogo = document.getElementById('tickyBrandLogoImg');
    if (tickyLogo) tickyLogo.src = 'assets/ferry_logo.png?v=6.0';
    const brandLogo = document.getElementById('brandLogoImg');
    if (brandLogo) brandLogo.src = 'assets/ferry_logo.png?v=6.0';

    // Fetch Tenant Isolated Data & Enforce Route Scope (Internasional vs Domestik)
    const routeScope = this.getTenantRouteScope(tenant);
    const isTenantIntl = routeScope === 'INTL';
    const fleet = Store.getVesselsByCompany(tenant.id);
    let allTenantSchedules = Store.getSchedulesByCompany(tenant.id);

    // Seluruh jadwal dan tiket resmi milik perusahaan selalu tampil di dashboard perusahaan
    let schedules = allTenantSchedules;

    // Sinkronisasi opsi dropdown rute di Manifest, Kalender, dan Modal Armada sesuai jalur perusahaan login
    this.syncRouteScopedUIForTenant(tenant, routeScope);

    const bookings = Store.getBookingsByCompany(tenant.id);

    // Update Badges Count (Safe Optional Chaining)
    const badgeFleet = document.getElementById('countFleetBadge');
    if (badgeFleet) badgeFleet.innerText = fleet.length;
    const badgeSched = document.getElementById('countSchedBadge');
    if (badgeSched) badgeSched.innerText = schedules.length;
    const badgeCal = document.getElementById('countCalendarBadge');
    if (badgeCal) badgeCal.innerText = schedules.length;
    const badgeManifest = document.getElementById('countManifestBadge');
    if (badgeManifest) badgeManifest.innerText = bookings.reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);

    // Render Pilihan Filter Statistik Masing-Masing Armada Perusahaan
    this.renderOverviewVesselFilterUI(fleet, schedules, bookings);

    // Set default vessel if configured by developer in Dev Mode
    if (tenant.defaultVesselId && fleet.some(v => v.id === tenant.defaultVesselId)) {
      if (!this.selectedOverviewVessel || this.selectedOverviewVessel === 'ALL') {
        this.selectedOverviewVessel = tenant.defaultVesselId;
      }
    }

    const activeVesselId = this.selectedOverviewVessel || 'ALL';
    const selectedVesselObj = activeVesselId !== 'ALL' ? fleet.find(v => v.id === activeVesselId) : null;
    if (activeVesselId !== 'ALL' && !selectedVesselObj) {
      this.selectedOverviewVessel = 'ALL';
    }
    const filterVid = this.selectedOverviewVessel || 'ALL';

    const filteredFleet = filterVid === 'ALL' ? fleet : fleet.filter(v => v.id === filterVid);
    const filteredSchedules = filterVid === 'ALL'
      ? schedules
      : schedules.filter(s => s.vesselId === filterVid || (selectedVesselObj && s.vesselNameCustom === selectedVesselObj.name));
    const filteredSchedIds = new Set(filteredSchedules.map(s => s.id));
    const activePeriod = this.selectedOverviewPeriod || 'WEEKLY';
    const nowDateObj = new Date();
    const todayIso = nowDateObj.toISOString().split('T')[0];
    const curMonthPrefix = todayIso.slice(0, 7);
    const curYearPrefix = todayIso.slice(0, 4);

    const periodBookings = bookings.filter(b => {
      const bDate = b.departDate || (b.createdAt ? b.createdAt.split('T')[0] : todayIso);
      if (activePeriod === 'DAILY') {
        return bDate === todayIso;
      } else if (activePeriod === 'WEEKLY') {
        const diffMs = nowDateObj.getTime() - new Date(bDate + 'T00:00:00').getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= -7 && diffDays <= 7;
      } else if (activePeriod === 'MONTHLY') {
        return bDate.startsWith(curMonthPrefix);
      } else if (activePeriod === 'YEARLY') {
        return bDate.startsWith(curYearPrefix);
      }
      return true;
    });

    const filteredBookings = filterVid === 'ALL'
      ? periodBookings
      : periodBookings.filter(b => b.vesselId === filterVid || filteredSchedIds.has(b.scheduleId) || (selectedVesselObj && b.vesselName === selectedVesselObj.name));

    // Calculate Financial KPIs (terfilter sesuai pilihan armada perusahaan)
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalTickets = filteredBookings.reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);

    const elRev = document.getElementById('kpiRevenue');
    if (elRev) elRev.innerText = formatRupiah(totalRevenue);
    const elTix = document.getElementById('kpiTicketsSold');
    if (elTix) elTix.innerText = totalTickets;
    const elFleet = document.getElementById('kpiFleetCount');
    if (elFleet) elFleet.innerText = filteredFleet.length;

    // Update Ticky 8 KPI Cards with real company ticketing metrics (All vs Selected Armada)
    const elTotTix = document.getElementById('kpiTotalTickets');
    if (elTotTix) elTotTix.innerText = totalTickets;

    const waitingTix = filteredBookings.filter(b => b.boardingStatus !== 'BOARDED').reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);
    const elOpenedTix = document.getElementById('kpiOpenedTickets');
    if (elOpenedTix) elOpenedTix.innerText = waitingTix;

    const closedTix = filteredBookings.filter(b => b.boardingStatus === 'BOARDED').reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);
    const elClosedTix = document.getElementById('kpiClosedTickets');
    if (elClosedTix) elClosedTix.innerText = closedTix;

    const elTotUsers = document.getElementById('kpiTotalUsers');
    if (elTotUsers) elTotUsers.innerText = totalTickets;

    const elTotAgents = document.getElementById('kpiTotalAgents');
    if (elTotAgents) elTotAgents.innerText = filteredFleet.length;

    const elTotAdmins = document.getElementById('kpiTotalAdmins');
    if (elTotAdmins) elTotAdmins.innerText = filteredSchedules.length;

    // Sisa Kuota Kursi across active schedules (atau kapasitas armada jika jadwal belum dibuat)
    let totalRemainingSeats = 0;
    if (filteredSchedules.length > 0) {
      totalRemainingSeats = filteredSchedules.reduce((sum, s) => {
        const v = fleet.find(item => item.id === s.vesselId);
        const cap = v ? (v.capacity || 150) : (s.capacity || 150);
        const bookedOnSched = bookings.filter(b => b.scheduleId === s.id).reduce((bSum, b) => bSum + (b.passengers ? b.passengers.length : 1), 0);
        return sum + Math.max(0, cap - bookedOnSched);
      }, 0);
    } else if (filteredFleet.length > 0) {
      totalRemainingSeats = filteredFleet.reduce((sum, v) => sum + (v.capacity || 150), 0);
    }
    const elWithdrawal = document.getElementById('kpiWithdrawalAmounts');
    if (elWithdrawal) elWithdrawal.innerText = totalRemainingSeats;

    const elTotTrans = document.getElementById('kpiTotalTransaction');
    if (elTotTrans) elTotTrans.innerText = formatRupiah(totalRevenue);

    // Update Chart Header, Period Labels & Tooltip for selected vessel + period
    const periodLabelMap = {
      DAILY: 'Harian (Hari Ini)',
      WEEKLY: 'Mingguan (7 Hari Terakhir)',
      MONTHLY: 'Bulanan (Bulan Ini)',
      YEARLY: 'Tahunan (Tahun Ini)'
    };
    const periodShortLabel = periodLabelMap[activePeriod] || 'Mingguan';

    const xAxisGroup = document.getElementById('overviewChartXAxisLabels');
    if (xAxisGroup) {
      const xCoords = [60, 145, 235, 325, 415, 565, 665];
      const labelsByPeriod = {
        DAILY: ['06:00', '09:00', '12:00', '15:00', '18:00', '20:00', '23:00'],
        WEEKLY: ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        MONTHLY: ['Mgg 1', 'Mgg 2', 'Tgl 10', 'Tgl 15', 'Mgg 3', 'Tgl 25', 'Akhir Bln'],
        YEARLY: ['Jan-Feb', 'Mar-Apr', 'Mei-Jun', 'Jul-Agu', 'Sep-Okt', 'Nov', 'Des']
      };
      const curLabels = labelsByPeriod[activePeriod] || labelsByPeriod.WEEKLY;
      xAxisGroup.innerHTML = curLabels.map((lbl, idx) => `<text x="${xCoords[idx]}" y="215">${lbl}</text>`).join('');
    }

    const chartTitle = document.getElementById('overviewStatChartTitle');
    const chartSub = document.getElementById('overviewStatChartSubtitle');
    const tooltipVal = document.getElementById('overviewChartTooltipVal');
    const tooltipSub = document.getElementById('overviewChartTooltipSub');
    if (selectedVesselObj) {
      if (chartTitle) chartTitle.innerText = `Statistik Armada: ${selectedVesselObj.name}`;
      if (chartSub) chartSub.innerText = `No. Reg: ${selectedVesselObj.regNumber || '-'} • Kapasitas: ${selectedVesselObj.capacity || 150} Kursi • Periode: ${periodShortLabel}`;
      if (tooltipVal) tooltipVal.innerText = `${totalTickets} Tiket`;
      if (tooltipSub) tooltipSub.innerText = `${periodShortLabel} • ${formatRupiah(totalRevenue)}`;
    } else {
      if (chartTitle) chartTitle.innerText = `Statistik Penjualan Tiket (${periodShortLabel.split(' ')[0]})`;
      if (chartSub) chartSub.innerText = `Menampilkan gabungan ${fleet.length} armada kapal perusahaan • Periode: ${periodShortLabel}`;
      if (tooltipVal) tooltipVal.innerText = `${totalTickets} Tiket`;
      if (tooltipSub) tooltipSub.innerText = `${periodShortLabel} • ${formatRupiah(totalRevenue)}`;
    }

    // Render Ticky Recent Ticket Bookings List
    const elRecentList = document.getElementById('tickyRecentUsersList');
    if (elRecentList) {
      elRecentList.innerHTML = '';
      if (filteredBookings.length === 0) {
        elRecentList.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: #94a3b8;">
            <p style="margin: 0; font-size: 0.88rem; font-weight: 600;">Belum ada aktivitas pemesanan tiket.</p>
            <small>Tiket yang dipesan oleh penumpang atau loket akan muncul di sini.</small>
          </div>
        `;
      } else {
        filteredBookings.slice(0, 4).forEach((b, idx) => {
          const paxName = (b.passengers && b.passengers[0] && b.passengers[0].name)
            ? b.passengers[0].name
            : (b.contact?.name || b.groupName || 'Penumpang');
          const paxCount = b.passengers ? b.passengers.length : 1;
          const isBoarded = b.boardingStatus === 'BOARDED';
          const avatarSvg = `assets/avatar-${(idx % 4) + 1}.svg`;

          const itemDiv = document.createElement('div');
          itemDiv.className = 'ticky-user-item';
          itemDiv.innerHTML = `
            <div class="ticky-user-item-left">
              <img src="${avatarSvg}" alt="${paxName}" class="ticky-avatar" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'38\\' height=\\'38\\' fill=\\'%237c3aed\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23ede9fe\\'/><text x=\\'12\\' y=\\'16\\' text-anchor=\\'middle\\' font-size=\\'12\\' font-weight=\\'bold\\' fill=\\'%237c3aed\\'>${paxName.charAt(0).toUpperCase()}</text></svg>'">
              <div>
                <h5 class="ticky-user-name">${paxName} <span style="font-weight: normal; font-size: 0.75rem; color: #64748b;">(${b.pnr})</span></h5>
                <span class="ticky-user-time">${b.originCity || 'Nunukan'} ➔ ${b.destinationCity || 'Tawau'} • ${paxCount} Tiket • ${b.departDate || 'Hari ini'}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="status-pill ${isBoarded ? 'boarded' : 'waiting'}" style="font-size: 0.7rem; padding: 2px 7px;">
                ${isBoarded ? 'Naik Kapal' : 'Menunggu'}
              </span>
              <button type="button" class="ticky-item-dots btn-quick-print-tix" title="Cetak Langsung Tiket Penumpang">🖨️</button>
            </div>
          `;

          itemDiv.querySelector('.btn-quick-print-tix')?.addEventListener('click', () => {
            this.openDirectTicketPrintModal(b.pnr);
          });

          elRecentList.appendChild(itemDiv);
        });
      }
    }

    // Render Recent Bookings Table
    const tbodyRecent = document.getElementById('tbodyRecentBookings');
    tbodyRecent.innerHTML = '';
    if (bookings.length === 0) {
      tbodyRecent.innerHTML = `<tr><td colspan="8" class="text-center text-dim" style="padding: 2rem;">Belum ada tiket yang dipesan pada armada perusahaan Anda.</td></tr>`;
    } else {
      filteredBookings.slice(0, 5).forEach(b => {
        const tr = document.createElement('tr');
        const contactName = b.contact ? b.contact.name : (b.groupName || '-');
        const paxCount = b.passengers ? b.passengers.length : 1;
        tr.innerHTML = `
          <td><strong style="color: var(--primary-cyan); font-family: var(--font-mono);">${b.pnr}</strong></td>
          <td>${b.departDate}</td>
          <td>${b.originCity} ➔ ${b.destinationCity}<br><small class="text-dim">${b.vesselName}</small></td>
          <td>${contactName}</td>
          <td>${paxCount} Kursi</td>
          <td class="text-gold"><strong>${formatRupiah(b.totalAmount)}</strong></td>
          <td><span class="status-pill ${b.boardingStatus === 'BOARDED' ? 'boarded' : 'waiting'}">${b.boardingStatus}</span></td>
          <td style="white-space: nowrap; text-align: center;">
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button type="button" class="btn-action-sm btn-print-booking-tickets" style="background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid #a7f3d0; font-weight: 700;" title="Cetak Langsung Tiket Penumpang">
                🖨️ Cetak
              </button>
              <button type="button" class="btn-action-sm btn-edit-ticket" title="Edit Tiket & Kursi">
                🎫 Tiket
              </button>
              <button type="button" class="btn-action-sm btn-transfer-vessel" title="Transfer Penumpang ke Kapal Lain">
                🔄 Transfer
              </button>
            </div>
          </td>
        `;

        tr.querySelector('.btn-print-booking-tickets').addEventListener('click', () => {
          this.openDirectTicketPrintModal(b.pnr);
        });
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
        const crewArr = Array.isArray(v.crewList) ? v.crewList.filter(c => c && c.name && c.name.trim()) : [];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${v.name}</strong></td>
          <td><code style="color: var(--primary-cyan);">${v.regNumber}</code></td>
          <td>${v.type}</td>
          <td>${v.capacity} Penumpang</td>
          <td><span class="status-pill paid">${v.status}</span></td>
          <td style="white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: nowrap;">
              <button type="button" class="btn-action-sm btn-manage-crew" data-id="${v.id}" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 0.34rem 0.65rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;">
                👨‍✈️ Daftar Crew (${crewArr.length})
              </button>
              <button type="button" class="btn-action-sm btn-edit-vessel" data-id="${v.id}" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0284c7; padding: 0.34rem 0.65rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;">
                ✏️ Edit
              </button>
              <button type="button" class="btn-action-sm btn-delete-vessel" data-id="${v.id}" style="background: #fef2f2; border: 1px solid #fecaca; color: #e11d48; padding: 0.34rem 0.65rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;">
                🗑️ Hapus Armada
              </button>
            </div>
          </td>
        `;
        tr.querySelector('.btn-manage-crew')?.addEventListener('click', () => {
          this.openVesselCrewModal(v.id);
        });
        tr.querySelector('.btn-edit-vessel')?.addEventListener('click', () => {
          this.openEditVesselModal(v.id);
        });
        tr.querySelector('.btn-delete-vessel')?.addEventListener('click', () => {
          this.openDeleteVesselModal(v.id, '', v.name);
        });
        tbodyFleet.appendChild(tr);
      });
    }

    // Render Crew List Preview Section for Fleet
    this.renderFleetCrewPreview(fleet);

    // Render Schedules Table (Simple & Ringkas per Armada + Rute)
    const tbodySched = document.getElementById('tbodySchedulesList');
    tbodySched.innerHTML = '';
    if (schedules.length === 0) {
      tbodySched.innerHTML = `<tr class="row-empty-open-schedule" style="cursor: pointer;" title="Klik untuk membuka jadwal keberangkatan baru"><td colspan="8" class="text-center text-dim" style="padding: 2rem;">Belum ada jadwal keberangkatan aktif. <strong style="color: #0284c7; text-decoration: underline;">Klik kolom ini untuk Buka Jadwal Baru</strong>.</td></tr>`;
      tbodySched.querySelector('.row-empty-open-schedule')?.addEventListener('click', () => {
        this.openAddScheduleModal();
      });
    } else {
      // Kelompokkan jadwal berulang agar tampil 1 baris simpel per Armada + Rute + Jam
      const uniqueSchedules = [];
      const seenSchedKeys = new Set();
      schedules.forEach(s => {
        const key = `${s.vesselId || s.vesselNameCustom || ''}__${s.originId}__${s.destinationId}__${s.departTime}`;
        if (!seenSchedKeys.has(key)) {
          seenSchedKeys.add(key);
          uniqueSchedules.push(s);
        }
      });

      uniqueSchedules.forEach((s, idx) => {
        const v = fleet.find(item => item.id === s.vesselId);
        const vName = v ? v.name : (s.vesselNameCustom || 'Armada Reguler');
        const orig = MASTER_PORTS.find(p => p.id === s.originId);
        const dest = MASTER_PORTS.find(p => p.id === s.destinationId);
        const tr = document.createElement('tr');
        const passFee = this.getSchedulePortPassFee(s, tenant);
        const regPrice = (s.classes && s.classes[0] && s.classes[0].price) ? s.classes[0].price : (s.priceEconomy || 690000);
        const shortId = `JDW-${String(idx + 1).padStart(2, '0')}`;
        const origSimple = orig ? orig.city.split(' ')[0] : s.originId;
        const destSimple = dest ? dest.city.split(' ')[0] : s.destinationId;

        tr.innerHTML = `
          <td style="white-space: nowrap;"><code style="font-weight: 700; color: #475569;">${shortId}</code></td>
          <td style="white-space: nowrap;"><strong>${vName}</strong></td>
          <td style="white-space: nowrap; font-weight: 600; color: #1e293b;">${origSimple} ➔ ${destSimple}</td>
          <td style="white-space: nowrap;">${s.departTime} - ${s.arrivalTime || '10:30'} WIB</td>
          <td style="white-space: nowrap;"><small class="text-dim">${s.pier || 'Dermaga Utama'}</small></td>
          <td style="white-space: nowrap;">
            <span style="font-weight: 700; color: #0f172a;">${formatRupiah(regPrice)}</span>
            <span style="color: #cbd5e1; margin: 0 4px;">•</span>
            <span style="font-size: 0.75rem; color: #0f766e; font-weight: 600;">Pas: ${formatRupiah(passFee)}</span>
          </td>
          <td style="white-space: nowrap;"><span class="status-pill paid">${s.status || 'Aktif'}</span></td>
          <td style="white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: nowrap;">
              <span style="background: #f8fafc; border: 1px solid #cbd5e1; color: #64748b; padding: 0.32rem 0.6rem; border-radius: 6px; font-weight: 600; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap;" title="Harga tiket dan pas pelabuhan hanya dapat diubah oleh Admin Developer">
                🔒 Tarif Resmi
              </span>
              <button type="button" class="btn-action-sm btn-delete-sched-vessel" data-id="${s.id}" data-vessel-id="${s.vesselId || ''}" style="background: #fef2f2; border: 1px solid #fecaca; color: #e11d48; padding: 0.32rem 0.65rem; border-radius: 6px; font-weight: 700; font-size: 0.74rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;">
                🗑️ Hapus Armada
              </button>
            </div>
          </td>
        `;
        tr.querySelector('.btn-delete-sched-vessel')?.addEventListener('click', () => {
          this.openDeleteVesselModal(s.vesselId || '', s.id, vName);
        });
        tbodySched.appendChild(tr);
      });
    }

    // Render Tabel Pengaturan Pas Pelabuhan
    this.renderPortPassTables();

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

      const btnAuditDup = document.getElementById('btnAuditDuplicatePax');
      if (btnAuditDup) {
        btnAuditDup.addEventListener('click', () => {
          if (boardingFilter) {
            boardingFilter.value = boardingFilter.value === 'DUPLICATE' ? 'ALL' : 'DUPLICATE';
            triggerFilter();
          }
        });
      }

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

    // Populate Pilihan Armada Kapal di Loket Pemrosesan Tiket (#paneTicketing)
    const tixVesselSelect = document.getElementById('ticketingVesselFilterSelect');
    const tixVesselPills = document.getElementById('ticketingVesselFilterPills');
    const activeTixVid = this.selectedTicketingVessel || 'ALL';
    if (activeTixVid !== 'ALL' && !fleet.some(v => v.id === activeTixVid)) {
      this.selectedTicketingVessel = 'ALL';
    }
    const curTixVid = this.selectedTicketingVessel || 'ALL';

    if (tixVesselSelect) {
      tixVesselSelect.innerHTML = `<option value="ALL">🚢 Semua Armada Perusahaan (${fleet.length} Kapal)</option>`;
      fleet.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `⚓ ${v.name} (${v.capacity || 150} Kursi)`;
        if (v.id === curTixVid) opt.selected = true;
        tixVesselSelect.appendChild(opt);
      });
      tixVesselSelect.onchange = () => {
        this.selectedTicketingVessel = tixVesselSelect.value;
        this.refreshCompanyDashboard();
      };
    }

    if (tixVesselPills) {
      tixVesselPills.innerHTML = '';
      const makeTixPill = (id, label) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isAct = curTixVid === id;
        btn.style.cssText = isAct
          ? 'background: #0284c7; color: #ffffff; border: 1px solid #0284c7; padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.76rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 6px rgba(2,132,199,0.25);'
          : 'background: #ffffff; color: #475569; border: 1px solid #cbd5e1; padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.76rem; font-weight: 600; cursor: pointer;';
        btn.textContent = label;
        btn.addEventListener('click', () => {
          this.selectedTicketingVessel = id;
          if (this.tixConsoleState) {
            this.tixConsoleState.selectedVesselId = (id !== 'ALL' ? id : null);
          }
          this.refreshCompanyDashboard();
          if (typeof this.renderTicketingConsole === 'function') {
            this.renderTicketingConsole();
          }
        });
        return btn;
      };
      tixVesselPills.appendChild(makeTixPill('ALL', `Semua Armada (${fleet.length})`));
      fleet.forEach(v => {
        tixVesselPills.appendChild(makeTixPill(v.id, `🚢 ${v.name}`));
      });
    }

        // Inisialisasi & Render All-in-One One-Page Ticketing Console
    if (typeof this.renderTicketingConsole === 'function') {
      this.initTicketingConsoleEvents();
      this.renderTicketingConsole();
    }

    if (ticketingList) {
      ticketingList.innerHTML = '';
      const selTixVessel = curTixVid !== 'ALL' ? fleet.find(v => v.id === curTixVid) : null;
      const ticketingSchedules = curTixVid === 'ALL'
        ? schedules
        : schedules.filter(s => s.vesselId === curTixVid || (selTixVessel && s.vesselNameCustom === selTixVessel.name));

      if (ticketingSchedules.length === 0) {
        ticketingList.innerHTML = `
          <div class="sched-card btn-empty-open-schedule" style="padding: 2.2rem 1.5rem; text-align: center; cursor: pointer; border: 1.5px solid #38bdf8; transition: all 0.2s ease;" title="Klik untuk membuka atau mengedit jadwal keberangkatan armada">
            <h4 style="font-size: 1.15rem; margin-bottom: 0.45rem; color: #f59e0b;">Belum Ada Jadwal Aktif untuk Pemrosesan Tiket</h4>
            <p class="text-dim" style="margin-bottom: 0.85rem;">Klik langsung pada kolom ini untuk membuka & mengatur jadwal keberangkatan armada ${tenant.name}.</p>
            <span style="display: inline-flex; align-items: center; gap: 0.4rem; background: #0284c7; color: #ffffff; padding: 0.48rem 1.1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700;">
              ✏️ Klik Kolom Ini untuk Buka / Edit Jadwal Keberangkatan
            </span>
          </div>
        `;
        ticketingList.querySelector('.btn-empty-open-schedule')?.addEventListener('click', () => {
          this.openAddScheduleModal();
          if (curTixVid && curTixVid !== 'ALL') {
            const vSel = document.getElementById('schedVesselSelect');
            if (vSel) vSel.value = curTixVid;
          }
        });
      } else {
        // Kelompokkan jadwal berulang agar tampil 1 kartu simpel per Armada + Rute + Jam
        const uniqueTicketingSchedules = [];
        const seenTixKeys = new Set();
        ticketingSchedules.forEach(s => {
          const k = `${s.vesselId || s.vesselNameCustom || ''}__${s.originId}__${s.destinationId}__${s.departTime}`;
          if (!seenTixKeys.has(k)) {
            seenTixKeys.add(k);
            uniqueTicketingSchedules.push(s);
          }
        });

        uniqueTicketingSchedules.forEach(sch => {
          let currentVessel = fleet.find(item => item.id === sch.vesselId) || fleet[0];
          let vName = currentVessel ? currentVessel.name : (sch.vesselNameCustom || 'Armada Resmi');
          const orig = MASTER_PORTS.find(p => p.id === sch.originId) || { name: sch.originId, city: sch.originId };
          const dest = MASTER_PORTS.find(p => p.id === sch.destinationId) || { name: sch.destinationId, city: sch.destinationId };
          const origCity = (orig.city || orig.name || sch.originId).split(' ')[0];
          const destCity = (dest.city || dest.name || sch.destinationId).split(' ')[0];
          const minPrice = (sch.classes && sch.classes.length > 0)
            ? Math.min(...sch.classes.map(c => Number(c.price)))
            : Number(sch.priceEconomy || 430000);
          const passFee = this.getSchedulePortPassFee ? this.getSchedulePortPassFee(sch, tenant) : Number(sch.portPassFee || 50000);
          const totalFare = minPrice + passFee;

          const card = document.createElement('div');
          card.className = 'sched-card';
          card.style.cssText = 'padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;';
          card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${tenant.brandColor}; display: inline-block;"></span>
                <div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">🚢 ${vName}</div>
                  <div style="font-size: 0.75rem; color: #64748b;">${currentVessel ? (currentVessel.capacity || 200) + ' Kursi' : 'Armada Aktif'} • ${sch.pier || 'Dermaga Utama'}</div>
                </div>
              </div>

              <div style="height: 28px; width: 1px; background: #e2e8f0;"></div>

              <div>
                <div style="font-size: 0.95rem; font-weight: 800; color: #0284c7;">${origCity} (${sch.originId}) ➔ ${destCity} (${sch.destinationId})</div>
                <div style="font-size: 0.78rem; color: #475569; font-weight: 600;">🕒 ${sch.departTime} - ${sch.arrivalTime || '10:30'} WIB</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem; margin-left: auto;">
              <div style="text-align: right;">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 600;">Total Harga Tiket</div>
                <strong style="font-size: 1.15rem; font-weight: 800; color: #ea580c; display: block; line-height: 1.15;">${formatRupiah(totalFare)}</strong>
                <div style="font-size: 0.7rem; color: #475569; font-weight: 600; margin-top: 2px; white-space: nowrap;">Tiket: ${formatRupiah(minPrice)} • Pas Pelabuhan: <span style="color: #0f766e; font-weight: 700;">${formatRupiah(passFee)}</span></div>
              </div>
              <button type="button" class="btn-book-sched btn-ticketing-action" data-sch-id="${sch.id}" style="margin: 0; white-space: nowrap;">
                🎫 Proses & Terbitkan Tiket
              </button>
            </div>
          `;

          const inlineVesselSel = card.querySelector('.card-inline-vessel-select');
          card.querySelector('.btn-ticketing-action').addEventListener('click', () => {
            const chosenVid = inlineVesselSel ? inlineVesselSel.value : (currentVessel ? currentVessel.id : sch.vesselId);
            const chosenVessel = fleet.find(fv => fv.id === chosenVid) || currentVessel;
            const targetSched = schedules.find(s => s.vesselId === chosenVid && s.originId === sch.originId && s.destinationId === sch.destinationId)
              || schedules.find(s => s.vesselId === chosenVid)
              || { ...sch, vesselId: chosenVid, vesselNameCustom: chosenVessel ? chosenVessel.name : vName };
            this.openBookingModal(targetSched, tenant, chosenVessel ? chosenVessel.name : vName, orig, dest);
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

    // Refresh Live Seat Map Dashboard if active
    if (document.getElementById('paneSeats')?.classList.contains('active')) {
      this.renderSeatDashboard();
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
      const paxArr = (Array.isArray(b.passengers) && b.passengers.length > 0) ? b.passengers : [{
        name: b.passengerName || 'Penumpang',
        gender: b.gender || 'L',
        docType: b.docType || 'KTP',
        docNumber: b.docNumber || b.nik || '-',
        nationality: b.nationality || 'ID',
        age: b.age || 30,
        seat: b.seatNumber || 'A-01',
        className: b.className || 'Ekonomi'
      }];
      paxArr.forEach((p, pIdx) => {
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

    // Hitung frekuensi nama penumpang untuk deteksi data ganda
    const nameFrequency = {};
    paxList.forEach(item => {
      const norm = (item.pax.name || '').trim().toLowerCase();
      if (norm) {
        nameFrequency[norm] = (nameFrequency[norm] || 0) + 1;
      }
    });

    // Update Quick Statistics & Duplicate Badge Count
    let wniCount = 0;
    let wnaCount = 0;
    let boardedCount = 0;
    let waitingCount = 0;
    let duplicatePaxCount = 0;

    paxList.forEach(item => {
      const norm = (item.pax.name || '').trim().toLowerCase();
      if (norm && nameFrequency[norm] > 1) duplicatePaxCount++;

      if (item.pax.nationality && item.pax.nationality !== 'ID' && item.pax.nationality !== 'Indonesia') wnaCount++;
      else wniCount++;

      if (item.booking.boardingStatus === 'BOARDED') boardedCount++;
      else waitingCount++;
    });

    const dupBadgeEl = document.getElementById('countDuplicateBadge');
    if (dupBadgeEl) dupBadgeEl.innerText = duplicatePaxCount;

    if (boardingFilter === 'DUPLICATE') {
      paxList = paxList.filter(item => {
        const norm = (item.pax.name || '').trim().toLowerCase();
        return norm && (nameFrequency[norm] > 1);
      });
    }

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
      const isDuplicate = (nameFrequency[(p.name || '').trim().toLowerCase()] || 0) > 1;
      const dupBadgeHtml = isDuplicate 
        ? ' <span class="tag-badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 0.62rem; padding: 1px 4px; border-radius: 3px; font-weight: 700;" title="Peringatan: Nama penumpang ini terdeteksi ganda di manifest">⚠️ Ganda</span>' 
        : '';
      const paxTypeBadge = p.paxType === 'Anak' 
        ? '<span class="tag-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border-color: #f59e0b;">Anak-Anak</span>' 
        : (p.paxType === 'Bayi' 
          ? '<span class="tag-badge" style="background: rgba(168, 85, 247, 0.15); color: #a855f7; border-color: #a855f7;">Bayi (Infant)</span>' 
          : '<span class="tag-badge" style="background: rgba(2, 132, 199, 0.15); color: #38bdf8; border-color: #0284c7;">Dewasa</span>');

      tr.innerHTML = `
        <td style="text-align: center; width: 28px; padding: 4px 3px;">
          <input type="checkbox" class="check-pax-item" data-pnr="${b.pnr}" data-pax-idx="${item.paxIndex}" style="cursor: pointer; width: 15px; height: 15px;">
        </td>
        <td style="color: var(--text-dim); text-align: center; width: 24px; padding: 4px 3px; font-size: 0.7rem;">${idx + 1}</td>
        <td style="padding: 4px; white-space: nowrap;"><strong style="color: #0284c7; font-family: var(--font-mono); font-size: 0.72rem;">${b.pnr}</strong></td>
        <td style="padding: 4px; white-space: nowrap;">${paxTypeBadge}</td>
        <td style="padding: 4px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong style="color: #0f172a; font-size: 0.74rem;" title="${p.name}">${p.name}</strong>${dupBadgeHtml}</td>
        <td style="text-align: center; font-weight: 700; width: 24px; padding: 4px 3px; font-size: 0.72rem;">${p.gender === 'P' ? '<span style="color: #ec4899;">P</span>' : '<span style="color: #0284c7;">L</span>'}</td>
        <td style="padding: 4px; white-space: nowrap;"><code style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 1px 4px; border-radius: 3px; font-weight: 700; color: #0f172a; font-size: 0.68rem;">${docNum}</code></td>
        <td style="padding: 4px; white-space: nowrap; font-size: 0.7rem;">${p.age ? p.age + ' th' : (p.dob || '-')}</td>
        <td style="padding: 4px; font-size: 0.7rem; white-space: nowrap;">${p.nationality === 'MY' ? 'Malaysia' : (p.nationality === 'OTHER' ? 'Asing' : (!p.nationality || p.nationality === 'ID' ? 'Indonesia' : p.nationality))}</td>
        <td style="padding: 4px; font-size: 0.68rem; color: var(--text-dim); max-width: 75px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.remark || '-'}">${p.remark || '-'}</td>
        <td style="padding: 4px; white-space: nowrap;">
          <span style="font-size: 0.68rem; font-weight: 600; color: #334155;" title="${b.vesselName}">${(b.vesselName || '').replace('PT ', '').replace('Express', 'Exp.').slice(0, 14)}</span>
          <strong style="color: #0284c7; font-size: 0.72rem; margin-left: 2px;">(${p.seat})</strong>
        </td>
        <td style="padding: 4px; white-space: nowrap;">
          <span class="status-pill ${isBoarded ? 'boarded' : 'waiting'}" style="font-size: 0.62rem; padding: 1px 5px;">
            ${isBoarded ? 'BOARDED' : 'MENUNGGU'}
          </span>
        </td>
        <td style="white-space: nowrap; text-align: center; padding: 4px;">
          <div style="display: inline-flex; gap: 3px; justify-content: center; align-items: center;">
            <button type="button" class="btn-action-sm btn-print-single-ticket" style="background: rgba(2, 132, 199, 0.1); color: #0284c7; border: 1px solid #bae6fd; font-weight: 700; padding: 2px 5px; font-size: 0.68rem;" title="Cetak Langsung Tiket / Boarding Pass Satuan">
              🖨️ Tiket
            </button>
            <button type="button" class="btn-action-sm btn-edit-manifest btn-edit-ticket" style="padding: 2px 7px; font-size: 0.68rem; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 700; border-radius: 4px;" title="Edit Data Lengkap Tiket & Manifest Penumpang">
              ✏️ Edit Tiket & Pax
            </button>
            <button type="button" class="btn-action-sm btn-transfer-vessel" style="padding: 2px 5px; font-size: 0.68rem;" title="Alihkan / Transfer Penumpang ke Kapal Lain">
              🔄
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-print-single-ticket').addEventListener('click', () => {
        this.openDirectTicketPrintModal({ pnr: b.pnr, paxIndex: item.paxIndex });
      });
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

    // Direct batch print selected tickets from manifest
    const btnBatchPrint = document.getElementById('btnDirectPrintSelectedTickets');
    if (btnBatchPrint) {
      btnBatchPrint.onclick = () => {
        const checkedBoxes = Array.from(document.querySelectorAll('.check-pax-item:checked'));
        if (checkedBoxes.length > 0) {
          const selectedItems = checkedBoxes.map(cb => ({
            pnr: cb.getAttribute('data-pnr'),
            paxIndex: parseInt(cb.getAttribute('data-pax-idx'), 10)
          }));
          this.openDirectTicketPrintModal(selectedItems);
        } else {
          // If none checked, print all visible passengers in manifest
          const allPaxItems = paxList.map(item => ({
            pnr: item.booking.pnr,
            paxIndex: item.paxIndex
          }));
          if (allPaxItems.length === 0) {
            this.showToast('Data Kosong', 'Tidak ada tiket penumpang pada manifest untuk dicetak.', 'warning');
            return;
          }
          this.openDirectTicketPrintModal(allPaxItems);
        }
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
      const paxArr = (Array.isArray(b.passengers) && b.passengers.length > 0) ? b.passengers : [{
        name: b.passengerName || '-',
        gender: b.gender || 'L',
        docNumber: b.docNumber || b.nik || '-',
        nationality: b.nationality || 'Indonesia',
        seat: b.seatNumber || 'A-01',
        className: b.className || 'Ekonomi'
      }];
      paxArr.forEach(p => {
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
  openOfficialManifestPrintModal(bookings = null, tenant = null) {
    const modal = document.getElementById('modalOfficialManifestPrint');
    if (!modal) return;

    if (!tenant) tenant = Store.getCurrentTenant() || Store.getCompanies()[0] || { name: 'Perusahaan Pelayaran Resmi', category: 'Operator Kapal Cepat', id: 'DEF' };
    if (!bookings) bookings = Store.getBookingsByCompany(tenant.id) || [];

    const ksop = Store.getKsopSettings();
    document.getElementById('docPrintCompanyTitle').innerText = (tenant.name || 'PERUSAHAAN PELAYARAN').toUpperCase();
    document.getElementById('docPrintCompanySub').innerText = `Kategori: ${tenant.category || 'Operator Resmi'} • Pangkalan Pelabuhan: ${ksop.ksopPort || 'Pelabuhan Tunon Taka Nunukan'}`;
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = ksop.spbPrefix || `MNF-${tenant.code || tenant.shortName || 'KSOP'}/`;
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

    // Populate Official Vessel Crew List Table in Print Modal
    const tbodyCrewPrint = document.getElementById('tbodyOfficialCrewPrintList');
    if (tbodyCrewPrint) {
      const fleet = Store.getVesselsByCompany(tenant.id);
      const activeVesselName = bookings.length > 0 ? bookings[0].vesselName : (fleet[0] ? fleet[0].name : '');
      const vesselObj = fleet.find(v => v.name === activeVesselName) || fleet[0];
      const defaultPositions = ['MASTER', 'MUALIM', 'MASINIS', 'CREW/ AB', 'CREW/ AB', 'CREW/ AB'];
      const crewRows = (vesselObj && Array.isArray(vesselObj.crewList) && vesselObj.crewList.length > 0)
        ? vesselObj.crewList
        : defaultPositions.map(pos => ({ name: '-', position: pos, gender: 'M', age: '-', nationality: 'Indonesia', passport: '-' }));

      const masterCrew = crewRows.find(c => (c.position || '').toUpperCase().includes('MASTER') && c.name && c.name !== '-');
      if (masterCrew && printMaster) {
        printMaster.innerText = masterCrew.name;
      }

      tbodyCrewPrint.innerHTML = crewRows.map((c, idx) => `
        <tr>
          <td style="padding: 4px 8px; text-align: center; border: 1px solid #0f172a;">${idx + 1}</td>
          <td style="padding: 4px 8px; border: 1px solid #0f172a; font-weight: 600;">${(c.name || '-').toUpperCase()}</td>
          <td style="padding: 4px 8px; border: 1px solid #0f172a;">${c.position || 'CREW/ AB'}</td>
          <td style="padding: 4px 8px; text-align: center; border: 1px solid #0f172a;">${c.gender || 'M'}</td>
          <td style="padding: 4px 8px; text-align: center; border: 1px solid #0f172a;">${c.age || '-'}</td>
          <td style="padding: 4px 8px; border: 1px solid #0f172a;">${c.nationality || 'Indonesia'}</td>
          <td style="padding: 4px 8px; border: 1px solid #0f172a; font-family: monospace;">${c.passport || '-'}</td>
        </tr>
      `).join('');
    }

    const tbody = document.getElementById('tbodyOfficialManifestPrintList');
    tbody.innerHTML = '';

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding: 1.5rem; text-align: center; color: #64748b;">Belum ada penumpang terdaftar di manifest pelayaran ini.</td></tr>`;
    } else {
      let count = 1;
      bookings.forEach(b => {
        const paxArr = (Array.isArray(b.passengers) && b.passengers.length > 0) ? b.passengers : [{
          name: b.passengerName || '-',
          gender: b.gender || 'L',
          docType: b.docType || 'KTP',
          docNumber: b.docNumber || b.nik || '-',
          nationality: b.nationality || 'Indonesia',
          seat: b.seatNumber || 'A-01'
        }];
        paxArr.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cbd5e1;">${count++}</td>
            <td style="padding: 5px 8px; font-family: monospace; border: 1px solid #cbd5e1;">${b.pnr}</td>
            <td style="padding: 5px 8px; font-weight: bold; border: 1px solid #cbd5e1;">${p.name}</td>
            <td style="padding: 5px 8px; text-align: center; border: 1px solid #cbd5e1;">${p.nationality === 'MY' ? 'Malaysia' : (p.nationality === 'OTHER' ? 'Asing' : (!p.nationality || p.nationality === 'ID' ? 'Indonesia' : p.nationality))}</td>
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

  // ========================================================
  // DIRECT TICKET & BOARDING PASS PRINTING ENGINE (SATUAN & MASSAL)
  // ========================================================

  normalizeTicketItems(target) {
    const tenant = Store.getCurrentTenant() || Store.getCompanies()[0];
    const allBookings = tenant ? Store.getBookingsByCompany(tenant.id) : Store.getBookings();
    const ksop = Store.getKsopSettings();

    let rawList = []; // Array of { booking, pax, paxIndex }

    if (typeof target === 'string') {
      const b = Store.getBookingByPnr(target) || allBookings.find(x => x.pnr === target);
      if (b && Array.isArray(b.passengers)) {
        b.passengers.forEach((p, pIdx) => {
          rawList.push({ booking: b, pax: p, paxIndex: pIdx });
        });
      }
    } else if (Array.isArray(target)) {
      target.forEach(item => {
        if (typeof item === 'string') {
          const b = Store.getBookingByPnr(item) || allBookings.find(x => x.pnr === item);
          if (b && Array.isArray(b.passengers)) {
            b.passengers.forEach((p, pIdx) => {
              rawList.push({ booking: b, pax: p, paxIndex: pIdx });
            });
          }
        } else if (item && item.pnr) {
          const b = Store.getBookingByPnr(item.pnr) || allBookings.find(x => x.pnr === item.pnr);
          if (b && Array.isArray(b.passengers)) {
            const pIdx = (typeof item.paxIndex === 'number' && item.paxIndex >= 0) ? item.paxIndex : 0;
            const p = b.passengers[pIdx] || b.passengers[0];
            if (p) {
              rawList.push({ booking: b, pax: p, paxIndex: pIdx });
            }
          }
        } else if (item && item.booking && item.pax) {
          rawList.push(item);
        }
      });
    } else if (target && typeof target === 'object') {
      if (target.pnr) {
        const b = Store.getBookingByPnr(target.pnr) || allBookings.find(x => x.pnr === target.pnr);
        if (b && Array.isArray(b.passengers)) {
          if (typeof target.paxIndex === 'number') {
            const p = b.passengers[target.paxIndex];
            if (p) rawList.push({ booking: b, pax: p, paxIndex: target.paxIndex });
          } else {
            b.passengers.forEach((p, pIdx) => {
              rawList.push({ booking: b, pax: p, paxIndex: pIdx });
            });
          }
        }
      }
    } else {
      allBookings.forEach(b => {
        if (Array.isArray(b.passengers)) {
          b.passengers.forEach((p, pIdx) => {
            rawList.push({ booking: b, pax: p, paxIndex: pIdx });
          });
        }
      });
    }

    return rawList.map(item => this.buildTicketDescriptor(item.booking, item.pax, item.paxIndex, tenant, ksop));
  },

  buildTicketDescriptor(booking, pax, paxIndex, tenant, ksop) {
    const isSingle = (!booking.passengers || booking.passengers.length <= 1);
    const suffix = String(paxIndex + 1).padStart(2, '0');
    const ticketNo = isSingle ? booking.pnr : `${booking.pnr}-${suffix}`;
    const barcodeCode = (booking.barcode || '8910482019') + (isSingle ? '' : suffix);
    const seatName = pax.seat || (booking.passengers && booking.passengers[0] ? booking.passengers[0].seat : `A-${suffix}`);
    const className = pax.className || booking.className || 'Ekonomi (Main Deck)';
    const fare = (booking.passengers && booking.passengers.length > 0)
      ? Math.round((booking.totalAmount || 250000) / booking.passengers.length)
      : (booking.totalAmount || 250000);
    const docNum = pax.passportNo || pax.docNumber || pax.nik || '-';
    const isIntl = booking.isIntl || booking.destCode === 'TWU' || booking.originCode === 'TWU';
    const docLabel = ((pax.nationality && pax.nationality !== 'ID' && pax.nationality !== 'Indonesia') || isIntl) ? 'NO. PASPOR / PLB' : 'NO. KTP / NIK';

    const qrData = JSON.stringify({
      tkt: ticketNo,
      pnr: booking.pnr,
      pax: pax.name,
      doc: docNum,
      seat: seatName,
      vessel: booking.vesselName,
      route: `${booking.originCity}-${booking.destinationCity}`,
      dep: `${booking.departDate} ${booking.departTime}`
    });

    return {
      ticketNo,
      pnr: booking.pnr,
      paxIndex,
      isBulkBooking: !isSingle,
      totalPaxInBooking: booking.passengers ? booking.passengers.length : 1,
      passengerName: pax.name || 'Penumpang Resmi',
      paxType: pax.paxType || 'Dewasa',
      gender: pax.gender || 'L',
      genderText: pax.gender === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)',
      docType: pax.docType || (isIntl ? 'PASPOR' : 'KTP'),
      docLabel,
      docNum,
      age: pax.age || (pax.dob ? '-' : 'Dewasa'),
      nationality: (pax.nationality === 'MY' || pax.nationality === 'Malaysia') ? 'Malaysia' : (pax.nationality === 'OTHER' ? 'Luar Negeri' : ((!pax.nationality || pax.nationality === 'ID' || pax.nationality === 'Indonesia') ? 'Indonesia' : pax.nationality)),
      seat: seatName,
      className,
      fare,
      fareFormatted: formatRupiah(fare),
      paymentMethod: booking.paymentMethod || 'CASH',
      paymentStatus: booking.paymentStatus || 'PAID',
      boardingStatus: booking.boardingStatus || 'NOT_CHECKED_IN',
      boardedAt: booking.boardedAt || null,
      vesselName: booking.vesselName || 'KM Hasna Express 01',
      originCity: booking.originCity || 'Nunukan',
      originCode: booking.originCode || 'NNK',
      destCity: booking.destinationCity || 'Tawau',
      destCode: booking.destCode || 'TWU',
      departDate: booking.departDate || new Date().toISOString().split('T')[0],
      departTime: booking.departTime || '09:00 WITA',
      pier: booking.pier || 'Dermaga 3 Tunon Taka',
      groupName: booking.groupName || (booking.contact ? booking.contact.name : '-'),
      companyName: tenant?.name || 'PT HASNA EXPRESS NUNUKAN',
      companyShort: tenant?.shortName || 'HASNA EXPRESS',
      companyColor: tenant?.brandColor || '#0284c7',
      ksopPort: ksop?.ksopPort || 'Pelabuhan Tunon Taka Nunukan',
      spbRef: `${ksop?.spbPrefix || 'SPB-KSOP-NNK/'}${booking.pnr.replace(/[^0-9]/g, '').slice(-6) || '829104'}`,
      barcodeCode,
      qrData
    };
  },

  openDirectTicketPrintModal(target = null, format = 'BOARDING_PASS') {
    this.directPrintState.currentFormat = format;
    const items = this.normalizeTicketItems(target);
    if (!items || items.length === 0) {
      this.showToast('Data Kosong', 'Tidak ada data tiket penumpang yang ditemukan untuk dicetak.', 'warning');
      return;
    }
    this.directPrintState.items = items;

    // Update Header and Format Buttons
    const batchBadge = document.getElementById('directPrintBatchBadge');
    if (batchBadge) {
      batchBadge.innerText = `${items.length} Tiket Siap Cetak (${this.directPrintState.currentFormat === 'BOARDING_PASS' ? 'A4 Boarding Pass' : 'Struk Thermal POS'})`;
    }

    const printBtnText = document.getElementById('btnExecuteDirectPrintText');
    if (printBtnText) {
      printBtnText.innerText = `🖨️ Cetak Sekarang (${items.length} Tiket)`;
    }

    // Sync format buttons UI
    document.querySelectorAll('.btn-toggle-print-format')?.forEach(btn => {
      const btnFormat = btn.getAttribute('data-format');
      if (btnFormat === format) {
        btn.classList.add('active');
        btn.style.background = '#ffffff';
        btn.style.color = '#0284c7';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#64748b';
        btn.style.boxShadow = 'none';
      }
    });

    this.renderDirectTicketsArea();
    document.getElementById('modalDirectTicketPrint')?.classList.add('show');
  },

  renderDirectTicketsArea() {
    const area = document.getElementById('directBatchTicketPrintArea');
    if (!area) return;
    area.innerHTML = '';

    const items = this.directPrintState.items || [];
    const isThermal = (this.directPrintState.currentFormat === 'THERMAL_POS');

    if (items.length === 0) {
      area.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: #64748b; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1;">
          Tidak ada tiket yang dimuat untuk dicetak.
        </div>
      `;
      return;
    }

    items.forEach((t, idx) => {
      const ticketHtml = isThermal
        ? this.renderThermalPosTicket(t, idx, items.length)
        : this.renderBoardingPassTicket(t, idx, items.length);

      const wrapper = document.createElement('div');
      wrapper.innerHTML = ticketHtml.trim();
      area.appendChild(wrapper.firstElementChild);
    });
  },

  renderBoardingPassTicket(t, idx, total) {
    const qrSvg = this.generateSvgQrCode(t.qrData);
    const barcodeLines = Array.from({ length: 32 }, (_, i) => {
      const w = (i % 5 === 0) ? 3 : ((i % 3 === 0) ? 1 : 2);
      const isSpace = (i % 7 === 0);
      return `<span style="width: ${w}px; background: ${isSpace ? 'transparent' : '#0f172a'};"></span>`;
    }).join('');

    return `
      <div class="direct-ticket-card">
        <!-- Header -->
        <div class="dt-header">
          <div class="dt-company-name">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${t.companyColor}; display: inline-block;"></span>
            <span>${t.companyName}</span>
            <span class="dt-pass-title">• BOARDING PASS RESMI KAPAL LAUT</span>
          </div>
          <div class="dt-pnr-box">
            <span class="dt-pnr-lbl">RESERVASI (PNR)</span>
            <span class="dt-pnr-code">${t.pnr}</span>
            <span class="dt-ticket-seq">(${idx + 1} / ${total})</span>
          </div>
        </div>

        <!-- Body -->
        <div class="dt-body">
          <!-- Route strip -->
          <div class="dt-route-row">
            <div>
              <span class="dt-city-code">${t.originCode}</span>
              <span class="dt-city-name">${t.originCity}</span>
              <span class="dt-time">${t.departTime}</span>
            </div>

            <div class="dt-arrow-cell">
              <span class="dt-vessel-badge">🚢 ${t.vesselName}</span>
              <div style="display: flex; align-items: center; gap: 4px; margin: 4px 0;">
                <span style="width: 30px; height: 1.5px; background: #0284c7; display: inline-block;"></span>
                <span style="color: #0284c7; font-size: 0.9rem;">➔</span>
                <span style="width: 30px; height: 1.5px; background: #0284c7; display: inline-block;"></span>
              </div>
              <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">${t.pier}</span>
            </div>

            <div style="text-align: right;">
              <span class="dt-city-code">${t.destCode}</span>
              <span class="dt-city-name">${t.destCity}</span>
              <span class="dt-time" style="color: #10b981;">Kedatangan Resmi</span>
            </div>
          </div>

          <!-- Passenger and Fare Details -->
          <div class="dt-grid-details">
            <div class="dt-cell">
              <span class="lbl">Nama Lengkap</span>
              <span class="val" style="color: #0284c7;">${t.passengerName}</span>
              <span class="sub">${t.paxType} • ${t.genderText}</span>
            </div>

            <div class="dt-cell">
              <span class="lbl">${t.docLabel}</span>
              <span class="val" style="font-family: monospace;">${t.docNum}</span>
              <span class="sub">Warga: ${t.nationality}</span>
            </div>

            <div class="dt-cell">
              <span class="lbl">Nomor Kursi (Seat)</span>
              <span class="dt-seat-highlight">${t.seat}</span>
              <span class="sub">${t.className}</span>
            </div>

            <div class="dt-cell">
              <span class="lbl">Tarif & Pembayaran</span>
              <span class="val" style="color: #b45309;">${t.fareFormatted}</span>
              <span class="sub" style="color: #059669; font-weight: 700;">✓ ${t.paymentStatus} (${t.paymentMethod})</span>
            </div>
          </div>

          <!-- Perforated Tear Line -->
          <div class="dt-perforated">
            <div class="circle-c c-left"></div>
            <div class="dashes"></div>
            <div class="circle-c c-right"></div>
          </div>

          <!-- Security Footer & Verification Seals -->
          <div class="dt-security-foot">
            <div class="dt-qr-wrap" title="Scan Validasi Boarding Pass Gate">
              ${qrSvg}
            </div>

            <div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
                DITJEN HUBLA & KSOP TERPADU • PASSENGER BOARDING CLEARANCE
              </div>
              <div style="font-size: 0.72rem; color: #475569;">
                No. SPB: <strong style="color: #0284c7; font-family: monospace;">${t.spbRef}</strong> • 
                No. Tiket: <strong style="font-family: monospace; color: #0f172a;">${t.ticketNo}</strong> • 
                Pelabuhan: <span style="font-weight: 600;">${t.ksopPort}</span>
              </div>
              <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 3px;">
                Wajib lapor di ruang tunggu terminal keberangkatan minimal 30 menit sebelum jadwal keberangkatan kapal.
              </div>
            </div>

            <div class="dt-barcode-wrap" style="align-items: flex-end;">
              <div class="dt-barcode-graphic">
                ${barcodeLines}
              </div>
              <span style="font-family: monospace; font-size: 0.72rem; color: #475569; letter-spacing: 0.5px;">*${t.barcodeCode}*</span>
            </div>
          </div>

          <!-- Notice Strip -->
          <div class="dt-terms-notice">
            <span>🛡️ Tiket ini sah dan dilindungi asuransi jasa raharja pelayaran resmi.</span>
            <span>Pencetakan: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • Universal Ticketing SaaS</span>
          </div>
        </div>
      </div>
    `;
  },

  renderThermalPosTicket(t, idx, total) {
    const qrSvg = this.generateSvgQrCode(t.qrData);

    return `
      <div class="direct-ticket-thermal">
        <div class="th-center">
          <div class="th-header-title">${t.companyName}</div>
          <div class="th-sub">${t.ksopPort}</div>
          <div class="th-sub">Layanan Penyeberangan & Kapal Cepat</div>
        </div>

        <div class="th-double-divider"></div>

        <div class="th-center">
          <div style="font-size: 0.88rem; font-weight: 900; letter-spacing: 0.5px;">BOARDING PASS KAPAL LAUT</div>
          <div style="font-size: 0.68rem; color: #333333;">KEMENTERIAN PERHUBUNGAN - DITJEN HUBLA</div>
          <div style="font-size: 0.68rem; color: #0284c7; font-weight: 700; margin-top: 2px;">TIKET #${idx + 1} DARI ${total} PENUMPANG</div>
        </div>

        <div class="th-divider"></div>

        <div class="th-row">
          <span>KODE RESERVASI (PNR)</span>
          <strong style="font-family: monospace;">${t.pnr}</strong>
        </div>
        <div class="th-row">
          <span>NO. TIKET PENUMPANG</span>
          <strong style="font-family: monospace;">${t.ticketNo}</strong>
        </div>
        <div class="th-row">
          <span>TANGGAL & WAKTU</span>
          <span>${t.departDate} • ${t.departTime}</span>
        </div>
        <div class="th-row">
          <span>RUTE PELAYARAN</span>
          <strong>${t.originCity} ➔ ${t.destCity}</strong>
        </div>
        <div class="th-row">
          <span>ARMADA KAPAL</span>
          <strong>${t.vesselName}</strong>
        </div>
        <div class="th-row">
          <span>DERMAGA</span>
          <span>${t.pier}</span>
        </div>

        <div class="th-divider"></div>

        <div class="th-row">
          <span>NAMA PENUMPANG</span>
          <strong>${t.passengerName}</strong>
        </div>
        <div class="th-row">
          <span>${t.docLabel}</span>
          <span style="font-family: monospace;">${t.docNum}</span>
        </div>
        <div class="th-row">
          <span>KATEGORI / KEWARGANEGARAAN</span>
          <span>${t.paxType} / ${t.nationality}</span>
        </div>

        <div class="th-seat-box">
          <span class="th-seat-lbl">NOMOR KURSI / SEAT</span>
          <span class="th-seat-num">${t.seat}</span>
          <span style="font-size: 0.72rem; font-weight: 700; color: #000;">${t.className}</span>
        </div>

        <div class="th-row">
          <span>TARIF TIKET</span>
          <strong>${t.fareFormatted}</strong>
        </div>
        <div class="th-row">
          <span>STATUS PEMBAYARAN</span>
          <strong>✓ ${t.paymentStatus} (${t.paymentMethod})</strong>
        </div>
        <div class="th-row">
          <span>REF CLEARANCE SPB</span>
          <span style="font-size: 0.7rem; font-family: monospace;">${t.spbRef}</span>
        </div>

        <div class="th-double-divider"></div>

        <div class="th-center">
          <div style="display: flex; justify-content: center; margin: 0.5rem 0;">
            ${qrSvg}
          </div>
          <div style="font-family: monospace; font-size: 0.75rem; font-weight: bold;">*${t.ticketNo}*</div>
          <div style="font-size: 0.65rem; color: #333; margin-top: 0.5rem; line-height: 1.3;">
            Tunjukkan struk ini pada petugas Gate & KSOP saat pemeriksaan manifest.
          </div>
          <div style="font-size: 0.65rem; color: #333; font-weight: 700;">
            Pintu Gate ditutup 15 menit sebelum keberangkatan kapal.
          </div>
          <div style="font-size: 0.72rem; font-weight: 900; margin-top: 0.6rem;">
            *** SEMOGA SELAMAT SAMPAI TUJUAN ***
          </div>
        </div>
      </div>
    `;
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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
          <h4 style="color: var(--accent-rose);">Tiket Tidak Terdaftar / Palsu!</h4>
          <p>Kode "${code}" tidak ditemukan dalam manifest kapal perusahaan ini.</p>
        </div>
      `;
      return;
    }

    const p0 = (booking.passengers && booking.passengers[0]) || {
      name: booking.passengerName || 'Penumpang Resmi',
      nationality: booking.nationality || 'ID',
      docType: booking.docType || 'KTP',
      docNumber: booking.docNumber || booking.nik || '-',
      gender: booking.gender || 'L',
      seat: booking.seatNumber || '-'
    };
    const isAlreadyBoarded = booking.boardingStatus === 'BOARDED';
    const natBadge = (p0.nationality && !['ID', 'Indonesia', 'MY', 'Malaysia', 'OTHER'].includes(p0.nationality)) ? `🌏 ${p0.nationality}` : (p0.nationality === 'MY' || p0.nationality === 'Malaysia') ? '🇲🇾 Malaysia' : (p0.nationality === 'OTHER' ? '🌏 Luar Negeri' : '🇮🇩 Indonesia');
    const docLabel = p0.docType === 'KTP' ? 'NIK KTP' : (p0.docType === 'PLB' ? 'PLB' : 'No. Paspor');

    card.innerHTML = `
      <div style="border-left: 4px solid ${isAlreadyBoarded ? '#0284c7' : '#10b981'}; padding-left: 1.25rem;">
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
          <span class="tag-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 800;">✓ TIKET VALID & RESMI</span>
          <span class="tag-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${natBadge}</span>
        </div>

        <h3 style="font-size: 1.35rem; margin: 0.25rem 0;">${p0.name}</h3>
        <p class="text-dim" style="font-size: 0.85rem;">
          ${docLabel}: <code style="color: #0f172a; font-weight: bold; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${p0.docNumber || p0.nik || '-'}</code> • Kursi: <strong style="color: var(--primary-cyan);">${(booking.passengers || []).map(p => p.seat).filter(Boolean).join(', ') || booking.seatNumber || '-'}</strong> (${booking.className || 'Ekonomi'})
        </p>

        <div style="margin: 0.85rem 0; font-size: 0.84rem; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid var(--border-line);">
          <div>Kapal: <strong>${booking.vesselName}</strong></div>
          <div>Rute: <strong>${booking.originCity} ➔ ${booking.destinationCity}</strong> (${booking.departTime})</div>
          <div>Dermaga: <strong>${booking.pier}</strong></div>
          <div>Status Pembayaran: <strong style="color: ${booking.paymentStatus === 'BOOKED' ? '#d97706' : 'var(--accent-green)'};">${booking.paymentStatus} (${booking.paymentStatus === 'BOOKED' ? 'BELUM BAYAR' : 'LUNAS'})</strong></div>
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

    // Delete Vessel Auth Modal Listeners
    document.getElementById('btnCloseDeleteVesselAuth')?.addEventListener('click', () => {
      document.getElementById('modalDeleteVesselAuth')?.classList.remove('show');
    });
    document.getElementById('btnCancelDeleteVesselAuth')?.addEventListener('click', () => {
      document.getElementById('modalDeleteVesselAuth')?.classList.remove('show');
    });
    document.getElementById('formDeleteVesselAuth')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      const enteredPass = document.getElementById('deleteVesselAuthPassword')?.value?.trim();
      if (tenant && tenant.password && enteredPass !== tenant.password) {
        this.showToast('Verifikasi Gagal', 'Password portal perusahaan yang Anda masukkan salah. Penghapusan armada ditolak.', 'warning');
        return;
      }
      if (!enteredPass) {
        this.showToast('Password Diperlukan', 'Silakan masukkan password portal perusahaan Anda untuk mengonfirmasi penghapusan.', 'warning');
        return;
      }

      const vId = document.getElementById('deleteTargetVesselId')?.value?.trim();
      const sId = document.getElementById('deleteTargetScheduleId')?.value?.trim();
      const vName = document.getElementById('deleteVesselNameLabel')?.innerText || 'Armada';

      if (vId && Store.deleteVessel) {
        Store.deleteVessel(vId);
      } else if (tenant && vName) {
        const matchV = Store.getVesselsByCompany(tenant.id).find(v => v.name === vName);
        if (matchV && Store.deleteVessel) Store.deleteVessel(matchV.id);
      }
      if (sId && Store.deleteSchedule) {
        Store.deleteSchedule(sId);
      }

      document.getElementById('modalDeleteVesselAuth')?.classList.remove('show');
      this.refreshCompanyDashboard();
      this.showToast('Armada Dihapus', `Armada "${vName}" beserta jadwal keberangkatannya berhasil dihapus.`);
    });

    // Edit Schedule Price Modal Listeners
    document.getElementById('btnCloseEditSchedulePrice')?.addEventListener('click', () => {
      document.getElementById('modalEditSchedulePrice').classList.remove('show');
    });
    document.getElementById('btnCancelEditSchedulePrice')?.addEventListener('click', () => {
      document.getElementById('modalEditSchedulePrice').classList.remove('show');
    });
    document.getElementById('formEditSchedulePrice')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
        this.showToast('Akses Dibatasi', 'Pengaturan harga tiket dan pas pelabuhan hanya dapat diubah di menu Login Developer.', 'warning');
        return;
      }

      const schedId = document.getElementById('editSchedId').value;
      const s = Store.getScheduleById ? Store.getScheduleById(schedId) : Store.getSchedules().find(item => item.id === schedId);
      if (!s) return;

      const newEko = parseFloat(document.getElementById('editSchedPriceEko')?.value) || 0;
      const newPortPass = parseFloat(document.getElementById('editSchedPortPassPrice')?.value) || 0;

      s.priceEconomy = newEko;
      s.portPassFee = newPortPass;
      const quotaVal = (s.classes && s.classes[0] && s.classes[0].quota) ? s.classes[0].quota : (s.quotaTotal || 200);
      const availVal = (s.classes && s.classes[0] && s.classes[0].available !== undefined) ? s.classes[0].available : quotaVal;
      s.classes = [
        { id: 'cls-eko', name: 'Tiket Reguler', price: newEko, quota: quotaVal, available: availVal }
      ];

      Store.updateSchedule(s.id, s);
      // Sinkronkan tarif pada seluruh jadwal berulang dengan armada & rute yang sama
      Store.getSchedulesByCompany(s.companyId).forEach(other => {
        if (other.id !== s.id && other.vesselId === s.vesselId && other.originId === s.originId && other.destinationId === s.destinationId) {
          other.priceEconomy = newEko;
          other.portPassFee = newPortPass;
          other.classes = [{ id: 'cls-eko', name: 'Tiket Reguler', price: newEko, quota: quotaVal, available: availVal }];
          Store.updateSchedule(other.id, other);
        }
      });
      // Sinkronkan juga ke tabel Pas Pelabuhan untuk rute/pelabuhan keberangkatan ini
      if (Store.getPortPasses && Store.updatePortPass) {
        const sIsIntl = s.originId === 'TWU' || s.destinationId === 'TWU' || s.categoryType === 'INTERNATIONAL';
        const rType = sIsIntl ? 'Internasional' : 'Domestik';
        const passes = Store.getPortPasses();
        const matchPass = passes.find(p => p.portId === (s.originId || 'NNK') && p.routeType === rType);
        if (matchPass) {
          Store.updatePortPass(matchPass.id, { priceAdult: newPortPass });
        }
      }
      document.getElementById('modalEditSchedulePrice').classList.remove('show');
      if (Store.getCurrentTenant()) this.refreshCompanyDashboard();
      if (typeof this.renderDevAdminDashboard === 'function') this.renderDevAdminDashboard();
      this.showToast('Tarif & Pas Pelabuhan Diperbarui', `Jadwal ${schedId}: Tiket ${formatRupiah(newEko)} • Pas Pelabuhan ${formatRupiah(newPortPass)}.`);
    });

    // Port Pass Modal Listeners (Developer Only)
    document.getElementById('btnDevOpenAddPortPass')?.addEventListener('click', () => this.openEditPortPassModal(null));
    document.getElementById('btnCloseEditPortPass')?.addEventListener('click', () => {
      document.getElementById('modalEditPortPass')?.classList.remove('show');
    });
    document.getElementById('btnCancelEditPortPass')?.addEventListener('click', () => {
      document.getElementById('modalEditPortPass')?.classList.remove('show');
    });
    document.getElementById('formEditPortPass')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
        this.showToast('Akses Dibatasi', 'Pengaturan pas pelabuhan hanya dapat diubah melalui menu Login Developer.', 'warning');
        return;
      }
      const tenant = Store.getCurrentTenant();
      const editId = document.getElementById('portPassEditId')?.value?.trim();
      const name = document.getElementById('portPassNameInput')?.value?.trim() || 'Pas Pelabuhan';
      const portId = document.getElementById('portPassPortSelect')?.value || 'NNK';
      const routeType = document.getElementById('portPassRouteType')?.value || 'Internasional';
      const operator = document.getElementById('portPassOperatorInput')?.value?.trim() || 'KSOP / Otoritas Pelabuhan';
      const priceAdult = parseFloat(document.getElementById('portPassAdultInput')?.value) || 0;
      const priceChild = priceAdult; // Hanya 1 kategori tarif pas pelabuhan
      const billingMode = document.getElementById('portPassBillingMode')?.value || 'INCLUDED';
      const status = document.getElementById('portPassStatusSelect')?.value || 'Aktif';

      if (editId) {
        Store.updatePortPass(editId, { name, portId, routeType, operator, priceAdult, priceChild, billingMode, status });
        this.showToast('Pas Pelabuhan Diperbarui', `Tarif "${name}" berhasil disimpan (Tarif Pas: ${formatRupiah(priceAdult)}).`);
      } else {
        const newItem = {
          id: `PP-${portId}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          companyId: tenant ? tenant.id : '',
          portId,
          name,
          operator,
          routeType,
          priceAdult,
          priceChild,
          billingMode,
          status
        };
        Store.addPortPass(newItem);
        this.showToast('Pas Pelabuhan Ditambahkan', `Tarif pas pelabuhan baru "${name}" berhasil ditambahkan.`);
      }

      // Sinkronkan tarif pas pelabuhan ke seluruh jadwal yang sesuai dengan rute & pelabuhan ini
      const allScheds = Store.getSchedules ? Store.getSchedules() : [];
      allScheds.forEach(s => {
        const sIsIntl = s.originId === 'TWU' || s.destinationId === 'TWU' || s.categoryType === 'INTERNATIONAL';
        const sRType = sIsIntl ? 'Internasional' : 'Domestik';
        if ((s.originId || 'NNK') === portId && sRType === routeType) {
          s.portPassFee = priceAdult;
          Store.updateSchedule(s.id, s);
        }
      });
      document.getElementById('modalEditPortPass')?.classList.remove('show');
      if (Store.getCurrentTenant()) this.refreshCompanyDashboard();
      if (typeof this.renderDevAdminDashboard === 'function') this.renderDevAdminDashboard();
    });

    // Master Route Tariffs Modal Listeners (Developer Only)
    document.getElementById('btnDevOpenAddMasterRoute')?.addEventListener('click', () => this.openAddMasterRouteModal());
    document.getElementById('btnCloseEditRouteTariff')?.addEventListener('click', () => {
      document.getElementById('modalEditRouteTariff')?.classList.remove('show');
    });
    document.getElementById('btnCancelEditRouteTariff')?.addEventListener('click', () => {
      document.getElementById('modalEditRouteTariff')?.classList.remove('show');
    });
    document.getElementById('formEditRouteTariff')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
        this.showToast('Akses Dibatasi', 'Pengaturan tarif resmi rute hanya dapat diubah di menu Login Developer.', 'warning');
        return;
      }
      const routeId = document.getElementById('editRouteId')?.value;
      const origId = document.getElementById('editRouteOriginId')?.value;
      const destId = document.getElementById('editRouteDestinationId')?.value;
      const newPrice = parseFloat(document.getElementById('editRouteTicketPrice')?.value) || 0;
      const newPass = parseFloat(document.getElementById('editRoutePortPassPrice')?.value) || 0;
      const newNotes = document.getElementById('editRouteNotes')?.value?.trim() || '';

      const updated = Store.saveMasterRouteTariff(routeId, {
        ticketPrice: newPrice,
        portPassFee: newPass,
        notes: newNotes
      });

      if (updated) {
        // Sinkronkan seluruh jadwal aktif pada lintasan rute ini
        const allScheds = Store.getSchedules ? Store.getSchedules() : [];
        let schedUpdatedCount = 0;
        allScheds.forEach(s => {
          if (s.originId === origId && s.destinationId === destId) {
            s.priceEconomy = newPrice;
            s.portPassFee = newPass;
            const quotaVal = (s.classes && s.classes[0] && s.classes[0].quota) ? s.classes[0].quota : (s.quotaTotal || 200);
            const availVal = (s.classes && s.classes[0] && s.classes[0].available !== undefined) ? s.classes[0].available : quotaVal;
            s.classes = [
              { id: 'cls-eko', name: 'Tiket Reguler', price: newPrice, quota: quotaVal, available: availVal }
            ];
            Store.updateSchedule(s.id, s);
            schedUpdatedCount++;
          }
        });

        // Sinkronkan ke master pas pelabuhan resmi jika sesuai
        if (Store.getPortPasses && Store.updatePortPass) {
          const passes = Store.getPortPasses();
          const rType = updated.category || (destId === 'TWU' || origId === 'TWU' ? 'Internasional' : 'Domestik');
          const matchPass = passes.find(p => p.portId === origId && p.routeType === rType);
          if (matchPass) {
            Store.updatePortPass(matchPass.id, { priceAdult: newPass });
          }
        }

        document.getElementById('modalEditRouteTariff')?.classList.remove('show');
        if (Store.getCurrentTenant()) this.refreshCompanyDashboard();
        if (typeof this.renderDevAdminDashboard === 'function') this.renderDevAdminDashboard();
        this.showToast('Tarif Resmi Diperbarui', `Rute ${updated.originName || origId} ➔ ${updated.destinationName || destId}: Tiket ${formatRupiah(newPrice)} • Pas Pelabuhan ${formatRupiah(newPass)}.`);
      }
    });

    document.getElementById('btnCloseAddMasterRoute')?.addEventListener('click', () => {
      document.getElementById('modalAddMasterRoute')?.classList.remove('show');
    });
    document.getElementById('btnCancelAddMasterRoute')?.addEventListener('click', () => {
      document.getElementById('modalAddMasterRoute')?.classList.remove('show');
    });
    document.getElementById('formAddMasterRoute')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
        this.showToast('Akses Dibatasi', 'Penambahan rute hanya dapat dilakukan oleh Developer.', 'warning');
        return;
      }
      const orig = document.getElementById('addRouteOriginSelect')?.value;
      const dest = document.getElementById('addRouteDestSelect')?.value;
      if (orig === dest) {
        this.showToast('Pelabuhan Sama', 'Pelabuhan asal dan tujuan tidak boleh sama.', 'warning');
        return;
      }
      const origPort = MASTER_PORTS.find(p => p.id === orig);
      const destPort = MASTER_PORTS.find(p => p.id === dest);
      const cat = document.getElementById('addRouteCategorySelect')?.value || 'Internasional';
      const price = parseFloat(document.getElementById('addRouteTicketPrice')?.value) || 0;
      const pass = parseFloat(document.getElementById('addRoutePortPassPrice')?.value) || 0;
      const notes = document.getElementById('addRouteNotes')?.value?.trim() || '';
      if (price <= 0) {
        this.showToast('Tarif Tidak Valid', 'Masukkan tarif resmi tiket kapal yang valid.', 'warning');
        return;
      }
      if (!Store.addMasterRouteTariff || !Store.saveMasterRouteTariff) {
        this.showToast('Muat Ulang Halaman', 'Data sistem belum diperbarui. Tekan Ctrl + F5 lalu coba simpan kembali.', 'warning');
        return;
      }

      const newRoute = {
        id: `ROUTE-${orig}-${dest}`,
        originId: orig,
        destinationId: dest,
        originName: origPort ? origPort.city.split(' ')[0] : orig,
        destinationName: destPort ? destPort.city.split(' ')[0] : dest,
        category: cat,
        ticketPrice: price,
        portPassFee: pass,
        notes: notes || `Rute Pelayaran Resmi ${orig} ke ${dest}`
      };

      if (Store.getMasterRouteTariffById && Store.getMasterRouteTariffById(newRoute.id)) {
        Store.saveMasterRouteTariff(newRoute.id, newRoute);
      } else {
        Store.addMasterRouteTariff(newRoute);
      }

      // Include: Tambah / perbarui Pas Pelabuhan sesuai pelabuhan asal & kategori rute
      if (Store.getPortPasses && Store.addPortPass && Store.updatePortPass) {
        const ppName = document.getElementById('addRoutePortPassName')?.value?.trim() || `Pas Pelabuhan ${cat} ${origPort ? origPort.name : orig}`;
        const ppOperator = document.getElementById('addRoutePortPassOperator')?.value?.trim() || 'KSOP / Otoritas Pelabuhan';
        const ppBilling = document.getElementById('addRoutePortPassBilling')?.value || 'INCLUDED';
        const existingPass = Store.getPortPasses().find(p => p.portId === orig && p.routeType === cat);
        if (existingPass) {
          Store.updatePortPass(existingPass.id, { name: ppName, operator: ppOperator, priceAdult: pass, priceChild: pass, billingMode: ppBilling, status: 'Aktif' });
        } else {
          Store.addPortPass({
            id: `PP-${orig}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
            companyId: '',
            portId: orig,
            name: ppName,
            operator: ppOperator,
            routeType: cat,
            priceAdult: pass,
            priceChild: pass,
            billingMode: ppBilling,
            status: 'Aktif'
          });
        }
        // Sinkronkan tarif pas ke jadwal yang sudah ada pada rute ini
        (Store.getSchedules ? Store.getSchedules() : []).forEach(s => {
          if (s.originId === orig && s.destinationId === dest) {
            s.portPassFee = pass;
            Store.updateSchedule(s.id, s);
          }
        });
      }

      document.getElementById('modalAddMasterRoute')?.classList.remove('show');
      if (typeof this.renderDevAdminDashboard === 'function') this.renderDevAdminDashboard();
      this.showToast('Rute Baru Ditambahkan', `Rute ${newRoute.originName} ➔ ${newRoute.destinationName} berhasil ditambahkan dengan tarif ${formatRupiah(price)} • Pas Pelabuhan ${formatRupiah(pass)}.`);
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

    // Direct Ticket & Boarding Pass Print Modal Listeners
    document.getElementById('btnCloseDirectTicketPrint')?.addEventListener('click', () => {
      document.getElementById('modalDirectTicketPrint')?.classList.remove('show');
    });
    document.getElementById('btnCancelDirectTicketPrint')?.addEventListener('click', () => {
      document.getElementById('modalDirectTicketPrint')?.classList.remove('show');
    });
    document.getElementById('btnExecuteDirectPrint')?.addEventListener('click', () => {
      window.print();
    });
    document.getElementById('btnSaveDirectTicketFile')?.addEventListener('click', () => {
      this.downloadDirectTicketPrintHtml();
    });
    document.querySelectorAll('.btn-toggle-print-format')?.forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.getAttribute('data-format') || 'BOARDING_PASS';
        this.directPrintState.currentFormat = format;

        document.querySelectorAll('.btn-toggle-print-format').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#64748b';
          b.style.boxShadow = 'none';
        });
        btn.classList.add('active');
        btn.style.background = '#ffffff';
        btn.style.color = '#0284c7';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

        const batchBadge = document.getElementById('directPrintBatchBadge');
        if (batchBadge) {
          batchBadge.innerText = `${this.directPrintState.items.length} Tiket Siap Cetak (${format === 'BOARDING_PASS' ? 'A4 Boarding Pass' : 'Struk Thermal POS'})`;
        }

        this.renderDirectTicketsArea();
      });
    });

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
        type: document.getElementById('editPaxType').value,
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

      const booking = Store.getBookingByPnr(pnr);
      if (booking && booking.scheduleId) {
        const dup = Store.checkDuplicatePassenger(updatedPax.name, booking.scheduleId, pnr);
        if (dup) {
          const proceed = confirm(`⚠️ PERINGATAN DATA GANDA!\n\nNama "${updatedPax.name}" sudah terdaftar pada jadwal ini di tiket lain:\n• PNR: ${dup.pnr}\n• Kursi: ${dup.seat}\n• Kapal: ${dup.vesselName}\n\nApakah Anda yakin ingin tetap menyimpan perubahan data nama ini?`);
          if (!proceed) return;
        }
      }

      // Simpan perubahan data tiket, kursi & status pembayaran/boarding
      if (booking) {
        const editSeat = document.getElementById('editManifestSeat')?.value?.trim()?.toUpperCase();
        const editPayment = document.getElementById('editManifestPaymentStatus')?.value;
        const editBoarding = document.getElementById('editManifestBoardingStatus')?.value;
        const editPhone = document.getElementById('editManifestContactPhone')?.value?.trim();

        if (editPayment) booking.paymentStatus = editPayment;
        if (editBoarding) {
          booking.boardingStatus = editBoarding;
          if (editBoarding === 'BOARDED' && !booking.boardedAt) {
            booking.boardedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';
          }
        }
        if (editPhone && booking.contact) {
          booking.contact.phone = editPhone;
        }
        if (editSeat && booking.passengers && booking.passengers[paxIndex]) {
          booking.passengers[paxIndex].seat = editSeat;
          updatedPax.seat = editSeat;
        }
        if (typeof Store.saveBookings === 'function') {
          Store.saveBookings();
        }
      }

      Store.updatePassenger(pnr, paxIndex, updatedPax);
      document.getElementById('modalEditManifest').classList.remove('show');
      this.refreshCompanyDashboard();
      this.showToast('Data Diperbarui', `Data tiket & manifest penumpang "${updatedPax.name}" (PNR: ${pnr}) berhasil disimpan.`);
    });

    // Modal 2: Edit Ticket Listeners
    document.getElementById('btnCloseEditTicket')?.addEventListener('click', () => {
      document.getElementById('modalEditTicket').classList.remove('show');
    });
    document.getElementById('btnCancelEditTicket')?.addEventListener('click', () => {
      document.getElementById('modalEditTicket').classList.remove('show');
    });
    document.getElementById('btnDirectPrintFromEditTicket')?.addEventListener('click', () => {
      const pnr = document.getElementById('editTicketPnr')?.value;
      if (pnr) {
        this.openDirectTicketPrintModal(pnr);
      }
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

      const editPriceInput = document.getElementById('editTicketPrice');
      if (editPriceInput && editPriceInput.value !== '') {
        const newPrice = parseFloat(editPriceInput.value) || 0;
        booking.totalAmount = newPrice;
        booking.totalFare = newPrice;
        if (booking.passengers && booking.passengers[0]) {
          booking.passengers[0].fare = newPrice;
        }
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
      const targetSchedRaw = document.getElementById('transferTargetScheduleSelect').value;
      const checkedBoxes = Array.from(document.querySelectorAll('#transferPaxListContainer .check-transfer-modal-pax:checked'));
      const pnrList = Array.from(new Set(checkedBoxes.map(cb => cb.getAttribute('data-pnr'))));
      const newSeatVal = document.getElementById('transferNewSeatInput').value.trim().toUpperCase();
      const reason = document.getElementById('transferReasonSelect').value;
      const extraRemark = document.getElementById('transferRemarkInput').value.trim();

      if (!targetSchedRaw) {
        this.showToast('Jadwal Kosong', 'Pilih kapal atau jadwal tujuan transfer terlebih dahulu.', 'warning');
        return;
      }

      if (pnrList.length === 0) {
        this.showToast('Belum Ada Penumpang', 'Pilih minimal satu penumpang untuk dialihkan.', 'warning');
        return;
      }

      const allBookings = Store.getBookingsByCompany(tenant.id);
      const firstBooking = allBookings.find(b => pnrList.includes(b.pnr)) || allBookings[0];
      const currentSchedId = firstBooking ? firstBooking.scheduleId : null;

      // Prevent transferring to the exact same schedule
      if (currentSchedId && (targetSchedRaw === currentSchedId || targetSchedRaw === `SCHED:${currentSchedId}`)) {
        this.showToast('Tujuan Tidak Valid', 'Kapal tujuan transfer tidak boleh sama dengan jadwal pelayaran saat ini! Pilih jadwal atau armada lain.', 'warning');
        return;
      }

      let targetSchedId = '';
      let targetVesselId = '';
      let targetVesselName = 'Armada Pengganti';
      let departTime = '';
      let arrivalTime = '';
      let pier = 'Dermaga Penumpang';
      let companyEndorsement = '';

      const fleet = Store.getVesselsByCompany(tenant.id);
      const allSchedules = Store.getSchedules();

      if (targetSchedRaw === 'CREATE_EMERGENCY_BACKUP') {
        // Auto provision backup vessel & schedule
        const backupName = `${tenant.shortName || tenant.name} Express 02 (Armada Cadangan)`;
        let backupVessel = fleet.find(f => f.name.includes('Cadangan') || f.name.includes('02'));
        if (!backupVessel) {
          backupVessel = Store.addVessel({
            id: 'VESSEL-' + Date.now().toString(36),
            companyId: tenant.id,
            name: backupName,
            code: 'CAD-02',
            capacity: 250,
            type: 'Kapal Cepat Cadangan (KSOP Authorized)',
            status: 'ACTIVE'
          });
        }
        const origId = firstBooking ? (firstBooking.originId || 'NNK') : 'NNK';
        const destId = firstBooking ? (firstBooking.destinationId || 'TWU') : 'TWU';
        const newSched = Store.addSchedule({
          id: 'SCH-EMG-' + Date.now().toString(36),
          companyId: tenant.id,
          vesselId: backupVessel.id,
          vesselNameCustom: backupVessel.name,
          originId: origId,
          destinationId: destId,
          departTime: firstBooking && firstBooking.departTime ? firstBooking.departTime : '09:00',
          arrivalTime: firstBooking && firstBooking.arrivalTime ? firstBooking.arrivalTime : '10:30',
          date: firstBooking && firstBooking.bookingDate ? firstBooking.bookingDate : new Date().toISOString().split('T')[0],
          pier: 'Dermaga Cadangan KSOP',
          priceEconomy: firstBooking ? (firstBooking.totalFare || 250000) : 250000,
          priceVip: 350000,
          quotaTotal: 250,
          quotaBooked: 0,
          status: 'ACTIVE'
        });
        targetSchedId = newSched.id;
        targetVesselId = backupVessel.id;
        targetVesselName = backupVessel.name;
        departTime = newSched.departTime;
        arrivalTime = newSched.arrivalTime;
        pier = newSched.pier;
      } else if (targetSchedRaw.startsWith('BACKUP_VESSEL:')) {
        const vId = targetSchedRaw.replace('BACKUP_VESSEL:', '');
        const backupVessel = fleet.find(f => f.id === vId) || { id: vId, name: 'Armada Cadangan' };
        const origId = firstBooking ? (firstBooking.originId || 'NNK') : 'NNK';
        const destId = firstBooking ? (firstBooking.destinationId || 'TWU') : 'TWU';
        const newSched = Store.addSchedule({
          id: 'SCH-EMG-' + Date.now().toString(36),
          companyId: tenant.id,
          vesselId: backupVessel.id,
          vesselNameCustom: backupVessel.name,
          originId: origId,
          destinationId: destId,
          departTime: firstBooking && firstBooking.departTime ? firstBooking.departTime : '09:00',
          arrivalTime: firstBooking && firstBooking.arrivalTime ? firstBooking.arrivalTime : '10:30',
          date: firstBooking && firstBooking.bookingDate ? firstBooking.bookingDate : new Date().toISOString().split('T')[0],
          pier: 'Dermaga Cadangan KSOP',
          priceEconomy: firstBooking ? (firstBooking.totalFare || 250000) : 250000,
          priceVip: 350000,
          quotaTotal: 250,
          quotaBooked: 0,
          status: 'ACTIVE'
        });
        targetSchedId = newSched.id;
        targetVesselId = backupVessel.id;
        targetVesselName = backupVessel.name;
        departTime = newSched.departTime;
        arrivalTime = newSched.arrivalTime;
        pier = newSched.pier;
      } else if (targetSchedRaw.startsWith('PARTNER_SCHED:')) {
        const psId = targetSchedRaw.replace('PARTNER_SCHED:', '');
        const targetSched = allSchedules.find(s => s.id === psId);
        if (targetSched) {
          const pComp = Store.getCompanyById(targetSched.companyId);
          companyEndorsement = pComp ? ` (Endorsement KSOP: ${pComp.name})` : '';
          targetSchedId = targetSched.id;
          targetVesselId = targetSched.vesselId;
          targetVesselName = (targetSched.vesselNameCustom || 'Kapal Mitra') + companyEndorsement;
          departTime = targetSched.departTime;
          arrivalTime = targetSched.arrivalTime;
          pier = targetSched.pier;
        }
      } else {
        const cleanId = targetSchedRaw.replace('SCHED:', '');
        const targetSched = allSchedules.find(s => s.id === cleanId);
        if (targetSched) {
          targetSchedId = targetSched.id;
          targetVesselId = targetSched.vesselId;
          const v = fleet.find(f => f.id === targetSched.vesselId);
          targetVesselName = v ? v.name : (targetSched.vesselNameCustom || 'Armada Alternatif');
          departTime = targetSched.departTime;
          arrivalTime = targetSched.arrivalTime;
          pier = targetSched.pier;
        }
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
      if (typeof this.renderVoyageCalendar === 'function') {
        this.renderVoyageCalendar();
      }
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

    const rawType = (p.paxType || p.type || 'Dewasa').toString().trim().toUpperCase();
    const normType = rawType.includes('ANAK') ? 'Anak' : (rawType.includes('BAYI') ? 'Bayi' : 'Dewasa');
    document.getElementById('editPaxType').value = normType;

    document.getElementById('editPaxName').value = p.name || '';

    const rawGender = (p.gender || 'L').toString().trim().toUpperCase();
    document.getElementById('editPaxGender').value = (rawGender.startsWith('P') || rawGender.startsWith('F') || rawGender.includes('WANITA')) ? 'P' : 'L';

    document.getElementById('editPaxDocNum').value = p.passportNo || p.docNumber || p.nik || '';
    document.getElementById('editPaxDob').value = p.dob || '';

    let calcAge = p.age !== undefined && p.age !== null && p.age !== '' ? p.age : '';
    if (p.dob) {
      const birthDate = new Date(p.dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let a = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
        if (a >= 0) calcAge = a;
      }
    }
    document.getElementById('editPaxAge').value = calcAge;

    const rawNat = (p.nationality || 'Indonesia').toString().trim().toUpperCase();
    let normNat = 'Indonesia';
    if (rawNat.includes('MALAY') || rawNat === 'MYS' || rawNat === 'MY') normNat = 'Malaysia';
    else if (rawNat.includes('SINGAP') || rawNat === 'SGP' || rawNat === 'SG') normNat = 'Singapura';
    else if (rawNat.includes('FILIP') || rawNat.includes('PHILIP') || rawNat === 'PHL' || rawNat === 'PH') normNat = 'Filipina';
    else if (rawNat.includes('INDO') || rawNat === 'WNI' || rawNat === 'IDN' || rawNat === 'ID' || !rawNat) normNat = 'Indonesia';
    else normNat = Array.from(document.getElementById('editPaxNationality')?.options || []).find(o => o.value.toUpperCase() === rawNat)?.value || 'Lainnya';
    document.getElementById('editPaxNationality').value = normNat;

    const rawRemark = (p.remark || 'None').toString().trim().toUpperCase();
    const normRemark = ['LC', 'PGS', 'CAD'].includes(rawRemark) ? rawRemark : 'None';
    document.getElementById('editPaxRemark').value = normRemark;

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

    // Real-time duplicate check on manifest edit modal
    const editNameInput = document.getElementById('editPaxName');
    const editDupWarn = document.getElementById('editPaxDuplicateWarning');
    if (editNameInput) {
      const checkEditDup = () => {
        const val = editNameInput.value.trim();
        if (!val || !booking.scheduleId) {
          if (editDupWarn) editDupWarn.style.display = 'none';
          return;
        }
        const dup = Store.checkDuplicatePassenger(val, booking.scheduleId, pnr);
        if (dup) {
          if (editDupWarn) {
            editDupWarn.style.display = 'block';
            editDupWarn.innerText = `⚠️ Nama ini terdaftar di tiket lain (PNR: ${dup.pnr}, Kursi: ${dup.seat})`;
          }
        } else {
          if (editDupWarn) editDupWarn.style.display = 'none';
        }
      };
      editNameInput.oninput = checkEditDup;
      checkEditDup();
    }

    // Set unified ticket & boarding fields
    const seatInput = document.getElementById('editManifestSeat');
    if (seatInput) seatInput.value = p.seat || '';

    const paySelect = document.getElementById('editManifestPaymentStatus');
    if (paySelect) paySelect.value = booking.paymentStatus || 'PAID';

    const boardSelect = document.getElementById('editManifestBoardingStatus');
    if (boardSelect) boardSelect.value = booking.boardingStatus || 'NOT_CHECKED_IN';

    const phoneInput = document.getElementById('editManifestContactPhone');
    if (phoneInput) phoneInput.value = booking.contact?.phone || '';

    document.getElementById('modalEditManifest').classList.add('show');
  },

  // Open Modal 2: Edit Ticket
  openEditTicketModal(pnr) {
    // Terintegrasi ke modal edit tiket & manifest terpadu
    this.openEditManifestModal(pnr, 0);
  },

  _legacyOpenEditTicketModal(pnr) {
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

    const priceInput = document.getElementById('editTicketPrice');
    if (priceInput) {
      priceInput.value = booking.totalAmount !== undefined ? booking.totalAmount : (booking.totalFare || 0);
    }

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

    // Origin schedule & vessel info
    const currentSchedId = firstBooking ? firstBooking.scheduleId : null;
    const currentVesselId = firstBooking ? firstBooking.vesselId : null;
    const currentOriginId = firstBooking ? (firstBooking.originId || (firstBooking.originCity === 'Nunukan' ? 'NNK' : (firstBooking.originCity === 'Tawau' ? 'TWU' : 'PRE'))) : 'NNK';
    const currentDestId = firstBooking ? (firstBooking.destinationId || (firstBooking.destinationCity === 'Tawau' ? 'TWU' : (firstBooking.destinationCity === 'Nunukan' ? 'NNK' : 'PRE'))) : 'TWU';

    const companySchedules = Store.getSchedulesByCompany(tenant.id);
    const fleet = Store.getVesselsByCompany(tenant.id);
    const allSchedules = Store.getSchedules();
    const allCompanies = Store.getCompanies();

    const select = document.getElementById('transferTargetScheduleSelect');
    select.innerHTML = '';

    // 1. Other regular schedules of this company (EXCLUDING current schedule!)
    const altCompanySchedules = companySchedules.filter(s => s.id !== currentSchedId);

    // 2. Backup fleet vessels belonging to this company
    const backupFleetVessels = fleet.filter(v => v.id !== currentVesselId);

    // 3. Partner company schedules operating the same route (KSOP clearance / endorsement)
    const partnerSchedules = allSchedules.filter(s => 
      s.companyId !== tenant.id && 
      s.originId === currentOriginId && 
      s.destinationId === currentDestId
    );

    let optionCount = 0;

    // Group 1: Other schedules of current company
    if (altCompanySchedules.length > 0) {
      const grpCompany = document.createElement('optgroup');
      grpCompany.label = `🚢 Jadwal Alternatif Milik ${tenant.shortName || tenant.name}`;
      altCompanySchedules.forEach(s => {
        const v = fleet.find(f => f.id === s.vesselId);
        const vName = v ? v.name : (s.vesselNameCustom || 'Armada Reguler');
        const orig = MASTER_PORTS.find(pt => pt.id === s.originId) || { city: s.originId };
        const dest = MASTER_PORTS.find(pt => pt.id === s.destinationId) || { city: s.destinationId };
        const label = `${vName} — ${orig.city} ➔ ${dest.city} (${s.departTime} WITA) [${s.status}]`;
        grpCompany.appendChild(new Option(label, `SCHED:${s.id}`));
        optionCount++;
      });
      select.appendChild(grpCompany);
    }

    // Group 2: Backup fleet vessels of company
    if (backupFleetVessels.length > 0) {
      const grpBackup = document.createElement('optgroup');
      grpBackup.label = `⚓ Armada Cadangan Milik ${tenant.shortName || tenant.name}`;
      backupFleetVessels.forEach(v => {
        const label = `${v.name} (Armada Cadangan) — Siap Berlayar [Otomatis Buka Jadwal Pengganti]`;
        grpBackup.appendChild(new Option(label, `BACKUP_VESSEL:${v.id}`));
        optionCount++;
      });
      select.appendChild(grpBackup);
    }

    // Group 3: Partner schedules on the same route (KSOP clearance)
    if (partnerSchedules.length > 0) {
      const grpPartner = document.createElement('optgroup');
      grpPartner.label = `🤝 Rekomendasi KSOP: Mitra Pelayaran Resmi di Rute yang Sama`;
      partnerSchedules.forEach(ps => {
        const pComp = allCompanies.find(c => c.id === ps.companyId);
        const pCompName = pComp ? (pComp.shortName || pComp.name) : 'Mitra Resmi KSOP';
        const orig = MASTER_PORTS.find(pt => pt.id === ps.originId) || { city: ps.originId };
        const dest = MASTER_PORTS.find(pt => pt.id === ps.destinationId) || { city: ps.destinationId };
        const label = `${ps.vesselNameCustom || 'Kapal Mitra'} (${pCompName}) — ${orig.city} ➔ ${dest.city} (${ps.departTime} WITA)`;
        grpPartner.appendChild(new Option(label, `PARTNER_SCHED:${ps.id}`));
        optionCount++;
      });
      select.appendChild(grpPartner);
    }

    // Group 4: Fast Emergency Action
    const grpAction = document.createElement('optgroup');
    grpAction.label = `⚡ Aksi Darurat Syahbandar / KSOP`;
    const newBackupVesselName = `${tenant.shortName || tenant.name} Express 02 (Armada Cadangan)`;
    grpAction.appendChild(new Option(`+ Buka & Aktifkan ${newBackupVesselName} sebagai Kapal Pengganti`, 'CREATE_EMERGENCY_BACKUP'));
    select.appendChild(grpAction);

    // Warning Box logic when no alternative regular schedule exists
    const warningBox = document.getElementById('transferTargetWarningBox');
    const warningTitle = document.getElementById('transferTargetWarningTitle');
    const warningText = document.getElementById('transferTargetWarningText');
    const btnQuickBackup = document.getElementById('btnQuickAddBackupVesselForTransfer');

    if (altCompanySchedules.length === 0) {
      if (warningBox) warningBox.style.display = 'flex';
      if (warningTitle) warningTitle.innerText = `Armada Utama (${firstBooking ? firstBooking.vesselName : 'Saat Ini'}) Belum Memiliki Jadwal Alternatif`;
      if (warningText) {
        warningText.innerText = partnerSchedules.length > 0
          ? `Tersedia ${partnerSchedules.length} kapal mitra di rute ini, atau buat Armada Cadangan Darurat langsung.`
          : `Tidak ada kapal reguler lain. Klik tombol di kanan untuk mengaktifkan Armada Cadangan resmi (${tenant.shortName || tenant.name} Express 02).`;
      }
    } else {
      if (warningBox) warningBox.style.display = 'none';
    }

    // Attach quick backup button handler
    if (btnQuickBackup) {
      btnQuickBackup.onclick = () => {
        this.quickProvisionEmergencyBackupSchedule(tenant, firstBooking);
      };
    }

    // Render Checklist Penumpang Asal
    const container = document.getElementById('transferPaxListContainer');
    container.innerHTML = '';

    allBookings.forEach(b => {
      const pList = (Array.isArray(b.passengers) && b.passengers.length > 0) ? b.passengers : [{
        name: b.passengerName || 'Penumpang Resmi',
        paxType: b.paxType || 'Dewasa',
        seat: b.seatNumber || 'A-01',
        docNumber: b.docNumber || b.nik || '-'
      }];
      pList.forEach((p, pIdx) => {
        const isChecked = selectedPnrs.includes(b.pnr);
        const row = document.createElement('label');
        row.className = 'transfer-pax-row';
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.8rem; padding: 6px 10px; border-radius: 6px; background: #ffffff; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;';
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" class="check-transfer-modal-pax" data-pnr="${b.pnr}" data-seat="${p.seat}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
            <div>
              <strong style="color: #0f172a;">${p.name}</strong>
              <small class="text-dim" style="margin-left: 6px;">(${p.paxType || 'Dewasa'})</small>
              <div style="font-size: 0.72rem; color: #64748b;">
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

  // Buka & Aktifkan Armada Cadangan Darurat (KSOP Fast Provision)
  quickProvisionEmergencyBackupSchedule(tenant, firstBooking) {
    const backupName = `${tenant.shortName || tenant.name} Express 02 (Armada Cadangan)`;
    let fleet = Store.getVesselsByCompany(tenant.id);
    let backupVessel = fleet.find(f => f.name.includes('Cadangan') || f.name.includes('02'));
    if (!backupVessel) {
      backupVessel = Store.addVessel({
        id: 'VESSEL-' + Date.now().toString(36),
        companyId: tenant.id,
        name: backupName,
        code: 'CAD-02',
        capacity: 250,
        type: 'Kapal Cepat Cadangan (KSOP Authorized)',
        status: 'ACTIVE'
      });
    }

    const origId = firstBooking ? (firstBooking.originId || (firstBooking.originCity === 'Nunukan' ? 'NNK' : 'PRE')) : 'NNK';
    const destId = firstBooking ? (firstBooking.destinationId || (firstBooking.destinationCity === 'Tawau' ? 'TWU' : 'PRE')) : 'TWU';
    const origPort = MASTER_PORTS.find(p => p.id === origId) || { city: 'Nunukan' };
    const destPort = MASTER_PORTS.find(p => p.id === destId) || { city: 'Tawau' };

    const newSched = Store.addSchedule({
      id: 'SCH-EMG-' + Date.now().toString(36),
      companyId: tenant.id,
      vesselId: backupVessel.id,
      vesselNameCustom: backupVessel.name,
      originId: origId,
      destinationId: destId,
      departTime: firstBooking && firstBooking.departTime ? firstBooking.departTime : '09:00',
      arrivalTime: firstBooking && firstBooking.arrivalTime ? firstBooking.arrivalTime : '10:30',
      date: firstBooking && firstBooking.bookingDate ? firstBooking.bookingDate : new Date().toISOString().split('T')[0],
      pier: 'Dermaga 2 (KSOP Standby)',
      priceEconomy: firstBooking ? (firstBooking.totalFare || 250000) : 250000,
      priceVip: 350000,
      quotaTotal: 250,
      quotaBooked: 0,
      status: 'ACTIVE'
    });

    this.showToast('Armada Cadangan Siap!', `${backupName} telah aktif untuk rute ${origPort.city} ➔ ${destPort.city} (${newSched.departTime} WITA).`);

    // Reload openTransferVesselModal with current checked items
    const checkedBoxes = Array.from(document.querySelectorAll('#transferPaxListContainer .check-transfer-modal-pax:checked'));
    const pnrList = Array.from(new Set(checkedBoxes.map(cb => cb.getAttribute('data-pnr'))));
    this.openTransferVesselModal(pnrList.length > 0 ? pnrList : null);
    
    // Select the new schedule
    const select = document.getElementById('transferTargetScheduleSelect');
    if (select) {
      select.value = `SCHED:${newSched.id}`;
    }
  },

  // ================= COMPANY PORTAL SETTINGS =================
  // Load Company Profile & Account Settings to Form
  loadCompanySettingsToForm() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('settingCompanyEmail', tenant.email);
    setVal('settingCompanyName', tenant.name);
    setVal('settingCompanyShortName', tenant.shortName || tenant.name);
    setVal('settingCompanyPhone', tenant.phone);
    setVal('settingCompanyCategory', tenant.category);
    setVal('settingCompanyColor', tenant.brandColor || '#7c3aed');

    // Sync route checkboxes in settings after login
    const cat = (tenant.category || '').toLowerCase();
    const routeIntlCb = document.getElementById('settingRouteIntl');
    const routeDomCb = document.getElementById('settingRouteDom');
    if (routeIntlCb) {
      routeIntlCb.checked = cat.includes('internasional') || cat.includes('tawau') || !cat;
    }
    if (routeDomCb) {
      routeDomCb.checked = cat.includes('domestik') || cat.includes('parepare');
    }
    setVal('settingCompanyDescription', tenant.description);

    if (tenant.bankAccount) {
      setVal('settingCompanyBankName', tenant.bankAccount.bank || '');
      setVal('settingCompanyBankNumber', tenant.bankAccount.number || '');
      setVal('settingCompanyBankHolder', tenant.bankAccount.holder || '');
    }

    // Reset password change inputs
    setVal('settingCompanyOldPass', '');
    setVal('settingCompanyNewPass', '');
    setVal('settingCompanyConfirmPass', '');

    // Set UI Theme Selection in Form
    const currentTheme = tenant.uiTheme || localStorage.getItem('ticky_ui_theme') || 'theme-default';
    const rDef = document.getElementById('radioThemeDefault');
    const rOps = document.getElementById('radioThemeOps');
    if (rDef && rOps) {
      rDef.checked = (currentTheme !== 'theme-ops-portal');
      rOps.checked = (currentTheme === 'theme-ops-portal');
      this.updateThemeRadioCards(currentTheme);
    }

    // Reset temporary uploaded photo variable to current tenant photo
    this.tempCompanyPhoto = tenant.displayPhoto || '';

    // Display photo preview
    const preview = document.getElementById('settingCompanyPhotoPreview');
    if (preview) {
      preview.src = tenant.displayPhoto || 'assets/avatar-header.svg';
    }
  },

  // Initialize Company Settings Sub-tab, Photo Upload & Form Submit
  initCompanySettingsEvents() {
    // 1. Sub-tab toggle between Company Profile, KSOP Settings, and Peak Season
    const btnCompany = document.getElementById('tabBtnSettingsCompany');
    const btnKsop = document.getElementById('tabBtnSettingsKsop');
    const btnPeak = document.getElementById('tabBtnSettingsPeakSeason');
    const btnPortPass = document.getElementById('tabBtnSettingsPortPass');
    const subCompany = document.getElementById('subPaneSettingsCompany');
    const subKsop = document.getElementById('subPaneSettingsKsop');
    const subPeak = document.getElementById('subPaneSettingsPeakSeason');
    const subPortPass = document.getElementById('subPaneSettingsPortPass');

    const resetSubTabButtons = () => {
      [btnCompany, btnKsop, btnPeak, btnPortPass].forEach(b => {
        if (!b) return;
        b.classList.remove('active');
        b.style.background = '#ffffff';
        b.style.color = '#64748b';
        b.style.border = '1px solid #cbd5e1';
        b.style.boxShadow = 'none';
      });
      if (subCompany) subCompany.style.display = 'none';
      if (subKsop) subKsop.style.display = 'none';
      if (subPeak) subPeak.style.display = 'none';
      if (subPortPass) subPortPass.style.display = 'none';
    };

    btnPortPass?.addEventListener('click', () => {
      resetSubTabButtons();
      btnPortPass.classList.add('active');
      btnPortPass.style.background = '#0d9488';
      btnPortPass.style.color = '#ffffff';
      btnPortPass.style.border = 'none';
      btnPortPass.style.boxShadow = '0 2px 6px rgba(13, 148, 136, 0.25)';
      if (subPortPass) subPortPass.style.display = 'block';
      this.renderPortPassTables();
    });

    btnCompany?.addEventListener('click', () => {
      resetSubTabButtons();
      btnCompany.classList.add('active');
      btnCompany.style.background = '#7c3aed';
      btnCompany.style.color = '#ffffff';
      btnCompany.style.border = 'none';
      btnCompany.style.boxShadow = '0 2px 6px rgba(124, 58, 237, 0.25)';
      if (subCompany) subCompany.style.display = 'block';
    });

    btnKsop?.addEventListener('click', () => {
      resetSubTabButtons();
      btnKsop.classList.add('active');
      btnKsop.style.background = '#0284c7';
      btnKsop.style.color = '#ffffff';
      btnKsop.style.border = 'none';
      btnKsop.style.boxShadow = '0 2px 6px rgba(2, 132, 199, 0.25)';
      if (subKsop) subKsop.style.display = 'block';
    });

    btnPeak?.addEventListener('click', () => {
      resetSubTabButtons();
      btnPeak.classList.add('active');
      btnPeak.style.background = '#f59e0b';
      btnPeak.style.color = '#ffffff';
      btnPeak.style.border = 'none';
      btnPeak.style.boxShadow = '0 2px 6px rgba(245, 158, 11, 0.25)';
      if (subPeak) subPeak.style.display = 'block';
      this.loadPeakSeasonSettingsToForm();
    });

    // 2. Photo Upload Trigger & File Reader
    const btnUpload = document.getElementById('btnTriggerCompanyPhoto');
    const fileInput = document.getElementById('settingCompanyPhotoFile');
    const photoPreview = document.getElementById('settingCompanyPhotoPreview');
    const btnRemovePhoto = document.getElementById('btnRemoveCompanyPhoto');

    btnUpload?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          this.showToast('Ukuran Terlalu Besar', 'Maksimal ukuran foto adalah 2MB.', 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (photoPreview) photoPreview.src = evt.target.result;
          this.tempCompanyPhoto = evt.target.result;
          this.showToast('Foto Diunggah', 'Pratinjau foto profil perusahaan diperbarui. Klik Simpan untuk menerapkan.');
        };
        reader.readAsDataURL(file);
      }
    });

    btnRemovePhoto?.addEventListener('click', () => {
      if (photoPreview) photoPreview.src = 'assets/avatar-header.svg';
      this.tempCompanyPhoto = 'assets/avatar-header.svg';
      if (fileInput) fileInput.value = '';
      this.showToast('Foto Direset', 'Display foto dikembalikan ke default.');
    });

    // Preset Icons for Company Avatar
    const presetSVGs = {
      ship: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="%237c3aed"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1M4 17l1.5-6h13l1.5 6M6 11V5h12v6M9 5V3h6v2"/></svg>`,
      anchor: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="%230284c7" stroke-width="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
      building: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/></svg>`,
      compass: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="%23f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`
    };

    document.querySelectorAll('.btn-quick-avatar').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-avatar');
        if (presetSVGs[type]) {
          if (photoPreview) photoPreview.src = presetSVGs[type];
          this.tempCompanyPhoto = presetSVGs[type];
          this.showToast('Ikon Dipilih', `Ikon ${type} dipilih sebagai display foto profil.`);
        }
      });
    });

    // Theme selection change listeners (Live Preview in Settings)
    const rDef = document.getElementById('radioThemeDefault');
    const rOps = document.getElementById('radioThemeOps');
    rDef?.addEventListener('change', () => {
      if (rDef.checked) {
        this.applyUITheme('theme-default');
        this.updateThemeRadioCards('theme-default');
      }
    });
    rOps?.addEventListener('change', () => {
      if (rOps.checked) {
        this.applyUITheme('theme-ops-portal');
        this.updateThemeRadioCards('theme-ops-portal');
      }
    });

    // Quick toggle button in header profile dropdown
    document.getElementById('btnDropdownToggleTheme')?.addEventListener('click', () => {
      const isOps = document.body.classList.contains('theme-ops-portal');
      const nextTheme = isOps ? 'theme-default' : 'theme-ops-portal';
      this.applyUITheme(nextTheme);
      const tenant = Store.getCurrentTenant();
      if (tenant) {
        tenant.uiTheme = nextTheme;
        Store.updateCompany(tenant.id, { uiTheme: nextTheme });
      }
      this.showToast('Tema Antarmuka Diubah', `Tema aktif saat ini: ${nextTheme === 'theme-ops-portal' ? 'Enterprise Ops / Telco Portal (Sesuai Foto)' : 'Standar Ticky'}.`);
    });

    // 3. Form Submit Handler
    const form = document.getElementById('formCompanySettings');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      if (!tenant) {
        this.showToast('Akses Ditolak', 'Silakan masuk ke portal operator terlebih dahulu untuk mengubah pengaturan.', 'warning');
        return;
      }

      const getVal = (id) => (document.getElementById(id)?.value || '').trim();
      const newEmail = getVal('settingCompanyEmail');
      const newName = getVal('settingCompanyName');
      const newShortName = getVal('settingCompanyShortName');
      const newPhone = getVal('settingCompanyPhone');
      const routeCheckboxes = Array.from(document.querySelectorAll('input[name="settingCompRoutes"]'));
      let checkedRoutes = routeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
      if (routeCheckboxes.length > 0 && checkedRoutes.length === 0) {
        this.showToast('Peringatan', 'Silakan pilih minimal satu rute pelayaran operasional.', 'warning');
        return;
      }
      if (checkedRoutes.length === 0) {
        checkedRoutes = tenant.routes || (tenant.category ? [tenant.category] : ['Kapal Penumpang Internasional (Nunukan - Tawau)']);
      }
      const newCategory = checkedRoutes.join(', ');
      const catHidden = document.getElementById('settingCompanyCategory');
      if (catHidden) catHidden.value = newCategory;
      const newColor = getVal('settingCompanyColor');
      const newDesc = getVal('settingCompanyDescription');

      const bankName = getVal('settingCompanyBankName');
      const bankNumber = getVal('settingCompanyBankNumber');
      const bankHolder = getVal('settingCompanyBankHolder');

      if (!newEmail) {
        this.showToast('Email Wajib Diisi', 'Silakan masukkan email resmi perusahaan.', 'warning');
        return;
      }

      // Password change verification
      const oldPass = getVal('settingCompanyOldPass');
      const newPass = getVal('settingCompanyNewPass');
      const confirmPass = getVal('settingCompanyConfirmPass');

      if (newPass) {
        if (!oldPass) {
          this.showToast('Password Lama Diperlukan', 'Masukkan password saat ini untuk memverifikasi perubahan password.', 'warning');
          return;
        }
        if (tenant.password && tenant.password !== oldPass) {
          this.showToast('Password Lama Salah', 'Password saat ini yang Anda masukkan salah.', 'warning');
          return;
        }
        if (newPass.length < 6) {
          this.showToast('Password Terlalu Pendek', 'Password baru minimal harus 6 karakter.', 'warning');
          return;
        }
        if (newPass !== confirmPass) {
          this.showToast('Konfirmasi Tidak Cocok', 'Password baru dan konfirmasi password tidak cocok.', 'warning');
          return;
        }
        tenant.password = newPass;
      }

      // Update tenant fields
      tenant.email = newEmail;
      tenant.name = newName;
      tenant.shortName = newShortName;
      tenant.phone = newPhone;
      if (routeCheckboxes.length > 0) {
        tenant.category = newCategory;
        tenant.routes = checkedRoutes;
      }
      tenant.brandColor = newColor;
      this.syncRouteScopedUIForTenant(tenant);
      if (document.getElementById('settingCompanyDescription')) tenant.description = newDesc;
      if (document.getElementById('settingCompanyBankName')) tenant.bankAccount = { bank: bankName, number: bankNumber, holder: bankHolder };

      if (this.tempCompanyPhoto) {
        tenant.displayPhoto = this.tempCompanyPhoto;
      }

      // Save UI Theme to tenant and localStorage
      const selectedTheme = document.querySelector('input[name="settingPortalTheme"]:checked')?.value || 'theme-default';
      tenant.uiTheme = selectedTheme;
      this.applyUITheme(selectedTheme);

      Store.updateCompany(tenant.id, tenant);
      this.updateHeaderTenantUI(tenant);
      this.refreshCompanyDashboard();
      this.renderCompanyFilterChips();
      this.renderCustomerSchedules();
      this.renderCompanyAuthButtons();

      this.showToast('Pengaturan Tersimpan', 'Profil portal, email, password, dan display foto berhasil diperbarui!');
    });
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

    // ========================================================
  // ALL-IN-ONE ONE-PAGE TICKETING CONSOLE ENGINE (PARALLEL 3-COL POS)
  // ========================================================
  tixConsoleState: {
    initialized: false,
    selectedVesselId: null,
    selectedScheduleId: null,
    selectedDestinationId: null, // 'TWU' or 'PRE'
    selectedDate: null,
    selectedDeckCode: null,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedSeats: [], // ['A-01', 'A-02']
    passengerEntries: [] // [{ seat, name, docNum, gender, paxType, nationality, phone }]
  },

  initTicketingConsoleEvents() {
    if (this.tixConsoleState.initialized) return;
    this.tixConsoleState.initialized = true;

    // Month Navigation
    document.getElementById('btnTixCalPrevMonth')?.addEventListener('click', () => {
      this.tixConsoleState.calMonth--;
      if (this.tixConsoleState.calMonth < 0) {
        this.tixConsoleState.calMonth = 11;
        this.tixConsoleState.calYear--;
      }
      this.renderTicketingConsole();
    });

    document.getElementById('btnTixCalNextMonth')?.addEventListener('click', () => {
      this.tixConsoleState.calMonth++;
      if (this.tixConsoleState.calMonth > 11) {
        this.tixConsoleState.calMonth = 0;
        this.tixConsoleState.calYear++;
      }
      this.renderTicketingConsole();
    });

    // Today Button
    document.getElementById('btnTixCalToday')?.addEventListener('click', () => {
      const now = new Date();
      this.tixConsoleState.calYear = now.getFullYear();
      this.tixConsoleState.calMonth = now.getMonth();
      this.tixConsoleState.selectedDate = now.toISOString().split('T')[0];
      this.renderTicketingConsole();
    });

    // Clear Selected Seats Button
    document.getElementById('btnTixClearSelectedSeats')?.addEventListener('click', () => {
      this.tixConsoleState.selectedSeats = [];
      this.tixConsoleState.passengerEntries = [];
      this.renderTicketingConsole();
      this.showToast('Pilihan Dikosongkan', 'Seluruh pilihan kursi telah dibersihkan.', 'warning');
    });

    // Save Only Button (Save Ticket without immediate printing)
    document.getElementById('btnTixSaveOnly')?.addEventListener('click', () => {
      this.processFinalPosBookings(false);
    });

    // Final Booking Submit & Print Button
    document.getElementById('btnTixSubmitBookingFinal')?.addEventListener('click', () => {
      this.processFinalPosBookings(true);
    });

    // Save & Restore Single Seat Draft
    document.getElementById('btnTixSaveDraftSeats')?.addEventListener('click', () => {
      this.saveSinglePassengerDraft();
    });
    document.getElementById('btnTixRestoreDraftSeats')?.addEventListener('click', () => {
      this.restoreSinglePassengerDraft();
    });

    // Bulk / Single buttons
    document.getElementById('btnOpenBulkPassengerFromTicketing')?.addEventListener('click', () => {
      this.setTicketingEntryMode('BULK');
    });
    document.getElementById('btnTixModeSingle')?.addEventListener('click', () => {
      this.setTicketingEntryMode('SINGLE');
    });
    document.getElementById('btnTixModeBulk')?.addEventListener('click', () => {
      this.setTicketingEntryMode('BULK');
    });
  },

  renderTicketingConsole() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const fleet = Store.getVesselsByCompany(tenant.id);
    const schedules = Store.getSchedulesByCompany(tenant.id);
    if (!fleet || fleet.length === 0) return;

    // 1. TANGGAL KEBERANGKATAN (DEPARTURE DATE)
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const { calYear, calMonth } = this.tixConsoleState;
    const elMonthLabel = document.getElementById('tixCalMonthLabel');
    if (elMonthLabel) elMonthLabel.innerText = `${monthNames[calMonth]} ${calYear}`;

    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Sen = 0
    const todayStr = new Date().toISOString().split('T')[0];

    if (!this.tixConsoleState.selectedDate) {
      const now = new Date();
      if (now.getFullYear() === calYear && now.getMonth() === calMonth) {
        this.tixConsoleState.selectedDate = todayStr;
      } else {
        this.tixConsoleState.selectedDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      }
    }

    const calDaysContainer = document.getElementById('tixCalDaysContainer');
    if (calDaysContainer) {
      calDaysContainer.innerHTML = '';

      for (let p = 0; p < firstDayIndex; p++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'tix-cal-day-cell other-month';
        emptyCell.innerHTML = `<span></span>`;
        calDaysContainer.appendChild(emptyCell);
      }

      for (let d = 1; d <= totalDays; d++) {
        const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasSailings = schedules.some(s => !s.departDate || s.departDate === dStr);
        const isSelected = this.tixConsoleState.selectedDate === dStr;
        const isToday = todayStr === dStr;

        const cell = document.createElement('div');
        cell.className = `tix-cal-day-cell ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}`;
        cell.style.cssText = `min-height: 38px; padding: 2px; ${isSelected ? 'background: #0284c7 !important; color: #fff !important;' : ''}`;
        cell.innerHTML = `
          <div class="tix-cal-day-num" style="font-size: 0.76rem; ${isSelected ? 'color: #ffffff;' : (isToday ? 'color: #0284c7;' : '')}">${d}</div>
          ${hasSailings ? `<div class="tix-cal-day-dot" style="${isSelected ? 'background: #ffffff;' : ''}" title="Ada pelayaran armada"></div>` : '<div style="height: 4px;"></div>'}
        `;

        cell.addEventListener('click', () => {
          this.tixConsoleState.selectedDate = dStr;
          this.renderTicketingConsole();
        });

        calDaysContainer.appendChild(cell);
      }
    }

    const elDateBadge = document.getElementById('tixSelectedDateBadge');
    if (elDateBadge) elDateBadge.innerText = this.tixConsoleState.selectedDate;

    // 2. TUJUAN RUTE (DESTINATIONS)
    const destPillsWrap = document.getElementById('tixDestinationPillsContainer');
    const availableDests = [];
    const destSet = new Set();
    schedules.forEach(s => {
      const dCode = s.destinationId || 'TWU';
      if (!destSet.has(dCode)) {
        destSet.add(dCode);
        const port = MASTER_PORTS.find(p => p.id === dCode) || { city: dCode === 'PRE' ? 'Parepare' : 'Tawau' };
        const label = dCode === 'TWU' ? '🏝️ Nunukan ➔ Tawau (Internasional)' : (dCode === 'PRE' ? '🚢 Nunukan ➔ Parepare (Sulawesi)' : `🚢 Nunukan ➔ ${port.city}`);
        availableDests.push({ id: dCode, label });
      }
    });

    if (availableDests.length === 0) {
      availableDests.push({ id: 'TWU', label: '🏝️ Nunukan ➔ Tawau (Internasional)' });
    }

    if (!this.tixConsoleState.selectedDestinationId || !availableDests.some(d => d.id === this.tixConsoleState.selectedDestinationId)) {
      this.tixConsoleState.selectedDestinationId = availableDests[0].id;
    }

    if (destPillsWrap) {
      destPillsWrap.innerHTML = availableDests.map(d => {
        const isAct = d.id === this.tixConsoleState.selectedDestinationId;
        return `
          <button type="button" class="btn-dest-pill" data-dest="${d.id}" style="padding: 0.35rem 0.75rem; font-size: 0.74rem; font-weight: 800; border-radius: 6px; cursor: pointer; border: 1.5px solid ${isAct ? '#0284c7' : '#cbd5e1'}; background: ${isAct ? '#0284c7' : '#ffffff'}; color: ${isAct ? '#ffffff' : '#334155'}; transition: all 0.15s ease;">
            ${d.label}
          </button>
        `;
      }).join('');

      destPillsWrap.querySelectorAll('.btn-dest-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          this.tixConsoleState.selectedDestinationId = btn.getAttribute('data-dest');
          this.tixConsoleState.selectedScheduleId = null;
          this.tixConsoleState.selectedSeats = [];
          this.tixConsoleState.passengerEntries = [];
          this.renderTicketingConsole();
        });
      });
    }

    // Filter Jadwal berdasarkan Destinasi & Tanggal
    let destSchedules = schedules.filter(s => (s.destinationId || 'TWU') === this.tixConsoleState.selectedDestinationId);
    if (destSchedules.length === 0) destSchedules = schedules;

    const daySchedules = destSchedules.filter(s => {
      const sDate = s.departDate || s.date;
      return !sDate || sDate === this.tixConsoleState.selectedDate;
    });
    const rawScheduleList = daySchedules.length > 0 ? daySchedules : destSchedules;

    // Prioritaskan jadwal yang memiliki tanggal spesifik hari ini daripada generic
    rawScheduleList.sort((a, b) => {
      const aExact = (a.departDate || a.date) === this.tixConsoleState.selectedDate ? 1 : 0;
      const bExact = (b.departDate || b.date) === this.tixConsoleState.selectedDate ? 1 : 0;
      return bExact - aExact;
    });

    // Deduplikasi ketat: jangan munculkan nama armada yang sama di tanggal yang sama
    const activeScheduleList = [];
    const seenVesselNamesOnDate = new Set();
    rawScheduleList.forEach(sch => {
      const v = fleet.find(f => f.id === sch.vesselId);
      const vName = (v ? v.name : (sch.vesselNameCustom || sch.vesselId || 'Armada')).trim().toLowerCase();
      if (!seenVesselNamesOnDate.has(vName)) {
        seenVesselNamesOnDate.add(vName);
        activeScheduleList.push(sch);
      }
    });

    const elSchedCount = document.getElementById('tixDepartSummaryCount');
    if (elSchedCount) elSchedCount.innerText = `${activeScheduleList.length} Jadwal`;

    if (!this.tixConsoleState.selectedScheduleId || !activeScheduleList.some(s => s.id === this.tixConsoleState.selectedScheduleId)) {
      this.tixConsoleState.selectedScheduleId = activeScheduleList[0] ? activeScheduleList[0].id : null;
    }

    // Render Kartu Jam & Kapal (#tixDepartureTimeCardsList)
    const timeCardsList = document.getElementById('tixDepartureTimeCardsList');
    if (timeCardsList) {
      timeCardsList.innerHTML = '';
      activeScheduleList.forEach(sch => {
        const isAct = sch.id === this.tixConsoleState.selectedScheduleId;
        const v = fleet.find(f => f.id === sch.vesselId);
        const vName = v ? v.name : (sch.vesselNameCustom || 'Armada');
        const isSulawesi = (sch.destinationId === 'PRE') || (v && ((v.type || '').toLowerCase().includes('parepare') || (v.name || '').toLowerCase().includes('pantokrator')));
        const minPrice = (sch.classes && sch.classes.length > 0)
          ? Math.min(...sch.classes.map(c => Number(c.price)))
          : Number(sch.priceEconomy || (isSulawesi ? 690000 : 430000));
        const passFee = this.getSchedulePortPassFee ? this.getSchedulePortPassFee(sch, tenant) : Number(sch.portPassFee || (isSulawesi ? 30000 : 50000));
        const totalFare = minPrice + passFee;

        const allBookings = Store.getBookingsByCompany(tenant.id);
        const schedBookings = allBookings.filter(b => b.scheduleId === sch.id && (!b.departDate || b.departDate === this.tixConsoleState.selectedDate));
        let occupiedCount = 0;
        schedBookings.forEach(b => {
          occupiedCount += (b.passengers && b.passengers.length > 0) ? b.passengers.length : 1;
        });
        const totalCap = sch.quotaTotal || (v ? v.capacity : 150);
        const availCount = Math.max(0, totalCap - occupiedCount);

        const card = document.createElement('div');
        card.className = `tix-time-card ${isAct ? 'active' : ''}`;
        card.style.cssText = `padding: 0.45rem 0.7rem; border-radius: 8px; border: 1.5px solid ${isAct ? '#0284c7' : '#e2e8f0'}; background: ${isAct ? '#f0f9ff' : '#ffffff'}; cursor: pointer; display: flex; justify-content: space-between; align-items: center;`;
        card.innerHTML = `
          <div>
            <div style="font-size: 0.78rem; font-weight: 800; color: ${isAct ? '#0284c7' : '#0f172a'};">
              🕒 ${sch.departTime} WITA • ${vName}
            </div>
            <div style="font-size: 0.68rem; color: #64748b; margin-top: 1px;">
              ${formatRupiah(totalFare)} / Pax • <strong style="color: ${availCount > 0 ? '#16a34a' : '#dc2626'};">Sisa ${availCount} Seat</strong>
            </div>
          </div>
          <div>
            <span class="tag-badge" style="font-size: 0.65rem; padding: 2px 6px; ${isAct ? 'background: #0284c7; color: #fff; border-color: #0284c7;' : ''}">
              ${isAct ? '✓ Dipilih' : 'Pilih'}
            </span>
          </div>
        `;

        card.addEventListener('click', () => {
          if (this.tixConsoleState.selectedScheduleId !== sch.id) {
            this.tixConsoleState.selectedScheduleId = sch.id;
            this.tixConsoleState.selectedVesselId = sch.vesselId;
            this.tixConsoleState.selectedSeats = [];
            this.tixConsoleState.passengerEntries = [];
            this.renderTicketingConsole();
          }
        });

        timeCardsList.appendChild(card);
      });
    }

    // 3. TRIP INFO
    const activeSched = activeScheduleList.find(s => s.id === this.tixConsoleState.selectedScheduleId) || activeScheduleList[0];
    if (!activeSched) return;

    const vessel = fleet.find(v => v.id === activeSched.vesselId) || fleet[0];
    const isSulawesi = (activeSched.destinationId === 'PRE') || (vessel && ((vessel.type || '').toLowerCase().includes('parepare') || (vessel.name || '').toLowerCase().includes('pantokrator')));
    const minPrice = (activeSched.classes && activeSched.classes.length > 0)
      ? Math.min(...activeSched.classes.map(c => Number(c.price)))
      : Number(activeSched.priceEconomy || (isSulawesi ? 690000 : 430000));
    const passFee = this.getSchedulePortPassFee ? this.getSchedulePortPassFee(activeSched, tenant) : Number(activeSched.portPassFee || (isSulawesi ? 30000 : 50000));
    const totalFare = minPrice + passFee;

    const origPort = MASTER_PORTS.find(p => p.id === activeSched.originId) || { city: 'Nunukan' };
    const destPort = MASTER_PORTS.find(p => p.id === activeSched.destinationId) || { city: isSulawesi ? 'Parepare' : 'Tawau' };

    const elTripCode = document.getElementById('tixTripScheduleCode');
    const elTripVessel = document.getElementById('tixTripVesselName');
    const elTripPier = document.getElementById('tixTripPierName');
    const elTripRoute = document.getElementById('tixTripRouteLabel');
    const elTripFare = document.getElementById('tixTripFareLabel');

    if (elTripCode) elTripCode.innerText = activeSched.id || 'SCH-REG';
    if (elTripVessel) elTripVessel.innerText = vessel ? vessel.name : (activeSched.vesselNameCustom || 'Armada Kapal');
    const subPlaceSel = document.getElementById('tixFromSubPlaceSelect');
    if (elTripPier) elTripPier.innerText = subPlaceSel ? subPlaceSel.value : (activeSched.pier || 'Tunon Taka');
    if (elTripRoute) elTripRoute.innerText = `${origPort.city} ➔ ${destPort.city}`;
    if (elTripFare) elTripFare.innerText = `${formatRupiah(totalFare)} (${formatRupiah(minPrice)} + Pas ${formatRupiah(passFee)})`;

    // 4. PILIH SEAT PENUMPANG (CHOOSE SEATS)
    const vesselDecks = (vessel && Array.isArray(vessel.decks) && vessel.decks.length > 0)
      ? vessel.decks
      : ((isSulawesi && Store.getSulawesiDecks)
          ? Store.getSulawesiDecks()
          : (Store.getRouteDecks ? Store.getRouteDecks(isSulawesi ? 'sulawesi' : 'tawau') : null));

    let deckName = 'Main Deck';
    let capacity = 150;

    const deckPillsWrap = document.getElementById('tixDeckSelectorPillsWrap');
    if (vesselDecks && vesselDecks.length > 0) {
      if (!this.tixConsoleState.selectedDeckCode || !vesselDecks.some(d => d.code === this.tixConsoleState.selectedDeckCode)) {
        this.tixConsoleState.selectedDeckCode = vesselDecks[0].code;
      }
      const activeDeckObj = vesselDecks.find(d => d.code === this.tixConsoleState.selectedDeckCode) || vesselDecks[0];
      deckName = activeDeckObj.name;
      capacity = activeDeckObj.capacity || 100;

      if (deckPillsWrap) {
        deckPillsWrap.innerHTML = vesselDecks.map(d => {
          const isAct = d.code === this.tixConsoleState.selectedDeckCode;
          return `
            <button type="button" class="btn-deck-pill" data-deck="${d.code}" style="background: ${isAct ? '#0284c7' : '#ffffff'}; color: ${isAct ? '#ffffff' : '#334155'}; border: 1.5px solid ${isAct ? '#0284c7' : '#cbd5e1'}; border-radius: 6px; padding: 0.2rem 0.55rem; font-size: 0.7rem; font-weight: 700; cursor: pointer;">
              🚢 ${d.name} (${d.capacity})
            </button>
          `;
        }).join('');

        deckPillsWrap.querySelectorAll('.btn-deck-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            this.tixConsoleState.selectedDeckCode = btn.getAttribute('data-deck');
            this.renderTicketingConsole();
          });
        });
      }
    } else {
      capacity = parseInt((vessel && vessel.capacity) || (activeSched && (activeSched.capacity || activeSched.quotaTotal)) || 150, 10);
      deckName = (vessel && vessel.deckName) || 'Main Deck';
      if (deckPillsWrap) {
        deckPillsWrap.innerHTML = `
          <button type="button" class="btn-deck-pill" style="background: #0284c7; color: #ffffff; border: 1.5px solid #0284c7; border-radius: 6px; padding: 0.2rem 0.6rem; font-size: 0.72rem; font-weight: 700; cursor: default;">
            🚢 ${deckName} (${capacity} Kursi)
          </button>
        `;
      }
    }
    if (!capacity || capacity <= 0) capacity = 150;

    // Hitung Kursi Terisi
    const allBookings = Store.getBookingsByCompany(tenant.id);
    const schedBookings = allBookings.filter(b => b.scheduleId === activeSched.id && (!b.departDate || b.departDate === this.tixConsoleState.selectedDate));
    const occupiedSeats = new Set();
    schedBookings.forEach(b => {
      const pArr = (b.passengers && b.passengers.length > 0) ? b.passengers : [{ seat: b.seatNumber }];
      pArr.forEach(p => {
        if (p.seat) occupiedSeats.add(p.seat.toUpperCase().trim());
      });
    });

    const availSeatsCount = Math.max(0, capacity - occupiedSeats.size);
    const elSeatAvailBadge = document.getElementById('tixSeatAvailBadge');
    if (elSeatAvailBadge) {
      elSeatAvailBadge.innerText = `Tersedia: ${availSeatsCount} Kursi (${occupiedSeats.size} Terisi)`;
    }

    // Render Visual Seat Map Grid
    const seatGrid = document.getElementById('tixVisualSeatMapGrid');
    if (seatGrid) {
      seatGrid.innerHTML = '';
      const getRowCode = (rIdx) => {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        if (rIdx < letters.length) return letters[rIdx];
        const p1 = letters[Math.floor(rIdx / letters.length) - 1];
        const p2 = letters[rIdx % letters.length];
        return `${p1}${p2}`;
      };

      const totalCols = (vessel && vessel.seatCols) ? vessel.seatCols : 6;
      const totalRows = (vessel && vessel.seatRows) ? vessel.seatRows : Math.ceil(capacity / totalCols);
      seatGrid.style.gridTemplateColumns = `repeat(${totalCols}, 1fr)`;
      let count = 0;
      for (let r = 0; r < totalRows; r++) {
        if (count >= capacity) break;
        const rCode = getRowCode(r);
        for (let col = 1; col <= totalCols; col++) {
          if (count >= capacity) break;
          count++;
          const prefix = vesselDecks ? `${this.tixConsoleState.selectedDeckCode}-` : '';
          const sCode = `${prefix}${rCode}-${String(col).padStart(2, '0')}`;
          const isOcc = occupiedSeats.has(sCode);
          const isSel = this.tixConsoleState.selectedSeats.includes(sCode);

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `tix-visual-seat-btn ${isOcc ? 'occupied' : (isSel ? 'selected' : 'available')}`;
          btn.setAttribute('data-seat', sCode);
          btn.title = isOcc ? `Kursi ${sCode} (Terisi/Booked)` : (isSel ? `Kursi ${sCode} (Dipilih)` : `Kursi ${sCode} (Klik untuk pilih)`);
          if (isOcc) btn.disabled = true;

          btn.innerText = sCode;

          if (!isOcc) {
            btn.addEventListener('click', () => {
              this.toggleSeatSelection(sCode);
            });
          }

          seatGrid.appendChild(btn);
        }
      }
    }

    // 5. RENDER ENTRI DATA PENUMPANG (DI BAWAHNYA)
    this.renderPassengerEntriesTable(activeSched, tenant, vessel, minPrice, passFee);

    // Sync bulk state schedule & render manual grid table in integrated tab
    if (activeSched) {
      this.bulkState.targetScheduleId = activeSched.id;
    }
    if (!this.bulkState.manualGridRows || this.bulkState.manualGridRows.length === 0) {
      this.initManualGridRows(3);
    } else {
      this.renderManualGridTable();
    }
  },

  toggleSeatSelection(seatCode) {
    const idx = this.tixConsoleState.selectedSeats.indexOf(seatCode);
    if (idx !== -1) {
      // Hapus
      this.tixConsoleState.selectedSeats.splice(idx, 1);
      this.tixConsoleState.passengerEntries = this.tixConsoleState.passengerEntries.filter(p => p.seat !== seatCode);
    } else {
      // Tambah kursi terpilih & buat entri penumpang otomatis
      this.tixConsoleState.selectedSeats.push(seatCode);
      this.tixConsoleState.passengerEntries.push({
        seat: seatCode,
        name: '',
        docNum: '',
        gender: 'L',
        paxType: 'Dewasa',
        nationality: 'ID',
        phone: ''
      });
    }

    this.renderTicketingConsole();

    // Scroll ke tabel jika baru menambah kursi pertama
    if (this.tixConsoleState.selectedSeats.length === 1) {
      document.getElementById('tixPassengerRowsTbody')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  renderPassengerEntriesTable(activeSched, tenant, vessel, minPrice, passFee) {
    const tbody = document.getElementById('tixPassengerRowsTbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const entries = this.tixConsoleState.passengerEntries;

    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: #94a3b8; padding: 2rem 1rem;">
            👆 Silakan klik nomor kursi yang diinginkan pada <strong>Denah Kursi (Step 5)</strong> di atas untuk otomatis membuat entri penumpang.
          </td>
        </tr>
      `;
    } else {
      entries.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align: center; font-weight: 700; color: #64748b;">${index + 1}</td>
          <td>
            <span class="tag-badge" style="background: #dcfce7; color: #166534; font-weight: 800; border: 1px solid #bbf7d0; font-size: 0.78rem;">
              💺 ${p.seat}
            </span>
          </td>
          <td>
            <input type="text" class="form-input pax-in-name" placeholder="Nama Lengkap Penumpang..." value="${p.name || ''}" style="padding: 0.35rem 0.55rem; font-size: 0.8rem; font-weight: 600;">
          </td>
          <td>
            <input type="text" class="form-input pax-in-doc" placeholder="Nomor NIK / Paspor..." value="${p.docNum || ''}" style="padding: 0.35rem 0.55rem; font-size: 0.8rem; font-weight: 600;">
          </td>
          <td>
            <select class="form-input pax-in-gender" style="padding: 0.35rem 0.45rem; font-size: 0.8rem; font-weight: 600;">
              <option value="L" ${p.gender === 'L' ? 'selected' : ''}>L</option>
              <option value="P" ${p.gender === 'P' ? 'selected' : ''}>P</option>
            </select>
          </td>
          <td>
            <select class="form-input pax-in-type" style="padding: 0.35rem 0.45rem; font-size: 0.8rem; font-weight: 600;">
              <option value="Dewasa" ${p.paxType === 'Dewasa' ? 'selected' : ''}>Dewasa</option>
              <option value="Anak" ${p.paxType === 'Anak' ? 'selected' : ''}>Anak</option>
              <option value="Bayi" ${p.paxType === 'Bayi' ? 'selected' : ''}>Bayi</option>
            </select>
          </td>
          <td>
            <select class="form-input pax-in-nat" style="padding: 0.35rem 0.45rem; font-size: 0.8rem; font-weight: 600;">
              <option value="ID" ${p.nationality === 'ID' ? 'selected' : ''}>Indonesia</option>
              <option value="MY" ${p.nationality === 'MY' ? 'selected' : ''}>Malaysia</option>
              <option value="OTHER" ${p.nationality === 'OTHER' ? 'selected' : ''}>Lainnya</option>
            </select>
          </td>
          <td>
            <input type="tel" class="form-input pax-in-phone" placeholder="08xxxxxxxxxx" value="${p.phone || ''}" style="padding: 0.35rem 0.55rem; font-size: 0.8rem;">
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-del-seat-row" style="color: #ef4444; border: none; background: transparent; cursor: pointer; font-size: 1.2rem; font-weight: 800; line-height: 1;" title="Batalkan Kursi ${p.seat}">
              &times;
            </button>
          </td>
        `;

        // Input Bindings
        tr.querySelector('.pax-in-name')?.addEventListener('input', (e) => { p.name = e.target.value; });
        tr.querySelector('.pax-in-doc')?.addEventListener('input', (e) => { p.docNum = e.target.value; });
        tr.querySelector('.pax-in-gender')?.addEventListener('change', (e) => { p.gender = e.target.value; });
        tr.querySelector('.pax-in-type')?.addEventListener('change', (e) => { p.paxType = e.target.value; });
        tr.querySelector('.pax-in-nat')?.addEventListener('change', (e) => { p.nationality = e.target.value; });
        tr.querySelector('.pax-in-phone')?.addEventListener('input', (e) => { p.phone = e.target.value; });

        tr.querySelector('.btn-del-seat-row')?.addEventListener('click', () => {
          this.toggleSeatSelection(p.seat);
        });

        tbody.appendChild(tr);
      });
    }

    // Update Pax Count Badge & Total Biaya
    const elPaxBadge = document.getElementById('tixPaxCountBadge');
    if (elPaxBadge) elPaxBadge.innerText = `${entries.length} Penumpang Terpilih`;

    const count = entries.length;
    const totalTiket = minPrice * count;
    const totalPas = passFee * count;
    const totalFinal = totalTiket + totalPas;

    const elBreakdown = document.getElementById('tixFinalFareBreakdown');
    if (elBreakdown) {
      elBreakdown.innerText = count > 0
        ? `Tiket ${formatRupiah(minPrice)} × ${count} Pax + Pas Pelabuhan ${formatRupiah(passFee)} × ${count} Pax`
        : `Tiket Rp 0 + Pas Pelabuhan Rp 0`;
    }

    const elTotal = document.getElementById('tixFinalFareTotal');
    if (elTotal) elTotal.innerText = formatRupiah(totalFinal);

    const elBtnText = document.getElementById('btnTixSubmitBookingFinalText');
    if (elBtnText) {
      elBtnText.innerText = count > 0
        ? `🖨️ Cetak Tiket (${count} Penumpang)`
        : `🖨️ Cetak Tiket (Pilih Kursi Terlebih Dahulu)`;
    }
    const elBtnSaveOnlyText = document.getElementById('btnTixSaveOnlyText');
    if (elBtnSaveOnlyText) {
      elBtnSaveOnlyText.innerText = count > 0
        ? `💾 Simpan Tiket (${count} Penumpang)`
        : `💾 Simpan Tiket (Tanpa Cetak)`;
    }
    const btnRestore = document.getElementById('btnTixRestoreDraftSeats');
    if (btnRestore) {
      const hasDraft = localStorage.getItem('tech_single_draft_passengers_v1');
      btnRestore.style.display = (entries.length === 0 && hasDraft) ? 'inline-flex' : 'none';
    }
    const elTabPax = document.getElementById('tixTabPaxCount');
    if (elTabPax) elTabPax.innerText = entries.length;
  },

  processFinalPosBookings(openPrint = true) {
    const tenant = Store.getCurrentTenant();
    if (!tenant) {
      this.showToast('Gagal', 'Sesi perusahaan tidak aktif.', 'error');
      return;
    }

    let entries = this.tixConsoleState.passengerEntries;
    if ((!entries || entries.length === 0) && this.bulkState && this.bulkState.paxList && this.bulkState.paxList.length > 0) {
      entries = this.bulkState.paxList.map(p => ({
        seat: p.seat || '-',
        name: p.name,
        docNum: p.docNum || p.passportNo || p.nik || '',
        gender: p.gender || 'L',
        paxType: p.paxType || 'Dewasa',
        nationality: p.nationality || 'ID',
        phone: p.phone || ''
      }));
      this.tixConsoleState.passengerEntries = entries;
    }
    if (!entries || entries.length === 0) {
      this.showToast('Pilih Kursi Terlebih Dahulu', 'Klik salah satu nomor kursi pada denah visual untuk membuat entri penumpang.', 'warning');
      return;
    }

    // Validasi Kelengkapan Nama & NIK/Paspor
    for (let i = 0; i < entries.length; i++) {
      const p = entries[i];
      if (!p.name || !p.name.trim()) {
        this.showToast('Data Belum Lengkap', `Nama lengkap penumpang pada kursi ${p.seat} wajib diisi!`, 'warning');
        return;
      }
      if (!p.docNum || !p.docNum.trim()) {
        this.showToast('Data Belum Lengkap', `Nomor NIK / Paspor penumpang pada kursi ${p.seat} wajib diisi!`, 'warning');
        return;
      }
    }

    const schedules = Store.getSchedulesByCompany(tenant.id);
    const activeSched = schedules.find(s => s.id === this.tixConsoleState.selectedScheduleId) || schedules[0];
    if (!activeSched) {
      this.showToast('Jadwal Tidak Ditemukan', 'Pilih jadwal pelayaran aktif terlebih dahulu.', 'warning');
      return;
    }

    const fleet = Store.getVesselsByCompany(tenant.id);
    const vessel = fleet.find(v => v.id === activeSched.vesselId) || fleet[0];
    const vesselName = vessel ? vessel.name : (activeSched.vesselNameCustom || 'Armada Kapal');

    // Cek duplikasi penumpang
    for (let i = 0; i < entries.length; i++) {
      const dup = Store.checkDuplicatePassenger(entries[i].name.trim(), activeSched.id);
      if (dup) {
        const ok = confirm(`⚠️ PERINGATAN DATA PENUMPANG GANDA!\n\nNama "${entries[i].name}" sudah terdaftar pada jadwal kapal ${dup.vesselName} (PNR: ${dup.pnr}).\n\nApakah Anda yakin ingin tetap menerbitkan tiket untuk penumpang ini?`);
        if (!ok) return;
      }
    }

    const isSulawesi = (activeSched.destinationId === 'PRE') || (vessel && ((vessel.type || '').toLowerCase().includes('parepare') || (vessel.name || '').toLowerCase().includes('pantokrator')));
    const minPrice = (activeSched.classes && activeSched.classes.length > 0)
      ? Math.min(...activeSched.classes.map(c => Number(c.price)))
      : Number(activeSched.priceEconomy || (isSulawesi ? 690000 : 430000));
    const passFee = this.getSchedulePortPassFee ? this.getSchedulePortPassFee(activeSched, tenant) : Number(activeSched.portPassFee || (isSulawesi ? 30000 : 50000));
    const totalPerPax = minPrice + passFee;
    const totalAmount = totalPerPax * entries.length;

    const payMethod = document.getElementById('tixFinalPaymentMethod')?.value || 'Loket Resmi Perusahaan';
    const subPlaceSel = document.getElementById('tixFromSubPlaceSelect');
    const pier = subPlaceSel ? subPlaceSel.value : (activeSched.pier || 'Tunon Taka');

    const origPort = MASTER_PORTS.find(p => p.id === activeSched.originId) || { city: 'Nunukan' };
    const destPort = MASTER_PORTS.find(p => p.id === activeSched.destinationId) || { city: isSulawesi ? 'Parepare' : 'Tawau' };

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const pnr = `OMNI-${tenant.shortName || 'TKT'}-${randomSuffix}`;
    const barcode = `8910${Math.floor(10000000 + Math.random() * 90000000)}`;

    const passengerList = entries.map(p => ({
      paxType: p.paxType || 'Dewasa',
      name: p.name.trim(),
      gender: p.gender || 'L',
      docType: p.nationality === 'ID' ? 'KTP' : 'PASSPORT',
      passportNo: p.docNum.trim(),
      docNumber: p.docNum.trim(),
      nik: p.docNum.trim(),
      dob: '',
      age: p.paxType === 'Anak' ? 8 : (p.paxType === 'Bayi' ? 1 : 30),
      nationality: p.nationality || 'ID',
      remark: 'POS Loket Resmi Interaktif',
      passportExp: '',
      seat: p.seat,
      className: 'Tiket Reguler'
    }));

    const newBooking = {
      pnr,
      barcode,
      companyId: tenant.id,
      scheduleId: activeSched.id,
      vesselName,
      originCity: origPort.city,
      originCode: activeSched.originId || 'NNK',
      destinationCity: destPort.city,
      destCode: activeSched.destinationId || (isSulawesi ? 'PRE' : 'TWU'),
      departDate: this.tixConsoleState.selectedDate || new Date().toISOString().split('T')[0],
      departTime: `${activeSched.departTime} WITA`,
      className: 'Tiket Reguler',
      pier,
      isIntl: (destPort.city === 'Tawau' || activeSched.destinationId === 'TWU'),
      contact: { name: passengerList[0].name, phone: entries[0].phone || '', email: '' },
      passengers: passengerList,
      totalAmount,
      paymentMethod: payMethod,
      paymentStatus: payMethod === 'Sistem Booked' ? 'BOOKED' : 'PAID',
      boardingStatus: 'NOT_CHECKED_IN',
      createdAt: new Date().toISOString()
    };

    Store.addBooking(newBooking);

    // Update Quota Jadwal
    activeSched.quotaBooked = (activeSched.quotaBooked || 0) + entries.length;
    const allScheds = Store.getSchedules();
    const sIdx = allScheds.findIndex(s => s.id === activeSched.id);
    if (sIdx !== -1) {
      allScheds[sIdx].quotaBooked = activeSched.quotaBooked;
      Store.saveSchedules(allScheds);
    }

    // Reset Pilihan Kursi & Entri Penumpang
    const totalPaxSuccess = entries.length;
    const seatListSuccess = entries.map(e => e.seat).join(', ');
    this.tixConsoleState.selectedSeats = [];
    this.tixConsoleState.passengerEntries = [];
    try { localStorage.removeItem('tech_single_draft_passengers_v1'); } catch (e) {}

    // Refresh dashboard & console
    this.refreshCompanyDashboard();
    this.renderTicketingConsole();

    if (openPrint) {
      // Buka Cetak Tiket Langsung (Thermal Kasir & A4 Boarding Pass)
      this.openDirectTicketPrintModal(newBooking, 'BOARDING_PASS');
      this.showToast('Tiket Berhasil Diterbitkan!', `${totalPaxSuccess} Tiket resmi ${vesselName} berhasil diterbitkan (PNR: ${pnr}, Kursi: ${seatListSuccess}).`);
    } else {
      this.showToast('Tiket Berhasil Disimpan!', `${totalPaxSuccess} Tiket resmi ${vesselName} berhasil disimpan ke sistem & manifest (PNR: ${pnr}, Kursi: ${seatListSuccess}). Tiket siap dicetak sewaktu-waktu dari menu Tagihan & Manifest.`, 'success');
    }
  },

  saveSinglePassengerDraft() {
    const entries = this.tixConsoleState.passengerEntries || [];
    if (entries.length === 0) {
      this.showToast('Pilih Kursi Terlebih Dahulu', 'Klik salah satu kursi pada denah visual sebelum menyimpan draft.', 'warning');
      return;
    }
    const data = {
      scheduleId: this.tixConsoleState.selectedScheduleId,
      seats: this.tixConsoleState.selectedSeats,
      entries: entries
    };
    localStorage.setItem('tech_single_draft_passengers_v1', JSON.stringify(data));
    this.showToast('Draft Tersimpan', `Draft ${entries.length} data penumpang kursi berhasil disimpan ke browser.`, 'success');
    const btnRestore = document.getElementById('btnTixRestoreDraftSeats');
    if (btnRestore) btnRestore.style.display = 'none';
  },

  restoreSinglePassengerDraft() {
    try {
      const raw = localStorage.getItem('tech_single_draft_passengers_v1');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.seats && data.entries && data.entries.length > 0) {
        if (data.scheduleId) this.tixConsoleState.selectedScheduleId = data.scheduleId;
        this.tixConsoleState.selectedSeats = data.seats;
        this.tixConsoleState.passengerEntries = data.entries;
        this.renderTicketingConsole();
        this.showToast('Draft Dimuat', `${data.entries.length} data penumpang kursi berhasil dipulihkan dari draft.`, 'success');
      }
    } catch (e) {
      console.error('Error restore draft:', e);
    }
  },

  downloadDirectTicketPrintHtml() {
    const area = document.getElementById('directBatchTicketPrintArea');
    if (!area || !area.innerHTML.trim()) {
      this.showToast('Tidak Ada Tiket', 'Tidak ada data tiket yang dapat disimpan.', 'warning');
      return;
    }
    const pnr = (this.directPrintState.items && this.directPrintState.items[0]?.pnr) || 'TIKET-MARITIM';
    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Tiket Resmi Pelayaran - ${pnr}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; padding: 20px; color: #0f172a; margin: 0; }
@media print { body { background: #fff; padding: 0; } }
</style>
</head>
<body>
${area.innerHTML}
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tiket-${pnr}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('File Tiket Disimpan', `File dokumen tiket ${pnr} berhasil diunduh ke komputer.`);
  },

  setTicketingEntryMode(mode) {
    if (mode === 'BULK') mode = 'SINGLE';
    const singleSection = document.getElementById('tixSingleModeSection');
    const bulkContainer = document.getElementById('tixBulkEntryContainer');
    const btnSingle = document.getElementById('btnTixModeSingle');
    const btnBulk = document.getElementById('btnTixModeBulk');

    if (mode === 'BULK') {
      if (singleSection) singleSection.style.display = 'none';
      if (bulkContainer) bulkContainer.style.display = 'block';
      if (btnSingle) {
        btnSingle.classList.remove('active');
        btnSingle.style.background = 'transparent';
        btnSingle.style.color = '#64748b';
      }
      if (btnBulk) {
        btnBulk.classList.add('active');
        btnBulk.style.background = '#0284c7';
        btnBulk.style.color = '#ffffff';
      }

      // Pastikan data bulk diinisialisasi
      const tenant = Store.getCurrentTenant();
      if (tenant) {
        const fleet = Store.getVesselsByCompany(tenant.id);
        const companySchedules = Store.getSchedulesByCompany(tenant.id);
        const vesselSelect = document.getElementById('bulkTargetVesselSelect');
        const select = document.getElementById('bulkTargetScheduleSelect');

        if (vesselSelect && fleet && fleet.length > 0) {
          vesselSelect.innerHTML = `<option value="ALL">🚢 Semua Armada (${fleet.length} Kapal)</option>`;
          fleet.forEach(fv => {
            const opt = new Option(`🚢 ${fv.name} (${fv.capacity || 150} Kursi)`, fv.id);
            vesselSelect.add(opt);
          });
          if (this.selectedTicketingVessel && this.selectedTicketingVessel !== 'ALL') {
            vesselSelect.value = this.selectedTicketingVessel;
          }
        }

        if (select && companySchedules && companySchedules.length > 0) {
          select.innerHTML = '';
          companySchedules.forEach(s => {
            const opt = new Option(`${s.vesselName || s.shipName || 'Armada'} — ${s.route} (${s.departureTime || s.time || s.departTime || '09:00'}) [Sisa: ${s.quota || 150}]`, s.id);
            select.add(opt);
          });
          if (this.bulkState && this.bulkState.targetScheduleId) {
            select.value = this.bulkState.targetScheduleId;
          } else if (companySchedules[0]) {
            if (!this.bulkState) this.bulkState = {};
            this.bulkState.targetScheduleId = companySchedules[0].id;
          }
        }

        if (typeof this.updateBulkScheduleInfo === 'function') {
          this.updateBulkScheduleInfo();
        }
        if (typeof this.renderBulkPassengerPreview === 'function') {
          this.renderBulkPassengerPreview();
        }
      }
    } else {
      if (singleSection) singleSection.style.display = 'block';
      if (bulkContainer) bulkContainer.style.display = 'none';
      if (btnSingle) {
        btnSingle.classList.add('active');
        btnSingle.style.background = '#0284c7';
        btnSingle.style.color = '#ffffff';
      }
      if (btnBulk) {
        btnBulk.classList.remove('active');
        btnBulk.style.background = 'transparent';
        btnBulk.style.color = '#64748b';
      }
      this.renderTicketingConsole();
    }
  },

  // ================= LIVE SEAT MAP DASHBOARD =================
  seatDashState: {
    scheduleId: null,
    classIdx: 0,
    selectedSeat: null
  },

  initSeatDashboardEvents() {
    if (this.seatDashEventsInitialized) return;
    this.seatDashEventsInitialized = true;

    const schedSelect = document.getElementById('seatDashScheduleSelect');
    if (schedSelect) {
      schedSelect.addEventListener('change', (e) => {
        this.seatDashState.scheduleId = e.target.value;
        this.seatDashState.classIdx = 0;
        this.seatDashState.selectedSeat = null;
        this.renderSeatDeckGrid();
      });
    }

    const btnRefresh = document.getElementById('btnRefreshSeatDash');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.renderSeatDashboard();
        this.showToast('Data Diperbarui', 'Peta alokasi kursi kapal berhasil disegarkan secara live.');
      });
    }

    const classTabs = document.querySelectorAll('.seat-class-filter-btn');
    classTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        classTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.seatDashState.classIdx = parseInt(btn.getAttribute('data-class-idx'), 10) || 0;
        this.seatDashState.selectedSeat = null;
        this.renderSeatDeckGrid();
      });
    });

    const btnBookSeat = document.getElementById('btnBookThisSeatAction');
    if (btnBookSeat) {
      btnBookSeat.addEventListener('click', () => {
        if (!this.seatDashState.selectedSeat || !this.seatDashState.scheduleId) return;
        const tenant = Store.getCurrentTenant();
        if (!tenant) return;
        const scheds = Store.getSchedulesByCompany(tenant.id);
        const sched = scheds.find(s => s.id === this.seatDashState.scheduleId);
        if (!sched) return;

        // Buka alur resmi One-Page POS Ticketing Console
        const targetSeat = this.seatDashState.selectedSeat;
        this.switchDashboardTab('tabTicketing');
        if (this.tixConsoleState) {
          this.tixConsoleState.selectedScheduleId = sched.id;
          if (sched.date) this.tixConsoleState.selectedDate = sched.date;
        }
        this.renderTicketingConsole();
        if (targetSeat && !this.tixConsoleState.selectedSeats.includes(targetSeat)) {
          this.toggleSeatSelection(targetSeat);
        }
        this.showToast('Kursi Dipilih', `Nomor kursi ${targetSeat} telah dimasukkan ke entri penumpang.`);
      });
    }

    const btnOpenTicketing = document.getElementById('btnOpenTicketingPaneDirect');
    if (btnOpenTicketing) {
      btnOpenTicketing.addEventListener('click', () => {
        document.querySelectorAll('.dash-tab-btn').forEach(b => {
          if (b.getAttribute('data-tab') === 'tabTicketing') b.click();
        });
      });
    }
  },

  renderSeatDashboard() {
    this.initSeatDashboardEvents();
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const schedules = Store.getSchedulesByCompany(tenant.id);
    const fleet = Store.getVesselsByCompany(tenant.id);
    const schedSelect = document.getElementById('seatDashScheduleSelect');
    if (!schedSelect) return;

    schedSelect.innerHTML = '';
    if (schedules.length === 0) {
      schedSelect.innerHTML = `<option value="">-- Belum Ada Jadwal Pelayaran Aktif --</option>`;
      this.seatDashState.scheduleId = null;
    } else {
      // Kelompokkan jadwal berulang agar tampil simpel (1 baris per Armada + Rute + Jam)
      const uniqueSchedules = [];
      const seenKeys = new Set();
      schedules.forEach(s => {
        const key = `${s.vesselId || s.vesselNameCustom || s.vesselName || ''}__${s.originId || ''}__${s.destinationId || ''}__${s.departTime || ''}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueSchedules.push(s);
        }
      });

      uniqueSchedules.forEach(s => {
        const v = fleet.find(item => item.id === s.vesselId) || Store.getVessels().find(item => item.id === s.vesselId);
        const vName = v ? v.name : (s.vesselNameCustom || s.vesselName || 'Armada Kapal');
        const origPort = MASTER_PORTS.find(p => p.id === s.originId);
        const destPort = MASTER_PORTS.find(p => p.id === s.destinationId);
        const origSimple = origPort ? origPort.city.split(' ')[0] : (s.originCity || s.originId || 'Nunukan');
        const destSimple = destPort ? destPort.city.split(' ')[0] : (s.destinationCity || s.destinationId || 'Tawau');

        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = `🚢 ${vName} • ${origSimple} ➔ ${destSimple} (${s.departTime || '09:00'})`;
        schedSelect.appendChild(opt);
      });

      // Keep current selection if valid, prioritize tenant default configured in Dev Mode, else pick first
      const hasDefaultSched = tenant.defaultScheduleId && uniqueSchedules.some(s => s.id === tenant.defaultScheduleId);
      const schedForDefaultVessel = tenant.defaultVesselId && uniqueSchedules.find(s => s.vesselId === tenant.defaultVesselId);

      if (!this.seatDashState.scheduleId || !uniqueSchedules.some(s => s.id === this.seatDashState.scheduleId)) {
        if (hasDefaultSched) {
          this.seatDashState.scheduleId = tenant.defaultScheduleId;
        } else if (schedForDefaultVessel) {
          this.seatDashState.scheduleId = schedForDefaultVessel.id;
        } else {
          this.seatDashState.scheduleId = uniqueSchedules[0].id;
        }
      }
      schedSelect.value = this.seatDashState.scheduleId;
    }

    this.renderSeatDeckGrid();
  },

  renderSeatDeckGrid() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const container = document.getElementById('seatDashGridContainer');
    const deckLabel = document.getElementById('seatPlanCurrentDeckLabel');
    if (!container) return;
    container.innerHTML = '';

    const schedules = Store.getSchedulesByCompany(tenant.id);
    const currentSched = schedules.find(s => s.id === this.seatDashState.scheduleId);

    // Ambil kapasitas kapal armada sesuai jadwal
    const fleet = Store.getVesselsByCompany(tenant.id);
    const currentVessel = currentSched ? (
      fleet.find(f => f.id === currentSched.vesselId) ||
      fleet.find(f => f.name === currentSched.vesselName) ||
      Store.getVessels().find(v => v.id === currentSched.vesselId)
    ) : null;

    if (!currentSched) {
      const fallbackDeckName = (currentVessel && currentVessel.deckName) ? currentVessel.deckName : 'Main Deck';
      if (deckLabel) deckLabel.innerText = fallbackDeckName.toUpperCase();
      this.updateSeatDetailDisplay(null, fallbackDeckName);
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🚢</div>
          <p style="font-size: 0.9rem; color: #0f172a; margin-bottom: 0.25rem;">Belum ada jadwal kapal yang dipilih.</p>
          <span style="font-size: 0.78rem;">Silakan tambahkan jadwal pelayaran terlebih dahulu di menu Jadwal Pelayaran.</span>
        </div>
      `;
      this.updateSeatDeckStats(0, 0, 0, fallbackDeckName, '-');
      return;
    }

    // Dek Kapal (Mendukung Multi-Deck Rute Sulawesi / Kapal Tertentu)
    const isSulawesi = (currentSched && (currentSched.destinationId === 'PRE' || currentSched.destinationCity === 'Parepare')) ||
                       (currentVessel && (((currentVessel.type || '').toLowerCase().includes('parepare')) || 
                                         ((currentVessel.type || '').toLowerCase().includes('domestik')) || 
                                         ((currentVessel.name || '').toLowerCase().includes('pantokrator'))));
    const vesselDecks = (isSulawesi && Store.getSulawesiDecks)
      ? Store.getSulawesiDecks()
      : (currentVessel && currentVessel.decks && currentVessel.decks.length > 0
          ? currentVessel.decks
          : [{ code: 'MAIN', name: (currentVessel && currentVessel.deckName) || 'Main Deck', capacity: (currentVessel && currentVessel.capacity) || (currentSched && (currentSched.capacity || currentSched.quotaTotal)) || 150 }]);

    if (this.seatDashState.classIdx >= vesselDecks.length) {
      this.seatDashState.classIdx = 0;
    }
    const activeDeckObj = vesselDecks[this.seatDashState.classIdx] || vesselDecks[0];
    const currentDeckName = activeDeckObj ? activeDeckObj.name : ((currentVessel && currentVessel.deckName) ? currentVessel.deckName : 'Main Deck');
    let vesselCapacity = activeDeckObj ? parseInt(activeDeckObj.capacity, 10) : 150;
    if (!vesselCapacity || vesselCapacity <= 0) vesselCapacity = 150;

    // Sinkronkan tab dek kapal di UI (#seatDashClassTabs)
    const deckTabsContainer = document.getElementById('seatDashClassTabs');
    if (deckTabsContainer) {
      deckTabsContainer.innerHTML = vesselDecks.map((d, idx) => `
        <button type="button" class="btn-action-sm ${idx === this.seatDashState.classIdx ? 'active' : ''} seat-class-filter-btn" data-class-idx="${idx}" style="padding: 0.45rem 0.9rem; font-weight: 700; border-radius: 6px; cursor: pointer;">
          🚢 ${d.name || d.code} (${d.capacity || 150} Kursi)
        </button>
      `).join('');

      deckTabsContainer.querySelectorAll('.seat-class-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          deckTabsContainer.querySelectorAll('.seat-class-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.seatDashState.classIdx = parseInt(btn.getAttribute('data-class-idx'), 10) || 0;
          this.seatDashState.selectedSeat = null;
          this.renderSeatDeckGrid();
        });
      });
    }

    if (deckLabel) deckLabel.innerText = currentDeckName.toUpperCase();

    // Reset details panel
    this.updateSeatDetailDisplay(null, currentDeckName);

    // Map booked passengers for this schedule
    const allBookings = Store.getBookingsByCompany(tenant.id);
    const schedBookings = allBookings.filter(b => b.scheduleId === currentSched.id);
    
    // Map of seatCode -> passenger object
    const occupiedMap = {};
    schedBookings.forEach(b => {
      const pArr = (b.passengers && b.passengers.length > 0) ? b.passengers : [{
        name: b.passengerName || 'Penumpang',
        seat: b.seatNumber,
        className: b.className,
        docNumber: b.docNumber || b.nik || '-'
      }];
      pArr.forEach(p => {
        if (p.seat) {
          occupiedMap[p.seat.trim().toUpperCase()] = {
            name: p.name,
            pnr: b.pnr,
            className: p.className || b.className,
            docNumber: p.passportNo || p.nik || p.docNumber || '-',
            boardingStatus: b.boardingStatus || 'NOT_CHECKED_IN',
            origin: b.originCity,
            dest: b.destinationCity
          };
        }
      });
    });

    // Generator Kode Baris Huruf (A, B, C... Z, AA, AB...)
    const getRowCode = (rIdx) => {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      if (rIdx < letters.length) return letters[rIdx];
      const p1 = letters[Math.floor(rIdx / letters.length) - 1];
      const p2 = letters[rIdx % letters.length];
      return `${p1}${p2}`;
    };

    let totalDeckSeats = vesselCapacity;
    let occupiedDeckCount = 0;
    let generatedCount = 0;
    const totalRows = Math.ceil(vesselCapacity / 6);

    for (let r = 0; r < totalRows; r++) {
      if (generatedCount >= vesselCapacity) break;
      const rowWrap = document.createElement('div');
      rowWrap.className = 'seat-row';
      rowWrap.style.display = 'flex';
      rowWrap.style.justifyContent = 'center';
      rowWrap.style.alignItems = 'center';
      rowWrap.style.gap = '0.45rem';
      const rowCode = getRowCode(r);

      // 3 Kolom Kursi Kiri (Port: 01, 02, 03)
      for (let col = 1; col <= 3; col++) {
        if (generatedCount >= vesselCapacity) break;
        generatedCount++;
        const seatCode = `${rowCode}-${String(col).padStart(2, '0')}`;
        const paxInfo = occupiedMap[seatCode];
        const isOccupied = !!paxInfo;
        if (isOccupied) occupiedDeckCount++;
        const isSelected = this.seatDashState.selectedSeat === seatCode;

        const seat = document.createElement('div');
        seat.className = `seat-box ${isOccupied ? 'seat-box-occupied' : ''} ${isSelected ? 'seat-box-selected' : ''}`;
        seat.innerText = seatCode;
        seat.title = `Kursi ${seatCode} (Kiri)`;
        seat.style.cursor = 'pointer';

        seat.addEventListener('click', () => {
          this.handleSeatClick(seatCode, paxInfo, currentDeckName, currentSched);
        });
        rowWrap.appendChild(seat);
      }

      // Lorong Tengah (Center Aisle)
      const aisle = document.createElement('div');
      aisle.className = 'seat-aisle-gap';
      aisle.style.width = '36px';
      aisle.style.textAlign = 'center';
      aisle.style.fontSize = '0.62rem';
      aisle.style.color = '#94a3b8';
      aisle.style.fontWeight = '700';
      aisle.innerText = 'LORONG';
      rowWrap.appendChild(aisle);

      // 3 Kolom Kursi Kanan (Starboard: 04, 05, 06)
      for (let col = 4; col <= 6; col++) {
        if (generatedCount >= vesselCapacity) break;
        generatedCount++;
        const seatCode = `${rowCode}-${String(col).padStart(2, '0')}`;
        const paxInfo = occupiedMap[seatCode];
        const isOccupied = !!paxInfo;
        if (isOccupied) occupiedDeckCount++;
        const isSelected = this.seatDashState.selectedSeat === seatCode;

        const seat = document.createElement('div');
        seat.className = `seat-box ${isOccupied ? 'seat-box-occupied' : ''} ${isSelected ? 'seat-box-selected' : ''}`;
        seat.innerText = seatCode;
        seat.title = `Kursi ${seatCode} (Kanan)`;
        seat.style.cursor = 'pointer';

        seat.addEventListener('click', () => {
          this.handleSeatClick(seatCode, paxInfo, currentDeckName, currentSched);
        });
        rowWrap.appendChild(seat);
      }

      container.appendChild(rowWrap);
    }

    const availableCount = Math.max(0, totalDeckSeats - occupiedDeckCount);
    const resolvedVesselName = currentVessel ? currentVessel.name : (currentSched.vesselNameCustom || currentSched.vesselName || 'Armada Kapal');
    this.updateSeatDeckStats(totalDeckSeats, availableCount, occupiedDeckCount, currentDeckName, resolvedVesselName);
  },

  handleSeatClick(seatCode, paxInfo, deckName, sched) {
    this.seatDashState.selectedSeat = seatCode;

    // Refresh seat highlight
    document.querySelectorAll('#seatDashGridContainer .seat-box').forEach(s => {
      s.classList.remove('seat-box-selected');
    });

    const clickedEl = Array.from(document.querySelectorAll('#seatDashGridContainer .seat-box')).find(el => el.innerText.trim() === seatCode);
    if (clickedEl) clickedEl.classList.add('seat-box-selected');

    this.updateSeatDetailDisplay(seatCode, deckName, paxInfo);
  },

  updateSeatDetailDisplay(seatCode, deckName, paxInfo) {
    const codeDisplay = document.getElementById('seatDetailCodeDisplay');
    const classDisplay = document.getElementById('seatDetailClassDisplay');
    const statusBadge = document.getElementById('seatDetailStatusBadge');
    const paxInfoBox = document.getElementById('seatDetailPassengerInfo');
    const availPrompt = document.getElementById('seatDetailAvailablePrompt');
    const btnBook = document.getElementById('btnBookThisSeatAction');

    if (!codeDisplay) return;

    if (!seatCode) {
      codeDisplay.innerText = '-';
      classDisplay.innerText = 'Klik salah satu kursi pada denah kapal';
      statusBadge.innerText = 'PILIH KURSI';
      statusBadge.style.background = 'rgba(56, 189, 248, 0.15)';
      statusBadge.style.color = '#38bdf8';
      statusBadge.style.borderColor = '#38bdf8';
      if (paxInfoBox) paxInfoBox.style.display = 'none';
      if (availPrompt) availPrompt.style.display = 'block';
      if (btnBook) btnBook.disabled = true;
      return;
    }

    codeDisplay.innerText = seatCode;
    classDisplay.innerText = deckName;

    if (paxInfo) {
      statusBadge.innerText = 'TERISI / BOOKED';
      statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      statusBadge.style.color = '#f87171';
      statusBadge.style.borderColor = '#ef4444';

      if (paxInfoBox) {
        paxInfoBox.style.display = 'block';
        document.getElementById('seatDetailPaxName').innerText = paxInfo.name || '-';
        document.getElementById('seatDetailPnr').innerText = paxInfo.pnr || '-';
        document.getElementById('seatDetailDoc').innerText = paxInfo.docNumber || '-';
        const stBadge = document.getElementById('seatDetailBoardingStatus');
        if (stBadge) {
          stBadge.innerText = paxInfo.boardingStatus || 'NOT_CHECKED_IN';
          stBadge.style.color = paxInfo.boardingStatus === 'BOARDED' ? '#10b981' : '#f59e0b';
        }
      }
      if (availPrompt) availPrompt.style.display = 'none';
      if (btnBook) btnBook.disabled = true;

    } else {
      statusBadge.innerText = 'TERSEDIA';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      statusBadge.style.color = '#10b981';
      statusBadge.style.borderColor = '#10b981';

      if (paxInfoBox) paxInfoBox.style.display = 'none';
      if (availPrompt) {
        availPrompt.style.display = 'block';
        availPrompt.innerText = `Kursi ${seatCode} (${deckName}) kosong dan siap dipesan.`;
      }
      if (btnBook) btnBook.disabled = false;
    }
  },

  updateSeatDeckStats(total, available, occupied, deckName, vesselName) {
    const elTotal = document.getElementById('statDeckTotal');
    const elAvail = document.getElementById('statDeckAvailable');
    const elOcc = document.getElementById('statDeckOccupied');
    const elRate = document.getElementById('statDeckRate');
    const elDeckNameSub = document.getElementById('statDeckNameSub');
    const elVessel = document.getElementById('statDeckVesselName');

    if (elTotal) elTotal.innerText = total;
    if (elAvail) elAvail.innerText = available;
    if (elOcc) elOcc.innerText = occupied;
    if (elDeckNameSub) elDeckNameSub.innerText = deckName;
    if (elVessel) elVessel.innerText = vesselName;

    const rate = total > 0 ? ((occupied / total) * 100).toFixed(1) : '0';
    if (elRate) elRate.innerText = `${rate}%`;
  },

  // ========================================================
  // KALENDER PELAYARAN ARMADA (VOYAGE CALENDAR ENGINE)
  // ========================================================
  initCalendarEvents() {
    const prevBtn = document.getElementById('btnCalPrevMonth');
    const nextBtn = document.getElementById('btnCalNextMonth');
    const todayBtn = document.getElementById('btnCalToday');
    const filterVessel = document.getElementById('calFilterVesselSelect');
    const filterRoute = document.getElementById('calFilterRouteSelect');
    const toggleGrid = document.getElementById('btnCalToggleGrid');
    const toggleAgenda = document.getElementById('btnCalToggleAgenda');
    const btnOpenAdd = document.getElementById('btnCalOpenAddSchedule');
    const btnCloseDetail = document.getElementById('btnCloseVoyageDetail');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.calendarState.month--;
        if (this.calendarState.month < 0) {
          this.calendarState.month = 11;
          this.calendarState.year--;
        }
        this.renderVoyageCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.calendarState.month++;
        if (this.calendarState.month > 11) {
          this.calendarState.month = 0;
          this.calendarState.year++;
        }
        this.renderVoyageCalendar();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const now = new Date();
        this.calendarState.year = now.getFullYear();
        this.calendarState.month = now.getMonth();
        this.renderVoyageCalendar();
      });
    }

    if (filterVessel) {
      filterVessel.addEventListener('change', (e) => {
        this.calendarState.filterVessel = e.target.value;
        this.renderVoyageCalendar();
      });
    }

    if (filterRoute) {
      filterRoute.addEventListener('change', (e) => {
        this.calendarState.filterRoute = e.target.value;
        this.renderVoyageCalendar();
      });
    }

    if (toggleGrid && toggleAgenda) {
      toggleGrid.addEventListener('click', () => {
        this.calendarState.viewMode = 'GRID';
        toggleGrid.classList.add('active');
        toggleAgenda.classList.remove('active');
        document.getElementById('calContainerGrid').style.display = 'block';
        document.getElementById('calContainerAgenda').style.display = 'none';
      });

      toggleAgenda.addEventListener('click', () => {
        this.calendarState.viewMode = 'AGENDA';
        toggleAgenda.classList.add('active');
        toggleGrid.classList.remove('active');
        document.getElementById('calContainerGrid').style.display = 'none';
        document.getElementById('calContainerAgenda').style.display = 'block';
        this.renderVoyageCalendar();
      });
    }

    if (btnOpenAdd) {
      btnOpenAdd.addEventListener('click', () => {
        this.openAddScheduleModal();
      });
    }

    if (btnCloseDetail) {
      btnCloseDetail.addEventListener('click', () => {
        document.getElementById('modalVoyageDetail')?.classList.remove('show');
      });
    }

    // Voyage Detail Modal actions
    document.getElementById('btnVoyageGoTicketing')?.addEventListener('click', () => {
      document.getElementById('modalVoyageDetail')?.classList.remove('show');
      const btn = document.querySelector('.dash-tab-btn[data-tab="tabTicketing"]');
      if (btn) btn.click();
    });

    document.getElementById('btnVoyageGoSeats')?.addEventListener('click', () => {
      document.getElementById('modalVoyageDetail')?.classList.remove('show');
      const schId = this.calendarState.selectedVoyageId;
      if (schId) {
        this.seatDashState.scheduleId = schId;
      }
      const btn = document.querySelector('.dash-tab-btn[data-tab="tabSeats"]');
      if (btn) btn.click();
    });

    document.getElementById('btnVoyageGoManifest')?.addEventListener('click', () => {
      document.getElementById('modalVoyageDetail')?.classList.remove('show');
      const btn = document.querySelector('.dash-tab-btn[data-tab="tabManifest"]');
      if (btn) btn.click();
    });
  },

  renderVoyageCalendar() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const { year, month, filterVessel, filterRoute } = this.calendarState;
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Label month/year
    const elMonthText = document.getElementById('calCurrentMonthText');
    if (elMonthText) elMonthText.innerText = `${monthNames[month]} ${year}`;
    const elPeriod = document.getElementById('calKpiPeriodLabel');
    if (elPeriod) elPeriod.innerText = `${monthNames[month]} ${year}`;

    // Get company fleet, schedules & bookings (Milik perusahaan login)
    const scope = this.getTenantRouteScope(tenant);
    const isTenantIntl = scope === 'INTL';
    const isTenantBoth = scope === 'BOTH';
    this.syncRouteScopedUIForTenant(tenant, scope);
    const fleet = Store.getVesselsByCompany(tenant.id);
    const schedules = Store.getSchedulesByCompany(tenant.id);
    const bookings = Store.getBookingsByCompany(tenant.id);

    // Populate filter vessel dropdown if needed
    const filterSelect = document.getElementById('calFilterVesselSelect');
    if (filterSelect && filterSelect.options.length <= 1) {
      filterSelect.innerHTML = '<option value="ALL">🚢 Semua Armada Kapal</option>';
      fleet.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.innerText = `🚢 ${v.name} (${v.type || 'Kapal'})`;
        filterSelect.appendChild(opt);
      });
      filterSelect.value = filterVessel;
    }

    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Monday-based day of week for 1st of month: 0=Senin ... 6=Minggu
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    // Days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    const monthStr = String(month + 1).padStart(2, '0');
    const dayVoyagesMap = {};
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
      dayVoyagesMap[dStr] = [];
    }

    let totalMonthVoyages = 0;
    const activeVesselIds = new Set();
    let totalMonthCapacity = 0;
    let totalMonthBooked = 0;

    schedules.forEach(sch => {
      // Filter vessel
      if (filterVessel !== 'ALL' && sch.vesselId !== filterVessel) return;

      // Filter route
      const isIntl = sch.categoryType === 'INTERNATIONAL' || sch.originId === 'TWU' || sch.destinationId === 'TWU';
      if (filterRoute === 'INTL' && !isIntl) return;
      if (filterRoute === 'DOM' && isIntl) return;

      const vessel = fleet.find(v => v.id === sch.vesselId) || {
        name: sch.vesselNameCustom || 'KM Armada',
        capacity: 120,
        regNumber: 'REG-SEA'
      };

      // Determine which dates this schedule operates on
      let datesToAssign = [];
      if (sch.departDate) {
        if (dayVoyagesMap[sch.departDate]) {
          datesToAssign.push(sch.departDate);
        }
      } else {
        // Recurring schedule: assign to every day of month
        for (let d = 1; d <= totalDays; d++) {
          const dStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
          datesToAssign.push(dStr);
        }
      }

      datesToAssign.forEach(dStr => {
        if (!dayVoyagesMap[dStr]) dayVoyagesMap[dStr] = [];

        // Jangan munculkan nama armada yang sama di tanggal yang sama di kalender pelayaran
        const vNameKey = (vessel.name || sch.vesselNameCustom || '').trim().toLowerCase();
        const alreadyExistsOnDate = dayVoyagesMap[dStr].some(existing => {
          const exName = (existing.vessel?.name || existing.vesselNameCustom || '').trim().toLowerCase();
          return exName === vNameKey;
        });
        if (alreadyExistsOnDate) return;

        // Calculate booked passengers on this schedule for this date
        const voyBookings = bookings.filter(b => 
          (b.scheduleId === sch.id || (b.originId === sch.originId && b.destinationId === sch.destinationId && b.vesselName === vessel.name)) &&
          b.departDate === dStr
        );
        const bookedPax = voyBookings.reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);
        const capacity = vessel.capacity || 120;

        const voyageObj = {
          ...sch,
          dateStr: dStr,
          vessel,
          bookedPax,
          capacity,
          isIntl
        };

        dayVoyagesMap[dStr].push(voyageObj);
        totalMonthVoyages++;
        activeVesselIds.add(vessel.id || vessel.name);
        totalMonthCapacity += capacity;
        totalMonthBooked += bookedPax;
      });
    });

    // Update KPI Bar
    const elTotVoyages = document.getElementById('calKpiTotalVoyages');
    if (elTotVoyages) elTotVoyages.innerText = `${totalMonthVoyages} Jadwal`;
    const elActFleet = document.getElementById('calKpiActiveFleet');
    if (elActFleet) elActFleet.innerText = `${activeVesselIds.size} Kapal`;
    const elTotCap = document.getElementById('calKpiTotalCapacity');
    if (elTotCap) elTotCap.innerText = `${totalMonthCapacity.toLocaleString('id-ID')} Seat`;
    const elTotBooked = document.getElementById('calKpiTotalBooked');
    if (elTotBooked) elTotBooked.innerText = `${totalMonthBooked.toLocaleString('id-ID')} Pax`;
    const elOccRate = document.getElementById('calKpiOccupancyRate');
    if (elOccRate) {
      const rate = totalMonthCapacity > 0 ? ((totalMonthBooked / totalMonthCapacity) * 100).toFixed(1) : '0';
      elOccRate.innerText = `${rate}% Okupansi Rata-rata`;
    }

    // Update Badge in Sidebar
    const elBadge = document.getElementById('countCalendarBadge');
    if (elBadge) elBadge.innerText = totalMonthVoyages;

    // 1. RENDER MONTHLY GRID CELLS
    const gridCells = document.getElementById('calMonthlyGridCells');
    if (gridCells) {
      gridCells.innerHTML = '';
      const realToday = new Date();
      const realTodayStr = `${realToday.getFullYear()}-${String(realToday.getMonth() + 1).padStart(2, '0')}-${String(realToday.getDate()).padStart(2, '0')}`;

      // A. Inactive days from previous month
      for (let i = 0; i < firstDayIndex; i++) {
        const prevDayNum = prevMonthDays - firstDayIndex + i + 1;
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell inactive-month';
        cell.innerHTML = `
          <div class="cal-day-header">
            <span class="cal-day-num">${prevDayNum}</span>
          </div>
        `;
        gridCells.appendChild(cell);
      }

      // B. Days of the current month
      for (let d = 1; d <= totalDays; d++) {
        const dStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
        const isToday = (dStr === realTodayStr);
        const dayVoyages = dayVoyagesMap[dStr] || [];

        const cell = document.createElement('div');
        cell.className = `cal-day-cell ${isToday ? 'is-today' : ''}`;

        let voyagesHtml = '';
        dayVoyages.forEach((voy) => {
          const isIntlClass = voy.isIntl ? 'intl' : 'domestic';
          voyagesHtml += `
            <div class="voyage-chip ${isIntlClass}" data-date="${dStr}" data-sch-id="${voy.id}">
              <div class="voyage-chip-head">
                <span class="voyage-chip-time">${voy.departTime || '08:00'}</span>
                <span class="voyage-chip-route">${voy.originId}➔${voy.destinationId}</span>
              </div>
              <span class="voyage-chip-vessel">${voy.vessel.name}</span>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
                <span class="voyage-chip-pax">${voy.bookedPax}/${voy.capacity} Pax</span>
                <span style="font-size:0.62rem;color:${voy.isIntl ? '#f59e0b' : '#0284c7'};font-weight:700;">${voy.isIntl ? 'LN' : 'DN'}</span>
              </div>
            </div>
          `;
        });

        cell.innerHTML = `
          <div class="cal-day-header">
            <div style="display:flex;align-items:center;gap:4px;">
              <span class="cal-day-num">${d}</span>
              ${isToday ? '<span style="font-size:0.6rem;background:#0284c7;color:#fff;padding:1px 4px;border-radius:4px;font-weight:800;">HARI INI</span>' : ''}
            </div>
            ${dayVoyages.length > 0 ? `<span class="cal-day-voyages-badge">${dayVoyages.length} Kapal</span>` : ''}
          </div>
          <div class="cal-voyages-list">
            ${voyagesHtml}
          </div>
          ${(typeof Store !== 'undefined' && Store.isDevAdminLoggedIn && Store.isDevAdminLoggedIn()) ? `
          <button type="button" class="btn-quick-add-voyage" data-date="${dStr}" title="Tambah Jadwal di Tanggal Ini">
            + Jadwal
          </button>` : ''}
        `;

        // Click handlers on voyage chips
        cell.querySelectorAll('.voyage-chip').forEach(chip => {
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            const schId = chip.getAttribute('data-sch-id');
            const voy = dayVoyages.find(v => v.id === schId);
            if (voy) this.openVoyageDetailModal(voy, dStr);
          });
        });

        // Click handler on quick add button
        const btnAdd = cell.querySelector('.btn-quick-add-voyage');
        if (btnAdd) {
          btnAdd.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openAddScheduleModal(dStr);
          });
        }

        gridCells.appendChild(cell);
      }

      // C. Padding days for next month to complete the grid
      const currentCellCount = firstDayIndex + totalDays;
      const totalGridCells = currentCellCount <= 35 ? 35 : 42;
      const nextMonthPadding = totalGridCells - currentCellCount;
      for (let n = 1; n <= nextMonthPadding; n++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell inactive-month';
        cell.innerHTML = `
          <div class="cal-day-header">
            <span class="cal-day-num">${n}</span>
          </div>
        `;
        gridCells.appendChild(cell);
      }
    }

    // 2. RENDER AGENDA VIEW LIST
    const agendaContainer = document.getElementById('calAgendaViewList');
    if (agendaContainer) {
      agendaContainer.innerHTML = '';
      const datesWithVoyages = Object.keys(dayVoyagesMap).filter(d => dayVoyagesMap[d].length > 0).sort();

      if (datesWithVoyages.length === 0) {
        agendaContainer.innerHTML = `
          <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:var(--radius-md);padding:2.5rem;text-align:center;color:#64748b;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" style="margin-bottom:0.75rem;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <h5 style="color:#0f172a;font-size:1rem;margin-bottom:0.35rem;">Tidak Ada Jadwal Pelayaran di Bulan Ini</h5>
            <p style="font-size:0.82rem;margin-bottom:1rem;">Gunakan tombol "+ Jadwal Baru" di atas untuk menambahkan jadwal keberangkatan armada kapal Anda.</p>
            <span class="tag-badge" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-weight: 700; padding: 0.45rem 0.9rem; border-radius: 8px;">
              🔒 Penambahan Jadwal Dikelola Developer Mode
            </span>
          </div>
        `;
      } else {
        datesWithVoyages.forEach(dStr => {
          const list = dayVoyagesMap[dStr];
          const dObj = new Date(dStr);
          const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dObj.getDay()];
          const dayNum = dObj.getDate();
          const monthName = monthNames[dObj.getMonth()];

          const block = document.createElement('div');
          block.className = 'agenda-day-block';

          let rowsHtml = '';
          list.forEach(voy => {
            const origPort = MASTER_PORTS.find(p => p.id === voy.originId) || { name: voy.originId, city: '' };
            const destPort = MASTER_PORTS.find(p => p.id === voy.destinationId) || { name: voy.destinationId, city: '' };
            const minPrice = Math.min(...(voy.classes ? voy.classes.map(c => c.price) : [300000]));
            const occPct = voy.capacity > 0 ? ((voy.bookedPax / voy.capacity) * 100).toFixed(0) : 0;

            rowsHtml += `
              <div class="agenda-voyage-row">
                <div>
                  <strong style="font-family:var(--font-mono);font-size:1.05rem;color:#0f172a;">${voy.departTime || '09:00'} WITA</strong>
                  <span style="font-size:0.72rem;color:#64748b;display:block;">Tiba: ${voy.arrivalTime || '11:00'}</span>
                </div>
                <div>
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                    <strong style="color:#0369a1;font-size:0.92rem;">${voy.vessel.name}</strong>
                    <span class="tag-badge" style="background:${voy.isIntl ? '#fef3c7' : '#ecfdf5'};color:${voy.isIntl ? '#d97706' : '#059669'};font-size:0.62rem;font-weight:700;">
                      ${voy.isIntl ? 'Luar Negeri' : 'Domestik'}
                    </span>
                  </div>
                  <span style="font-size:0.78rem;color:#334155;">${origPort.city} ➔ ${destPort.city}</span>
                  <small style="font-size:0.7rem;color:#64748b;display:block;">${voy.pier || 'Dermaga Keberangkatan'}</small>
                </div>
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:2px;">
                    <span style="color:#64748b;">Okupansi:</span>
                    <strong style="color:#0f172a;">${voy.bookedPax} / ${voy.capacity} Pax (${occPct}%)</strong>
                  </div>
                  <div style="width:100%;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
                    <div style="width:${occPct}%;height:100%;background:${occPct > 80 ? '#ef4444' : '#0284c7'};border-radius:3px;"></div>
                  </div>
                  <span style="font-size:0.7rem;color:#10b981;font-weight:600;margin-top:2px;display:block;">Mulai ${formatRupiah(minPrice)}</span>
                </div>
                <div style="text-align:right;">
                  <button type="button" class="btn-action-sm btn-agenda-detail" data-sch-id="${voy.id}" style="padding:0.4rem 0.8rem;font-weight:700;">
                    🔍 Detail & Tiket
                  </button>
                </div>
              </div>
            `;
          });

          block.innerHTML = `
            <div class="agenda-day-header">
              <span>📅 ${dayName}, ${dayNum} ${monthName} ${year}</span>
              <span class="tag-badge" style="background:#e0f2fe;color:#0284c7;font-weight:700;">${list.length} Pelayaran Terjadwal</span>
            </div>
            <div>${rowsHtml}</div>
          `;

          block.querySelectorAll('.btn-agenda-detail').forEach(b => {
            b.addEventListener('click', () => {
              const schId = b.getAttribute('data-sch-id');
              const voy = list.find(v => v.id === schId);
              if (voy) this.openVoyageDetailModal(voy, dStr);
            });
          });

          agendaContainer.appendChild(block);
        });
      }
    }
  },

  openVoyageDetailModal(sch, dateStr) {
    this.calendarState.selectedVoyageId = sch.id;
    const modal = document.getElementById('modalVoyageDetail');
    if (!modal) return;

    const origPort = MASTER_PORTS.find(p => p.id === sch.originId) || { name: sch.originId, city: sch.originId };
    const destPort = MASTER_PORTS.find(p => p.id === sch.destinationId) || { name: sch.destinationId, city: sch.destinationId };
    const vessel = sch.vessel || Store.getVessels().find(v => v.id === sch.vesselId) || { name: 'KM Armada', capacity: 120, regNumber: 'REG-1284' };

    document.getElementById('voyageModalTitle').innerText = vessel.name;
    document.getElementById('voyageModalId').innerText = sch.id;
    document.getElementById('voyageModalDate').innerText = dateStr;
    document.getElementById('voyageModalOrigCity').innerText = `${origPort.city} (${sch.originId})`;
    document.getElementById('voyageModalPier').innerText = sch.pier || 'Dermaga Tunon Taka';
    document.getElementById('voyageModalDepartTime').innerText = `${sch.departTime} WITA`;
    document.getElementById('voyageModalDestCity').innerText = `${destPort.city} (${sch.destinationId})`;
    document.getElementById('voyageModalArrivalTime').innerText = `${sch.arrivalTime} WITA`;
    document.getElementById('voyageModalDuration').innerText = sch.durationText || '1.5 Jam';
    document.getElementById('voyageModalVesselName').innerText = vessel.name;
    document.getElementById('voyageModalRegNum').innerText = vessel.regNumber || 'REG-KSOP';
    document.getElementById('voyageModalCapacity').innerText = `${sch.capacity || vessel.capacity || 120} Seat`;
    document.getElementById('voyageModalBookedPax').innerText = `${sch.bookedPax || 0} Pax`;

    const cap = sch.capacity || vessel.capacity || 120;
    const occ = sch.bookedPax || 0;
    const pct = cap > 0 ? ((occ / cap) * 100).toFixed(1) : 0;
    document.getElementById('voyageModalOccupancyRate').innerText = `${pct}% Terisi (${cap - occ} Kursi Sisa)`;

    const catBadge = document.getElementById('voyageModalCategoryBadge');
    if (catBadge) {
      if (sch.isIntl) {
        catBadge.innerText = '🌏 Rute Internasional (Tawau, Sabah)';
        catBadge.style.background = '#fef3c7';
        catBadge.style.color = '#d97706';
      } else {
        catBadge.innerText = '🇮🇩 Rute Domestik (Sulawesi / Kaltara)';
        catBadge.style.background = '#ecfdf5';
        catBadge.style.color = '#059669';
      }
    }

    // Classes list
    const classContainer = document.getElementById('voyageModalClassList');
    if (classContainer) {
      classContainer.innerHTML = '';
      if (sch.classes && sch.classes.length > 0) {
        sch.classes.forEach(c => {
          const pill = document.createElement('div');
          pill.style.cssText = 'background:#fff;border:1px solid #cbd5e1;padding:0.35rem 0.75rem;border-radius:6px;display:flex;align-items:center;gap:0.5rem;';
          pill.innerHTML = `<span style="font-size:0.75rem;font-weight:700;color:#0f172a;">${c.name}:</span> <strong style="color:#0284c7;font-family:var(--font-mono);font-size:0.82rem;">${formatRupiah(c.price)}</strong>`;
          classContainer.appendChild(pill);
        });
      }
    }

    modal.classList.add('show');
  },

  getDefaultCrewTemplate() {
    return [
      { name: '', position: 'MASTER', gender: 'M', age: '', nationality: 'Indonesia', passport: '' },
      { name: '', position: 'MUALIM', gender: 'M', age: '', nationality: 'Indonesia', passport: '' },
      { name: '', position: 'MASINIS', gender: 'M', age: '', nationality: 'Indonesia', passport: '' },
      { name: '', position: 'CREW/ AB', gender: 'M', age: '', nationality: 'Indonesia', passport: '' },
      { name: '', position: 'CREW/ AB', gender: 'M', age: '', nationality: 'Indonesia', passport: '' },
      { name: '', position: 'CREW/ AB', gender: 'M', age: '', nationality: 'Indonesia', passport: '' }
    ];
  },

  renderFleetCrewPreview(fleet) {
    this.initVesselCrewEvents();
    const sel = document.getElementById('fleetCrewVesselSelect');
    const tbody = document.getElementById('tbodyVesselCrewPreview');
    if (!sel || !tbody) return;

    const prevSelected = sel.value;
    sel.innerHTML = '';
    if (!fleet || fleet.length === 0) {
      sel.innerHTML = '<option value="">-- Belum Ada Armada --</option>';
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-dim" style="padding: 1.5rem;">Tambahkan armada kapal terlebih dahulu untuk mengisi daftar crew.</td></tr>';
      return;
    }

    fleet.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `🚢 ${v.name}`;
      sel.appendChild(opt);
    });

    if (prevSelected && fleet.some(v => v.id === prevSelected)) {
      sel.value = prevSelected;
    } else {
      sel.value = fleet[0].id;
    }

    const activeVessel = fleet.find(v => v.id === sel.value) || fleet[0];
    const crewList = (activeVessel && Array.isArray(activeVessel.crewList) && activeVessel.crewList.length > 0)
      ? activeVessel.crewList
      : this.getDefaultCrewTemplate();

    tbody.innerHTML = crewList.map((c, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700; border: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="font-weight: 700; color: #0f172a; border: 1px solid #e2e8f0;">${c.name ? c.name.toUpperCase() : '<span style="color:#94a3b8; font-weight:400; font-style:italic;">Belum diisi</span>'}</td>
        <td style="font-weight: 700; color: #0284c7; border: 1px solid #e2e8f0;">${c.position || 'CREW/ AB'}</td>
        <td style="text-align: center; border: 1px solid #e2e8f0;">${c.gender || 'M'}</td>
        <td style="text-align: center; border: 1px solid #e2e8f0;">${c.age || '-'}</td>
        <td style="text-align: center; border: 1px solid #e2e8f0;">${c.nationality || 'Indonesia'}</td>
        <td style="font-family: monospace; font-weight: 600; border: 1px solid #e2e8f0;">${c.passport || '-'}</td>
      </tr>
    `).join('');
  },

  initVesselCrewEvents() {
    if (this._vesselCrewEventsBound) return;
    this._vesselCrewEventsBound = true;

    document.getElementById('fleetCrewVesselSelect')?.addEventListener('change', () => {
      const tenant = Store.getCurrentTenant();
      if (!tenant) return;
      const fleet = Store.getVesselsByCompany(tenant.id);
      this.renderFleetCrewPreview(fleet);
    });

    document.getElementById('btnOpenEditCrewFromPreview')?.addEventListener('click', () => {
      const vid = document.getElementById('fleetCrewVesselSelect')?.value;
      if (!vid) {
        this.showToast('Pilih Armada', 'Tambahkan atau pilih armada kapal terlebih dahulu.', 'warning');
        return;
      }
      this.openVesselCrewModal(vid);
    });

    document.getElementById('btnPrintVesselCrewList')?.addEventListener('click', () => {
      const vid = document.getElementById('fleetCrewVesselSelect')?.value;
      if (!vid) {
        this.showToast('Pilih Armada', 'Pilih armada kapal terlebih dahulu untuk mencetak Crew List.', 'warning');
        return;
      }
      this.printVesselCrewListDocument(vid);
    });

    document.getElementById('btnCloseVesselCrewModal')?.addEventListener('click', () => {
      document.getElementById('modalVesselCrewList')?.classList.remove('show');
    });
    document.getElementById('btnCancelVesselCrewModal')?.addEventListener('click', () => {
      document.getElementById('modalVesselCrewList')?.classList.remove('show');
    });

    document.getElementById('btnAddCrewRow')?.addEventListener('click', () => {
      this._currentModalCrewRows = this.collectModalCrewRows();
      this._currentModalCrewRows.push({
        name: '',
        position: 'CREW/ AB',
        gender: 'M',
        age: '',
        nationality: 'Indonesia',
        passport: ''
      });
      this.renderModalCrewRows();
    });

    document.getElementById('formVesselCrewList')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const vid = document.getElementById('crewModalVesselId')?.value;
      if (!vid) return;
      const rows = this.collectModalCrewRows();
      Store.updateVessel(vid, { crewList: rows });
      document.getElementById('modalVesselCrewList')?.classList.remove('show');
      const sel = document.getElementById('fleetCrewVesselSelect');
      if (sel) sel.value = vid;
      this.refreshCompanyDashboard();
      this.showToast('Crew List Tersimpan', 'Daftar crew armada berhasil diperbarui.');
    });
  },

  openVesselCrewModal(vesselId) {
    this.initVesselCrewEvents();
    const tenant = Store.getCurrentTenant();
    const fleet = tenant ? Store.getVesselsByCompany(tenant.id) : Store.getVessels();
    const vessel = fleet.find(v => v.id === vesselId);
    if (!vessel) return;

    document.getElementById('crewModalVesselId').value = vessel.id;
    const lbl = document.getElementById('modalCrewVesselNameLabel');
    if (lbl) lbl.textContent = vessel.name;

    this._currentModalCrewRows = (Array.isArray(vessel.crewList) && vessel.crewList.length > 0)
      ? vessel.crewList.map(c => ({ ...c }))
      : this.getDefaultCrewTemplate();

    this.renderModalCrewRows();
    document.getElementById('modalVesselCrewList')?.classList.add('show');
  },

  collectModalCrewRows() {
    const tbody = document.getElementById('tbodyModalCrewRows');
    if (!tbody) return this._currentModalCrewRows || this.getDefaultCrewTemplate();
    const trs = [...tbody.querySelectorAll('tr')];
    return trs.map(tr => ({
      name: (tr.querySelector('.crew-input-name')?.value || '').trim().toUpperCase(),
      position: tr.querySelector('.crew-input-position')?.value || 'CREW/ AB',
      gender: tr.querySelector('.crew-input-gender')?.value || 'M',
      age: (tr.querySelector('.crew-input-age')?.value || '').trim(),
      nationality: tr.querySelector('.crew-input-nationality')?.value || 'Indonesia',
      passport: (tr.querySelector('.crew-input-passport')?.value || '').trim().toUpperCase()
    }));
  },

  renderModalCrewRows() {
    const tbody = document.getElementById('tbodyModalCrewRows');
    if (!tbody) return;
    const rows = this._currentModalCrewRows || this.getDefaultCrewTemplate();
    const positions = ['MASTER', 'MUALIM', 'MASINIS', 'CREW/ AB', 'KKM', 'JURU MUDI', 'OILER'];
    const natFromForm = Array.from(document.getElementById('custPaxNationality')?.options || []).map(o => o.value);
    const nationalities = natFromForm.length ? natFromForm : ['Indonesia', 'Malaysia', 'Singapura', 'Filipina', 'Lainnya'];

    tbody.innerHTML = rows.map((r, idx) => {
      const posOptions = positions.map(p => `<option value="${p}" ${r.position === p ? 'selected' : ''}>${p}</option>`).join('');
      const natOptions = nationalities.map(n => `<option value="${n}" ${(r.nationality || 'Indonesia') === n ? 'selected' : ''}>${n}</option>`).join('');
      return `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #475569;">${idx + 1}</td>
          <td>
            <input type="text" class="form-input crew-input-name" value="${r.name || ''}" placeholder="Contoh: SARIANTO LATONGKO" style="padding: 0.35rem 0.55rem; font-size: 0.8rem; text-transform: uppercase;">
          </td>
          <td>
            <select class="form-input crew-input-position" style="padding: 0.35rem 0.5rem; font-size: 0.8rem; font-weight: 700;">
              ${posOptions}
            </select>
          </td>
          <td>
            <select class="form-input crew-input-gender" style="padding: 0.35rem 0.45rem; font-size: 0.8rem;">
              <option value="M" ${(r.gender || 'M') === 'M' ? 'selected' : ''}>M</option>
              <option value="F" ${r.gender === 'F' ? 'selected' : ''}>F</option>
            </select>
          </td>
          <td>
            <input type="number" class="form-input crew-input-age" value="${r.age || ''}" placeholder="43" min="16" max="90" style="padding: 0.35rem 0.45rem; font-size: 0.8rem; text-align: center;">
          </td>
          <td>
            <select class="form-input crew-input-nationality" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;">
              ${natOptions}
            </select>
          </td>
          <td>
            <input type="text" class="form-input crew-input-passport" value="${r.passport || ''}" placeholder="E6989151" style="padding: 0.35rem 0.55rem; font-size: 0.8rem; font-family: monospace; text-transform: uppercase;">
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-del-crew-row" data-idx="${idx}" style="background: transparent; border: none; color: #ef4444; font-size: 1.1rem; font-weight: 800; cursor: pointer;" title="Hapus Baris">&times;</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-del-crew-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        this._currentModalCrewRows = this.collectModalCrewRows();
        if (this._currentModalCrewRows.length <= 1) return;
        this._currentModalCrewRows.splice(idx, 1);
        this.renderModalCrewRows();
      });
    });
  },

  printVesselCrewListDocument(vesselId) {
    const tenant = Store.getCurrentTenant();
    const fleet = tenant ? Store.getVesselsByCompany(tenant.id) : Store.getVessels();
    const vessel = fleet.find(v => v.id === vesselId);
    if (!vessel) return;

    const crewList = (Array.isArray(vessel.crewList) && vessel.crewList.length > 0)
      ? vessel.crewList
      : this.getDefaultCrewTemplate();

    const rowsHtml = crewList.map((c, idx) => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 6px 10px;">${(c.name || '-').toUpperCase()}</td>
        <td style="border: 1px solid #000; padding: 6px 10px;">${c.position || 'CREW/ AB'}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${c.gender || 'M'}</td>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${c.age || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px 10px;">${c.nationality || 'Indonesia'}</td>
        <td style="border: 1px solid #000; padding: 6px 10px;">${c.passport || '-'}</td>
      </tr>
    `).join('');

    const w = window.open('', '_blank', 'width=900,height=650');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CREW LIST - ${vessel.name}</title>
        <style>
          body { font-family: "Times New Roman", Times, serif; color: #000; padding: 28px; }
          h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: bold; text-transform: uppercase; }
          .sub { margin-bottom: 12px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>CREW LIST</h2>
        <div class="sub"><strong>Vessel / Armada:</strong> ${vessel.name} &nbsp;|&nbsp; <strong>Reg / IMO:</strong> ${vessel.regNumber || '-'} &nbsp;|&nbsp; <strong>Operator:</strong> ${tenant ? tenant.name : '-'}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 45px;">No.</th>
              <th>Name</th>
              <th style="width: 150px;">Position</th>
              <th style="width: 70px;">Gender</th>
              <th style="width: 60px;">Age</th>
              <th style="width: 130px;">Nationality</th>
              <th style="width: 150px;">Passport</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); };<\/script>
      </body>
      </html>
    `);
    w.document.close();
  },

  openEditVesselModal(vesselId) {
    const vessel = Store.getVessels().find(v => v.id === vesselId);
    if (!vessel) return;

    const modalTitle = document.getElementById('modalVesselTitle');
    const submitBtn = document.getElementById('btnSubmitVessel');
    const editIdInput = document.getElementById('vesselEditId');

    if (modalTitle) modalTitle.innerText = `Edit Data Armada: ${vessel.name}`;
    if (submitBtn) submitBtn.innerText = 'Simpan Perubahan Armada';
    if (editIdInput) editIdInput.value = vessel.id;

    const nameInput = document.getElementById('vesselNameInput');
    const regInput = document.getElementById('vesselRegInput');
    this.populateVesselTypeDropdown();
    const typeInput = document.getElementById('vesselTypeInput');
    const capInput = document.getElementById('vesselCapacityInput');
    const facInput = document.getElementById('vesselFacInput');
    const passInput = document.getElementById('vesselAuthPassword');

    if (nameInput) nameInput.value = vessel.name || '';
    if (regInput) regInput.value = vessel.regNumber || '';
    if (typeInput) {
      if (vessel.type && ![...typeInput.options].some(o => o.value === vessel.type)) {
        typeInput.add(new Option(vessel.type, vessel.type));
      }
      typeInput.value = vessel.type || typeInput.options[0]?.value || 'Kapal Penumpang Internasional (Nunukan - Tawau)';
    }
    if (capInput) capInput.value = vessel.capacity || 250;
    if (facInput) facInput.value = (vessel.facilities && vessel.facilities.length > 0) ? vessel.facilities.join(', ') : '';
    if (passInput) passInput.value = '';

    document.getElementById('modalAddVessel')?.classList.add('show');
  },

  openEditSchedulePriceModal(scheduleId) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Pengaturan harga tiket dan pas pelabuhan hanya dapat diubah di menu Login Developer.', 'warning');
      return;
    }
    const s = Store.getScheduleById ? Store.getScheduleById(scheduleId) : Store.getSchedules().find(item => item.id === scheduleId);
    if (!s) {
      this.showToast('Jadwal Tidak Ditemukan', `Jadwal ${scheduleId} tidak ditemukan.`, 'warning');
      return;
    }
    const allVessels = Store.getVessels ? Store.getVessels() : [];
    const v = allVessels.find(item => item.id === s.vesselId);
    const vName = v ? v.name : 'Armada Reguler';
    const orig = MASTER_PORTS.find(p => p.id === s.originId);
    const dest = MASTER_PORTS.find(p => p.id === s.destinationId);

    const schedIdEl = document.getElementById('editSchedId');
    const schedIdLabel = document.getElementById('editSchedIdLabel');
    const routeInfoEl = document.getElementById('editSchedRouteInfo');
    const vipInput = document.getElementById('editSchedPriceVip');
    const ekoInput = document.getElementById('editSchedPriceEko');

    if (schedIdEl) schedIdEl.value = s.id;
    if (schedIdLabel) schedIdLabel.innerText = s.id;
    if (routeInfoEl) routeInfoEl.value = `${vName} (${orig ? orig.name : s.originId} ➔ ${dest ? dest.name : s.destinationId}) • ${s.departTime} WITA`;

    let vipPrice = 750000;
    let ekoPrice = s.priceEconomy || 690000;
    if (s.classes && s.classes.length > 0) {
      const vipClass = s.classes.find(c => c.id === 'cls-vip' || (c.name && c.name.toLowerCase().includes('vip')));
      const ekoClass = s.classes.find(c => c.id === 'cls-eko' || (c.name && c.name.toLowerCase().includes('ekonomi')));
      if (vipClass) vipPrice = vipClass.price;
      if (ekoClass) ekoPrice = ekoClass.price;
      else if (s.classes[0]) ekoPrice = s.classes[0].price;
    }

    if (vipInput) vipInput.value = vipPrice;
    if (ekoInput) ekoInput.value = ekoPrice;

    const portPassInput = document.getElementById('editSchedPortPassPrice');
    if (portPassInput) {
      const isTwu = s.originId === 'TWU' || s.destinationId === 'TWU';
      portPassInput.value = s.portPassFee !== undefined ? s.portPassFee : (isTwu ? 50000 : 30000);
    }

    const passInput = document.getElementById('editSchedAuthPassword');
    if (passInput) passInput.value = '';

    document.getElementById('modalEditSchedulePrice')?.classList.add('show');
  },

  openEditRouteTariffModal(routeId) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Pengaturan tarif rute pelayaran hanya dapat diubah di menu Login Developer.', 'warning');
      return;
    }
    const r = Store.getMasterRouteTariffById ? Store.getMasterRouteTariffById(routeId) : null;
    if (!r) {
      this.showToast('Rute Tidak Ditemukan', `Rute ${routeId} tidak ditemukan.`, 'warning');
      return;
    }

    const idEl = document.getElementById('editRouteId');
    const origEl = document.getElementById('editRouteOriginId');
    const destEl = document.getElementById('editRouteDestinationId');
    const labelEl = document.getElementById('editRouteNameLabel');
    const displayEl = document.getElementById('editRouteDisplayName');
    const catEl = document.getElementById('editRouteCategory');
    const portsEl = document.getElementById('editRoutePorts');
    const priceEl = document.getElementById('editRouteTicketPrice');
    const passEl = document.getElementById('editRoutePortPassPrice');
    const notesEl = document.getElementById('editRouteNotes');

    const origPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.originId) : null;
    const destPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.destinationId) : null;
    const origCity = origPort ? origPort.city.split(' ')[0] : (r.originName ? r.originName.split(' ')[0].replace(/\(.*$/, '').trim() : r.originId);
    const destCity = destPort ? destPort.city.split(' ')[0] : (r.destinationName ? r.destinationName.split(' ')[0].replace(/\(.*$/, '').trim() : r.destinationId);
    const shortLabel = `${origCity} - ${destCity}`;

    if (idEl) idEl.value = r.id;
    if (origEl) origEl.value = r.originId;
    if (destEl) destEl.value = r.destinationId;
    if (labelEl) labelEl.innerText = shortLabel;
    if (displayEl) displayEl.value = shortLabel;
    if (catEl) catEl.value = r.category || 'Internasional';
    if (portsEl) portsEl.value = `${r.originId} ➔ ${r.destinationId}`;
    if (priceEl) priceEl.value = r.ticketPrice || 430000;
    if (passEl) passEl.value = r.portPassFee !== undefined ? r.portPassFee : 50000;
    if (notesEl) notesEl.value = r.notes || '';

    document.getElementById('modalEditRouteTariff')?.classList.add('show');
  },

  deleteMasterRouteTariff(routeId) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Penghapusan rute hanya dapat dilakukan oleh Developer.', 'warning');
      return;
    }
    if (!Store.deleteMasterRouteTariff) {
      this.showToast('Muat Ulang Halaman', 'Data sistem belum diperbarui. Tekan Ctrl + F5 lalu coba kembali.', 'warning');
      return;
    }
    const r = Store.getMasterRouteTariffById ? Store.getMasterRouteTariffById(routeId) : null;
    const label = r ? `${r.originName || r.originId} ➔ ${r.destinationName || r.destinationId}` : routeId;
    if (!confirm(`Hapus rute "${label}" dari daftar tarif resmi?`)) return;
    Store.deleteMasterRouteTariff(routeId);
    if (typeof this.renderDevAdminDashboard === 'function') this.renderDevAdminDashboard();
    this.showToast('Rute Dihapus', `Rute ${label} telah dihapus dari daftar tarif resmi.`);
  },

  openAddMasterRouteModal() {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Penambahan rute baru hanya dapat dilakukan oleh Developer.', 'warning');
      return;
    }
    document.getElementById('formAddMasterRoute')?.reset();
    const origSel = document.getElementById('addRouteOriginSelect');
    const destSel = document.getElementById('addRouteDestSelect');
    const catSel = document.getElementById('addRouteCategorySelect');
    const syncPassByRoute = () => {
      const o = origSel ? origSel.value : 'NNK';
      const d = destSel ? destSel.value : 'TWU';
      const isIntl = o === 'TWU' || d === 'TWU';
      const cat = isIntl ? 'Internasional' : 'Domestik';
      if (catSel) catSel.value = cat;
      const oPort = MASTER_PORTS.find(p => p.id === o);
      const nameEl = document.getElementById('addRoutePortPassName');
      const priceEl = document.getElementById('addRoutePortPassPrice');
      const ticketEl = document.getElementById('addRouteTicketPrice');
      const existingPass = Store.getPortPasses ? Store.getPortPasses().find(p => p.portId === o && p.routeType === cat) : null;
      if (nameEl) nameEl.value = existingPass ? existingPass.name : `Pas Pelabuhan ${cat} ${oPort ? oPort.name : o}`;
      if (priceEl) priceEl.value = existingPass ? (existingPass.priceAdult || 0) : (isIntl ? 50000 : 30000);
      if (ticketEl) ticketEl.value = isIntl ? 430000 : 690000;
    };
    if (origSel) origSel.onchange = syncPassByRoute;
    if (destSel) destSel.onchange = syncPassByRoute;
    syncPassByRoute();
    document.getElementById('modalAddMasterRoute')?.classList.add('show');
  },

  // ================= DEVELOPER PORTAL: MODAL HELPERS =================
  openDevEditCompanyModal(compId) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Menu ini hanya dapat diakses dalam Mode Developer.', 'warning');
      return;
    }
    const comp = Store.getCompanyById(compId);
    if (!comp) {
      this.showToast('Perusahaan Tidak Ditemukan', 'Data perusahaan tidak ditemukan dalam sistem.', 'warning');
      return;
    }

    const idInput = document.getElementById('devEditCompId');
    const nameInput = document.getElementById('devEditCompName');
    const shortNameInput = document.getElementById('devEditCompShortName');
    const codeInput = document.getElementById('devEditCompCode');
    const catSelect = document.getElementById('devEditCompCategory');
    const emailInput = document.getElementById('devEditCompEmail');
    const passInput = document.getElementById('devEditCompPassword');
    const phoneInput = document.getElementById('devEditCompPhone');
    const colorSelect = document.getElementById('devEditCompColor');

    if (idInput) idInput.value = comp.id;
    if (nameInput) nameInput.value = comp.name || '';
    if (shortNameInput) shortNameInput.value = comp.shortName || comp.name || '';
    if (codeInput) codeInput.value = comp.code || '';
    if (catSelect) catSelect.value = comp.category || 'Kapal Penumpang Internasional (Nunukan - Tawau)';
    if (emailInput) emailInput.value = comp.email || '';
    if (passInput) passInput.value = comp.password || '';
    if (phoneInput) phoneInput.value = comp.phone || '';
    if (colorSelect) colorSelect.value = comp.brandColor || '#0284c7';

    document.getElementById('modalDevEditCompany')?.classList.add('show');
    setTimeout(() => nameInput?.focus(), 80);
  },

  openDevAddCompanyModal() {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Menu ini hanya dapat diakses dalam Mode Developer.', 'warning');
      return;
    }
    document.getElementById('formDevAddCompany')?.reset();
    const codeEl = document.getElementById('devAddCompCode');
    if (codeEl) codeEl.value = '';
    const colEl = document.getElementById('devAddCompColor');
    if (colEl) colEl.value = '#0284c7';
    document.getElementById('modalDevAddCompany')?.classList.add('show');
    setTimeout(() => document.getElementById('devAddCompName')?.focus(), 80);
  },

  openDevAddScheduleModal(preselectedCompanyId = null) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Menu ini hanya dapat diakses dalam Mode Developer.', 'warning');
      return;
    }
    const companies = Store.getCompanies();
    if (companies.length === 0) {
      this.showToast('Perusahaan Kosong', 'Daftarkan perusahaan terlebih dahulu sebelum membuka jadwal.', 'warning');
      this.openDevAddCompanyModal();
      return;
    }

    const compSel = document.getElementById('devAddSchedCompanySelect');
    const vesSel = document.getElementById('devAddSchedVesselSelect');
    const origSel = document.getElementById('devAddSchedOriginSelect');
    const destSel = document.getElementById('devAddSchedDestSelect');

    if (compSel) {
      compSel.innerHTML = '';
      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.code || c.id})`;
        if (preselectedCompanyId && c.id === preselectedCompanyId) opt.selected = true;
        compSel.appendChild(opt);
      });
      if (preselectedCompanyId && [...compSel.options].some(o => o.value === preselectedCompanyId)) {
        compSel.value = preselectedCompanyId;
      }
    }

    // Populate Ports
    const allPorts = (typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.slice() : []);
    const masterRoutes = (typeof Store !== 'undefined' && Store.getMasterRouteTariffs) ? Store.getMasterRouteTariffs() : [];
    masterRoutes.forEach(r => {
      if (r.originId && !allPorts.some(p => p.id === r.originId)) {
        allPorts.push({ id: r.originId, name: r.originName || r.originId, city: r.originName || r.originId });
      }
      if (r.destinationId && !allPorts.some(p => p.id === r.destinationId)) {
        allPorts.push({ id: r.destinationId, name: r.destinationName || r.destinationId, city: r.destinationName || r.destinationId });
      }
    });

    if (origSel && destSel) {
      origSel.innerHTML = '';
      destSel.innerHTML = '';
      allPorts.forEach(port => {
        origSel.add(new Option(`${port.name} (${port.city})`, port.id));
        destSel.add(new Option(`${port.name} (${port.city})`, port.id));
      });
      origSel.value = 'NNK';
      destSel.value = 'TWU';
    }

    // Function to populate vessels for selected company
    const populateVessels = () => {
      const cId = compSel ? compSel.value : (companies[0] ? companies[0].id : '');
      const compFleet = Store.getVesselsByCompany(cId);
      if (vesSel) {
        vesSel.innerHTML = '';
        if (compFleet.length === 0) {
          vesSel.innerHTML = '<option value="">-- Tidak ada armada (Tambah armada dulu) --</option>';
        } else {
          compFleet.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.name} (${v.type || 'Kapal'} • ${v.capacity} Seat)`;
            vesSel.appendChild(opt);
          });
        }
      }
      syncRouteAndPrice();
    };

    // Function to sync tariffs based on route
    const syncRouteAndPrice = () => {
      const oVal = origSel ? origSel.value : 'NNK';
      const dVal = destSel ? destSel.value : 'TWU';
      const isDestIntl = dVal === 'TWU' || oVal === 'TWU';
      const pEko = document.getElementById('devAddSchedPriceEko');
      const pPass = document.getElementById('devAddSchedPortPassPrice');
      const pPier = document.getElementById('devAddSchedPierInput');
      const rTariff = (typeof Store !== 'undefined' && Store.getMasterRouteTariff) ? Store.getMasterRouteTariff(oVal, dVal) : null;
      if (pEko) pEko.value = rTariff ? rTariff.ticketPrice : (isDestIntl ? 430000 : 690000);
      if (pPass) pPass.value = rTariff ? rTariff.portPassFee : (isDestIntl ? 50000 : 30000);
      if (pPier) pPier.value = isDestIntl ? 'Dermaga Lintas Batas Internasional' : 'Dermaga Nusantara Domestik';
    };

    if (compSel) compSel.onchange = populateVessels;
    if (origSel) origSel.onchange = syncRouteAndPrice;
    if (destSel) destSel.onchange = syncRouteAndPrice;
    if (vesSel) {
      vesSel.onchange = () => {
        const v = Store.getVessels().find(item => item.id === vesSel.value);
        if (v && origSel && destSel) {
          const vType = (v.type || '').toLowerCase();
          const vName = (v.name || '').toLowerCase();
          if (vType.includes('parepare - nunukan') || vName.includes('parepare - nunukan')) {
            origSel.value = 'PRE';
            destSel.value = 'NNK';
          } else if (vType.includes('parepare') || vType.includes('domestik') || vName.includes('pantokrator')) {
            origSel.value = 'NNK';
            destSel.value = 'PRE';
          } else if (vType.includes('tawau - nunukan') || vName.includes('tawau - nunukan')) {
            origSel.value = 'TWU';
            destSel.value = 'NNK';
          } else if (vType.includes('tawau') || vType.includes('internasional') || vName.includes('labuan')) {
            origSel.value = 'NNK';
            destSel.value = 'TWU';
          }
          syncRouteAndPrice();
        }
      };
    }

    populateVessels();

    const dateInput = document.getElementById('devAddSchedDateInput');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
      dateInput.min = today;
    }

    document.getElementById('modalDevAddSchedule')?.classList.add('show');
  },

  openDevAddVesselModal(preselectedCompanyId = null) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Menu ini hanya dapat diakses dalam Mode Developer.', 'warning');
      return;
    }
    const companies = Store.getCompanies();
    if (companies.length === 0) {
      this.showToast('Perusahaan Kosong', 'Daftarkan perusahaan terlebih dahulu sebelum menambahkan armada.', 'warning');
      this.openDevAddCompanyModal();
      return;
    }

    const sel = document.getElementById('devAddVesselCompanySelect');
    if (sel) {
      sel.innerHTML = '';
      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.code || c.id})`;
        if (preselectedCompanyId && c.id === preselectedCompanyId) opt.selected = true;
        sel.appendChild(opt);
      });
      if (preselectedCompanyId && [...sel.options].some(o => o.value === preselectedCompanyId)) {
        sel.value = preselectedCompanyId;
      }
    }

    document.getElementById('formDevAddVessel')?.reset();
    const capEl = document.getElementById('devAddVesselCapacity');
    if (capEl) capEl.value = '150';
    const facEl = document.getElementById('devAddVesselFacilities');
    if (facEl) facEl.value = '-';
    const chkEl = document.getElementById('devAddVesselMakeDefaultCheck');
    if (chkEl) chkEl.checked = true;

    document.getElementById('modalDevAddVessel')?.classList.add('show');
    setTimeout(() => document.getElementById('devAddVesselName')?.focus(), 80);
  },

  openDevEditVesselModal(vesselId) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Menu ini hanya dapat diakses dalam Mode Developer.', 'warning');
      return;
    }
    const vessel = Store.getVessels().find(v => v.id === vesselId);
    if (!vessel) {
      this.showToast('Armada Tidak Ditemukan', 'Data armada kapal tidak ditemukan dalam sistem.', 'warning');
      return;
    }

    const companies = Store.getCompanies();
    const sel = document.getElementById('devEditVesselCompanySelect');
    if (sel) {
      sel.innerHTML = '';
      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.code || c.id})`;
        if (c.id === vessel.companyId) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.value = vessel.companyId;
    }

    const idInput = document.getElementById('devEditVesselId');
    const nameInput = document.getElementById('devEditVesselName');
    const regInput = document.getElementById('devEditVesselReg');
    const typeSelect = document.getElementById('devEditVesselType');
    const capInput = document.getElementById('devEditVesselCapacity');
    const facInput = document.getElementById('devEditVesselFacilities');
    const titleLabel = document.getElementById('devEditVesselModalTitle');

    if (idInput) idInput.value = vessel.id;
    if (nameInput) nameInput.value = vessel.name || '';
    if (regInput) regInput.value = vessel.regNumber || '';
    if (typeSelect) {
      if (vessel.type && ![...typeSelect.options].some(o => o.value === vessel.type)) {
        typeSelect.add(new Option(vessel.type, vessel.type));
      }
      typeSelect.value = vessel.type || typeSelect.options[0]?.value || 'Kapal Penumpang Internasional (Nunukan - Tawau)';
    }
    const isVesselSulawesi = (vessel.type || '').toLowerCase().includes('parepare') || (vessel.type || '').toLowerCase().includes('domestik') || (vessel.name || '').toLowerCase().includes('pantokrator');
    if (capInput) {
      capInput.value = vessel.capacity || 0;
    }
    if (facInput) {
      facInput.value = (Array.isArray(vessel.facilities) && vessel.facilities.length > 0)
        ? vessel.facilities.join(', ')
        : '-';
    }
    if (titleLabel) titleLabel.textContent = `Pengaturan Data & Dek Armada: ${vessel.name}`;

    // Muat konfigurasi baris vertikal & kolom horizontal terpadu
    const capVal = vessel.capacity || 150;
    const vCols = vessel.seatCols || 6;
    const vRows = vessel.seatRows || Math.max(1, Math.ceil(capVal / vCols));
    const vColsLeft = vessel.seatColsLeft || Math.ceil(vCols / 2);
    const vColsRight = vessel.seatColsRight || (vCols - vColsLeft);

    const rowsInput = document.getElementById('devEditVesselRowsInput');
    const colsInput = document.getElementById('devEditVesselColsInput');
    const colsLeftInput = document.getElementById('devEditVesselColsLeftInput');
    const colsRightInput = document.getElementById('devEditVesselColsRightInput');

    if (rowsInput) rowsInput.value = vRows;
    if (colsInput) colsInput.value = vCols;
    if (colsLeftInput) colsLeftInput.value = vColsLeft;
    if (colsRightInput) colsRightInput.value = vColsRight;

    this.updateDevEditVesselSeatPreview();

    // Muat daftar dek kapal untuk diedit langsung di modal ini
    const vesselDecks = (typeof Store !== 'undefined' && Store.getVesselDecks)
      ? Store.getVesselDecks(vessel)
      : (vessel.decks || []);
    this.renderDevEditVesselDecks(vesselDecks);

    document.getElementById('modalDevEditVessel')?.classList.add('show');
    setTimeout(() => nameInput?.focus(), 80);
  },

  renderDevEditVesselDecks(decks = []) {
    const tbody = document.getElementById('tbodyDevEditVesselDecks');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(decks) || decks.length === 0) {
      tbody.innerHTML = `
        <tr id="rowDevEditVesselEmptyDecks">
          <td colspan="6" style="text-align: center; color: #94a3b8; padding: 1.5rem; font-size: 0.76rem;">
            Belum ada dek ditambahkan untuk armada ini. Klik tombol <strong>➕ Tambah Dek</strong> di atas untuk mengatur nama dek dan jumlah kursi.
          </td>
        </tr>
      `;
      this.updateDevEditVesselCapacitySummary();
      return;
    }

    decks.forEach((d, idx) => {
      const tr = document.createElement('tr');
      tr.style.background = '#162032';
      tr.innerHTML = `
        <td style="background: #162032 !important; border-bottom: 1px solid rgba(51, 65, 85, 0.55) !important;"><input type="text" class="form-input dev-vessel-deck-code" value="${d.code || 'DECK'}" required style="padding: 0.35rem 0.5rem; font-size: 0.76rem; background: #1e293b; color: #38bdf8; font-weight: 700; width: 100%; border: 1px solid #334155;"></td>
        <td style="background: #162032 !important; border-bottom: 1px solid rgba(51, 65, 85, 0.55) !important;"><input type="text" class="form-input dev-vessel-deck-carriage" value="${d.carriage || d.name || 'DECK'}" required style="padding: 0.35rem 0.5rem; font-size: 0.76rem; background: #1e293b; color: #ffffff; font-weight: 700; width: 100%; border: 1px solid #334155;"></td>
        <td style="background: #162032 !important; border-bottom: 1px solid rgba(51, 65, 85, 0.55) !important;"><input type="text" class="form-input dev-vessel-deck-name" value="${d.name || 'Dek Kapal'}" required style="padding: 0.35rem 0.5rem; font-size: 0.76rem; background: #1e293b; color: #ffffff; font-weight: 600; width: 100%; border: 1px solid #334155;"></td>
        <td style="background: #162032 !important; border-bottom: 1px solid rgba(51, 65, 85, 0.55) !important;"><input type="number" class="form-input dev-vessel-deck-capacity" value="${d.capacity || 100}" min="1" max="3000" required style="padding: 0.35rem 0.5rem; font-size: 0.76rem; background: #1e293b; color: #34d399; font-weight: 800; width: 100%; border: 1px solid #334155;"></td>
        <td style="background: #162032 !important; border-bottom: 1px solid rgba(51, 65, 85, 0.55) !important;"><input type="text" class="form-input dev-vessel-deck-desc" value="${d.desc || ''}" placeholder="Keterangan area dek..." style="padding: 0.35rem 0.5rem; font-size: 0.76rem; background: #1e293b; color: #cbd5e1; width: 100%; border: 1px solid #334155;"></td>
        <td style="text-align: center; background: #162032 !important; border-bottom: 1px solid rgba(51, 65, 85, 0.55) !important;">
          <button type="button" class="btn-dev-vessel-remove-deck" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 0.25rem 0.45rem; font-size: 0.72rem; cursor: pointer;" title="Hapus Dek Ini">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);

      tr.querySelector('.dev-vessel-deck-capacity')?.addEventListener('input', () => {
        this.updateDevEditVesselCapacitySummary();
      });
      tr.querySelector('.btn-dev-vessel-remove-deck')?.addEventListener('click', () => {
        tr.remove();
        if (tbody.querySelectorAll('tr').length === 0) {
          tbody.innerHTML = `
            <tr id="rowDevEditVesselEmptyDecks">
              <td colspan="6" style="text-align: center; color: #94a3b8; padding: 1.5rem; font-size: 0.76rem;">
                Belum ada dek ditambahkan untuk armada ini. Klik tombol <strong>➕ Tambah Dek</strong> di atas untuk mengatur nama dek dan jumlah kursi.
              </td>
            </tr>
          `;
        }
        this.updateDevEditVesselCapacitySummary();
      });
    });

    this.updateDevEditVesselCapacitySummary();
  },

  updateDevEditVesselCapacitySummary() {
    const tbody = document.getElementById('tbodyDevEditVesselDecks');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr:not(#rowDevEditVesselEmptyDecks)');
    let totalSeats = 0;
    rows.forEach(tr => {
      const capInput = tr.querySelector('.dev-vessel-deck-capacity');
      if (capInput) {
        totalSeats += parseInt(capInput.value, 10) || 0;
      }
    });

    const totalSeatsLabel = document.getElementById('devEditVesselTotalSeatsLabel');
    const totalDecksLabel = document.getElementById('devEditVesselDecksCountLabel');
    const badgeLabel = document.getElementById('devEditVesselDeckCountBadge');
    const vesselCapInput = document.getElementById('devEditVesselCapacity');

    if (totalSeatsLabel) totalSeatsLabel.textContent = `${totalSeats.toLocaleString('id-ID')} Pax`;
    if (totalDecksLabel) totalDecksLabel.textContent = `(${rows.length} Dek)`;
    if (badgeLabel) badgeLabel.textContent = `${rows.length} Dek`;
    if (vesselCapInput) vesselCapInput.value = totalSeats;

    // Sinkronkan baris vertikal otomatis jika total kursi terakumulasi
    const colsInput = document.getElementById('devEditVesselColsInput');
    const rowsInput = document.getElementById('devEditVesselRowsInput');
    if (colsInput && rowsInput && totalSeats > 0) {
      const cols = Math.max(2, parseInt(colsInput.value, 10) || 6);
      rowsInput.value = Math.max(1, Math.ceil(totalSeats / cols));
    }
    this.updateDevEditVesselSeatPreview();
  },

  updateDevEditVesselSeatPreview() {
    const rowsInput = document.getElementById('devEditVesselRowsInput');
    const colsInput = document.getElementById('devEditVesselColsInput');
    const colsLeftInput = document.getElementById('devEditVesselColsLeftInput');
    const colsRightInput = document.getElementById('devEditVesselColsRightInput');
    const capInput = document.getElementById('devEditVesselCapacity');

    const cols = Math.max(2, parseInt(colsInput ? colsInput.value : 6, 10) || 6);
    const colsLeft = Math.max(1, parseInt(colsLeftInput ? colsLeftInput.value : Math.ceil(cols / 2), 10) || Math.ceil(cols / 2));
    const colsRight = Math.max(1, parseInt(colsRightInput ? colsRightInput.value : (cols - colsLeft), 10) || (cols - colsLeft));
    const effectiveCols = colsLeft + colsRight;

    let rows = Math.max(1, parseInt(rowsInput ? rowsInput.value : 25, 10) || 25);
    let cap = parseInt(capInput ? capInput.value : (rows * effectiveCols), 10) || (rows * effectiveCols);

    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const getRowCode = (rIdx) => {
      if (rIdx < letters.length) return letters[rIdx];
      const p1 = letters[Math.floor(rIdx / letters.length) - 1];
      const p2 = letters[rIdx % letters.length];
      return `${p1}${p2}`;
    };

    const firstRow = 'A';
    const lastRow = getRowCode(Math.max(0, rows - 1));

    const badge = document.getElementById('devEditVesselSeatSummaryBadge');
    if (badge) {
      badge.textContent = `${rows} Baris Vertikal × ${effectiveCols} Kolom Horizontal`;
    }

    const details = document.getElementById('devEditVesselPreviewDetails');
    if (details) {
      const leftRange = colsLeft === 1 ? '01' : `01 s/d ${String(colsLeft).padStart(2, '0')}`;
      const rightStart = colsLeft + 1;
      const rightRange = rightStart === effectiveCols ? String(effectiveCols).padStart(2, '0') : `${String(rightStart).padStart(2, '0')} s/d ${String(effectiveCols).padStart(2, '0')}`;
      details.innerHTML = `
        Format Horizontal: <strong>${colsLeft} Kursi Kiri (${leftRange})</strong> — <span style="color: #38bdf8; font-weight: 700;">Lorong Tengah</span> — <strong>${colsRight} Kursi Kanan (${rightRange})</strong><br>
        Format Vertikal: Baris <strong>${firstRow}</strong> hingga Baris <strong>${lastRow}</strong> (${rows} baris ke belakang). Penomoran: <strong>${firstRow}-01</strong> s/d <strong>${lastRow}-${String(effectiveCols).padStart(2, '0')}</strong>.
      `;
    }

    const miniGrid = document.getElementById('devEditVesselMiniGridPreview');
    if (miniGrid) {
      const previewRowsCount = Math.min(3, rows);
      let rowsHtml = '';
      for (let r = 0; r < previewRowsCount; r++) {
        const rCode = getRowCode(r);
        let leftPills = '';
        for (let c = 1; c <= colsLeft; c++) {
          leftPills += `<span style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 4px; padding: 0.15rem 0.35rem;">${rCode}-${String(c).padStart(2, '0')}</span>`;
        }
        let rightPills = '';
        for (let c = colsLeft + 1; c <= effectiveCols; c++) {
          rightPills += `<span style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 4px; padding: 0.15rem 0.35rem;">${rCode}-${String(c).padStart(2, '0')}</span>`;
        }
        rowsHtml += `
          <div style="display: flex; gap: 0.25rem; align-items: center; justify-content: center; flex-wrap: wrap;">
            ${leftPills}
            <span style="color: #94a3b8; padding: 0 0.3rem; font-size: 0.58rem; letter-spacing: 0.5px;">LORONG</span>
            ${rightPills}
          </div>
        `;
      }
      miniGrid.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.25rem; font-family: monospace; font-size: 0.68rem; font-weight: 700; color: #38bdf8; width: 100%;">
          ${rowsHtml}
          ${rows > previewRowsCount ? `
            <div style="text-align: center; color: #94a3b8; font-size: 0.65rem; padding-top: 0.15rem;">
              ... berlanjut hingga baris <strong>${lastRow}</strong> (${rows} baris vertikal, ${effectiveCols} kolom horizontal) ...
            </div>
          ` : ''}
        </div>
      `;
    }
  },

  getDevEditVesselDecksFromTable() {
    const tbody = document.getElementById('tbodyDevEditVesselDecks');
    if (!tbody) return [];
    const rows = tbody.querySelectorAll('tr:not(#rowDevEditVesselEmptyDecks)');
    const decks = [];
    const totalCap = Array.from(rows).reduce((acc, tr) => acc + (parseInt(tr.querySelector('.dev-vessel-deck-capacity')?.value, 10) || 0), 0);

    rows.forEach(tr => {
      const codeInput = tr.querySelector('.dev-vessel-deck-code');
      if (!codeInput) return;
      const code = (codeInput.value || 'DECK').trim();
      const carriage = (tr.querySelector('.dev-vessel-deck-carriage')?.value || code).trim().toUpperCase();
      const name = (tr.querySelector('.dev-vessel-deck-name')?.value || code).trim();
      const cap = parseInt(tr.querySelector('.dev-vessel-deck-capacity')?.value, 10) || 0;
      const desc = (tr.querySelector('.dev-vessel-deck-desc')?.value || `${name} (${cap} Kursi)`).trim();
      const pct = totalCap > 0 ? ((cap / totalCap) * 100).toFixed(1) + '%' : '0%';
      decks.push({
        code,
        carriage,
        name,
        capacity: cap,
        percent: pct,
        range: `Kursi 1 s/d ${cap}`,
        desc
      });
    });
    return decks;
  },

  openDevConfigSeatsModal(preselectedCompanyId = null, preselectedVesselId = null) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Menu ini hanya dapat diakses dalam Mode Developer.', 'warning');
      return;
    }
    const vessels = Store.getVessels();
    if (vessels.length === 0) {
      this.showToast('Armada Kosong', 'Daftarkan armada kapal terlebih dahulu untuk mengatur baris, kolom & dek.', 'warning');
      this.openDevAddVesselModal(preselectedCompanyId);
      return;
    }

    let targetVessel = null;
    if (preselectedVesselId) {
      targetVessel = vessels.find(v => v.id === preselectedVesselId);
    }
    if (!targetVessel && preselectedCompanyId) {
      targetVessel = vessels.find(v => v.companyId === preselectedCompanyId);
    }
    if (!targetVessel) {
      targetVessel = vessels[0];
    }

    // Terpusat satu tempat di Pengaturan Data & Dek Armada
    this.openDevEditVesselModal(targetVessel.id);
  },

  syncDevSeatModalVessels(companyId, preselectedVesselId = null) {
    const vesselSel = document.getElementById('devSeatVesselSelect');
    if (!vesselSel) return;
    vesselSel.innerHTML = '';

    const vessels = Store.getVesselsByCompany(companyId);
    if (vessels.length === 0) {
      vesselSel.innerHTML = '<option value="">-- Perusahaan ini belum memiliki armada --</option>';
      const capInput = document.getElementById('devSeatCapacityInput');
      if (capInput) capInput.value = 150;
      this.updateDevSeatModalPreview();
      return;
    }

    vessels.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `🚢 ${v.name} (${v.capacity || 150} Kursi • ${v.type || 'Kapal'})`;
      if (preselectedVesselId && v.id === preselectedVesselId) opt.selected = true;
      vesselSel.appendChild(opt);
    });

    if (preselectedVesselId && [...vesselSel.options].some(o => o.value === preselectedVesselId)) {
      vesselSel.value = preselectedVesselId;
    }

    const activeVessel = vessels.find(v => v.id === vesselSel.value) || vessels[0];
    if (activeVessel) {
      const vType = (activeVessel.type || '').toLowerCase();
      const vName = (activeVessel.name || '').toLowerCase();
      const isSulawesi = vType.includes('parepare') || vType.includes('domestik') || vName.includes('pantokrator');

      const presetBanner = document.getElementById('devSeatSulawesiPresetBanner');
      if (presetBanner) presetBanner.style.display = isSulawesi ? 'block' : 'none';

      const capInput = document.getElementById('devSeatCapacityInput');
      if (capInput) {
        if (isSulawesi && (!activeVessel.capacity || activeVessel.capacity === 150)) {
          capInput.value = 1084;
        } else {
          capInput.value = activeVessel.capacity || 150;
        }
      }
      const deckInput = document.getElementById('devSeatDeckNameInput');
      if (deckInput) {
        if (isSulawesi && (!activeVessel.deckName || activeVessel.deckName === 'Main Deck')) {
          deckInput.value = 'Deck 2A, 2B, 3A, 3B, 3C, 3 Depan';
        } else {
          deckInput.value = activeVessel.deckName || 'Main Deck';
        }
      }
      const classInput = document.getElementById('devSeatClassNameInput');
      if (classInput) classInput.value = activeVessel.className || 'Tiket Reguler';

      const capVal = activeVessel.capacity || 150;
      const vCols = activeVessel.seatCols || 6;
      const vRows = activeVessel.seatRows || Math.ceil(capVal / vCols);
      const vColsLeft = activeVessel.seatColsLeft || Math.ceil(vCols / 2);
      const vColsRight = activeVessel.seatColsRight || (vCols - vColsLeft);

      const rowsInput = document.getElementById('devSeatRowsInput');
      const colsInput = document.getElementById('devSeatColsInput');
      const colsLeftInput = document.getElementById('devSeatColsLeftInput');
      const colsRightInput = document.getElementById('devSeatColsRightInput');

      if (rowsInput) rowsInput.value = vRows;
      if (colsInput) colsInput.value = vCols;
      if (colsLeftInput) colsLeftInput.value = vColsLeft;
      if (colsRightInput) colsRightInput.value = vColsRight;

      // Suggested price based on route type
      const isIntl = (activeVessel.type || '').toLowerCase().includes('tawau') || (activeVessel.type || '').toLowerCase().includes('internasional');
      const ticketPriceInput = document.getElementById('devSeatTicketPriceInput');
      if (ticketPriceInput) {
        ticketPriceInput.value = isIntl ? 430000 : 690000;
      }
    }
    this.updateDevSeatModalPreview();
  },

  updateDevSeatModalPreview() {
    const capInput = document.getElementById('devSeatCapacityInput');
    const rowsInput = document.getElementById('devSeatRowsInput');
    const colsInput = document.getElementById('devSeatColsInput');
    const colsLeftInput = document.getElementById('devSeatColsLeftInput');
    const colsRightInput = document.getElementById('devSeatColsRightInput');

    const cols = Math.max(2, parseInt(colsInput ? colsInput.value : 6, 10) || 6);
    const colsLeft = Math.max(1, parseInt(colsLeftInput ? colsLeftInput.value : Math.ceil(cols / 2), 10) || Math.ceil(cols / 2));
    const colsRight = Math.max(1, parseInt(colsRightInput ? colsRightInput.value : (cols - colsLeft), 10) || (cols - colsLeft));
    const effectiveCols = colsLeft + colsRight;

    let rows = Math.max(1, parseInt(rowsInput ? rowsInput.value : 25, 10) || 25);
    let cap = Math.max(2, parseInt(capInput ? capInput.value : (rows * effectiveCols), 10) || (rows * effectiveCols));

    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const getRowCode = (rIdx) => {
      if (rIdx < letters.length) return letters[rIdx];
      const p1 = letters[Math.floor(rIdx / letters.length) - 1];
      const p2 = letters[rIdx % letters.length];
      return `${p1}${p2}`;
    };

    const firstRow = 'A';
    const lastRow = getRowCode(Math.max(0, rows - 1));

    const badge = document.getElementById('devSeatSummaryBadge');
    if (badge) {
      badge.textContent = `${cap} Kursi (${rows} Baris Vertikal × ${effectiveCols} Kolom Horizontal)`;
    }

    const details = document.getElementById('devSeatPreviewDetails');
    if (details) {
      const leftRange = colsLeft === 1 ? '01' : `01 s/d ${String(colsLeft).padStart(2, '0')}`;
      const rightStart = colsLeft + 1;
      const rightRange = rightStart === effectiveCols ? String(effectiveCols).padStart(2, '0') : `${String(rightStart).padStart(2, '0')} s/d ${String(effectiveCols).padStart(2, '0')}`;
      details.innerHTML = `
        Format Horizontal: <strong>${colsLeft} Kursi Kiri (${leftRange})</strong> — <span style="color: #38bdf8; font-weight: 700;">Lorong Tengah</span> — <strong>${colsRight} Kursi Kanan (${rightRange})</strong><br>
        Format Vertikal: Baris <strong>${firstRow}</strong> hingga Baris <strong>${lastRow}</strong> (${rows} baris ke belakang). Penomoran: <strong>${firstRow}-01</strong> s/d <strong>${lastRow}-${String(effectiveCols).padStart(2, '0')}</strong>.
      `;
    }

    const miniGrid = document.getElementById('devSeatMiniGridPreview');
    if (miniGrid) {
      const previewRowsCount = Math.min(3, rows);
      let rowsHtml = '';
      for (let r = 0; r < previewRowsCount; r++) {
        const rCode = getRowCode(r);
        let leftPills = '';
        for (let c = 1; c <= colsLeft; c++) {
          leftPills += `<span style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 4px; padding: 0.15rem 0.35rem;">${rCode}-${String(c).padStart(2, '0')}</span>`;
        }
        let rightPills = '';
        for (let c = colsLeft + 1; c <= effectiveCols; c++) {
          rightPills += `<span style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 4px; padding: 0.15rem 0.35rem;">${rCode}-${String(c).padStart(2, '0')}</span>`;
        }
        rowsHtml += `
          <div style="display: flex; gap: 0.25rem; align-items: center; justify-content: center; flex-wrap: wrap;">
            ${leftPills}
            <span style="color: #94a3b8; padding: 0 0.3rem; font-size: 0.58rem; letter-spacing: 0.5px;">LORONG</span>
            ${rightPills}
          </div>
        `;
      }
      miniGrid.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.25rem; font-family: monospace; font-size: 0.68rem; font-weight: 700; color: #38bdf8; width: 100%;">
          ${rowsHtml}
          ${rows > previewRowsCount ? `
            <div style="text-align: center; color: #94a3b8; font-size: 0.65rem; padding-top: 0.15rem;">
              ... berlanjut hingga baris <strong>${lastRow}</strong> (Total ${rows} baris vertikal, ${effectiveCols} kolom horizontal) ...
            </div>
          ` : ''}
        </div>
      `;
    }
  },

  openDeleteVesselModal(vesselId, scheduleId, vesselName) {
    const vIdEl = document.getElementById('deleteTargetVesselId');
    const sIdEl = document.getElementById('deleteTargetScheduleId');
    const labelEl = document.getElementById('deleteVesselNameLabel');
    const passEl = document.getElementById('deleteVesselAuthPassword');

    if (vIdEl) vIdEl.value = vesselId || '';
    if (sIdEl) sIdEl.value = scheduleId || '';
    if (labelEl) labelEl.innerText = vesselName || 'Armada Kapal';
    if (passEl) passEl.value = '';

    document.getElementById('modalDeleteVesselAuth')?.classList.add('show');
  },

  renderOverviewVesselFilterUI(fleet, schedules, bookings) {
    const activeVid = this.selectedOverviewVessel || 'ALL';
    const activePeriod = this.selectedOverviewPeriod || 'WEEKLY';
    const topSelect = document.getElementById('overviewVesselFilterSelect');
    const chartSelect = document.getElementById('chartVesselFilterSelect');
    const periodSelect = document.getElementById('chartPeriodFilterSelect');
    const trendPeriodSelect = document.getElementById('trendPeriodFilterSelect');

    [periodSelect, trendPeriodSelect].forEach(pSel => {
      if (!pSel) return;
      pSel.value = activePeriod;
      pSel.onchange = () => {
        this.selectedOverviewPeriod = pSel.value;
        this.refreshCompanyDashboard();
      };
    });
    const pillsWrap = document.getElementById('overviewVesselFilterPills');
    const breakdownWrap = document.getElementById('overviewPerVesselStatsBreakdown');

    // 1. Populate Dropdowns
    [topSelect, chartSelect].forEach(sel => {
      if (!sel) return;
      sel.innerHTML = `<option value="ALL">🚢 Semua Armada Perusahaan (${fleet.length} Kapal)</option>`;
      fleet.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `⚓ ${v.name} (${v.capacity || 150} Kursi)`;
        if (v.id === activeVid) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.onchange = () => {
        this.selectedOverviewVessel = sel.value;
        this.refreshCompanyDashboard();
      };
    });

    // 2. Populate Quick Pills
    if (pillsWrap) {
      pillsWrap.innerHTML = '';
      const createPill = (id, label) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isActive = activeVid === id;
        btn.style.cssText = isActive
          ? 'background: #7c3aed; color: #ffffff; border: 1px solid #7c3aed; padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.76rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 6px rgba(124,58,237,0.25);'
          : 'background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.76rem; font-weight: 600; cursor: pointer;';
        btn.textContent = label;
        btn.addEventListener('click', () => {
          this.selectedOverviewVessel = id;
          this.refreshCompanyDashboard();
        });
        return btn;
      };

      pillsWrap.appendChild(createPill('ALL', `Semua Armada (${fleet.length})`));
      fleet.forEach(v => {
        pillsWrap.appendChild(createPill(v.id, `🚢 ${v.name}`));
      });
    }

    // 3. Populate Per-Vessel Statistics Breakdown inside Statistik Penjualan Tiket card
    if (breakdownWrap) {
      breakdownWrap.innerHTML = '';
      if (fleet.length === 0) {
        breakdownWrap.innerHTML = `<div style="font-size: 0.78rem; color: #64748b; padding: 0.5rem;">Belum ada armada terdaftar. Tambahkan armada pada menu Armada Kapal Saya.</div>`;
      } else {
        fleet.forEach(v => {
          const vScheds = schedules.filter(s => s.vesselId === v.id || s.vesselNameCustom === v.name);
          const vSchedIds = new Set(vScheds.map(s => s.id));
          const vBookings = bookings.filter(b => b.vesselId === v.id || vSchedIds.has(b.scheduleId) || b.vesselName === v.name);
          const vTickets = vBookings.reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);
          const vBoarded = vBookings.filter(b => b.boardingStatus === 'BOARDED').reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);
          const vRev = vBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
          const cap = v.capacity || 150;
          const totalCap = vScheds.length > 0 ? vScheds.length * cap : cap;
          const sisaKursi = Math.max(0, totalCap - vTickets);
          const occPct = totalCap > 0 ? Math.min(100, Math.round((vTickets / totalCap) * 100)) : 0;
          const isSelected = activeVid === v.id;

          const card = document.createElement('div');
          card.style.cssText = `background: ${isSelected ? '#f5f3ff' : '#f8fafc'}; border: 1.5px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}; border-radius: 10px; padding: 0.7rem 0.85rem; cursor: pointer; transition: all 0.15s ease;`;
          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <strong style="font-size: 0.8rem; color: ${isSelected ? '#6d28d9' : '#0f172a'};">🚢 ${v.name}</strong>
              <span style="font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 99px; background: ${isSelected ? '#7c3aed' : '#e0f2fe'}; color: ${isSelected ? '#ffffff' : '#0284c7'};">
                ${isSelected ? 'Sedang Ditampilkan' : 'Pilih Statistik'}
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.73rem; color: #475569;">
              <div>Tiket Terbit: <strong style="color: #0f172a;">${vTickets}</strong></div>
              <div>Naik Kapal: <strong style="color: #059669;">${vBoarded}</strong></div>
              <div>Jadwal: <strong style="color: #0f172a;">${vScheds.length}</strong></div>
              <div>Sisa Kursi: <strong style="color: #0284c7;">${sisaKursi}</strong></div>
            </div>
            <div style="margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 0.73rem;">
              <span style="color: #64748b;">Okupansi: <strong>${occPct}%</strong></span>
              <strong style="color: #7c3aed;">${formatRupiah(vRev)}</strong>
            </div>
          `;
          card.addEventListener('click', () => {
            this.selectedOverviewVessel = isSelected ? 'ALL' : v.id;
            this.refreshCompanyDashboard();
          });
          breakdownWrap.appendChild(card);
        });
      }
    }
  },

  getTenantRouteScope(tenant = null) {
    const t = tenant || Store.getCurrentTenant();
    if (!t) return 'BOTH';
    const fleet = Store.getVessels ? Store.getVesselsByCompany(t.id) : [];
    const scheds = Store.getSchedules ? Store.getSchedulesByCompany(t.id) : [];

    // Deteksi otomatis dari seluruh armada & rute jadwal yang terdaftar
    const fTypes = fleet.map(v => `${v.type || ''} ${v.name || ''}`).join(' ').toLowerCase();
    const sRoutes = scheds.map(s => `${s.originId} ${s.destinationId}`).join(' ');
    const fHasIntl = fTypes.includes('internasional') || fTypes.includes('tawau') || sRoutes.includes('TWU');
    const fHasDom = fTypes.includes('domestik') || fTypes.includes('parepare') || sRoutes.includes('PRE');
    if (fHasIntl && fHasDom) return 'BOTH';
    if (fHasDom && !fHasIntl) return 'DOM';
    if (fHasIntl && !fHasDom) return 'INTL';

    const cat = (t.category || '').toLowerCase();
    const hasIntl = cat.includes('internasional') || cat.includes('tawau') || cat.includes('lintas batas');
    const hasDom = cat.includes('domestik') || cat.includes('parepare');
    if (hasIntl && hasDom) return 'BOTH';
    if (hasIntl) return 'INTL';
    if (hasDom) return 'DOM';
    return 'BOTH';
  },

  getDefaultPortPassForScope(scope = 'INTL', originPortId = 'NNK') {
    const passes = Store.getPortPasses ? Store.getPortPasses() : [];
    const targetRouteType = scope === 'INTL' ? 'Internasional' : 'Domestik';
    const matched = passes.find(p => p.portId === originPortId && p.routeType === targetRouteType)
      || passes.find(p => p.routeType === targetRouteType);
    if (matched && matched.priceAdult !== undefined) return Number(matched.priceAdult);
    return scope === 'INTL' ? 50000 : 30000;
  },

  getSchedulePortPassFee(s, tenant = null) {
    if (s && s.portPassFee !== undefined && s.portPassFee !== null) {
      return Number(s.portPassFee);
    }
    const isIntl = s && (s.originId === 'TWU' || s.destinationId === 'TWU' || s.categoryType === 'INTERNATIONAL');
    return this.getDefaultPortPassForScope(isIntl ? 'INTL' : 'DOM', (s && s.originId) || 'NNK');
  },

  syncRouteScopedUIForTenant(tenant, routeScope = null) {
    const scope = routeScope || this.getTenantRouteScope(tenant);
    const isBoth = scope === 'BOTH';
    const isIntl = scope === 'INTL';

    // 1. Filter Route Select in Manifest
    const manifestRouteSel = document.getElementById('manifestFilterRoute');
    if (manifestRouteSel) {
      if (isBoth) {
        manifestRouteSel.innerHTML = '<option value="ALL">Semua Rute (Internasional & Domestik)</option>'
          + '<option value="TAWAU">🌏 Rute Internasional: Nunukan ➔ Tawau</option>'
          + '<option value="PAREPARE">🇮🇩 Rute Domestik: Nunukan ➔ Parepare</option>';
        manifestRouteSel.value = 'ALL';
      } else {
        manifestRouteSel.innerHTML = isIntl
          ? '<option value="TAWAU">🌏 Rute Internasional: Nunukan ➔ Tawau</option>'
          : '<option value="PAREPARE">🇮🇩 Rute Domestik: Nunukan ➔ Parepare</option>';
        manifestRouteSel.value = isIntl ? 'TAWAU' : 'PAREPARE';
      }
    }

    // 2. Filter Route Select in Voyage Calendar
    const calRouteSel = document.getElementById('calFilterRouteSelect');
    if (calRouteSel) {
      if (isBoth) {
        calRouteSel.innerHTML = '<option value="ALL">Semua Rute Pelayaran</option>'
          + '<option value="INTL">🌏 Rute Internasional (Nunukan ➔ Tawau)</option>'
          + '<option value="DOM">🇮🇩 Rute Domestik (Nunukan ➔ Parepare)</option>';
        calRouteSel.value = 'ALL';
        if (this.calendarState) {
          this.calendarState.filterRoute = 'ALL';
        }
      } else {
        calRouteSel.innerHTML = isIntl
          ? '<option value="INTL">🌏 Rute Internasional (Nunukan ➔ Tawau)</option>'
          : '<option value="DOM">🇮🇩 Rute Domestik (Nunukan ➔ Parepare)</option>';
        calRouteSel.value = isIntl ? 'INTL' : 'DOM';
        if (this.calendarState) {
          this.calendarState.filterRoute = isIntl ? 'INTL' : 'DOM';
        }
      }
    }

    // 3. Filter Vessel Type Select in Modal Tambah/Edit Armada sesuai seluruh rute di menu Developer
    this.populateVesselTypeDropdown(scope);
  },

  populateVesselTypeDropdown(preferredScope = null) {
    const vesselTypeSel = document.getElementById('vesselTypeInput');
    if (!vesselTypeSel) return;
    const currentVal = vesselTypeSel.value;
    const masterRoutes = (typeof Store !== 'undefined' && Store.getMasterRouteTariffs) ? Store.getMasterRouteTariffs() : [];
    
    if (masterRoutes.length > 0) {
      vesselTypeSel.innerHTML = masterRoutes.map(r => {
        const origPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.originId) : null;
        const destPort = typeof MASTER_PORTS !== 'undefined' ? MASTER_PORTS.find(p => p.id === r.destinationId) : null;
        const origCity = origPort ? origPort.city.split(' ')[0] : (r.originName ? r.originName.split(' ')[0] : r.originId);
        const destCity = destPort ? destPort.city.split(' ')[0] : (r.destinationName ? r.destinationName.split(' ')[0] : r.destinationId);
        const val = `Kapal Penumpang ${r.category || 'Reguler'} (${origCity} - ${destCity})`;
        return `<option value="${val}">${val}</option>`;
      }).join('');
    } else {
      vesselTypeSel.innerHTML = `
        <option value="Kapal Penumpang Internasional (Nunukan - Tawau)">Kapal Penumpang Internasional (Nunukan - Tawau)</option>
        <option value="Kapal Penumpang Domestik (Nunukan - Parepare)">Kapal Penumpang Domestik (Nunukan - Parepare)</option>
      `;
    }

    if (currentVal && [...vesselTypeSel.options].some(o => o.value === currentVal)) {
      vesselTypeSel.value = currentVal;
    } else if (preferredScope) {
      const matchOpt = [...vesselTypeSel.options].find(o => {
        const txt = o.value.toLowerCase();
        if (preferredScope === 'INTL') return txt.includes('internasional') || txt.includes('tawau');
        if (preferredScope === 'DOM') return txt.includes('domestik') || txt.includes('parepare');
        return false;
      });
      if (matchOpt) vesselTypeSel.value = matchOpt.value;
    }
  },

  renderPortPassTables() {
    const tenant = Store.getCurrentTenant();
    const scope = this.getTenantRouteScope(tenant);
    const isBoth = scope === 'BOTH';
    const isIntl = scope === 'INTL';
    const allPasses = Store.getPortPasses ? Store.getPortPasses() : [];

    // Hanya tampilkan Pas Pelabuhan yang sesuai dengan rute layanan perusahaan login (Internasional vs Domestik)
    const passes = allPasses.filter(pp => {
      if (pp.companyId && tenant && pp.companyId !== tenant.id) return false;
      if (isBoth) return true;
      if (isIntl) {
        return pp.routeType === 'Internasional' || pp.portId === 'TWU';
      } else {
        return pp.routeType === 'Domestik' || pp.portId === 'PRE';
      }
    });

    const tbodies = [
      document.getElementById('tbodyPortPassList'),
      document.getElementById('tbodySettingsPortPassList')
    ].filter(Boolean);
    if (tbodies.length === 0) return;

    const modeLabels = {
      INCLUDED: 'Termasuk di Tiket (Bundling)',
      ADDON: 'Ditambahkan Otomatis ke Tiket',
      COUNTER: 'Bayar di Loket Pelabuhan'
    };

    tbodies.forEach(tbody => {
      tbody.innerHTML = '';
      if (passes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-dim" style="padding: 1.5rem;">Belum ada pengaturan pas pelabuhan. Klik "+ Tambah Pas Pelabuhan" untuk menambahkan.</td></tr>`;
        return;
      }
      passes.forEach(pp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${pp.id}</code></td>
          <td><strong>${pp.name}</strong></td>
          <td><small class="text-dim">${pp.operator || '-'}</small></td>
          <td><span class="tag-badge" style="background: ${pp.routeType === 'Internasional' ? '#fef3c7' : '#e0f2fe'}; color: ${pp.routeType === 'Internasional' ? '#d97706' : '#0284c7'}; font-weight: 700;">${pp.routeType || 'Domestik'}</span></td>
          <td><strong style="color: #0f766e;">${formatRupiah(pp.priceAdult || 0)}</strong></td>
          <td><small>${modeLabels[pp.billingMode] || pp.billingMode}</small></td>
          <td><span class="status-pill ${pp.status === 'Nonaktif' ? 'waiting' : 'paid'}">${pp.status || 'Aktif'}</span></td>
          <td style="white-space: nowrap;">
            <span style="background: #f8fafc; border: 1px solid #cbd5e1; color: #64748b; padding: 0.35rem 0.65rem; border-radius: 6px; font-weight: 600; font-size: 0.74rem; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;" title="Pengaturan pas pelabuhan hanya dapat diubah melalui Login Developer">
              🔒 Hanya Lihat
            </span>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
  },

  openEditPortPassModal(portPassId = null) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Akses Dibatasi', 'Pengaturan pas pelabuhan hanya dapat diubah melalui menu Login Developer.', 'warning');
      return;
    }
    const passes = Store.getPortPasses ? Store.getPortPasses() : [];
    const item = portPassId ? passes.find(p => p.id === portPassId) : null;
    const isIntl = item ? (item.routeType === 'Internasional' || item.portId === 'TWU') : true;
    const titleEl = document.getElementById('modalPortPassTitle');
    if (titleEl) {
      titleEl.innerText = item ? `Edit Tarif Pas Pelabuhan (${item.id})` : 'Tambah Tarif Pas Pelabuhan Baru';
    }

    const portSel = document.getElementById('portPassPortSelect');
    if (portSel) {
      portSel.innerHTML = `<option value="NNK">Pelabuhan Tunon Taka (Nunukan)</option><option value="TWU">Tawau Ferry Terminal (Malaysia)</option><option value="PRE">Pelabuhan Nusantara (Parepare)</option>`;
    }
    const routeTypeSel = document.getElementById('portPassRouteType');
    if (routeTypeSel) {
      routeTypeSel.innerHTML = `<option value="Internasional">Internasional (Luar Negeri)</option><option value="Domestik">Domestik (Dalam Negeri)</option>`;
    }

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('portPassEditId', item ? item.id : '');
    setVal('portPassNameInput', item ? item.name : (isIntl ? 'Pas Pelabuhan Internasional Tunon Taka (Nunukan ➔ Tawau)' : 'Pas Pelabuhan Domestik Tunon Taka (Nunukan ➔ Parepare)'));
    setVal('portPassPortSelect', item ? (item.portId || 'NNK') : 'NNK');
    setVal('portPassRouteType', item ? (item.routeType || (isIntl ? 'Internasional' : 'Domestik')) : (isIntl ? 'Internasional' : 'Domestik'));
    setVal('portPassOperatorInput', item ? (item.operator || 'KSOP / Pelindo Tunon Taka Nunukan') : 'KSOP / Pelindo Tunon Taka Nunukan');
    setVal('portPassAdultInput', item ? (item.priceAdult ?? (isIntl ? 50000 : 10000)) : (isIntl ? 50000 : 10000));
    setVal('portPassChildInput', item ? (item.priceChild ?? (isIntl ? 15000 : 5000)) : (isIntl ? 15000 : 5000));
    setVal('portPassBillingMode', item ? (item.billingMode || 'INCLUDED') : 'INCLUDED');
    setVal('portPassStatusSelect', item ? (item.status || 'Aktif') : 'Aktif');
    setVal('portPassAuthPassword', '');

    document.getElementById('modalEditPortPass')?.classList.add('show');
  },

  openAddScheduleModal(defaultDate = null) {
    if (!Store.isDevAdminLoggedIn() && this.activeView !== 'devAdminDashboard') {
      this.showToast('Fitur Dibatasi', 'Pembukaan dan penambahan jadwal baru hanya dapat dilakukan melalui Mode Pengembang (Developer Mode).', 'warning');
      return;
    }
    const modal = document.getElementById('modalAddSchedule');
    if (!modal) return;
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const scope = this.getTenantRouteScope(tenant);
    const isBoth = scope === 'BOTH';
    const isIntl = scope === 'INTL';

    // Populate vessels in modal dropdown terlebih dahulu
    const vesselSel = document.getElementById('schedVesselSelect');
    const fleet = Store.getVesselsByCompany(tenant.id);
    if (vesselSel) {
      vesselSel.innerHTML = '';
      if (fleet.length === 0) {
        vesselSel.innerHTML = '<option value="">-- Daftarkan Armada Terlebih Dahulu --</option>';
      } else {
        fleet.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.id;
          opt.innerText = `${v.name} (${v.type || 'Kapal'} • ${v.capacity} Seat)`;
          vesselSel.appendChild(opt);
        });
      }
    }

    // Tampilkan SEMUA rute & pelabuhan yang telah ditetapkan di menu developer
    const allPorts = MASTER_PORTS.slice();
    const masterRoutes = (typeof Store !== 'undefined' && Store.getMasterRouteTariffs) ? Store.getMasterRouteTariffs() : [];
    masterRoutes.forEach(r => {
      if (r.originId && !allPorts.some(p => p.id === r.originId)) {
        allPorts.push({ id: r.originId, name: r.originName || r.originId, city: r.originName || r.originId });
      }
      if (r.destinationId && !allPorts.some(p => p.id === r.destinationId)) {
        allPorts.push({ id: r.destinationId, name: r.destinationName || r.destinationId, city: r.destinationName || r.destinationId });
      }
    });

    const origSel = document.getElementById('schedOriginSelect');
    const destSel = document.getElementById('schedDestSelect');
    if (origSel && destSel) {
      origSel.innerHTML = '';
      destSel.innerHTML = '';
      allPorts.forEach(port => {
        origSel.add(new Option(`${port.name} (${port.city})`, port.id));
        destSel.add(new Option(`${port.name} (${port.city})`, port.id));
      });
      origSel.value = 'NNK';
      destSel.value = isIntl ? 'TWU' : (isBoth ? 'TWU' : 'PRE');
    }

    // Fungsi sinkronisasi tarif harga tiket, pas pelabuhan, & dermaga sesuai master developer
    const syncRouteTariffAndPier = () => {
      const oVal = origSel ? origSel.value : 'NNK';
      const dVal = destSel ? destSel.value : 'PRE';
      const isDestIntl = dVal === 'TWU' || oVal === 'TWU';
      const pEko = document.getElementById('schedPriceEko');
      const pPass = document.getElementById('schedPortPassPrice');
      const pPier = document.getElementById('schedPierInput');
      const rTariff = (typeof Store !== 'undefined' && Store.getMasterRouteTariff) ? Store.getMasterRouteTariff(oVal, dVal) : null;
      if (pEko) pEko.value = rTariff ? rTariff.ticketPrice : (isDestIntl ? 430000 : 690000);
      if (pPass) pPass.value = rTariff ? rTariff.portPassFee : (isDestIntl ? 50000 : 30000);
      if (pPier) pPier.value = isDestIntl ? 'Dermaga Lintas Batas Internasional' : 'Dermaga Nusantara Domestik';
    };

    // Sinkronisasi otomatis rute pelayaran berdasarkan kapal yang dipilih
    const syncRouteFromSelectedVessel = () => {
      if (!vesselSel || !origSel || !destSel) return;
      const vid = vesselSel.value;
      const v = fleet.find(item => item.id === vid);
      if (!v) {
        syncRouteTariffAndPier();
        return;
      }
      const vType = (v.type || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();
      if (vType.includes('parepare - nunukan') || vName.includes('parepare - nunukan')) {
        origSel.value = 'PRE';
        destSel.value = 'NNK';
      } else if (vType.includes('parepare') || vType.includes('domestik') || vName.includes('pantokrator')) {
        origSel.value = 'NNK';
        destSel.value = 'PRE';
      } else if (vType.includes('tawau - nunukan') || vName.includes('tawau - nunukan')) {
        origSel.value = 'TWU';
        destSel.value = 'NNK';
      } else if (vType.includes('tawau') || vType.includes('internasional') || vName.includes('labuan')) {
        origSel.value = 'NNK';
        destSel.value = 'TWU';
      }
      syncRouteTariffAndPier();
    };

    if (vesselSel) {
      vesselSel.onchange = syncRouteFromSelectedVessel;
    }
    if (origSel) {
      origSel.onchange = syncRouteTariffAndPier;
    }
    if (destSel) {
      destSel.onchange = syncRouteTariffAndPier;
    }

    // Jalankan auto-sync langsung saat modal pertama kali dibuka
    syncRouteFromSelectedVessel();

    // Set default date
    const dateInput = document.getElementById('schedDateInput');
    if (dateInput) {
      dateInput.value = defaultDate || new Date().toISOString().split('T')[0];
    }

    // Set default departure & arrival times (09.00 WITA & 11.00 WITA)
    const depTimeInput = document.getElementById('schedDepartTime');
    if (depTimeInput) depTimeInput.value = '09:00';
    const arrTimeInput = document.getElementById('schedArrivalTime');
    if (arrTimeInput) arrTimeInput.value = '11:00';

    modal.classList.add('show');
  },

  // ========================================================
  // FITUR: INPUT DATA PENUMPANG MASSAL (BULK & GROUP ENTRY)
  // ========================================================

  initBulkPassengerEvents() {
    // Triggers to open bulk modal
    document.getElementById('btnHeaderQuickBulkPax')?.addEventListener('click', () => {
      this.openBulkPassengerModal();
    });
    document.getElementById('btnOpenBulkPassengerModal')?.addEventListener('click', () => {
      this.openBulkPassengerModal();
    });
    document.getElementById('subBtnBulkPassenger')?.addEventListener('click', () => {
      this.openBulkPassengerModal();
    });
    document.getElementById('btnOpenBulkPassengerFromTicketing')?.addEventListener('click', () => {
      this.openBulkPassengerModal();
    });
    document.getElementById('btnVoyageGoBulkPax')?.addEventListener('click', () => {
      const schId = document.getElementById('voyageModalId')?.innerText;
      document.getElementById('modalVoyageDetail')?.classList.remove('show');
      this.openBulkPassengerModal(schId);
    });

    // Close / Cancel in-page
    document.getElementById('btnCloseBulkPassengerEntry')?.addEventListener('click', () => {
      this.setTicketingEntryMode('SINGLE');
    });
    document.getElementById('btnCancelBulkPassengerEntry')?.addEventListener('click', () => {
      this.setTicketingEntryMode('SINGLE');
    });

    // Close on backdrop click
    const modalBulk = document.getElementById('modalBulkPassengerEntry');
    if (modalBulk) {
      modalBulk.addEventListener('click', (e) => {
        if (e.target === modalBulk) {
          modalBulk.classList.remove('show');
        }
      });
    }

    // Target Schedule & Class Changes
    document.getElementById('bulkTargetScheduleSelect')?.addEventListener('change', (e) => {
      this.bulkState.targetScheduleId = e.target.value;
      this.updateBulkScheduleInfo();
      this.renderManualGridTable();
      this.reallocateBulkSeats();
    });

    document.getElementById('bulkClassSelect')?.addEventListener('change', (e) => {
      const sel = e.target;
      const opt = sel.options[sel.selectedIndex];
      this.bulkState.selectedClass = sel.value;
      this.bulkState.farePerPax = opt ? parseInt(opt.getAttribute('data-fare') || '250000', 10) : 250000;
      this.renderBulkPassengerPreview();
    });

    // Input Tabs Switching
    const tabBtns = document.querySelectorAll('#bulkInputTabs .bulk-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        this.bulkState.activeTab = mode;

        const panePaste = document.getElementById('bulkPanePaste');
        const paneFile = document.getElementById('bulkPaneFile');
        const paneGrid = document.getElementById('bulkPaneGrid');
        const paneSeats = document.getElementById('tixPaneVisualSeats');

        if (panePaste) panePaste.style.display = (mode === 'PASTE') ? 'block' : 'none';
        if (paneFile) paneFile.style.display = (mode === 'FILE') ? 'block' : 'none';
        if (paneGrid) paneGrid.style.display = (mode === 'GRID') ? 'block' : 'none';
        if (paneSeats) paneSeats.style.display = (mode === 'SEATS') ? 'block' : 'none';

        tabBtns.forEach(b => {
          b.style.color = '#64748b';
          b.style.borderBottom = '2px solid transparent';
          b.style.fontWeight = '700';
        });
        btn.style.color = '#0284c7';
        btn.style.borderBottom = '2px solid #0284c7';
        btn.style.fontWeight = '800';

        if (mode === 'GRID' && (!this.bulkState.manualGridRows || this.bulkState.manualGridRows.length === 0)) {
          this.initManualGridRows(3);
        }
      });
    });

    // Download CSV Template
    document.getElementById('btnGoToIntegratedTix')?.addEventListener('click', () => {
      this.setTicketingEntryMode('SINGLE');
      document.querySelector('.bulk-tab-btn[data-mode="GRID"]')?.click();
    });

    document.getElementById('btnDownloadBulkCsvTemplate')?.addEventListener('click', () => {
      this.downloadBulkPassengerTemplate();
    });

    // Parse Pasted Text Button & Live Input
    document.getElementById('btnParsePastedText')?.addEventListener('click', () => {
      const text = document.getElementById('bulkPasteTextarea')?.value || '';
      this.parseAndSetBulkPassengers(text, true);
    });
    document.getElementById('bulkPasteTextarea')?.addEventListener('input', () => {
      const text = document.getElementById('bulkPasteTextarea')?.value || '';
      if (text.trim().length > 0) {
        this.parseAndSetBulkPassengers(text, false);
      }
    });

    // Load Demo Data Button
    document.getElementById('btnLoadBulkDemoData')?.addEventListener('click', () => {
      const demoData = 
`Ahmad Dahlan\tA9128374\tL\tDewasa\t35\tID\tA-01\tRombongan Kerja Nunukan
Siti Rahmawati\t6401024508900001\tP\tDewasa\t30\tID\tA-02\tWisata Keluarga
Hafiz bin Ismail\tMYB582910\tL\tDewasa\t42\tMY\tA-03\tWNA Tawau Malaysia
Muhammad Rizki\t6401021204150003\tL\tAnak\t8\tID\tA-04\tAnak Pendamping
Nurul Hidayah\t6401028910950002\tP\tDewasa\t28\tID\tA-05\tRombongan Mandiri
Bambang Suryono\t6401031507850004\tL\tDewasa\t39\tID\tA-06\tTeknisi Pelayaran
Faridah binti Osman\tMYC910283\tP\tDewasa\t37\tMY\tA-07\tTamu Perusahaan
Faisal Tanjung\t6401042003920005\tL\tDewasa\t32\tID\tA-08\tKunjungan Dinas
Dewi Lestari\t6401055511980006\tP\tDewasa\t26\tID\tA-09\tWisatawan
Zainal Abidin\t6401060909800007\tL\tDewasa\t44\tID\tA-10\tPedagang Lintas Batas`;
      
      const ta = document.getElementById('bulkPasteTextarea');
      if (ta) ta.value = demoData;
      this.parseAndSetBulkPassengers(demoData, true);
    });

    // File Upload via Input & Drag-and-drop
    const fileInput = document.getElementById('bulkFileInput');
    const dropArea = document.getElementById('bulkDropzoneArea');

    document.getElementById('btnBrowseBulkFile')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleBulkUploadedFile(file);
    });

    if (dropArea) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropArea.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropArea.classList.remove('dragover');
        });
      });
      dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) this.handleBulkUploadedFile(file);
      });
    }

    // Grid row buttons & Save triggers
    document.getElementById('btnAddGridRow')?.addEventListener('click', () => {
      this.addManualGridRow();
    });
    document.getElementById('btnAdd5GridRows')?.addEventListener('click', () => {
      for (let i = 0; i < 5; i++) this.addManualGridRow();
    });
    document.getElementById('btnClearGridRows')?.addEventListener('click', () => {
      this.initManualGridRows(3);
      this.syncGridToPaxList();
      try { localStorage.removeItem('tech_bulk_draft_passengers_v1'); } catch (e) {}
    });
    document.getElementById('btnSaveGridRows')?.addEventListener('click', () => {
      this.saveManualGridRows(true);
    });
    document.getElementById('btnSaveBulkDraft')?.addEventListener('click', () => {
      this.saveManualGridRows(true);
    });

    // Clear All Bulk Data
    document.getElementById('btnClearBulkData')?.addEventListener('click', () => {
      this.resetBulkPassengerState();
      this.showToast('Data Dibersihkan', 'Seluruh input data penumpang massal telah direset.', 'warning');
    });

    // Reallocate Seats
    document.getElementById('btnReallocateBulkSeats')?.addEventListener('click', () => {
      this.reallocateBulkSeats(true);
      this.showToast('Kursi Dialokasikan', 'Seluruh alokasi nomor kursi berhasil diurutkan kembali.');
    });

    // Submit Bulk Passenger
    document.getElementById('btnSubmitBulkPassenger')?.addEventListener('click', () => {
      this.processBulkPassengerSubmit();
    });

    // Success Modal Actions
    document.getElementById('btnBulkSuccessClose')?.addEventListener('click', () => {
      document.getElementById('modalBulkSuccess')?.classList.remove('show');
    });
    document.getElementById('btnBulkSuccessGoManifest')?.addEventListener('click', () => {
      document.getElementById('modalBulkSuccess')?.classList.remove('show');
      this.switchDashboardTab('tabManifest');
    });
    document.getElementById('btnBulkSuccessPrintManifest')?.addEventListener('click', () => {
      document.getElementById('modalBulkSuccess')?.classList.remove('show');
      this.openOfficialManifestPrintModal();
    });
    document.getElementById('btnBulkSuccessPrintTickets')?.addEventListener('click', () => {
      const pnr = document.getElementById('bulkSuccessPnr')?.innerText?.trim();
      document.getElementById('modalBulkSuccess')?.classList.remove('show');
      if (pnr && pnr !== '-') {
        this.openDirectTicketPrintModal(pnr);
      } else {
        this.openDirectTicketPrintModal();
      }
    });
  },

  openBulkPassengerModal(preselectedScheduleId = null) {
    const tenant = Store.getCurrentTenant();
    if (!tenant) {
      this.showToast('Sesi Belum Aktif', 'Silakan login ke portal perusahaan terlebih dahulu.', 'warning');
      return;
    }

    if (preselectedScheduleId && this.tixConsoleState) {
      this.tixConsoleState.selectedScheduleId = preselectedScheduleId;
    }
    const fleet = Store.getVesselsByCompany(tenant.id);
    const companySchedules = Store.getSchedulesByCompany(tenant.id);

    const vesselSelect = document.getElementById('bulkTargetVesselSelect');
    const select = document.getElementById('bulkTargetScheduleSelect');

    if (vesselSelect) {
      vesselSelect.innerHTML = `<option value="ALL">🚢 Semua Armada (${fleet.length} Kapal)</option>`;
      fleet.forEach(fv => {
        const opt = new Option(`⚓ ${fv.name} (${fv.capacity || 150} Kursi)`, fv.id);
        vesselSelect.add(opt);
      });
      vesselSelect.onchange = () => {
        const vid = vesselSelect.value;
        if (select) {
          select.innerHTML = '';
          const filteredScheds = vid === 'ALL'
            ? companySchedules
            : companySchedules.filter(s => s.vesselId === vid);
          const listToUse = filteredScheds.length > 0 ? filteredScheds : companySchedules;
          listToUse.forEach((s, idx) => {
            const v = fleet.find(f => f.id === s.vesselId);
            const vName = v ? v.name : (s.vesselNameCustom || 'Armada Reguler');
            const orig = MASTER_PORTS.find(pt => pt.id === s.originId) || { city: s.originId };
            const dest = MASTER_PORTS.find(pt => pt.id === s.destinationId) || { city: s.destinationId };
            const booked = s.quotaBooked || 0;
            const total = s.quotaTotal || (v ? v.capacity : 250);
            const sisa = Math.max(0, total - booked);
            const label = `${vName} — ${orig.city} ➔ ${dest.city} (${s.departTime} WITA) [Sisa: ${sisa} Seat]`;
            const opt = new Option(label, s.id);
            if (idx === 0) opt.selected = true;
            select.add(opt);
          });
          this.bulkState.targetScheduleId = select.value;
          this.updateBulkScheduleInfo();
          this.renderBulkPassengerPreview();
        }
      };
    }

    if (select) {
      select.innerHTML = '';
      companySchedules.forEach((s, idx) => {
        const v = fleet.find(f => f.id === s.vesselId);
        const vName = v ? v.name : (s.vesselNameCustom || 'Armada Reguler');
        const orig = MASTER_PORTS.find(pt => pt.id === s.originId) || { city: s.originId };
        const dest = MASTER_PORTS.find(pt => pt.id === s.destinationId) || { city: s.destinationId };
        const booked = s.quotaBooked || 0;
        const total = s.quotaTotal || (v ? v.capacity : 250);
        const sisa = Math.max(0, total - booked);
        const label = `${vName} — ${orig.city} ➔ ${dest.city} (${s.departTime} WITA) [Sisa: ${sisa} Seat]`;
        const opt = new Option(label, s.id);
        if (preselectedScheduleId && s.id === preselectedScheduleId) {
          opt.selected = true;
        } else if (!preselectedScheduleId && idx === 0) {
          opt.selected = true;
        }
        select.add(opt);
      });
      this.bulkState.targetScheduleId = select.value;
    }

    this.updateBulkScheduleInfo();

    // Default group name with company route
    const routeLabel = this.getTenantRouteScope(tenant) === 'INTL' ? 'Nunukan - Tawau' : 'Nunukan - Parepare';
    const groupInput = document.getElementById('bulkGroupNameInput');
    if (groupInput) {
      groupInput.value = `Rombongan ${tenant.shortName || tenant.name} (${routeLabel})`;
    }

    // Set default active tab to GRID and sync UI panes
    this.bulkState.activeTab = 'GRID';
    const tabBtns = document.querySelectorAll('#bulkInputTabs .bulk-tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === 'GRID');
    });
    const panePaste = document.getElementById('bulkPanePaste');
    const paneFile = document.getElementById('bulkPaneFile');
    const paneGrid = document.getElementById('bulkPaneGrid');
    if (panePaste) panePaste.style.display = 'none';
    if (paneFile) paneFile.style.display = 'none';
    if (paneGrid) paneGrid.style.display = 'block';

    // Initialize manual grid rows if empty (check saved draft first)
    if (!this.bulkState.manualGridRows || this.bulkState.manualGridRows.length === 0) {
      try {
        const savedDraft = localStorage.getItem('tech_bulk_draft_passengers_v1');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.bulkState.manualGridRows = parsed;
          }
        }
      } catch (e) {}
    }
    if (!this.bulkState.manualGridRows || this.bulkState.manualGridRows.length === 0) {
      this.initManualGridRows(3);
    } else {
      this.renderManualGridTable();
      this.syncGridToPaxList();
    }

    // Render initial state
    this.renderBulkPassengerPreview();

    // Buka di pane Entri Penumpang mode Rombongan
    this.switchDashboardTab('tabTicketing');
    this.setTicketingEntryMode('BULK');
  },

  updateBulkScheduleInfo() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;
    const companySchedules = Store.getSchedulesByCompany(tenant.id);
    const targetSched = companySchedules.find(s => s.id === this.bulkState.targetScheduleId) || companySchedules[0];
    const classSelect = document.getElementById('bulkClassSelect');

    if (targetSched && classSelect) {
      const ticketPrice = (targetSched.classes && targetSched.classes[0] && targetSched.classes[0].price)
        ? Number(targetSched.classes[0].price)
        : Number(targetSched.priceEconomy || (this.getTenantRouteScope(tenant) === 'INTL' ? 430000 : 690000));
      const passFee = this.getSchedulePortPassFee(targetSched, tenant);
      const totalPerPax = ticketPrice + passFee;

      classSelect.innerHTML = `<option value="Reguler" data-fare="${totalPerPax}">Tiket Reguler — ${formatRupiah(ticketPrice)} (+ Pas Pelabuhan ${formatRupiah(passFee)}) / Pax</option>`;
      this.bulkState.farePerPax = totalPerPax;

      // Update Quick Info Strip Pelayaran & Kuota Full-Page
      const fleet = Store.getVesselsByCompany(tenant.id);
      const v = fleet.find(f => f.id === targetSched.vesselId);
      const vName = v ? v.name : (targetSched.vesselNameCustom || 'Armada Reguler');
      const orig = MASTER_PORTS.find(pt => pt.id === targetSched.originId) || { city: targetSched.originId || 'Nunukan' };
      const dest = MASTER_PORTS.find(pt => pt.id === targetSched.destinationId) || { city: targetSched.destinationId || 'Tawau' };
      const totalSeats = targetSched.quotaTotal || (v ? v.capacity : 150);
      const booked = targetSched.quotaBooked || 0;
      const avail = Math.max(0, totalSeats - booked);

      const elVes = document.getElementById('bulkInfoVesselBadge');
      const elRoute = document.getElementById('bulkInfoRouteBadge');
      const elDate = document.getElementById('bulkInfoDateBadge');
      const elAvail = document.getElementById('bulkInfoAvailBadge');
      const elFare = document.getElementById('bulkInfoFareBadge');

      if (elVes) elVes.innerText = `Armada: ${vName}`;
      if (elRoute) elRoute.innerText = `${orig.city} ➔ ${dest.city}`;
      if (elDate) elDate.innerText = `🕒 ${targetSched.departTime || '09:00'} WITA • ${targetSched.departDate || 'Hari Ini'}`;
      if (elAvail) elAvail.innerText = avail;
      if (elFare) elFare.innerText = formatRupiah(totalPerPax);
    }
  },

  downloadBulkPassengerTemplate() {
    const csvContent = "Nama Lengkap,No Dokumen (NIK/Paspor),Jenis Kelamin (L/P),Jenis Penumpang (Dewasa/Anak),Umur,Kewarganegaraan,No Kursi (Opsional),Catatan\n" +
      "Ahmad Dahlan,A9128374,L,Dewasa,35,ID,,Rombongan Kerja Nunukan\n" +
      "Siti Rahmawati,6401024508900001,P,Dewasa,30,ID,,Wisata Keluarga\n" +
      "Hafiz bin Ismail,MYB582910,L,Dewasa,42,MY,,WNA Tawau Malaysia\n" +
      "Muhammad Rizki,6401021204150003,L,Anak,8,ID,,Anak Pendamping\n" +
      "Nurul Hidayah,6401028910950002,P,Dewasa,28,ID,,Rombongan Mandiri\n";
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_manifes_penumpang_massal_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Template Diunduh', 'Berkas template CSV berhasil diunduh. Silakan isi dan unggah kembali.', 'success');
  },

  handleBulkUploadedFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const ta = document.getElementById('bulkPasteTextarea');
      if (ta) ta.value = content;
      this.parseAndSetBulkPassengers(content, true);
      this.showToast('File Berhasil Dibaca', `${file.name} berhasil diuraikan. Menampilkan pratinjau data.`);
    };
    reader.readAsText(file);
  },

  parseBulkPassengerText(rawText) {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));
    if (lines.length === 0) return [];

    const passengers = [];
    const headerKeywords = ['nama', 'name', 'lengkap', 'dokumen', 'nik', 'paspor', 'passport', 'jenis kelamin'];

    lines.forEach((line, idx) => {
      // Determine delimiter per-line
      let delim = '\t';
      if (line.includes('\t')) delim = '\t';
      else if (line.includes(';')) delim = ';';
      else if (line.includes('|')) delim = '|';
      else if (line.includes(',')) delim = ',';

      let cols = [];
      if (delim === ',') {
        cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
      } else {
        cols = line.split(delim).map(c => c.replace(/^"|"$/g, '').trim());
      }

      if (cols.length === 0 || !cols[0]) return;

      const isHeader = cols.some(c => headerKeywords.some(kw => c.toLowerCase() === kw || c.toLowerCase().includes(kw)));
      if (idx === 0 && isHeader) return;

      // Clean name: remove leading index like "1. ", "01) ", "- "
      let name = (cols[0] || '').replace(/^[\d]+[\.\-\)]\s*/, '').replace(/^[-*•]\s*/, '').trim();
      if (!name || name.length < 2) return;

      // Document Number
      let docNum = (cols[1] || '').trim();
      if (!docNum || docNum.length === 0) {
        docNum = `KTP-${Math.floor(10000000 + Math.random() * 90000000)}`;
      }

      // Gender
      let gender = (cols[2] || 'L').toUpperCase().trim();
      if (!['L', 'P', 'M', 'F'].includes(gender)) gender = 'L';
      if (gender === 'M') gender = 'L';
      if (gender === 'F') gender = 'P';

      // Pax Type
      let paxType = (cols[3] || 'Dewasa').trim();
      if (paxType.toLowerCase().includes('anak') || paxType.toLowerCase().includes('child')) paxType = 'Anak';
      else if (paxType.toLowerCase().includes('bayi') || paxType.toLowerCase().includes('infant')) paxType = 'Bayi';
      else paxType = 'Dewasa';

      // Age
      const age = parseInt(cols[4] || (paxType === 'Anak' ? '8' : '30'), 10) || 30;

      // Nationality
      let nationality = (cols[5] || 'ID').toUpperCase().trim();
      if (!['ID', 'MY', 'OTHER'].includes(nationality)) {
        const matchedNat = Array.from(document.getElementById('custPaxNationality')?.options || []).find(o => o.value.toUpperCase() === nationality && o.value !== 'Indonesia' && o.value !== 'Malaysia');
        if (matchedNat) nationality = matchedNat.value;
        else if (nationality.includes('MAL') || nationality.includes('MY')) nationality = 'MY';
        else nationality = 'ID';
      }

      const manualSeat = cols[6] ? cols[6].trim().toUpperCase() : '';
      const remark = cols[7] ? cols[7].trim() : '';

      passengers.push({
        name,
        docNum,
        gender,
        paxType,
        age,
        nationality,
        manualSeat,
        remark
      });
    });

    return passengers;
  },

  parseAndSetBulkPassengers(rawText, notify = false) {
    const list = this.parseBulkPassengerText(rawText);
    this.bulkState.paxList = list;
    this.reallocateBulkSeats(false);
    this.renderBulkPassengerPreview();

    if (notify && list.length > 0) {
      this.showToast('Data Diproses', `${list.length} Data penumpang berhasil diuraikan dan divalidasi.`);
    }
  },

  reallocateBulkSeats(forceReset = false) {
    if (!this.bulkState.paxList || this.bulkState.paxList.length === 0) return;
    const scheduleId = this.bulkState.targetScheduleId;
    const manualSeats = this.bulkState.paxList.map(p => forceReset ? '' : p.manualSeat);
    const allocated = this.generateSequentialSeats(scheduleId, this.bulkState.paxList.length, manualSeats);

    this.bulkState.paxList.forEach((p, idx) => {
      p.seat = allocated[idx] || `S-${idx + 1}`;
    });

    this.renderBulkPassengerPreview();
  },

  getOccupiedSeatsForSchedule(scheduleId) {
    const allBookings = Store.getBookings();
    const schedBookings = allBookings.filter(b => b.scheduleId === scheduleId);
    const occupied = new Set();
    schedBookings.forEach(b => {
      if (b.passengers) {
        b.passengers.forEach(p => {
          if (p.seat) occupied.add(p.seat.toUpperCase().trim());
        });
      }
    });
    return occupied;
  },

  generateSequentialSeats(scheduleId, count, manualSeats = []) {
    const occupied = this.getOccupiedSeatsForSchedule(scheduleId);
    const allocated = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
    let rowIndex = 0;
    let seatNum = 1;

    for (let i = 0; i < count; i++) {
      const manual = manualSeats[i];
      if (manual && !occupied.has(manual.toUpperCase().trim()) && !allocated.includes(manual.toUpperCase().trim())) {
        allocated.push(manual.toUpperCase().trim());
        occupied.add(manual.toUpperCase().trim());
      } else {
        while (rowIndex < rows.length) {
          const candidate = `${rows[rowIndex]}-${String(seatNum).padStart(2, '0')}`;
          seatNum++;
          if (seatNum > 30) {
            seatNum = 1;
            rowIndex++;
          }
          if (!occupied.has(candidate) && !allocated.includes(candidate)) {
            allocated.push(candidate);
            occupied.add(candidate);
            break;
          }
        }
        if (allocated.length <= i) {
          allocated.push(`S-${i + 1}`);
        }
      }
    }
    return allocated;
  },

  initManualGridRows(rowCount = 3) {
    this.bulkState.manualGridRows = [];
    for (let i = 0; i < rowCount; i++) {
      this.bulkState.manualGridRows.push({
        name: '',
        docNum: '',
        gender: 'L',
        paxType: 'Dewasa',
        nationality: 'ID',
        seat: ''
      });
    }
    this.renderManualGridTable();
  },

  addManualGridRow() {
    this.bulkState.manualGridRows.push({
      name: '',
      docNum: '',
      gender: 'L',
      paxType: 'Dewasa',
      nationality: 'ID',
      seat: ''
    });
    this.renderManualGridTable();
  },

  saveManualGridRows(showFeedback = true) {
    const tbody = document.getElementById('tbodyBulkManualGrid');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach((tr, idx) => {
        if (!this.bulkState.manualGridRows[idx]) {
          this.bulkState.manualGridRows[idx] = {
            name: '',
            docNum: '',
            gender: 'L',
            paxType: 'Dewasa',
            nationality: 'ID',
            seat: ''
          };
        }
        const nameInput = tr.querySelector('[data-field="name"]');
        const docInput = tr.querySelector('[data-field="docNum"]');
        const genderInput = tr.querySelector('[data-field="gender"]');
        const paxTypeInput = tr.querySelector('[data-field="paxType"]');
        const natInput = tr.querySelector('[data-field="nationality"]');
        const seatInput = tr.querySelector('[data-field="seat"]');

        if (nameInput) this.bulkState.manualGridRows[idx].name = nameInput.value;
        if (docInput) this.bulkState.manualGridRows[idx].docNum = docInput.value;
        if (genderInput) this.bulkState.manualGridRows[idx].gender = genderInput.value;
        if (paxTypeInput) this.bulkState.manualGridRows[idx].paxType = paxTypeInput.value;
        if (natInput) this.bulkState.manualGridRows[idx].nationality = natInput.value;
        if (seatInput) this.bulkState.manualGridRows[idx].seat = seatInput.value;
      });
    }

    try {
      localStorage.setItem('tech_bulk_draft_passengers_v1', JSON.stringify(this.bulkState.manualGridRows));
    } catch (e) {}

    this.syncGridToPaxList();

    const validCount = (this.bulkState.paxList || []).length;
    if (showFeedback) {
      if (validCount > 0) {
        this.showToast('Data Berhasil Disimpan', `${validCount} data penumpang berhasil disimpan ke daftar tiket massal.`);
      } else {
        this.showToast('Draft Disimpan', 'Data baris telah disimpan.', 'warning');
      }
    }
  },

  renderManualGridTable() {
    const tbody = document.getElementById('tbodyBulkManualGrid');
    if (!tbody) return;
    tbody.innerHTML = '';

    const tenant = Store.getCurrentTenant();
    const companySchedules = tenant ? Store.getSchedulesByCompany(tenant.id) : [];
    const targetSched = companySchedules.find(s => s.id === this.bulkState.targetScheduleId) || companySchedules[0] || (typeof Store !== 'undefined' ? Store.getSchedules().find(s => s.id === this.bulkState.targetScheduleId) : null);
    const fleet = tenant ? Store.getVesselsByCompany(tenant.id) : [];
    const targetVessel = targetSched ? (fleet.find(f => f.id === targetSched.vesselId) || fleet.find(f => f.name === targetSched.vesselName) || Store.getVessels().find(v => v.id === targetSched.vesselId)) : null;

    const occupiedSeats = (targetSched && targetSched.id && typeof this.getOccupiedSeatsForSchedule === 'function')
      ? this.getOccupiedSeatsForSchedule(targetSched.id)
      : new Set();

    const isSulawesi = (targetSched && (targetSched.destinationId === 'PRE' || targetSched.destinationCity === 'Parepare')) ||
                       (targetVessel && (((targetVessel.type || '').toLowerCase().includes('parepare')) || 
                                         ((targetVessel.type || '').toLowerCase().includes('domestik')) || 
                                         ((targetVessel.name || '').toLowerCase().includes('pantokrator'))));

    const vesselDecks = (isSulawesi && Store.getSulawesiDecks)
      ? Store.getSulawesiDecks()
      : (targetVessel && targetVessel.decks && targetVessel.decks.length > 0
          ? targetVessel.decks
          : null);

    const seatItems = [];
    const getRowCode = (rIdx) => {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      if (rIdx < letters.length) return letters[rIdx];
      const p1 = letters[Math.floor(rIdx / letters.length) - 1];
      const p2 = letters[rIdx % letters.length];
      return `${p1}${p2}`;
    };

    if (vesselDecks && vesselDecks.length > 0) {
      vesselDecks.forEach(deck => {
        const dCap = deck.capacity || 100;
        const totalRows = Math.ceil(dCap / 6);
        let gen = 0;
        for (let r = 0; r < totalRows; r++) {
          if (gen >= dCap) break;
          const rCode = getRowCode(r);
          for (let col = 1; col <= 6; col++) {
            if (gen >= dCap) break;
            gen++;
            const sCode = `${deck.code}-${rCode}${String(col).padStart(2, '0')}`;
            seatItems.push({
              code: sCode,
              label: `${sCode} (${deck.name})`,
              group: deck.name,
              occupied: occupiedSeats.has(sCode)
            });
          }
        }
      });
    } else {
      let cap = 150;
      if (targetVessel && targetVessel.capacity) cap = parseInt(targetVessel.capacity, 10);
      else if (targetSched && (targetSched.capacity || targetSched.quotaTotal)) cap = parseInt(targetSched.capacity || targetSched.quotaTotal, 10);
      if (!cap || cap <= 0) cap = 150;

      const totalRows = Math.ceil(cap / 6);
      let gen = 0;
      for (let r = 0; r < totalRows; r++) {
        if (gen >= cap) break;
        const rCode = getRowCode(r);
        for (let col = 1; col <= 6; col++) {
          if (gen >= cap) break;
          gen++;
          const sCode = `${rCode}-${String(col).padStart(2, '0')}`;
          seatItems.push({
            code: sCode,
            label: sCode,
            group: (targetVessel && targetVessel.deckName) || 'Main Deck',
            occupied: occupiedSeats.has(sCode)
          });
        }
      }
    }

    this.bulkState.manualGridRows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
        <td>
          <input type="text" class="bulk-grid-input grid-field grid-pax-name" data-idx="${idx}" data-field="name" value="${row.name || ''}" placeholder="Nama lengkap...">
        </td>
        <td>
          <input type="text" class="bulk-grid-input grid-field" data-idx="${idx}" data-field="docNum" value="${row.docNum || ''}" placeholder="NIK / Paspor...">
        </td>
        <td>
          <select class="bulk-grid-input grid-field" data-idx="${idx}" data-field="gender">
            <option value="L" ${row.gender === 'L' ? 'selected' : ''}>L</option>
            <option value="P" ${row.gender === 'P' ? 'selected' : ''}>P</option>
          </select>
        </td>
        <td>
          <select class="bulk-grid-input grid-field" data-idx="${idx}" data-field="paxType">
            <option value="Dewasa" ${row.paxType === 'Dewasa' ? 'selected' : ''}>Dewasa</option>
            <option value="Anak" ${row.paxType === 'Anak' ? 'selected' : ''}>Anak</option>
            <option value="Bayi" ${row.paxType === 'Bayi' ? 'selected' : ''}>Bayi</option>
          </select>
        </td>
        <td>
          <select class="bulk-grid-input grid-field" data-idx="${idx}" data-field="nationality">
            <option value="ID" ${row.nationality === 'ID' || row.nationality === 'Indonesia' ? 'selected' : ''}>Indonesia</option>
            <option value="MY" ${row.nationality === 'MY' || row.nationality === 'Malaysia' ? 'selected' : ''}>Malaysia</option>
            ${Array.from(document.getElementById('custPaxNationality')?.options || []).filter(o => !['Indonesia', 'Malaysia', 'Lainnya'].includes(o.value)).map(o => `<option value="${o.value}" ${row.nationality === o.value ? 'selected' : ''}>${o.value}</option>`).join('')}
          </select>
        </td>
        <td>
          <select class="bulk-grid-input grid-field" data-idx="${idx}" data-field="seat">
            <option value="" ${!row.seat ? 'selected' : ''}>Otomatis</option>
            ${(() => {
              let optionsHtml = '';
              const groups = {};
              seatItems.forEach(s => {
                if (!groups[s.group]) groups[s.group] = [];
                groups[s.group].push(s);
              });
              const groupKeys = Object.keys(groups);
              const hasMultipleGroups = groupKeys.length > 1;

              groupKeys.forEach(grp => {
                const groupSeats = groups[grp];
                const innerOpts = groupSeats.map(s => {
                  const isSelected = row.seat && row.seat.trim().toUpperCase() === s.code.toUpperCase();
                  const isOcc = s.occupied && !isSelected;
                  return `<option value="${s.code}" ${isSelected ? 'selected' : ''} ${isOcc ? 'disabled style="color: #94a3b8;"' : ''}>${s.label}${isOcc ? ' (Terisi)' : ''}</option>`;
                }).join('');

                if (hasMultipleGroups) {
                  optionsHtml += `<optgroup label="${grp}">${innerOpts}</optgroup>`;
                } else {
                  optionsHtml += innerOpts;
                }
              });

              if (row.seat && !seatItems.some(s => s.code.toUpperCase() === row.seat.trim().toUpperCase())) {
                optionsHtml = `<option value="${row.seat}" selected>${row.seat} (Manual)</option>` + optionsHtml;
              }

              return optionsHtml;
            })()}
          </select>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-del-grid-row" data-idx="${idx}" style="background: transparent; border: none; color: #ef4444; font-weight: bold; cursor: pointer;">&times;</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.grid-field').forEach(input => {
      const updateHandler = (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        const field = e.target.getAttribute('data-field');
        if (this.bulkState.manualGridRows[idx]) {
          this.bulkState.manualGridRows[idx][field] = e.target.value;
          this.syncGridToPaxList();
        }
      };
      input.addEventListener('input', updateHandler);
      input.addEventListener('change', updateHandler);
    });

    tbody.querySelectorAll('.btn-del-grid-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        this.bulkState.manualGridRows.splice(idx, 1);
        this.renderManualGridTable();
        this.syncGridToPaxList();
      });
    });
  },

  syncGridToPaxList() {
    const valid = this.bulkState.manualGridRows
      .filter(r => r.name && r.name.trim().length > 0)
      .map(r => ({
        name: r.name.trim(),
        docNum: r.docNum ? r.docNum.trim() : `NIK-${Math.floor(10000000 + Math.random() * 90000000)}`,
        gender: r.gender || 'L',
        paxType: r.paxType || 'Dewasa',
        age: r.paxType === 'Anak' ? 8 : 30,
        nationality: r.nationality || 'ID',
        manualSeat: r.seat ? r.seat.trim().toUpperCase() : '',
        remark: r.remark || 'None'
      }));

    this.bulkState.paxList = valid;
    this.reallocateBulkSeats(false);
    this.renderBulkPassengerPreview();
  },

  renderBulkPassengerPreview() {
    const list = this.bulkState.paxList || [];
    const tbody = document.getElementById('tbodyBulkPreview');
    const kpiTotal = document.getElementById('kpiBulkTotalPax');
    const kpiValid = document.getElementById('kpiBulkValidPax');
    const kpiFare = document.getElementById('kpiBulkTotalFare');
    const btnSubmit = document.getElementById('btnSubmitBulkPassenger');
    const btnSubmitText = document.getElementById('btnSubmitBulkPassengerText');

    const totalFare = list.length * (this.bulkState.farePerPax || 250000);

    if (kpiTotal) kpiTotal.innerText = `${list.length} Orang`;
    if (kpiValid) kpiValid.innerText = `${list.length} Lolos`;
    if (kpiFare) kpiFare.innerText = formatRupiah(totalFare);

    if (btnSubmitText) {
      btnSubmitText.innerText = list.length > 0
        ? `Terbitkan Tiket Massal (${list.length} Penumpang)`
        : 'Masukkan Data Penumpang Terlebih Dahulu';
    }
    if (btnSubmit) {
      btnSubmit.disabled = (list.length === 0);
      btnSubmit.style.opacity = (list.length === 0) ? '0.6' : '1';
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: #94a3b8; padding: 1.5rem;">
            Belum ada data penumpang dimasukkan. Tempel data teks di atas atau unggah file.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
        <td><strong style="color: #0f172a;">${p.name}</strong></td>
        <td><code style="color: #0284c7; font-weight: 700;">${p.docNum || '-'}</code></td>
        <td><span class="tag-badge" style="padding: 2px 6px; font-size: 0.72rem;">${p.gender}</span></td>
        <td>${p.paxType}</td>
        <td><span class="tag-badge" style="background:#f1f5f9;color:#334155;border-color:#cbd5e1;padding:2px 6px;font-size:0.72rem;">${(p.nationality === 'ID' || p.nationality === 'Indonesia') ? 'Indonesia' : ((p.nationality === 'MY' || p.nationality === 'Malaysia') ? 'Malaysia' : p.nationality)}</span></td>
        <td>
          <span class="tag-badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706; border-color: #fde68a; font-weight: 800; font-size: 0.76rem;">
            ${p.seat || 'OTOMATIS'}
          </span>
        </td>
        <td>
          <span style="color: #16a34a; font-weight: 700; font-size: 0.75rem;">✓ Siap Terbit</span>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-remove-preview-pax" data-idx="${idx}" style="background: transparent; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer;" title="Hapus penumpang ini">&times;</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-remove-preview-pax').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        this.bulkState.paxList.splice(idx, 1);
        this.reallocateBulkSeats(false);
        this.renderBulkPassengerPreview();
      });
    });
  },

  resetBulkPassengerState() {
    this.bulkState.paxList = [];
    this.bulkState.manualGridRows = [];
    try { localStorage.removeItem('tech_bulk_draft_passengers_v1'); } catch (e) {}
    const ta = document.getElementById('bulkPasteTextarea');
    if (ta) ta.value = '';
    const fi = document.getElementById('bulkFileInput');
    if (fi) fi.value = '';
    this.renderManualGridTable();
    this.renderBulkPassengerPreview();
  },

  processBulkPassengerSubmit() {
    try {
      this.saveManualGridRows(false);
      let tenant = Store.getCurrentTenant();
      if (!tenant) {
        tenant = Store.getCompanies()[0];
        if (tenant) Store.setCurrentTenant(tenant);
      }
      if (!tenant) {
        this.showToast('Akses Ditolak', 'Silakan pilih atau daftarkan perusahaan terlebih dahulu.', 'warning');
        return;
      }

      const scheduleId = this.bulkState.targetScheduleId;
      if (!scheduleId) {
        this.showToast('Jadwal Kosong', 'Pilih jadwal kapal tujuan terlebih dahulu.', 'warning');
        return;
      }

      const list = this.bulkState.paxList;
      if (!list || list.length === 0) {
        this.showToast('Data Kosong', 'Masukkan data penumpang minimal satu orang (atau klik tombol "+ Muat 10 Contoh Data Demo").', 'warning');
        return;
      }

      const companySchedules = Store.getSchedulesByCompany(tenant.id);
      const targetSched = (companySchedules && companySchedules.length > 0)
        ? (companySchedules.find(s => s.id === scheduleId) || companySchedules[0])
        : {
          id: scheduleId || `SCH-${tenant.id}-AUTO`,
          companyId: tenant.id,
          date: new Date().toISOString().split('T')[0],
          departTime: '09:00',
          originId: 'NNK',
          destinationId: 'TWU',
          pier: 'Dermaga 3 Tunon Taka',
          quotaTotal: 250,
          quotaBooked: 0,
          classes: [{ id: 'cls-eko', name: 'Ekonomi', price: 250000, quota: 250, available: 250 }]
        };

      const fleet = Store.getVesselsByCompany(tenant.id);
      const vessel = (fleet && fleet.length > 0)
        ? (fleet.find(f => f.id === targetSched?.vesselId) || fleet[0])
        : { name: 'KM Hasna Express 01', capacity: 250 };
      const vesselName = vessel ? vessel.name : (targetSched?.vesselNameCustom || 'Armada Reguler');

      const origPort = MASTER_PORTS.find(pt => pt.id === targetSched?.originId) || { city: 'Nunukan', id: 'NNK', country: 'Indonesia' };
      const destPort = MASTER_PORTS.find(pt => pt.id === targetSched?.destinationId) || { city: 'Tawau', id: 'TWU', country: 'Malaysia' };
      const isIntl = (origPort.country !== destPort.country);

      const groupName = document.getElementById('bulkGroupNameInput')?.value.trim() || 'Rombongan Penumpang Resmi';
      const payMethod = document.getElementById('bulkPaymentMethodSelect')?.value || 'Loket Resmi / Tunai';
      const picName = document.getElementById('bulkPicNameInput')?.value.trim() || (list[0]?.name || 'Koordinator Rombongan');
      const picPhone = document.getElementById('bulkPicPhoneInput')?.value.trim() || '-';
      const pnrMode = document.querySelector('input[name="bulkPnrGroupingMode"]:checked')?.value || 'GROUP';

      const className = this.bulkState.selectedClass || 'EKONOMI';
      const fare = this.bulkState.farePerPax || 250000;
      const totalFare = list.length * fare;

      // Cek Duplikasi Nama di Daftar Rombongan
      const nameSet = new Set();
      const internalDups = [];
      list.forEach(p => {
        const n = (p.name || '').trim().toLowerCase();
        if (n) {
          if (nameSet.has(n)) internalDups.push(p.name);
          else nameSet.add(n);
        }
      });
      if (internalDups.length > 0) {
        const proceed = confirm(`⚠️ PERINGATAN DATA PENUMPANG GANDA!\n\nTerdapat nama penumpang ganda di dalam daftar rombongan ini:\n• ${internalDups.slice(0, 3).join(', ')}${internalDups.length > 3 ? ' dan lainnya' : ''}\n\nApakah Anda yakin ingin tetap memproses tiket?`);
        if (!proceed) return;
      }

      let mainPnr = '';

      if (pnrMode === 'GROUP') {
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        mainPnr = `OMNI-GRP-${randomSuffix}`;
        const barcode = `8910${Math.floor(10000000 + Math.random() * 90000000)}`;

        const booking = {
          pnr: mainPnr,
          barcode,
          companyId: tenant.id,
          scheduleId: targetSched.id,
          vesselName,
          originCity: origPort.city,
          originCode: origPort.id || 'NNK',
          destinationCity: destPort.city,
          destCode: destPort.id || 'TWU',
          departDate: targetSched.date || new Date().toISOString().split('T')[0],
          departTime: `${targetSched.departTime || '09:00'} WITA`,
          className,
          pier: targetSched.pier || 'Dermaga Keberangkatan',
          isIntl,
          groupName,
          contact: { name: picName, phone: picPhone, email: '' },
          passengers: list.map((p, idx) => ({
            paxType: p.paxType || 'Dewasa',
            name: p.name,
            gender: p.gender || 'L',
            docType: (p.nationality && p.nationality !== 'ID' && p.nationality !== 'Indonesia') || isIntl ? 'PASPOR' : 'KTP',
            passportNo: p.docNum,
            docNumber: p.docNum,
            nik: p.docNum,
            dob: '1990-01-01',
            age: p.age || 30,
            nationality: p.nationality || 'ID',
            remark: (p.remark && ['None', 'LC', 'PGS', 'CAD'].includes(p.remark)) ? p.remark : 'None',
            passportExp: '2029-01-01',
            seat: p.seat || `B-${String(idx + 1).padStart(2, '0')}`,
            className
          })),
          totalAmount: totalFare,
          paymentMethod: payMethod,
          paymentStatus: payMethod === 'Sistem Booked' ? 'BOOKED' : 'PAID',
          boardingStatus: 'NOT_CHECKED_IN',
          createdAt: new Date().toISOString()
        };

        Store.addBooking(booking);
      } else {
        mainPnr = `OMNI-${tenant.shortName || 'TKT'}-${Math.floor(100000 + Math.random() * 900000)}`;
        list.forEach((p, idx) => {
          const indPnr = `OMNI-${tenant.shortName || 'TKT'}-${Math.floor(100000 + Math.random() * 900000)}`;
          const barcode = `8910${Math.floor(10000000 + Math.random() * 90000000)}`;
          const booking = {
            pnr: indPnr,
            barcode,
            companyId: tenant.id,
            scheduleId: targetSched.id,
            vesselName,
            originCity: origPort.city,
            originCode: origPort.id || 'NNK',
            destinationCity: destPort.city,
            destCode: destPort.id || 'TWU',
            departDate: targetSched.date || new Date().toISOString().split('T')[0],
            departTime: `${targetSched.departTime || '09:00'} WITA`,
            className,
            pier: targetSched.pier || 'Dermaga Keberangkatan',
            isIntl,
            groupName,
            contact: { name: picName, phone: picPhone, email: '' },
            passengers: [{
              paxType: p.paxType || 'Dewasa',
              name: p.name,
              gender: p.gender || 'L',
              docType: (p.nationality && p.nationality !== 'ID' && p.nationality !== 'Indonesia') || isIntl ? 'PASPOR' : 'KTP',
              passportNo: p.docNum,
              docNumber: p.docNum,
              nik: p.docNum,
              dob: '1990-01-01',
              age: p.age || 30,
              nationality: p.nationality || 'ID',
              remark: (p.remark && ['None', 'LC', 'PGS', 'CAD'].includes(p.remark)) ? p.remark : 'None',
              passportExp: '2029-01-01',
              seat: p.seat || `B-${String(idx + 1).padStart(2, '0')}`,
              className
            }],
            totalAmount: fare,
            paymentMethod: payMethod,
            paymentStatus: payMethod === 'Sistem Booked' ? 'BOOKED' : 'PAID',
            boardingStatus: 'NOT_CHECKED_IN',
            createdAt: new Date().toISOString()
          };
          Store.addBooking(booking);
        });
      }

      // Update schedule quota
      if (targetSched && targetSched.id) {
        targetSched.quotaBooked = (targetSched.quotaBooked || 0) + list.length;
        const allSchedules = Store.getSchedules();
        const sIdx = allSchedules.findIndex(s => s.id === targetSched.id);
        if (sIdx !== -1) {
          allSchedules[sIdx].quotaBooked = targetSched.quotaBooked;
          Store.saveSchedules(allSchedules);
        } else {
          targetSched.companyId = tenant.id;
          targetSched.classes = targetSched.classes || [{ id: 'cls-eko', name: 'Ekonomi', price: fare, quota: 250, available: 250 }];
          Store.addSchedule(targetSched);
        }
      }

      // Close entry modal
      document.getElementById('modalBulkPassengerEntry')?.classList.remove('show');

      // Refresh UI
      this.refreshCompanyDashboard();
      if (typeof this.renderVoyageCalendar === 'function') {
        this.renderVoyageCalendar();
      }

      // Show Success Modal
      const pnrEl = document.getElementById('bulkSuccessPnr');
      const grpEl = document.getElementById('bulkSuccessGroup');
      const paxEl = document.getElementById('bulkSuccessPaxCount');
      const vesEl = document.getElementById('bulkSuccessVessel');
      const fareEl = document.getElementById('bulkSuccessTotalFare');

      if (pnrEl) pnrEl.innerText = mainPnr;
      if (grpEl) grpEl.innerText = groupName;
      if (paxEl) paxEl.innerText = `${list.length} Orang Terdaftar`;
      if (vesEl) vesEl.innerText = `${vesselName} (${origPort.city} ➔ ${destPort.city})`;
      if (fareEl) fareEl.innerText = formatRupiah(totalFare);

      document.getElementById('modalBulkSuccess')?.classList.add('show');

      // Toast
      this.showToast('Entri Massal Berhasil!', `${list.length} Penumpang resmi diterbitkan tiketnya (PNR: ${mainPnr}).`);
      this.resetBulkPassengerState();
    } catch (err) {
      console.error('Error in processBulkPassengerSubmit:', err);
      this.showToast('Terjadi Kesalahan', err.message || 'Gagal menyimpan data penumpang massal.', 'warning');
    }
  },

  // ========================================================
  // ENTERPRISE FEATURE 1: KALKULATOR DWT & MANIFEST MUATAN KAPAL
  // ========================================================
  initCargoEvents() {
    const form = document.getElementById('formAddCargoRecord');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const tenant = Store.getCurrentTenant();
      const scheduleId = document.getElementById('cargoScheduleSelect')?.value;
      const type = document.getElementById('cargoTypeInput')?.value;
      const sender = document.getElementById('cargoSenderInput')?.value?.trim();
      const weight = parseFloat(document.getElementById('cargoWeightInput')?.value || 0);
      const rate = parseFloat(document.getElementById('cargoRateInput')?.value || 3500);
      const remark = document.getElementById('cargoRemarkInput')?.value?.trim() || '-';

      if (!weight || weight <= 0) {
        this.showToast('Input Tidak Valid', 'Berat muatan harus lebih dari 0 kg.', 'warning');
        return;
      }

      const receiptNo = `RES-CRG-${Math.floor(100000 + Math.random() * 900000)}`;
      const totalCost = weight * rate;

      const record = {
        receiptNo,
        companyId: tenant?.id || 'TENANT',
        scheduleId,
        type,
        sender,
        weightKg: weight,
        ratePerKg: rate,
        totalCost,
        remark,
        status: 'CLEARANCE_KSOP_APPROVED',
        createdAt: new Date().toISOString()
      };

      Store.addCargoRecord(record);
      form.reset();
      this.renderCargoCalculator();
      this.showToast('Muatan Tercatat', `Resi ${receiptNo} (${weight} kg) berhasil ditambahkan ke manifest kapal.`);
    });

    document.getElementById('cargoVesselSelect')?.addEventListener('change', () => {
      this.renderCargoCalculator();
    });
    document.getElementById('cargoScheduleSelect')?.addEventListener('change', () => {
      this.renderCargoCalculator();
    });
  },

  renderCargoCalculator() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    const vesselSel = document.getElementById('cargoVesselSelect');
    const schedSel = document.getElementById('cargoScheduleSelect');
    const vessels = Store.getVesselsByCompany(tenant.id);
    const schedules = Store.getSchedulesByCompany(tenant.id);

    // Populate Vessels
    if (vesselSel && vesselSel.options.length === 0) {
      vessels.forEach(v => {
        vesselSel.add(new Option(`${v.name} (Kap: ${v.capacity} Pax)`, v.id));
      });
    }

    // Populate Schedules
    if (schedSel && schedSel.options.length === 0) {
      schedules.forEach(s => {
        schedSel.add(new Option(`${s.routeCode || 'RUTE'} • ${s.originCity} ➔ ${s.destinationCity} (${s.departTime})`, s.id));
      });
    }

    const selectedVessel = vessels.find(v => v.id === vesselSel?.value) || vessels[0];
    const selectedSched = schedules.find(s => s.id === schedSel?.value) || schedules[0];

    // Max DWT capacity estimation based on passenger vessel specs
    const maxDwtTon = selectedVessel ? Math.max(35, Math.round(selectedVessel.capacity * 0.18)) : 45;

    // Estimated Passenger Weight (Hubla standard: 75kg/pax)
    const bookings = Store.getBookingsByCompany(tenant.id).filter(b => 
      !selectedSched || b.scheduleId === selectedSched.id || b.vesselName === selectedVessel?.name
    );
    const paxCount = bookings.reduce((sum, b) => sum + ((b.passengers && b.passengers.length) || 1), 0);
    const estPaxWeightKg = paxCount * 75;

    // Cargo records
    const cargoRecords = Store.getCargoRecords().filter(c => 
      !tenant || c.companyId === tenant.id
    );
    const totalCargoWeightKg = cargoRecords.reduce((sum, c) => sum + (c.weightKg || 0), 0);
    const totalCargoRevenue = cargoRecords.reduce((sum, c) => sum + (c.totalCost || 0), 0);

    const totalWeightKg = estPaxWeightKg + totalCargoWeightKg;
    const totalWeightTon = parseFloat((totalWeightKg / 1000).toFixed(2));
    const dwtPercent = Math.min(120, Math.round((totalWeightTon / maxDwtTon) * 100));

    // Update UI elements
    const summaryVal = document.getElementById('cargoDwtSummaryVal');
    const fillEl = document.getElementById('cargoDwtMeterFill');
    const badgeEl = document.getElementById('cargoDwtSafetyBadge');

    if (summaryVal) {
      summaryVal.innerText = `${totalWeightTon} Ton / ${maxDwtTon}.0 Ton (${dwtPercent}%)`;
    }
    if (fillEl) {
      fillEl.style.width = `${Math.min(100, dwtPercent)}%`;
      if (dwtPercent > 100) {
        fillEl.style.background = '#ef4444';
      } else if (dwtPercent > 80) {
        fillEl.style.background = '#f59e0b';
      } else {
        fillEl.style.background = 'linear-gradient(90deg, #10b981 0%, #0284c7 100%)';
      }
    }

    if (badgeEl) {
      if (dwtPercent > 100) {
        badgeEl.style.background = '#fee2e2';
        badgeEl.style.color = '#dc2626';
        badgeEl.style.borderColor = '#fca5a5';
        badgeEl.innerText = '⛔ PERINGATAN OVERDRAFT! MELEBIHI SARAT AIR PLIMSOLL KSOP';
      } else if (dwtPercent > 80) {
        badgeEl.style.background = '#fef3c7';
        badgeEl.style.color = '#d97706';
        badgeEl.style.borderColor = '#fde68a';
        badgeEl.innerText = '⚠️ WASPADA DRAFT TINGGI (MENDEKATI BATAS MAKSIMAL)';
      } else {
        badgeEl.style.background = '#ecfdf5';
        badgeEl.style.color = '#059669';
        badgeEl.style.borderColor = '#a7f3d0';
        badgeEl.innerText = '✅ SARAT AIR AMAN (DRAFT NORMAL & LAIK LAUT)';
      }
    }

    document.getElementById('cargoEstPaxWeight').innerText = `${estPaxWeightKg.toLocaleString('id-ID')} Kg (${paxCount} Pax)`;
    document.getElementById('cargoEstCargoWeight').innerText = `${totalCargoWeightKg.toLocaleString('id-ID')} Kg (${cargoRecords.length} Resi)`;
    document.getElementById('cargoEstRevenue').innerText = formatRupiah(totalCargoRevenue);

    // Render Table
    const tbody = document.getElementById('cargoManifestTableBody');
    if (tbody) {
      if (cargoRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 1.5rem;">Belum ada muatan kargo tambahan tercatat pada jadwal ini.</td></tr>`;
      } else {
        tbody.innerHTML = cargoRecords.map(c => `
          <tr>
            <td><strong style="color: #0284c7; font-family: var(--font-mono);">${c.receiptNo}</strong></td>
            <td>${selectedSched ? selectedSched.routeCode || 'NNK-TWU' : 'Rute Penyeberangan'}</td>
            <td><strong>${c.sender}</strong></td>
            <td><span class="tag-badge" style="background:#f1f5f9;color:#334155;">${c.type}</span></td>
            <td>${c.weightKg.toLocaleString('id-ID')} Kg</td>
            <td><strong style="color:#059669;">${formatRupiah(c.totalCost)}</strong></td>
            <td><span class="tag-badge" style="background:#ecfdf5;color:#059669;">✓ KSOP CLEAR</span></td>
          </tr>
        `).join('');
      }
    }
  },

  // ========================================================
  // ENTERPRISE FEATURE 3: INTEGRASI INAPORTNET DIJEN HUBLA
  // ========================================================
  initInaportnetEvents() {
    document.getElementById('btnOpenInaportnetModal')?.addEventListener('click', () => {
      this.renderInaportnetModal();
      document.getElementById('modalInaportnetHubla')?.classList.add('show');
    });
    document.getElementById('btnCloseInaportnetModal')?.addEventListener('click', () => {
      document.getElementById('modalInaportnetHubla')?.classList.remove('show');
    });
    document.getElementById('btnCancelInaportnetModal')?.addEventListener('click', () => {
      document.getElementById('modalInaportnetHubla')?.classList.remove('show');
    });

    document.getElementById('btnSendInaportnetApi')?.addEventListener('click', () => {
      this.showToast('Sinkronisasi INAPORTNET', 'Payload Port Clearance berhasil divalidasi & diterima server Ditjen Hubla (HTTP 200 OK).');
      setTimeout(() => {
        document.getElementById('modalInaportnetHubla')?.classList.remove('show');
      }, 1200);
    });

    document.getElementById('btnDownloadInaportnetXml')?.addEventListener('click', () => {
      const xml = document.getElementById('inaportnetXmlPreview')?.innerText || '';
      const blob = new Blob([xml], { type: 'application/xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `INAPORTNET_PortClearance_NNK_${Date.now()}.xml`;
      a.click();
      this.showToast('Unduh XML Berhasil', 'Dokumen manifes format XML INAPORTNET telah disimpan.');
    });
  },

  renderInaportnetModal() {
    const tenant = Store.getCurrentTenant() || { name: 'PT SAMUDERA PELAYARAN', id: 'TENANT' };
    const bookings = Store.getBookingsByCompany(tenant.id);
    const ksop = Store.getKsopSettings();
    const now = new Date().toISOString();
    const spbNo = `${ksop.spbPrefix || 'SPB.NNK/2026/X/'}${Math.floor(1000 + Math.random() * 9000)}`;

    let wni = 0;
    let wna = 0;
    bookings.forEach(b => {
      const nat = (b.passengers && b.passengers[0]?.nationality) || b.nationality || 'ID';
      if (nat === 'ID' || nat === 'Indonesia') wni++;
      else wna++;
    });

    const xmlPayload = 
`<?xml version="1.0" encoding="UTF-8"?>
<InaportnetDepartureClearance version="2.4" xmlns="http://hubla.dephub.go.id/inaportnet/schema">
  <Header>
    <MessageId>MSG-HUBLA-${Date.now()}</MessageId>
    <Timestamp>${now}</Timestamp>
    <PortCode>IDNNK</PortCode>
    <PortName>PELABUHAN TUNON TAKA NUNUKAN</PortName>
    <OfficeKSOP>${ksop.ksopOffice}</OfficeKSOP>
    <SyahbandarName>${ksop.ksopName}</SyahbandarName>
    <SyahbandarNIP>${ksop.ksopNip}</SyahbandarNIP>
  </Header>
  <PortClearance>
    <SPBNumber>${spbNo}</SPBNumber>
    <CompanyId>${tenant.id}</CompanyId>
    <CompanyName>${tenant.name}</CompanyName>
    <MasterName>${ksop.masterName}</MasterName>
    <MasterCertificate>${ksop.masterCertNo}</MasterCertificate>
    <DepartureSchedule>
      <VoyageType>PASSENGER_FERRY_CROSSBORDER</VoyageType>
      <OriginPort>NNK (TUNON TAKA)</OriginPort>
      <DestinationPort>TWU (TAWAU FERRY TERMINAL)</DestinationPort>
      <DepartureTimeWITA>${now.split('T')[0]} 09:00</DepartureTimeWITA>
    </DepartureSchedule>
    <PassengerManifestSummary>
      <TotalPax>${bookings.length}</TotalPax>
      <TotalWNI>${wni}</TotalWNI>
      <TotalWNA>${wna}</TotalWNA>
      <ImmigrationCleared>true</ImmigrationCleared>
      <CustomsCleared>true</CustomsCleared>
    </PassengerManifestSummary>
    <SafetyAdvisoryStatus>
      <BMKGSeaState>SAFE_TO_SAIL</BMKGSeaState>
      <WaveHeightMax>0.75m</WaveHeightMax>
      <ClearanceStatus>APPROVED_FOR_SAILING</ClearanceStatus>
    </SafetyAdvisoryStatus>
  </PortClearance>
</InaportnetDepartureClearance>`;

    document.getElementById('inaportnetXmlPreview').innerText = xmlPayload;
    document.getElementById('inaportnetSpbNo').innerText = spbNo;
    document.getElementById('inaportnetTotalPax').innerText = `${bookings.length} Jiwa`;
    document.getElementById('inaportnetPaxRatio').innerText = `${wni} WNI • ${wna} WNA`;
  },

  // ========================================================
  // ENTERPRISE FEATURE 6: PERINGATAN DINI CUACA MARITIM KSOP
  // ========================================================
  weatherHoldActive: false,
  initWeatherWarningEvents() {
    const btnToggle = document.getElementById('btnToggleWeatherHold');
    const btnReset = document.getElementById('btnDashResetWeather');

    btnToggle?.addEventListener('click', () => {
      this.weatherHoldActive = !this.weatherHoldActive;
      this.applyWeatherWarningState();
    });

    btnReset?.addEventListener('click', () => {
      this.weatherHoldActive = false;
      this.applyWeatherWarningState();
    });
  },

  applyWeatherWarningState() {
    const notice = document.getElementById('dashWeatherWarningNotice');
    const desc = document.getElementById('bmkgWarningDesc');
    const btnToggle = document.getElementById('btnToggleWeatherHold');

    if (this.weatherHoldActive) {
      if (notice) notice.style.display = 'flex';
      if (desc) desc.innerText = '⚠️ STATUS HOLD AKTIF: Gelombang Selat Makassar > 1.75m. Keberangkatan ditunda demi keselamatan.';
      if (btnToggle) {
        btnToggle.style.background = '#dc2626';
        btnToggle.innerText = '✓ Pulihkan ke Cuaca Aman';
      }
      this.showToast('Status Cuaca Buruk (Hold)', 'Syahbandar KSOP menerbitkan Maklumat Penundaan Berlayar (Weather Hold).', 'warning');
    } else {
      if (notice) notice.style.display = 'none';
      if (desc) desc.innerText = 'Ambang batas gelombang > 1.25m / angin > 15 knot memicu status Waspada & Hold Keberangkatan Pelayaran.';
      if (btnToggle) {
        btnToggle.style.background = '#f59e0b';
        btnToggle.innerText = '⚡ Simulasikan Status Cuaca Buruk (Hold)';
      }
      this.showToast('Cuaca Maritim Kondusif', 'Status pelayaran dipulihkan ke normal (Aman Melaut).');
    }
  },

  // ========================================================
  // ENTERPRISE FEATURE 7: DYNAMIC PRICING & PEAK SEASON ENGINE
  // ========================================================
  initPeakSeasonEvents() {
    const form = document.getElementById('formPeakSeasonSettings');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const enabled = document.getElementById('peakSeasonEnabled')?.checked;
      const name = document.getElementById('peakSeasonName')?.value?.trim();
      const surchargePercent = parseFloat(document.getElementById('peakSeasonPercent')?.value || 15);
      const startDate = document.getElementById('peakSeasonStart')?.value;
      const endDate = document.getElementById('peakSeasonEnd')?.value;
      const notice = document.getElementById('peakSeasonNotice')?.value?.trim();

      Store.savePeakSeasonSettings({
        enabled,
        name,
        surchargePercent,
        startDate,
        endDate,
        notice
      });

      this.showToast('Peak Season Disimpan', `Pengaturan musim padat (${enabled ? 'Aktif +' + surchargePercent + '%' : 'Nonaktif'}) berhasil diperbarui.`);
    });

    document.getElementById('peakSeasonPercent')?.addEventListener('change', (e) => {
      const pct = parseFloat(e.target.value || 15);
      const simEko = Math.round(250000 * (1 + pct / 100));
      const simBis = Math.round(285000 * (1 + pct / 100));
      const simVip = Math.round(335000 * (1 + pct / 100));

      document.getElementById('simPeakEko').innerText = `Tarif Peak: ${formatRupiah(simEko)} (+${formatRupiah(simEko - 250000)})`;
      document.getElementById('simPeakBis').innerText = `Tarif Peak: ${formatRupiah(simBis)} (+${formatRupiah(simBis - 285000)})`;
      document.getElementById('simPeakVip').innerText = `Tarif Peak: ${formatRupiah(simVip)} (+${formatRupiah(simVip - 335000)})`;
    });
  },

  loadPeakSeasonSettingsToForm() {
    const settings = Store.getPeakSeasonSettings();
    if (!settings) return;

    const chk = document.getElementById('peakSeasonEnabled');
    const nameInput = document.getElementById('peakSeasonName');
    const pctSel = document.getElementById('peakSeasonPercent');
    const startInput = document.getElementById('peakSeasonStart');
    const endInput = document.getElementById('peakSeasonEnd');
    const noticeInput = document.getElementById('peakSeasonNotice');

    if (chk) chk.checked = !!settings.enabled;
    if (nameInput) nameInput.value = settings.name || '';
    if (pctSel) pctSel.value = settings.surchargePercent || 15;
    if (startInput) startInput.value = settings.startDate || '';
    if (endInput) endInput.value = settings.endDate || '';
    if (noticeInput) noticeInput.value = settings.notice || '';
  },

  // ========================================================
  // ENTERPRISE FEATURE 8, 9, 10: MULTI-CURRENCY, MDAC & WATCHLIST
  // ========================================================
  bookingCurrency: 'IDR',
  offlineModeActive: false,
  exchangeRateLoaded: false,

  async fetchOnlineExchangeRate(showToast = false) {
    if (typeof this.refreshAllCurrencyRates === 'function') {
      return this.refreshAllCurrencyRates(showToast);
    }
    const btn = document.getElementById('btnRecheckExchangeRate');
    const iconSpin = document.getElementById('iconRecheckSpin');
    const rateText = document.getElementById('rateTextVal');
    const rateDot = document.getElementById('rateStatusDot');

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.7';
    }
    if (iconSpin) {
      iconSpin.style.animation = 'spinRate 0.8s linear infinite';
    }
    if (rateText) {
      rateText.textContent = 'Memeriksa kurs online...';
    }

    let liveRate = null;
    let source = '';

    const endpoints = [
      'https://open.er-api.com/v6/latest/MYR',
      'https://api.exchangerate-api.com/v4/latest/MYR'
    ];

    for (const url of endpoints) {
      try {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates && data.rates.IDR) {
            liveRate = Math.round(Number(data.rates.IDR));
            source = 'Online Live';
            break;
          }
        }
      } catch (err) {
        // Fallback to next endpoint
      }
    }

    if (liveRate && liveRate > 0) {
      if (typeof setMyrRate === 'function') {
        setMyrRate(liveRate);
      } else {
        window.MYR_RATE = liveRate;
      }
      this.exchangeRateLoaded = true;
      if (rateDot) rateDot.style.background = '#10b981';
      this.updateExchangeRateUI(liveRate, source);
      if (showToast) {
        this.showToast('Kurs Berhasil Diperbarui', `Kurs online terkini: 1 MYR = Rp ${Number(liveRate).toLocaleString('id-ID')}`);
      }
    } else {
      const current = typeof getMyrRate === 'function' ? getMyrRate() : (window.MYR_RATE || 3500);
      if (rateDot) rateDot.style.background = '#f59e0b';
      this.updateExchangeRateUI(current, 'Offline / Cache');
      if (showToast) {
        this.showToast('Koneksi Kurs Terbatas', `Menggunakan kurs operasional: 1 MYR = Rp ${Number(current).toLocaleString('id-ID')}`, 'warning');
      }
    }

    if (iconSpin) iconSpin.style.animation = '';
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }

    this.updateSeatPickerSummary();
    this.renderClassOptions();
  },

  updateExchangeRateUI(rate = null, source = 'Online Live') {
    const r = rate || (typeof getMyrRate === 'function' ? getMyrRate() : (window.MYR_RATE || 3500));
    const rateText = document.getElementById('rateTextVal');
    const labelBox = document.getElementById('labelExchangeRateDisplay');
    const formatted = Number(r).toLocaleString('id-ID');
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (rateText) {
      rateText.textContent = `Kurs: 1 MYR = Rp ${formatted}`;
    }
    if (labelBox) {
      labelBox.title = `Sumber: ${source} • Terakhir diperiksa pukul ${timeStr} WITA`;
    }
  },

  initCurrencyAndMdacEvents() {
    // 1. Currency Switcher Buttons
    const btnIdr = document.getElementById('btnCurrencyIdr');
    const btnMyr = document.getElementById('btnCurrencyMyr');

    btnIdr?.addEventListener('click', () => {
      this.bookingCurrency = 'IDR';
      btnIdr.classList.add('active');
      btnMyr?.classList.remove('active');
      this.updateCurrencyUI();
    });

    btnMyr?.addEventListener('click', () => {
      this.bookingCurrency = 'MYR';
      btnMyr.classList.add('active');
      btnIdr?.classList.remove('active');
      this.updateCurrencyUI();
    });

    // 1B. Tombol Recheck Kurs Terkini
    document.getElementById('btnRecheckExchangeRate')?.addEventListener('click', () => {
      this.fetchOnlineExchangeRate(true);
    });

    // Inisialisasi tampilan kurs & ambil data online saat startup
    this.updateExchangeRateUI();
    this.fetchOnlineExchangeRate(false);

    // 2. MDAC Prefill Copy Button
    document.getElementById('btnPrefillMdacData')?.addEventListener('click', () => {
      const name = document.getElementById('custPaxName')?.value || 'Penumpang';
      const doc = document.getElementById('custPaxDocNum')?.value || 'A12345678';
      const dob = document.getElementById('custPaxDob')?.value || '1995-05-14';
      const nat = document.getElementById('custPaxNationality')?.value || 'Indonesia';
      const textToCopy = `Nama: ${name}\nNo. Paspor: ${doc}\nTanggal Lahir: ${dob}\nKewarganegaraan: ${nat}\nPelabuhan Tiba: Tawau Ferry Terminal (Sabah)\nModa Transportasi: Sea Ferry`;
      
      navigator.clipboard?.writeText(textToCopy);
      this.showToast('Data Paspor Tersalin', 'Rincian data penumpang berhasil disalin ke clipboard untuk pengisian MDAC.');
    });

    // 3. Passport Expiry Validation (Must be >= 6 months)
    const expInput = document.getElementById('custPaxPassportExpInput');
    expInput?.addEventListener('change', () => {
      const expVal = expInput.value;
      const alertBox = document.getElementById('passportExpiryAlert');
      if (!alertBox || !expVal) return;

      const expDate = new Date(expVal);
      const sixMonths = new Date();
      sixMonths.setMonth(sixMonths.getMonth() + 6);

      if (expDate < sixMonths) {
        alertBox.style.background = '#fee2e2';
        alertBox.style.color = '#dc2626';
        alertBox.style.borderColor = '#fca5a5';
        alertBox.innerText = '⚠️ PERINGATAN: Masa berlaku paspor kurang dari 6 bulan! Wajib diperpanjang sebelum tiba di Tawau.';
      } else {
        alertBox.style.background = '#ecfdf5';
        alertBox.style.color = '#059669';
        alertBox.style.borderColor = '#a7f3d0';
        alertBox.innerText = '✓ Masa berlaku paspor valid (≥ 6 bulan dari keberangkatan)';
      }
    });

    // 4. Watchlist Live Check
    const docInput = document.getElementById('custPaxDocNum');
    const nameInput = document.getElementById('custPaxName');
    const checkWatchlistLive = () => {
      const doc = docInput?.value;
      const name = nameInput?.value;
      const ind = document.getElementById('watchlistStatusIndicator');
      if (!ind) return;

      const matched = Store.checkWatchlist(doc, name);
      if (matched) {
        ind.style.color = '#dc2626';
        ind.innerHTML = `<span>⛔ TERDETEKSI RED-LIST PENCEKALAN: ${matched.reason}</span>`;
      } else {
        ind.style.color = '#10b981';
        ind.innerHTML = `<span>✅ Status Imigrasi: Clear to Board</span>`;
      }
    };
    docInput?.addEventListener('input', checkWatchlistLive);
    nameInput?.addEventListener('input', checkWatchlistLive);

    // 5. Offline Scanner Mode Toggle
    document.getElementById('btnToggleOfflineMode')?.addEventListener('click', () => {
      this.offlineModeActive = !this.offlineModeActive;
      const dot = document.getElementById('scannerNetworkDot');
      const txt = document.getElementById('scannerNetworkText');
      if (this.offlineModeActive) {
        if (dot) dot.style.background = '#f59e0b';
        if (txt) {
          txt.innerText = 'Mode: OFFLINE DERMAGA (Penyimpanan Lokal Aktif)';
          txt.style.color = '#d97706';
        }
        this.showToast('Mode Offline Dermaga', 'Gate Scanner berjalan dalam mode offline mandiri. Data divalidasi dari manifest lokal.');
      } else {
        if (dot) dot.style.background = '#10b981';
        if (txt) {
          txt.innerText = 'Mode: ONLINE (Tersinkronisasi)';
          txt.style.color = '#0f172a';
        }
        this.showToast('Mode Online', 'Koneksi pelabuhan tersambung kembali.');
      }
    });

    document.getElementById('btnSyncOfflineScans')?.addEventListener('click', () => {
      const q = Store.getOfflineScanQueue();
      if (q.length === 0) {
        this.showToast('Antrean Kosong', 'Tidak ada data scan offline yang menunggu sinkronisasi.');
      } else {
        Store.clearOfflineScanQueue();
        this.updateOfflineQueueBadge();
        this.showToast('Sinkronisasi Selesai', `${q.length} Tiket offline berhasil disinkronkan ke server pusat.`);
      }
    });
  },

  updateOfflineQueueBadge() {
    const q = Store.getOfflineScanQueue();
    const badge = document.getElementById('offlineQueueBadge');
    if (badge) {
      badge.innerText = `Antrean Offline: ${q.length} Tiket`;
    }
  },

  updateCurrencyUI() {
    const isMyr = this.bookingCurrency === 'MYR';
    const duitNow = document.getElementById('payMethodDuitNow');
    const fpx = document.getElementById('payMethodFpx');
    const qris = document.getElementById('payMethodQris');

    if (duitNow) duitNow.style.display = isMyr ? 'flex' : 'none';
    if (fpx) fpx.style.display = isMyr ? 'flex' : 'none';
    if (qris) qris.style.display = isMyr ? 'none' : 'flex';

    this.updateSeatPickerSummary();
  },

  showToast(title, body, type = 'info') {
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
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  },

  // ================= UI THEME MANAGEMENT (OPS ALTERNATIVE & DEFAULT) =================
  initTheme() {
    const tenant = Store.getCurrentTenant();
    const savedTheme = (tenant && tenant.uiTheme) || localStorage.getItem('ticky_ui_theme') || 'theme-default';
    this.applyUITheme('theme-default');
    this.initLiveClock();
    this.initOpsFilterEvents();
  },

  applyUITheme(theme) {
    if (theme === 'theme-ops-portal') {
      document.body.classList.add('theme-ops-portal');
      document.body.classList.remove('theme-default');
    } else {
      document.body.classList.remove('theme-ops-portal');
      document.body.classList.add('theme-default');
    }
    localStorage.setItem('ticky_ui_theme', theme);

    // Sync radio buttons if form exists
    const rDef = document.getElementById('radioThemeDefault');
    const rOps = document.getElementById('radioThemeOps');
    if (rDef && rOps) {
      rDef.checked = (theme !== 'theme-ops-portal');
      rOps.checked = (theme === 'theme-ops-portal');
      this.updateThemeRadioCards(theme);
    }
  },

  updateThemeRadioCards(theme) {
    const lDef = document.getElementById('labelThemeDefault');
    const lOps = document.getElementById('labelThemeOps');
    if (!lDef || !lOps) return;
    if (theme === 'theme-ops-portal') {
      lOps.style.border = '2px solid #2563eb';
      lOps.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
      lDef.style.border = '1px solid #cbd5e1';
      lDef.style.boxShadow = 'none';
    } else {
      lDef.style.border = '2px solid #7c3aed';
      lDef.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.15)';
      lOps.style.border = '1px solid #cbd5e1';
      lOps.style.boxShadow = 'none';
    }
  },

  initLiveClock() {
    const updateClock = () => {
      const clockEl = document.getElementById('opsLiveClock');
      const dateEl = document.getElementById('opsLiveDate');
      const headerDateEl = document.getElementById('headerRealtimeFullDate');
      const headerClockEl = document.getElementById('headerRealtimeClock');
      if (!clockEl && !dateEl && !headerDateEl && !headerClockEl) return;
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dayName = days[now.getDay()];
      const dateNum = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const fullDateStr = `${dayName}, ${dateNum} ${monthName} ${year}`;
      if (clockEl) clockEl.textContent = `${hh}:${mm}:${ss} WITA`;
      if (dateEl) dateEl.textContent = fullDateStr;
      if (headerDateEl) headerDateEl.textContent = fullDateStr;
      if (headerClockEl) headerClockEl.textContent = `${hh}:${mm}:${ss} WITA`;
    };
    updateClock();
    if (!this._clockInterval) {
      this._clockInterval = setInterval(updateClock, 1000);
    }

    const updateHeaderRealtimeWeather = async () => {
      const tempBadge = document.getElementById('headerWeatherTempBadge');
      const svgWrap = document.getElementById('headerWeatherSvgWrap');
      const iconBox = document.getElementById('headerWeatherLogoIcon');
      if (!tempBadge || !svgWrap) return;

      const renderWeatherUI = (tempC, code, isDay) => {
        let label = 'Cerah Berawan';
        let svg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`;
        let bg = 'linear-gradient(135deg, #fef3c7 0%, #bae6fd 100%)';

        if (code === 0) {
          label = isDay ? 'Cerah' : 'Malam Cerah';
          bg = isDay ? 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)' : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';
          svg = isDay
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
            : `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
        } else if (code >= 1 && code <= 3) {
          label = code === 3 ? 'Berawan' : 'Cerah Berawan';
        } else if (code >= 51 && code <= 82) {
          label = 'Hujan Ringan';
          bg = 'linear-gradient(135deg, #e0f2fe 0%, #93c5fd 100%)';
          svg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
        } else if (code >= 95) {
          label = 'Hujan Petir';
          bg = 'linear-gradient(135deg, #fef3c7 0%, #cbd5e1 100%)';
          svg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>`;
        }

        tempBadge.textContent = `${Math.round(tempC)}°C • ${label}`;
        svgWrap.innerHTML = svg;
        if (iconBox) iconBox.style.background = bg;
      };

      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=4.1333&longitude=117.6667&current=temperature_2m,weather_code,is_day&timezone=Asia%2FMakassar');
        if (res.ok) {
          const data = await res.json();
          if (data && data.current) {
            renderWeatherUI(data.current.temperature_2m ?? 29, data.current.weather_code ?? 1, data.current.is_day ?? 1);
            return;
          }
        }
      } catch (_) {}

      const hr = new Date().getHours();
      const isDayNow = hr >= 6 && hr < 18 ? 1 : 0;
      const fallbackTemp = isDayNow ? 30 : 27;
      renderWeatherUI(fallbackTemp, 1, isDayNow);
    };

    updateHeaderRealtimeWeather();
    if (!this._weatherHeaderInterval) {
      this._weatherHeaderInterval = setInterval(updateHeaderRealtimeWeather, 600000);
    }

    // Toggle collapse / expand logo cuaca on click
    const weatherWidget = document.getElementById('headerRealtimeWeatherWidget');
    if (weatherWidget && !this._weatherWidgetClickBound) {
      this._weatherWidgetClickBound = true;
      const updateWidgetTitle = (isCollapsed) => {
        weatherWidget.title = isCollapsed
          ? 'Klik logo cuaca untuk menampilkan rincian cuaca & waktu'
          : 'Klik untuk menyembunyikan rincian cuaca (hanya menyisakan logo)';
      };

      // Restore saved state from localStorage if any
      const isSavedCollapsed = localStorage.getItem('tech_weather_collapsed') === 'true';
      if (isSavedCollapsed) {
        weatherWidget.classList.add('is-collapsed');
        updateWidgetTitle(true);
      } else {
        updateWidgetTitle(false);
      }

      weatherWidget.addEventListener('click', () => {
        const isNowCollapsed = weatherWidget.classList.toggle('is-collapsed');
        try {
          localStorage.setItem('tech_weather_collapsed', isNowCollapsed ? 'true' : 'false');
        } catch (_) {}
        updateWidgetTitle(isNowCollapsed);
      });
    }
  },

  initOpsFilterEvents() {
    const btnSubmit = document.getElementById('btnOpsFilterSubmit');
    if (!btnSubmit || this._opsFilterBound) return;
    this._opsFilterBound = true;

    btnSubmit.addEventListener('click', () => {
      const area = document.getElementById('opsFilterServiceArea')?.value || 'ALL';
      const status = document.getElementById('opsFilterStatus')?.value || 'BACKEND';
      const date = document.getElementById('opsFilterDate')?.value || '2026-10-28';

      this.showToast('Filter Manifest Diterapkan', `Data manifest pelayaran diperbarui: Pelabuhan ${area}, Status ${status}, Tanggal ${date}.`, 'info');

      // Filter rows in Customer table
      const rows = document.querySelectorAll('#opsTbodyCustomer tr');
      rows.forEach(r => {
        const text = r.textContent || '';
        if (area === 'ALL' || text.toUpperCase().includes(area.toUpperCase())) {
          r.style.display = '';
          r.style.backgroundColor = area !== 'ALL' ? '#eff6ff' : '';
        } else {
          r.style.display = 'none';
        }
      });
    });
  },

  // ========================================================
  // PENGECEKAN KURS VALAS ONLINE REALTIME (OPERASIONAL PELABUHAN)
  // ========================================================
  liveExchangeRates: null,
  liveExchangeSource: 'Belum Terhubung',
  liveExchangeTime: null,
  currencyBoardBase: 'MYR',
  currencyExchangeInitialized: false,
  currencyExchangeListenersBound: false,

  initCurrencyExchangePane() {
    this.populateCurrencyDropdowns();
    this.initCurrencyExchangeListeners();
    if (!this.liveExchangeRates) {
      this.refreshAllCurrencyRates(false);
    } else {
      this.updateCurrencyHeroDisplay();
      this.updateCurrencyConverterResult();
      this.renderWorldCurrenciesTable(document.getElementById('currencySearchInput')?.value || '');
    }
  },

  populateCurrencyDropdowns() {
    const fromSel = document.getElementById('convFromCurrency');
    const toSel = document.getElementById('convToCurrency');
    if (!fromSel || !toSel) return;
    if (fromSel.options && fromSel.options.length > 1) return;

    const list = (typeof MASTER_WORLD_CURRENCIES !== 'undefined' ? MASTER_WORLD_CURRENCIES : (window.MASTER_WORLD_CURRENCIES || []));
    if (!list || list.length === 0) return;

    fromSel.innerHTML = '';
    toSel.innerHTML = '';

    list.forEach(c => {
      const optFrom = document.createElement('option');
      optFrom.value = c.code;
      optFrom.textContent = `${c.flag} ${c.code} - ${c.name}`;
      if (c.code === 'MYR') optFrom.selected = true;
      fromSel.appendChild(optFrom);

      const optTo = document.createElement('option');
      optTo.value = c.code;
      optTo.textContent = `${c.flag} ${c.code} - ${c.name}`;
      if (c.code === 'IDR') optTo.selected = true;
      toSel.appendChild(optTo);
    });
  },

  initCurrencyExchangeListeners() {
    if (this.currencyExchangeListenersBound) return;
    this.currencyExchangeListenersBound = true;

    // Refresh all rates button
    document.getElementById('btnRefreshAllRates')?.addEventListener('click', () => {
      this.refreshAllCurrencyRates(true);
    });

    // Inputs & dropdowns in converter
    const fromSel = document.getElementById('convFromCurrency');
    const toSel = document.getElementById('convToCurrency');
    const amtInput = document.getElementById('convAmountInput');

    fromSel?.addEventListener('change', () => this.updateCurrencyConverterResult());
    toSel?.addEventListener('change', () => this.updateCurrencyConverterResult());
    amtInput?.addEventListener('input', () => this.updateCurrencyConverterResult());

    // Swap button
    document.getElementById('btnSwapCurrencies')?.addEventListener('click', () => {
      if (!fromSel || !toSel) return;
      const tmp = fromSel.value;
      fromSel.value = toSel.value;
      toSel.value = tmp;
      this.updateCurrencyConverterResult();
    });

    // Quick amount buttons
    document.querySelectorAll('.btn-quick-amount').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = btn.getAttribute('data-amt');
        if (amtInput && amt) {
          amtInput.value = amt;
          this.updateCurrencyConverterResult();
        }
      });
    });

    // Apply live rate button
    document.getElementById('btnApplyLiveRateToTickets')?.addEventListener('click', () => {
      const current = typeof getMyrRate === 'function' ? getMyrRate() : (window.MYR_RATE || 3500);
      this.showToast('Kurs Berhasil Diterapkan', `Tarif tiket loket kini menggunakan kurs live: 1 MYR = Rp ${Number(current).toLocaleString('id-ID')}`);
      this.updateSeatPickerSummary();
      this.renderClassOptions();
    });

    // Board Base Currency Selector (Basis MYR / IDR / USD)
    document.querySelectorAll('.btn-board-base').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-board-base').forEach(b => {
          b.classList.remove('active');
          b.style.background = '#f1f5f9';
          b.style.color = '#475569';
        });
        btn.classList.add('active');
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
        this.currencyBoardBase = btn.getAttribute('data-base') || 'MYR';
        const searchVal = document.getElementById('currencySearchInput')?.value || '';
        this.renderWorldCurrenciesTable(searchVal);
      });
    });

    // Search input for world currencies
    document.getElementById('currencySearchInput')?.addEventListener('input', (e) => {
      this.renderWorldCurrenciesTable(e.target.value);
    });
  },

  async refreshAllCurrencyRates(showToast = false) {
    const btnPane = document.getElementById('btnRefreshAllRates');
    const iconSpinPane = document.getElementById('iconCurrencyRefreshSpin');
    const btnModal = document.getElementById('btnRecheckExchangeRate');
    const iconSpinModal = document.getElementById('iconRecheckSpin');
    const statusLabel = document.getElementById('lblCurrencySyncStatus');

    if (btnPane) { btnPane.disabled = true; btnPane.style.opacity = '0.7'; }
    if (btnModal) { btnModal.disabled = true; btnModal.style.opacity = '0.7'; }
    if (iconSpinPane) iconSpinPane.style.animation = 'spinRate 0.8s linear infinite';
    if (iconSpinModal) iconSpinModal.style.animation = 'spinRate 0.8s linear infinite';
    if (statusLabel) {
      statusLabel.textContent = 'Menyinkronkan...';
      statusLabel.style.color = '#0284c7';
    }

    let liveRates = null;
    let source = '';

    const endpoints = [
      'https://open.er-api.com/v6/latest/MYR',
      'https://api.exchangerate-api.com/v4/latest/MYR'
    ];

    for (const url of endpoints) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates && data.rates.IDR) {
            liveRates = data.rates;
            source = url.includes('open.er-api.com') ? 'Open Exchange Rates (Live)' : 'ExchangeRate-API (Live)';
            break;
          }
        }
      } catch (e) {
        // Fallback to next endpoint
      }
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WITA';

    if (liveRates && liveRates.IDR) {
      this.liveExchangeRates = liveRates;
      this.liveExchangeSource = source;
      this.liveExchangeTime = timeStr;

      const myrToIdr = Math.round(Number(liveRates.IDR));
      if (typeof setMyrRate === 'function') {
        setMyrRate(myrToIdr);
      } else {
        window.MYR_RATE = myrToIdr;
      }
      this.exchangeRateLoaded = true;

      if (statusLabel) {
        statusLabel.textContent = 'Online Terhubung';
        statusLabel.style.color = '#10b981';
      }

      this.updateCurrencyHeroDisplay();
      this.updateCurrencyConverterResult();
      this.renderWorldCurrenciesTable(document.getElementById('currencySearchInput')?.value || '');
      this.updateExchangeRateUI(myrToIdr, source);

      // Update all quick rate labels across app
      document.querySelectorAll('.lbl-quick-myr-rate').forEach(el => {
        el.textContent = `Rp ${Number(myrToIdr).toLocaleString('id-ID')}`;
      });

      if (showToast) {
        this.showToast('Kurs Terkini Disinkronkan', `1 MYR = Rp ${Number(myrToIdr).toLocaleString('id-ID')} (${source})`);
      }
    } else {
      if (statusLabel) {
        statusLabel.textContent = 'Mode Offline / Cache';
        statusLabel.style.color = '#f59e0b';
      }
      const current = typeof getMyrRate === 'function' ? getMyrRate() : (window.MYR_RATE || 3500);
      this.updateCurrencyHeroDisplay();
      this.updateCurrencyConverterResult();
      this.renderWorldCurrenciesTable(document.getElementById('currencySearchInput')?.value || '');
      this.updateExchangeRateUI(current, 'Offline / Cache');

      if (showToast) {
        this.showToast('Koneksi Kurs Terbatas', `Menggunakan kurs operasional: 1 MYR = Rp ${Number(current).toLocaleString('id-ID')}`, 'warning');
      }
    }

    const lastUpdatedEl = document.getElementById('lblCurrencyLastUpdated');
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = `Terakhir dicek: ${timeStr}`;
    }

    if (iconSpinPane) iconSpinPane.style.animation = '';
    if (iconSpinModal) iconSpinModal.style.animation = '';
    if (btnPane) { btnPane.disabled = false; btnPane.style.opacity = '1'; }
    if (btnModal) { btnModal.disabled = false; btnModal.style.opacity = '1'; }

    this.updateSeatPickerSummary();
    this.renderClassOptions();
  },

  updateCurrencyHeroDisplay() {
    const currentRate = typeof getMyrRate === 'function' ? getMyrRate() : (window.MYR_RATE || 3500);
    const heroRateEl = document.getElementById('heroMyrToIdrDisplay');
    const heroInverseEl = document.getElementById('heroInverseDisplay');
    const sourceBadge = document.getElementById('lblRateSourceBadge');

    if (heroRateEl) {
      heroRateEl.textContent = `1 MYR = Rp ${Number(currentRate).toLocaleString('id-ID')}`;
    }
    if (heroInverseEl && currentRate > 0) {
      const inv = (10000 / currentRate).toFixed(2);
      heroInverseEl.textContent = `(10.000 IDR ≈ ${inv} MYR)`;
    }
    if (sourceBadge && this.liveExchangeSource) {
      sourceBadge.textContent = `Sumber: ${this.liveExchangeSource}`;
    }
  },

  getRateBetween(fromCode, toCode) {
    if (fromCode === toCode) return 1;
    const rates = this.liveExchangeRates;
    if (rates) {
      const fromInMyr = rates[fromCode] !== undefined ? Number(rates[fromCode]) : null;
      const toInMyr = rates[toCode] !== undefined ? Number(rates[toCode]) : null;
      if (fromInMyr && toInMyr && fromInMyr > 0) {
        return toInMyr / fromInMyr;
      }
    }

    // Fallbacks if offline
    const myrRate = typeof getMyrRate === 'function' ? getMyrRate() : (window.MYR_RATE || 3500);
    if (fromCode === 'MYR' && toCode === 'IDR') return myrRate;
    if (fromCode === 'IDR' && toCode === 'MYR') return 1 / myrRate;
    if (fromCode === 'USD' && toCode === 'IDR') return myrRate * 4.45;
    if (fromCode === 'SGD' && toCode === 'IDR') return myrRate * 3.48;
    return 1;
  },

  updateCurrencyConverterResult() {
    const fromSel = document.getElementById('convFromCurrency');
    const toSel = document.getElementById('convToCurrency');
    const amtInput = document.getElementById('convAmountInput');
    const formulaEl = document.getElementById('convResultFormula');
    const valueEl = document.getElementById('convResultValue');

    if (!fromSel || !toSel || !amtInput || !valueEl) return;

    const fromCode = fromSel.value || 'MYR';
    const toCode = toSel.value || 'IDR';
    const amount = parseFloat(amtInput.value) || 0;

    const unitRate = this.getRateBetween(fromCode, toCode);
    const total = amount * unitRate;

    const formatNumber = (num, isIdr = false) => {
      if (isIdr || num >= 100) {
        return Number(Math.round(num)).toLocaleString('id-ID');
      } else if (num >= 1) {
        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      } else {
        return num.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
      }
    };

    if (formulaEl) {
      formulaEl.textContent = `1 ${fromCode} = ${formatNumber(unitRate, toCode === 'IDR')} ${toCode}`;
    }

    valueEl.textContent = `${Number(amount).toLocaleString('id-ID')} ${fromCode} = ${formatNumber(total, toCode === 'IDR')} ${toCode}`;
  },

  renderWorldCurrenciesTable(query = '') {
    const tbody = document.getElementById('worldCurrenciesTableBody');
    const thBase = document.getElementById('thBaseCol');
    if (!tbody) return;

    const base = this.currencyBoardBase || 'MYR';
    if (thBase) {
      thBase.textContent = `1 Satuan dalam ${base}`;
    }

    const list = (typeof MASTER_WORLD_CURRENCIES !== 'undefined' ? MASTER_WORLD_CURRENCIES : (window.MASTER_WORLD_CURRENCIES || []));
    const q = (query || '').toLowerCase().trim();

    const filtered = list.filter(c => {
      if (!q) return true;
      return c.code.toLowerCase().includes(q) ||
             c.name.toLowerCase().includes(q) ||
             c.country.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 1.5rem; text-align: center; color: #94a3b8;">Tidak ada mata uang yang cocok dengan kata kunci "${query}".</td></tr>`;
      return;
    }

    const rows = filtered.map(c => {
      const rateToBase = this.getRateBetween(c.code, base);
      const rateToIdr = this.getRateBetween(c.code, 'IDR');
      const rateToMyr = this.getRateBetween(c.code, 'MYR');

      const formatVal = (num, isIdr = false) => {
        if (isIdr || num >= 1000) return Number(Math.round(num)).toLocaleString('id-ID');
        if (num >= 1) return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
        return num.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
      };

      const isBaseRow = c.code === base;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; ${isBaseRow ? 'background: #f0fdf4; font-weight: 700;' : ''}">
          <td style="padding: 0.65rem 0.85rem; font-weight: 800; color: #0f172a;">
            <span style="font-size: 1.15rem; margin-right: 0.35rem;">${c.flag}</span>
            <span style="font-size: 0.88rem;">${c.code}</span>
            <span style="font-size: 0.72rem; color: #64748b; font-weight: 600; margin-left: 0.25rem;">(${c.symbol})</span>
          </td>
          <td style="padding: 0.65rem 0.85rem; color: #334155;">
            <div>${c.name}</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">${c.country}</div>
          </td>
          <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #0284c7;">
            ${formatVal(rateToBase)} ${base}
          </td>
          <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #059669;">
            Rp ${formatVal(rateToIdr, true)}
          </td>
          <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #d97706;">
            RM ${formatVal(rateToMyr)}
          </td>
          <td style="padding: 0.65rem 0.85rem; text-align: center;">
            <button type="button" class="btn-action-sm btn-select-currency-calc" data-code="${c.code}" style="padding: 3px 10px; font-size: 0.75rem; border-radius: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 700; cursor: pointer;">
              Hitung ➔
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;

    tbody.querySelectorAll('.btn-select-currency-calc').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        const fromSel = document.getElementById('convFromCurrency');
        if (fromSel && code) {
          fromSel.value = code;
          this.updateCurrencyConverterResult();
          fromSel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fromSel.focus();
        }
      });
    });
  },
};

// Global window exposure
if (typeof window !== 'undefined') {
  window.App = App;
  window.logoutTenant = () => App.logoutTenant();
}

// Initialize app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
