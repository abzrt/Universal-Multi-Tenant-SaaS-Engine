// ========================================================
// TECH SOLUTION - TICKETING SERVICES PLATFORM ENGINE
// ========================================================

const App = {
  activeView: 'weatherHome', // 'weatherHome' | 'companyDashboard'
  selectedCompanyFilter: 'ALL',
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
    activeTab: 'PASTE',
    paxList: [],
    manualGridRows: []
  },
  directPrintState: {
    items: [],
    currentFormat: 'BOARDING_PASS' // 'BOARDING_PASS' | 'THERMAL_POS'
  },

  init() {
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
    document.getElementById('tabBtnLogin')?.click();
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

      // Interactive 3D Cursor Tilt & Magnetic Depth on Tech Solution Logo
      const logoWrap = document.getElementById('brandLogoWrap');
      const logoImg = document.getElementById('brandLogoImg');
      if (logoWrap) {
        brandHome.addEventListener('mousemove', (e) => {
          const rect = logoWrap.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const deltaX = (e.clientX - centerX) / (rect.width / 2);
          const deltaY = (e.clientY - centerY) / (rect.height / 2);

          const tiltX = -deltaY * 18;
          const tiltY = deltaX * 18;

          logoWrap.style.transform = `perspective(500px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg) translateY(-3px) scale(1.1)`;
          if (logoImg) {
            logoImg.style.transform = `translateZ(25px) scale(1.15) translate(${(deltaX * 3).toFixed(1)}px, ${(deltaY * 3).toFixed(1)}px)`;
          }
        });

        brandHome.addEventListener('mouseleave', () => {
          logoWrap.style.transform = '';
          if (logoImg) logoImg.style.transform = '';
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
      const minPrice = (sch.classes && sch.classes.length > 0) ? Math.min(...sch.classes.map(c => c.price)) : (sch.priceEconomy || 250000);
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

    const isIntl = Boolean(
      origPort?.id === 'TWU' ||
      destPort?.id === 'TWU' ||
      (comp?.category && (comp.category.toLowerCase().includes('tawau') || comp.category.toLowerCase().includes('internasional')))
    );

    const elVessel = document.getElementById('bookModalVessel');
    if (elVessel) elVessel.innerText = `${vesselName}`;
    const elComp = document.getElementById('bookModalCompany');
    if (elComp) elComp.innerText = `Operator Resmi: ${comp.name} • ${comp.category || 'Pelayaran'}`;

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
    const basePrice = (sch.classes && sch.classes[0]) ? sch.classes[0].price : (sch.priceEconomy || 250000);
    this.bookingClasses = [
      { name: 'Ekonomi (Main Deck)', price: basePrice, sub: 'Kursi Nyaman Ber-AC, Free Bagasi 20kg' },
      { name: 'Bisnis / Executive (Upper Deck)', price: basePrice + 75000, sub: 'Upper Deck View, Snack & Reclining Seat' },
      { name: 'VIP Stateroom (Private Cabin)', price: basePrice + 175000, sub: 'Kabin Eksklusif Privat, Sofa Bed & Port Priority' }
    ];

    this.renderClassOptions();
    this.renderSeatPickerGrid();
    this.updateSeatPickerSummary();

    document.getElementById('modalCustomerBooking')?.classList.add('show');
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

    const paxType = document.getElementById('custPaxType')?.value || 'Dewasa';
    const paxName = document.getElementById('custPaxName')?.value?.trim() || '';
    const gender = document.getElementById('custPaxGender')?.value || 'L';
    const docNum = document.getElementById('custPaxDocNum')?.value?.trim() || '';
    const dob = document.getElementById('custPaxDob')?.value || '';
    const age = document.getElementById('custPaxAge')?.value || '';
    const nationality = document.getElementById('custPaxNationality')?.value || 'ID';
    const remark = document.getElementById('custPaxRemark')?.value?.trim() || '-';
    const docType = document.getElementById('custDocType')?.value || 'PASSPORT_RI';
    const passportExp = document.getElementById('custPaxPassportExp')?.value || '';
    const paxPhone = document.getElementById('custPaxPhone')?.value?.trim() || '';
    const paxEmail = document.getElementById('custPaxEmail')?.value?.trim() || '';

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
    document.getElementById('modalCustomerBooking')?.classList.remove('show');

    // Open Boarding Pass Modal
    this.refreshCompanyDashboard();
    this.openBoardingPassModal(newBooking);
    this.showToast('Tiket Berhasil Diterbitkan!', `Tiket resmi ${comp.name} berhasil diterbitkan (PNR: ${pnr}).`);
  },

  openBoardingPassModal(booking) {
    if (!booking) return;
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

    const natLabel = p0.nationality === 'MY' ? '🇲🇾 WNA (Malaysia)' : (p0.nationality === 'OTHER' ? '🌏 WNA (Foreigner)' : '🇮🇩 WNI (Indonesia)');
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

    // Attach WhatsApp send handler
    const btnWa = document.getElementById('btnSendTicketWhatsapp');
    if (btnWa) {
      btnWa.onclick = () => {
        const phone = booking.contact?.phone || 'Nomor Penumpang';
        this.showToast('Kirim ke WhatsApp', `E-Boarding Pass & QR Code (PNR: ${booking.pnr}) berhasil disiapkan ke WhatsApp ${phone}.`);
      };
    }

    document.getElementById('modalCustomerTicket')?.classList.add('show');
  },

  // Render Dynamic Entry Portal Buttons for Registered Companies
  renderCompanyAuthButtons() {
    const grid = document.getElementById('demoButtonsGrid');
    if (!grid) return;
    const companies = Store.getCompanies();
    grid.innerHTML = '';

    if (companies.length === 0) {
      grid.innerHTML = `
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-md); padding: 0.85rem 1rem; color: #64748b; font-size: 0.83rem; line-height: 1.5; grid-column: 1 / -1;">
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

    // Login Form Submit
    document.getElementById('formCompanyLogin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginCompEmail')?.value?.trim();
      const pass = document.getElementById('loginCompPassword')?.value;

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
        departDate: new Date().toISOString().split('T')[0],
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

  // Helper function to switch tabs in company dashboard
  switchDashboardTab(tabKey) {
    document.querySelectorAll('.dash-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dash-tab-btn').forEach(b => {
      if (b.getAttribute('data-tab') === tabKey) {
        b.classList.add('active');
        const parentGroup = b.closest('.dash-nav-group');
        if (parentGroup) parentGroup.classList.add('open');
      } else {
        b.classList.remove('active');
      }
    });

    // Update Top Header Breadcrumb Title
    const titleEl = document.getElementById('tickyCurrentTabTitle');
    const tabTitles = {
      tabOverview: 'Dashboard Loket',
      tabManifest: 'Tagihan & Riwayat Tiket',
      tabTicketing: 'Terbitkan Tiket Baru',
      tabFleet: 'Armada Kapal Saya',
      tabSchedules: 'Daftar Rute & Jadwal',
      tabCalendar: 'Kalender Pelayaran',
      tabScanner: 'Gate Scanner QR',
      tabSeats: 'Denah Kursi & Seat',
      tabSettings: 'Pengaturan KSOP & Pejabat'
    };
    if (titleEl && tabTitles[tabKey]) {
      titleEl.innerText = tabTitles[tabKey];
    }

    if (tabKey === 'tabOverview') document.getElementById('paneOverview')?.classList.add('active');
    if (tabKey === 'tabFleet') document.getElementById('paneFleet')?.classList.add('active');
    if (tabKey === 'tabSchedules') document.getElementById('paneSchedules')?.classList.add('active');
    if (tabKey === 'tabManifest') document.getElementById('paneManifest')?.classList.add('active');
    if (tabKey === 'tabScanner') document.getElementById('paneScanner')?.classList.add('active');
    if (tabKey === 'tabTicketing') document.getElementById('paneTicketing')?.classList.add('active');
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
      this.loadKsopSettingsToForm();
    }
  },

  // ================= COMPANY DASHBOARD =================
  initDashboardEvents() {
    // Helper function to switch tabs
    const switchTab = (tabKey) => this.switchDashboardTab(tabKey);

    // Ticky Sidebar Collapse Toggle
    document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
      document.getElementById('tickySidebar')?.classList.toggle('collapsed');
    });

    // Ticky Brand Home link
    document.getElementById('tickyBrandHome')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tabOverview');
    });

    // Ticky Switch Profile button
    document.getElementById('btnSwitchProfile')?.addEventListener('click', () => {
      this.openCompanyAuthModal();
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
      this.showToast('Pengaturan KSOP & Pejabat', 'Silakan perbarui data syahbandar, inspektur keselamatan, atau regulasi.');
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
    document.getElementById('btnMoreSwitchProfile')?.addEventListener('click', () => {
      closeAllHeaderDropdowns();
      this.openCompanyAuthModal();
    });

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

    // Add Schedule Modal triggers
    document.getElementById('btnOpenAddSchedule').addEventListener('click', () => {
      this.openAddScheduleModal();
    });
    document.getElementById('subBtnAddSchedule')?.addEventListener('click', () => {
      this.openAddScheduleModal();
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
      const priceVip = parseInt(document.getElementById('schedPriceVip').value, 10);
      const priceEko = parseInt(document.getElementById('schedPriceEko').value, 10);

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
        classes: [
          { id: 'cls-vip', name: 'VIP Suite Class', price: priceVip, quota: 20, booked: 0 },
          { id: 'cls-eko', name: 'Ekonomi Reclining', price: priceEko, quota: 100, booked: 0 }
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
    const badgeCal = document.getElementById('countCalendarBadge');
    if (badgeCal) badgeCal.innerText = schedules.length;
    const badgeManifest = document.getElementById('countManifestBadge');
    if (badgeManifest) badgeManifest.innerText = bookings.reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);

    // Calculate Financial KPIs
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalTickets = bookings.reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);

    const elRev = document.getElementById('kpiRevenue');
    if (elRev) elRev.innerText = formatRupiah(totalRevenue);
    const elTix = document.getElementById('kpiTicketsSold');
    if (elTix) elTix.innerText = totalTickets;
    const elFleet = document.getElementById('kpiFleetCount');
    if (elFleet) elFleet.innerText = fleet.length;

    // Update Ticky 8 KPI Cards with real company ticketing metrics
    const elTotTix = document.getElementById('kpiTotalTickets');
    if (elTotTix) elTotTix.innerText = totalTickets;

    const waitingTix = bookings.filter(b => b.boardingStatus !== 'BOARDED').reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);
    const elOpenedTix = document.getElementById('kpiOpenedTickets');
    if (elOpenedTix) elOpenedTix.innerText = waitingTix;

    const closedTix = bookings.filter(b => b.boardingStatus === 'BOARDED').reduce((sum, b) => sum + (b.passengers ? b.passengers.length : 1), 0);
    const elClosedTix = document.getElementById('kpiClosedTickets');
    if (elClosedTix) elClosedTix.innerText = closedTix;

    const elTotUsers = document.getElementById('kpiTotalUsers');
    if (elTotUsers) elTotUsers.innerText = totalTickets;

    const elTotAgents = document.getElementById('kpiTotalAgents');
    if (elTotAgents) elTotAgents.innerText = fleet.length;

    const elTotAdmins = document.getElementById('kpiTotalAdmins');
    if (elTotAdmins) elTotAdmins.innerText = schedules.length;

    // Sisa Kuota Kursi across active schedules
    const totalRemainingSeats = schedules.reduce((sum, s) => {
      const v = fleet.find(item => item.id === s.vesselId);
      const cap = v ? (v.capacity || 150) : (s.capacity || 150);
      const bookedOnSched = bookings.filter(b => b.scheduleId === s.id).reduce((bSum, b) => bSum + (b.passengers ? b.passengers.length : 1), 0);
      return sum + Math.max(0, cap - bookedOnSched);
    }, 0);
    const elWithdrawal = document.getElementById('kpiWithdrawalAmounts');
    if (elWithdrawal) elWithdrawal.innerText = totalRemainingSeats;

    const elTotTrans = document.getElementById('kpiTotalTransaction');
    if (elTotTrans) elTotTrans.innerText = formatRupiah(totalRevenue);

    // Render Ticky Recent Ticket Bookings List
    const elRecentList = document.getElementById('tickyRecentUsersList');
    if (elRecentList) {
      elRecentList.innerHTML = '';
      if (bookings.length === 0) {
        elRecentList.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: #94a3b8;">
            <p style="margin: 0; font-size: 0.88rem; font-weight: 600;">Belum ada aktivitas pemesanan tiket.</p>
            <small>Tiket yang dipesan oleh penumpang atau loket akan muncul di sini.</small>
          </div>
        `;
      } else {
        bookings.slice(0, 4).forEach((b, idx) => {
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
      bookings.slice(0, 5).forEach(b => {
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
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${v.name}</strong></td>
          <td><code style="color: var(--primary-cyan);">${v.regNumber}</code></td>
          <td>${v.type}</td>
          <td>${v.capacity} Penumpang</td>
          <td><small class="text-dim">${(v.facilities && v.facilities.length > 0) ? v.facilities.join(', ') : 'Standar Penumpang, Life Jacket'}</small></td>
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
        const classesHtml = (s.classes && s.classes.length > 0)
          ? s.classes.map(c => `<div>${c.name}: <strong>${formatRupiah(c.price)}</strong></div>`).join('')
          : `<div>Ekonomi: <strong>${formatRupiah(s.priceEconomy || 250000)}</strong></div>`;

        tr.innerHTML = `
          <td><code>${s.id}</code></td>
          <td><strong>${vName}</strong></td>
          <td>${orig ? orig.name : s.originId} ➔ ${dest ? dest.name : s.destinationId}</td>
          <td>${s.departTime} - ${s.arrivalTime || '10:30'} WIB</td>
          <td><small class="text-dim">${s.pier || 'Dermaga Penumpang'}</small></td>
          <td>${classesHtml}</td>
          <td><span class="status-pill paid">${s.status || 'Aktif'}</span></td>
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
          const minPrice = (sch.classes && sch.classes.length > 0)
            ? Math.min(...sch.classes.map(c => c.price))
            : (sch.priceEconomy || 250000);

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
        <td style="text-align: center; width: 28px; padding: 4px 3px;">
          <input type="checkbox" class="check-pax-item" data-pnr="${b.pnr}" data-pax-idx="${item.paxIndex}" style="cursor: pointer; width: 15px; height: 15px;">
        </td>
        <td style="color: var(--text-dim); text-align: center; width: 24px; padding: 4px 3px; font-size: 0.7rem;">${idx + 1}</td>
        <td style="padding: 4px; white-space: nowrap;"><strong style="color: #0284c7; font-family: var(--font-mono); font-size: 0.72rem;">${b.pnr}</strong></td>
        <td style="padding: 4px; white-space: nowrap;">${paxTypeBadge}</td>
        <td style="padding: 4px; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong style="color: #0f172a; font-size: 0.74rem;" title="${p.name}">${p.name}</strong></td>
        <td style="text-align: center; font-weight: 700; width: 24px; padding: 4px 3px; font-size: 0.72rem;">${p.gender === 'P' ? '<span style="color: #ec4899;">P</span>' : '<span style="color: #0284c7;">L</span>'}</td>
        <td style="padding: 4px; white-space: nowrap;"><code style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 1px 4px; border-radius: 3px; font-weight: 700; color: #0f172a; font-size: 0.68rem;">${docNum}</code></td>
        <td style="padding: 4px; white-space: nowrap; font-size: 0.7rem;">${p.age ? p.age + ' th' : (p.dob || '-')}</td>
        <td style="padding: 4px; font-size: 0.7rem; white-space: nowrap;">${p.nationality === 'MY' ? 'Malaysia' : (p.nationality === 'OTHER' ? 'Asing' : 'Indonesia')}</td>
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
            <button type="button" class="btn-action-sm btn-edit-manifest" style="padding: 2px 5px; font-size: 0.68rem;" title="Edit Data Manifest Penumpang (Nama, Dokumen, Umur, Remark)">
              ✏️ Manifest
            </button>
            <button type="button" class="btn-action-sm btn-edit-ticket" style="padding: 2px 5px; font-size: 0.68rem;" title="Edit Tiket (Nomor Kursi, Status Bayar & Boarding)">
              🎫
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
    const docLabel = (pax.nationality === 'MY' || isIntl) ? 'NO. PASPOR / PLB' : 'NO. KTP / NIK';

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
      nationality: pax.nationality === 'MY' ? 'Malaysia' : (pax.nationality === 'OTHER' ? 'WNA' : 'Indonesia (WNI)'),
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
      departTime: booking.departTime || '08:30 WITA',
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
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
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
          ${docLabel}: <code style="color: #0f172a; font-weight: bold; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${p0.docNumber || p0.nik || '-'}</code> • Kursi: <strong style="color: var(--primary-cyan);">${(booking.passengers || []).map(p => p.seat).filter(Boolean).join(', ') || booking.seatNumber || '-'}</strong> (${booking.className || 'Ekonomi'})
        </p>

        <div style="margin: 0.85rem 0; font-size: 0.84rem; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid var(--border-line);">
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

        // Open booking modal with pre-selected class and seat
        this.openBookingModal(sched);
        this.selectedClassIndex = this.seatDashState.classIdx;
        this.selectedSeats = [this.seatDashState.selectedSeat];
        this.renderClassOptions();
        this.renderSeatPickerGrid();
        this.updateSeatPickerSummary();
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
    const schedSelect = document.getElementById('seatDashScheduleSelect');
    if (!schedSelect) return;

    schedSelect.innerHTML = '';
    if (schedules.length === 0) {
      schedSelect.innerHTML = `<option value="">-- Belum Ada Jadwal Pelayaran Aktif --</option>`;
      this.seatDashState.scheduleId = null;
    } else {
      schedules.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = `${s.vesselName} • ${s.originCity} ➔ ${s.destinationCity} (${s.departDate} ${s.departTime})`;
        schedSelect.appendChild(opt);
      });

      // Keep current selection if valid, else pick first
      if (!schedules.some(s => s.id === this.seatDashState.scheduleId)) {
        this.seatDashState.scheduleId = schedules[0].id;
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

    const classIdx = this.seatDashState.classIdx || 0;
    const classNames = ['Ekonomi (Main Deck)', 'Bisnis / Executive (Upper Deck)', 'VIP Stateroom (Private Cabin)'];
    const currentDeckName = classNames[classIdx];
    if (deckLabel) deckLabel.innerText = currentDeckName.toUpperCase();

    // Reset details panel
    this.updateSeatDetailDisplay(null, currentDeckName);

    if (!currentSched) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🚢</div>
          <p style="font-size: 0.9rem; color: #0f172a; margin-bottom: 0.25rem;">Belum ada jadwal kapal yang dipilih.</p>
          <span style="font-size: 0.78rem;">Silakan tambahkan jadwal pelayaran terlebih dahulu di menu Jadwal Pelayaran.</span>
        </div>
      `;
      this.updateSeatDeckStats(0, 0, 0, currentDeckName, currentSched ? currentSched.vesselName : '-');
      return;
    }

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

    let totalDeckSeats = 0;
    let occupiedDeckCount = 0;

    if (classIdx === 2) {
      // VIP Stateroom Layout (4 Cabins: VIP-01 s/d VIP-04)
      totalDeckSeats = 4;
      const vipRow = document.createElement('div');
      vipRow.className = 'seat-row';
      vipRow.style.gap = '1.25rem';
      vipRow.style.justifyContent = 'center';

      for (let i = 1; i <= 4; i++) {
        const seatCode = `VIP-0${i}`;
        const paxInfo = occupiedMap[seatCode];
        const isOccupied = !!paxInfo;
        if (isOccupied) occupiedDeckCount++;

        const isSelected = this.seatDashState.selectedSeat === seatCode;

        const seat = document.createElement('div');
        seat.className = `seat-box vip ${isOccupied ? 'seat-box-occupied' : ''} ${isSelected ? 'seat-box-selected' : ''}`;
        seat.style.width = '100px';
        seat.style.padding = '0.75rem 0.5rem';
        seat.style.display = 'flex';
        seat.style.flexDirection = 'column';
        seat.style.alignItems = 'center';
        seat.style.gap = '0.2rem';
        seat.innerHTML = `
          <span style="font-size: 1.1rem;">👑</span>
          <strong style="font-size: 0.82rem;">${seatCode}</strong>
          <span style="font-size: 0.65rem; color: ${isOccupied ? '#fca5a5' : '#38bdf8'};">
            ${isOccupied ? 'TERISI' : 'TERSEDIA'}
          </span>
        `;

        seat.addEventListener('click', () => {
          this.handleSeatClick(seatCode, paxInfo, currentDeckName, currentSched);
        });

        vipRow.appendChild(seat);
      }
      container.appendChild(vipRow);

    } else if (classIdx === 1) {
      // Business Upper Deck (3 Rows: B1, B2, B3 x 4 seats = 12 seats)
      totalDeckSeats = 12;
      const rows = ['B1', 'B2', 'B3'];

      rows.forEach(rPrefix => {
        const rowWrap = document.createElement('div');
        rowWrap.className = 'seat-row';

        // Left 2 seats
        for (let col = 1; col <= 2; col++) {
          const seatCode = `${rPrefix}-0${col}`;
          const paxInfo = occupiedMap[seatCode];
          const isOccupied = !!paxInfo;
          if (isOccupied) occupiedDeckCount++;
          const isSelected = this.seatDashState.selectedSeat === seatCode;

          const seat = document.createElement('div');
          seat.className = `seat-box ${isOccupied ? 'seat-box-occupied' : ''} ${isSelected ? 'seat-box-selected' : ''}`;
          seat.style.width = '52px';
          seat.style.border = '1px solid rgba(56, 189, 248, 0.4)';
          seat.innerHTML = `<span>⭐</span> ${seatCode}`;

          seat.addEventListener('click', () => {
            this.handleSeatClick(seatCode, paxInfo, currentDeckName, currentSched);
          });
          rowWrap.appendChild(seat);
        }

        // Center Aisle
        const aisle = document.createElement('div');
        aisle.className = 'seat-aisle-gap';
        aisle.style.width = '36px';
        aisle.innerText = 'LORONG';
        rowWrap.appendChild(aisle);

        // Right 2 seats
        for (let col = 3; col <= 4; col++) {
          const seatCode = `${rPrefix}-0${col}`;
          const paxInfo = occupiedMap[seatCode];
          const isOccupied = !!paxInfo;
          if (isOccupied) occupiedDeckCount++;
          const isSelected = this.seatDashState.selectedSeat === seatCode;

          const seat = document.createElement('div');
          seat.className = `seat-box ${isOccupied ? 'seat-box-occupied' : ''} ${isSelected ? 'seat-box-selected' : ''}`;
          seat.style.width = '52px';
          seat.style.border = '1px solid rgba(56, 189, 248, 0.4)';
          seat.innerHTML = `<span>⭐</span> ${seatCode}`;

          seat.addEventListener('click', () => {
            this.handleSeatClick(seatCode, paxInfo, currentDeckName, currentSched);
          });
          rowWrap.appendChild(seat);
        }

        container.appendChild(rowWrap);
      });

    } else {
      // Main Passenger Deck Economy (Rows A, B, C, D, E, F x 4 seats = 24 seats)
      totalDeckSeats = 24;
      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

      rows.forEach(rPrefix => {
        const rowWrap = document.createElement('div');
        rowWrap.className = 'seat-row';

        // Left 2 seats (Port)
        for (let col = 1; col <= 2; col++) {
          const seatCode = `${rPrefix}-0${col}`;
          const paxInfo = occupiedMap[seatCode];
          const isOccupied = !!paxInfo;
          if (isOccupied) occupiedDeckCount++;
          const isSelected = this.seatDashState.selectedSeat === seatCode;

          const seat = document.createElement('div');
          seat.className = `seat-box ${isOccupied ? 'seat-box-occupied' : ''} ${isSelected ? 'seat-box-selected' : ''}`;
          seat.innerText = seatCode;

          seat.addEventListener('click', () => {
            this.handleSeatClick(seatCode, paxInfo, currentDeckName, currentSched);
          });
          rowWrap.appendChild(seat);
        }

        // Center Aisle (Lorong)
        const aisle = document.createElement('div');
        aisle.className = 'seat-aisle-gap';
        aisle.style.width = '36px';
        aisle.innerText = 'LORONG';
        rowWrap.appendChild(aisle);

        // Right 2 seats (Starboard)
        for (let col = 3; col <= 4; col++) {
          const seatCode = `${rPrefix}-0${col}`;
          const paxInfo = occupiedMap[seatCode];
          const isOccupied = !!paxInfo;
          if (isOccupied) occupiedDeckCount++;
          const isSelected = this.seatDashState.selectedSeat === seatCode;

          const seat = document.createElement('div');
          seat.className = `seat-box ${isOccupied ? 'seat-box-occupied' : ''} ${isSelected ? 'seat-box-selected' : ''}`;
          seat.innerText = seatCode;

          seat.addEventListener('click', () => {
            this.handleSeatClick(seatCode, paxInfo, currentDeckName, currentSched);
          });
          rowWrap.appendChild(seat);
        }

        container.appendChild(rowWrap);
      });
    }

    const availableCount = Math.max(0, totalDeckSeats - occupiedDeckCount);
    this.updateSeatDeckStats(totalDeckSeats, availableCount, occupiedDeckCount, currentDeckName, currentSched.vesselName);
  },

  handleSeatClick(seatCode, paxInfo, deckName, sched) {
    this.seatDashState.selectedSeat = seatCode;

    // Refresh seat highlight
    document.querySelectorAll('#seatDashGridContainer .seat-box').forEach(s => {
      s.classList.remove('seat-box-selected');
    });

    const clickedEl = Array.from(document.querySelectorAll('#seatDashGridContainer .seat-box')).find(el => el.innerText.includes(seatCode));
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

    // Get company fleet, schedules & bookings
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
          <button type="button" class="btn-quick-add-voyage" data-date="${dStr}" title="Tambah Jadwal di Tanggal Ini">
            + Jadwal
          </button>
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" style="margin-bottom:0.75rem;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <h5 style="color:#0f172a;font-size:1rem;margin-bottom:0.35rem;">Tidak Ada Jadwal Pelayaran di Bulan Ini</h5>
            <p style="font-size:0.82rem;margin-bottom:1rem;">Gunakan tombol "+ Jadwal Baru" di atas untuk menambahkan jadwal keberangkatan armada kapal Anda.</p>
            <button type="button" class="btn-primary-action" onclick="App.openAddScheduleModal()">+ Buka Jadwal Baru Sekarang</button>
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
                  <strong style="font-family:var(--font-mono);font-size:1.05rem;color:#0f172a;">${voy.departTime || '08:30'} WITA</strong>
                  <span style="font-size:0.72rem;color:#64748b;display:block;">Tiba: ${voy.arrivalTime || '10:00'}</span>
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

  openAddScheduleModal(defaultDate = null) {
    const modal = document.getElementById('modalAddSchedule');
    if (!modal) return;
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;

    // Populate vessels in modal dropdown
    const vesselSel = document.getElementById('schedVesselSelect');
    if (vesselSel) {
      vesselSel.innerHTML = '';
      const fleet = Store.getVesselsByCompany(tenant.id);
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

    // Set default date
    const dateInput = document.getElementById('schedDateInput');
    if (dateInput) {
      dateInput.value = defaultDate || new Date().toISOString().split('T')[0];
    }

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

    // Close Modal
    document.getElementById('btnCloseBulkPassengerEntry')?.addEventListener('click', () => {
      document.getElementById('modalBulkPassengerEntry')?.classList.remove('show');
    });
    document.getElementById('btnCancelBulkPassengerEntry')?.addEventListener('click', () => {
      document.getElementById('modalBulkPassengerEntry')?.classList.remove('show');
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

        if (panePaste) panePaste.style.display = (mode === 'PASTE') ? 'block' : 'none';
        if (paneFile) paneFile.style.display = (mode === 'FILE') ? 'block' : 'none';
        if (paneGrid) paneGrid.style.display = (mode === 'GRID') ? 'block' : 'none';

        if (mode === 'GRID' && (!this.bulkState.manualGridRows || this.bulkState.manualGridRows.length === 0)) {
          this.initManualGridRows(3);
        }
      });
    });

    // Download CSV Template
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

    // Grid row buttons
    document.getElementById('btnAddGridRow')?.addEventListener('click', () => {
      this.addManualGridRow();
    });
    document.getElementById('btnAdd5GridRows')?.addEventListener('click', () => {
      for (let i = 0; i < 5; i++) this.addManualGridRow();
    });
    document.getElementById('btnClearGridRows')?.addEventListener('click', () => {
      this.initManualGridRows(3);
      this.syncGridToPaxList();
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
    let tenant = Store.getCurrentTenant();
    if (!tenant) {
      const companies = Store.getCompanies();
      if (companies && companies.length > 0) {
        tenant = companies[0];
      } else {
        // Auto-provision default official operator tenant
        tenant = {
          id: 'COMP-HASNA-01',
          name: 'PT Hasna Express Nunukan',
          shortName: 'Hasna Express',
          category: 'Operator Kapal Cepat Lintas Batas (Nunukan - Tawau)',
          brandColor: '#0284c7',
          email: 'operasional@hasnaexpress.co.id',
          phone: '+62 811-540-8899',
          activeVesselsCount: 1,
          createdAt: new Date().toISOString()
        };
        Store.saveCompanies([tenant]);

        const initialVessel = {
          id: 'VES-HASNA-01',
          companyId: tenant.id,
          name: 'KM Hasna Express 01',
          regNumber: 'GT.148/No.2881/PPm',
          type: 'Kapal Cepat Penumpang (High Speed Craft)',
          capacity: 250,
          facilities: ['AC Reclining Seat', 'Toilet Bersih', 'Life Jacket KSOP'],
          status: 'READY'
        };
        Store.saveVessels([initialVessel]);
      }
      Store.setCurrentTenant(tenant);
      this.updateHeaderTenantUI(tenant);
    }

    // Ensure we are inside company dashboard view
    if (this.activeView !== 'companyDashboard') {
      this.switchView('companyDashboard');
    }

    // Ensure manifest tab is selected in background
    this.switchDashboardTab('tabManifest');

    // Ensure company has fleet
    let fleet = Store.getVesselsByCompany(tenant.id);
    if (!fleet || fleet.length === 0) {
      const v = {
        id: `VES-${tenant.id}-01`,
        companyId: tenant.id,
        name: `${tenant.shortName || tenant.name} Express 01`,
        regNumber: `GT.150/No.3190/PPm`,
        type: 'Kapal Cepat Penumpang',
        capacity: 250,
        facilities: ['AC Reclining Seat', 'Toilet Bersih', 'Life Jacket KSOP'],
        status: 'READY'
      };
      fleet = [v];
      const allVessels = Store.getVessels();
      allVessels.push(v);
      Store.saveVessels(allVessels);
    }

    // Ensure company has schedules
    let companySchedules = Store.getSchedulesByCompany(tenant.id);
    if (!companySchedules || companySchedules.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const defaultSchedule = {
        id: `SCH-${tenant.id}-AUTO`,
        companyId: tenant.id,
        vesselId: fleet[0].id,
        vesselNameCustom: fleet[0].name,
        originId: 'NNK',
        destinationId: 'TWU',
        date: todayStr,
        departTime: '08:30',
        arrivalTime: '10:30',
        pier: 'Dermaga 3 Tunon Taka',
        quotaTotal: fleet[0].capacity || 250,
        quotaBooked: 0,
        priceEconomy: 250000,
        priceBisnis: 350000,
        priceVip: 500000,
        status: 'ON_TIME',
        classes: [
          { name: 'Ekonomi', price: 250000, quota: 160, available: 160 },
          { name: 'Bisnis', price: 350000, quota: 60, available: 60 },
          { name: 'VIP', price: 500000, quota: 30, available: 30 }
        ]
      };
      Store.addSchedule(defaultSchedule);
      companySchedules = Store.getSchedulesByCompany(tenant.id);
    }

    const select = document.getElementById('bulkTargetScheduleSelect');
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

    // Default group name with company
    const groupInput = document.getElementById('bulkGroupNameInput');
    if (groupInput && (!groupInput.value || groupInput.value === 'Rombongan Penumpang Resmi')) {
      groupInput.value = `Rombongan ${tenant.shortName || tenant.name} (Tawau/Parepare)`;
    }

    // Initialize manual grid rows if empty
    if (!this.bulkState.manualGridRows || this.bulkState.manualGridRows.length === 0) {
      this.initManualGridRows(3);
    }

    // Render initial state
    this.renderBulkPassengerPreview();

    // Show modal
    document.getElementById('modalBulkPassengerEntry')?.classList.add('show');
  },

  updateBulkScheduleInfo() {
    const tenant = Store.getCurrentTenant();
    if (!tenant) return;
    const companySchedules = Store.getSchedulesByCompany(tenant.id);
    const targetSched = companySchedules.find(s => s.id === this.bulkState.targetScheduleId);
    const classSelect = document.getElementById('bulkClassSelect');

    if (targetSched && classSelect) {
      const priceEko = targetSched.priceEconomy || 250000;
      const priceVip = targetSched.priceVip || (priceEko + 100000);
      const priceBisnis = Math.round((priceEko + priceVip) / 2);

      if (classSelect.options[0]) {
        classSelect.options[0].text = `Ekonomi — ${formatRupiah(priceEko)} / Pax`;
        classSelect.options[0].setAttribute('data-fare', priceEko);
      }
      if (classSelect.options[1]) {
        classSelect.options[1].text = `Bisnis — ${formatRupiah(priceBisnis)} / Pax`;
        classSelect.options[1].setAttribute('data-fare', priceBisnis);
      }
      if (classSelect.options[2]) {
        classSelect.options[2].text = `VIP Stateroom — ${formatRupiah(priceVip)} / Pax`;
        classSelect.options[2].setAttribute('data-fare', priceVip);
      }

      const curOpt = classSelect.options[classSelect.selectedIndex] || classSelect.options[0];
      this.bulkState.farePerPax = parseInt(curOpt?.getAttribute('data-fare') || priceEko, 10);
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
        if (nationality.includes('MAL') || nationality.includes('MY')) nationality = 'MY';
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

  renderManualGridTable() {
    const tbody = document.getElementById('tbodyBulkManualGrid');
    if (!tbody) return;
    tbody.innerHTML = '';

    this.bulkState.manualGridRows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
        <td>
          <input type="text" class="bulk-grid-input grid-field" data-idx="${idx}" data-field="name" value="${row.name || ''}" placeholder="Nama lengkap...">
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
            <option value="ID" ${row.nationality === 'ID' ? 'selected' : ''}>WNI (ID)</option>
            <option value="MY" ${row.nationality === 'MY' ? 'selected' : ''}>WNA (MY)</option>
          </select>
        </td>
        <td>
          <input type="text" class="bulk-grid-input grid-field" data-idx="${idx}" data-field="seat" value="${row.seat || ''}" placeholder="Otomatis">
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-del-grid-row" data-idx="${idx}" style="background: transparent; border: none; color: #ef4444; font-weight: bold; cursor: pointer;">&times;</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.grid-field').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        const field = e.target.getAttribute('data-field');
        if (this.bulkState.manualGridRows[idx]) {
          this.bulkState.manualGridRows[idx][field] = e.target.value;
          this.syncGridToPaxList();
        }
      });
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
        remark: 'Entri Manual Grid'
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
        <td><span class="tag-badge" style="background:#f1f5f9;color:#334155;border-color:#cbd5e1;padding:2px 6px;font-size:0.72rem;">${p.nationality}</span></td>
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
    const ta = document.getElementById('bulkPasteTextarea');
    if (ta) ta.value = '';
    const fi = document.getElementById('bulkFileInput');
    if (fi) fi.value = '';
    this.renderManualGridTable();
    this.renderBulkPassengerPreview();
  },

  processBulkPassengerSubmit() {
    try {
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
          departTime: '08:30',
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
      const payMethod = document.getElementById('bulkPaymentMethodSelect')?.value || 'CASH';
      const picName = document.getElementById('bulkPicNameInput')?.value.trim() || (list[0]?.name || 'Koordinator Rombongan');
      const picPhone = document.getElementById('bulkPicPhoneInput')?.value.trim() || '-';
      const pnrMode = document.querySelector('input[name="bulkPnrGroupingMode"]:checked')?.value || 'GROUP';

      const className = this.bulkState.selectedClass || 'EKONOMI';
      const fare = this.bulkState.farePerPax || 250000;
      const totalFare = list.length * fare;

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
          departTime: `${targetSched.departTime || '08:30'} WITA`,
          className,
          pier: targetSched.pier || 'Dermaga Keberangkatan',
          isIntl,
          groupName,
          contact: { name: picName, phone: picPhone, email: '' },
          passengers: list.map((p, idx) => ({
            paxType: p.paxType || 'Dewasa',
            name: p.name,
            gender: p.gender || 'L',
            docType: p.nationality === 'MY' || isIntl ? 'PASPOR' : 'KTP',
            passportNo: p.docNum,
            docNumber: p.docNum,
            nik: p.docNum,
            dob: '1990-01-01',
            age: p.age || 30,
            nationality: p.nationality || 'ID',
            remark: p.remark || `Rombongan: ${groupName}`,
            passportExp: '2029-01-01',
            seat: p.seat || `B-${String(idx + 1).padStart(2, '0')}`,
            className
          })),
          totalAmount: totalFare,
          paymentMethod: payMethod,
          paymentStatus: 'PAID',
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
            departTime: `${targetSched.departTime || '08:30'} WITA`,
            className,
            pier: targetSched.pier || 'Dermaga Keberangkatan',
            isIntl,
            groupName,
            contact: { name: picName, phone: picPhone, email: '' },
            passengers: [{
              paxType: p.paxType || 'Dewasa',
              name: p.name,
              gender: p.gender || 'L',
              docType: p.nationality === 'MY' || isIntl ? 'PASPOR' : 'KTP',
              passportNo: p.docNum,
              docNumber: p.docNum,
              nik: p.docNum,
              dob: '1990-01-01',
              age: p.age || 30,
              nationality: p.nationality || 'ID',
              remark: p.remark || `Rombongan: ${groupName}`,
              passportExp: '2029-01-01',
              seat: p.seat || `B-${String(idx + 1).padStart(2, '0')}`,
              className
            }],
            totalAmount: fare,
            paymentMethod: payMethod,
            paymentStatus: 'PAID',
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
