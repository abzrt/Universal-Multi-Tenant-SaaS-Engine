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

  // Open Customer Booking Modal
  openBookingModal(sch, comp, vesselName, origPort, destPort) {
    this.currentBookingSchedule = { sch, comp, vesselName, origPort, destPort };
    this.selectedSeats = [];

    document.getElementById('bookModalVessel').innerText = `${vesselName} (${sch.classes[0].name})`;
    document.getElementById('bookModalCompany').innerText = `Operator: ${comp.name} • ${comp.category}`;

    document.getElementById('bookRouteStrip').innerHTML = `
      <div class="flex-between align-center">
        <div>
          <strong>${origPort.name} (${origPort.city}) ➔ ${destPort.name} (${destPort.city})</strong>
          <div class="text-dim">Waktu: ${sch.departTime} - ${sch.arrivalTime} WIB • ${sch.pier}</div>
        </div>
        <div class="tag-badge" style="background: ${comp.brandColor}22; color: ${comp.brandColor}; border-color: ${comp.brandColor};">
          ${comp.shortName || comp.name}
        </div>
      </div>
    `;

    this.renderSeatPickerGrid();
    this.updateSeatPickerSummary();

    document.getElementById('modalCustomerBooking').classList.add('show');
  },

  renderSeatPickerGrid() {
    const grid = document.getElementById('custSeatGrid');
    grid.innerHTML = '';
    const totalSeats = 18;
    const occupiedSeats = ['A-02', 'A-05', 'A-08', 'A-12', 'A-15'];

    for (let i = 1; i <= totalSeats; i++) {
      const seatCode = `A-${i < 10 ? '0' + i : i}`;
      const isOccupied = occupiedSeats.includes(seatCode);
      const isSelected = this.selectedSeats.includes(seatCode);

      const seat = document.createElement('div');
      seat.className = `seat-box ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`;
      seat.innerText = seatCode;

      if (!isOccupied) {
        seat.addEventListener('click', () => {
          if (this.selectedSeats.includes(seatCode)) {
            this.selectedSeats = this.selectedSeats.filter(s => s !== seatCode);
          } else {
            const paxInput = document.getElementById('custSelectPax');
            const maxPax = paxInput ? (parseInt(paxInput.value, 10) || 1) : 4;
            if (this.selectedSeats.length >= maxPax) {
              this.showToast('Batas Kursi', `Anda memilih pemesanan untuk ${maxPax} kursi penumpang.`, 'warning');
              return;
            }
            this.selectedSeats.push(seatCode);
          }
          this.renderSeatPickerGrid();
          this.updateSeatPickerSummary();
        });
      }
      grid.appendChild(seat);
    }
  },

  updateSeatPickerSummary() {
    const seatDisp = document.getElementById('custSelectedSeatDisplay');
    const priceDisp = document.getElementById('custSubtotalDisplay');
    const { sch } = this.currentBookingSchedule;
    const pricePerSeat = sch.classes[0].price;

    if (this.selectedSeats.length === 0) {
      seatDisp.innerText = 'Belum dipilih (Klik kotak di atas)';
      priceDisp.innerText = formatRupiah(0);
    } else {
      seatDisp.innerText = this.selectedSeats.join(', ');
      priceDisp.innerText = formatRupiah(this.selectedSeats.length * pricePerSeat);
    }
  },

  // Confirm Customer Payment & Generate E-Ticket
  confirmCustomerPayment() {
    if (!this.currentBookingSchedule) return;
    if (this.selectedSeats.length === 0) {
      this.showToast('Pilih Kursi', 'Silakan pilih minimal 1 nomor kursi sebelum membayar.', 'warning');
      return;
    }

    const paxName = document.getElementById('custPaxName').value.trim();
    const paxNik = document.getElementById('custPaxNik').value.trim();
    const paxPhone = document.getElementById('custPaxPhone').value.trim();
    const paxEmail = document.getElementById('custPaxEmail').value.trim();

    if (!paxName || !paxNik) {
      this.showToast('Lengkapi Data', 'Nama lengkap dan NIK KTP wajib diisi untuk manifest Ditjen Hubla.', 'warning');
      return;
    }

    const { sch, comp, vesselName, origPort, destPort } = this.currentBookingSchedule;
    const pricePerSeat = sch.classes[0].price;
    const totalAmount = this.selectedSeats.length * pricePerSeat;
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
      destinationCity: destPort.city,
      departDate,
      departTime: `${sch.departTime} WIB`,
      className: sch.classes[0].name,
      pier: sch.pier,
      contact: { name: paxName, phone: paxPhone, email: paxEmail },
      passengers: this.selectedSeats.map(seat => ({
        name: paxName,
        nik: paxNik,
        seat
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
    
    document.getElementById('ticketCompName').innerText = comp.name;
    document.getElementById('ticketPnrVal').innerText = booking.pnr;
    document.getElementById('ticketOriginCity').innerText = booking.originCity;
    document.getElementById('ticketDestCity').innerText = booking.destinationCity;
    document.getElementById('ticketDepartTime').innerText = booking.departTime;
    document.getElementById('ticketArrivalTime').innerText = 'Tiba Tepat Waktu';
    document.getElementById('ticketVesselVal').innerText = booking.vesselName;
    document.getElementById('ticketPaxNameVal').innerText = booking.passengers[0].name;
    document.getElementById('ticketPaxNikVal').innerText = `NIK: ${booking.passengers[0].nik}`;
    document.getElementById('ticketSeatVal').innerText = booking.passengers.map(p => p.seat).join(', ');
    document.getElementById('ticketClassVal').innerText = booking.className;
    document.getElementById('ticketPierVal').innerText = booking.pier;
    document.getElementById('ticketTotalAmountVal').innerText = formatRupiah(booking.totalAmount);
    document.getElementById('ticketPayMethodVal').innerText = booking.paymentMethod;
    document.getElementById('ticketBarcodeNum').innerText = booking.barcode;

    const statusPill = document.getElementById('ticketBoardingStatusPill');
    if (booking.boardingStatus === 'BOARDED') {
      statusPill.innerText = '✓ SUDAH BOARDING (CHECKED-IN)';
      statusPill.style.background = '#0284c7';
    } else {
      statusPill.innerText = 'READY FOR BOARDING';
      statusPill.style.background = '#10b981';
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

    // Render Manifest Table
    const tbodyManifest = document.getElementById('tbodyManifestList');
    tbodyManifest.innerHTML = '';
    if (bookings.length === 0) {
      tbodyManifest.innerHTML = `<tr><td colspan="8" class="text-center text-dim" style="padding: 2rem;">Belum ada penumpang terdaftar di manifest Ditjen Hubla.</td></tr>`;
    } else {
      bookings.forEach(b => {
        b.passengers.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${b.pnr}</strong></td>
            <td><strong>${p.name}</strong></td>
            <td><code>${p.nik}</code></td>
            <td>${b.vesselName}<br><small class="text-dim">${b.className}</small></td>
            <td>${b.originCity} ➔ ${b.destinationCity}</td>
            <td><strong style="color: var(--primary-cyan);">${p.seat}</strong></td>
            <td><span class="status-pill paid">${b.paymentStatus}</span></td>
            <td><span class="status-pill ${b.boardingStatus === 'BOARDED' ? 'boarded' : 'waiting'}">${b.boardingStatus}</span></td>
          `;
          tbodyManifest.appendChild(tr);
        });
      });
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
  },

  // Gate Scanner Execution
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
          <h4 style="color: var(--accent-rose);">Tiket Tidak Terdaftar!</h4>
          <p>Kode "${code}" tidak ditemukan dalam manifest perusahaan ini.</p>
        </div>
      `;
      return;
    }

    // Valid ticket found
    const isAlreadyBoarded = booking.boardingStatus === 'BOARDED';

    card.innerHTML = `
      <div style="border-left: 4px solid ${isAlreadyBoarded ? '#0284c7' : '#10b981'}; padding-left: 1rem;">
        <span class="tag-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; margin-bottom: 0.5rem;">TIKET VALID & RESMI</span>
        <h3 style="font-size: 1.4rem; margin: 0.25rem 0;">${booking.passengers[0].name}</h3>
        <p class="text-dim">NIK: <code>${booking.passengers[0].nik}</code> • Kursi: <strong style="color: #38bdf8;">${booking.passengers.map(p => p.seat).join(', ')}</strong></p>
        <div style="margin: 0.75rem 0; font-size: 0.88rem;">
          <div>Kapal: <strong>${booking.vesselName}</strong> (${booking.className})</div>
          <div>Rute: ${booking.originCity} ➔ ${booking.destinationCity} (${booking.departTime})</div>
          <div>Dermaga: <strong>${booking.pier}</strong></div>
        </div>

        <div style="margin-top: 1rem;">
          ${isAlreadyBoarded ? `
            <div style="background: rgba(2, 132, 199, 0.15); border: 1px solid #0284c7; padding: 0.6rem 1rem; border-radius: 8px; color: #38bdf8; font-weight: 700;">
              ✓ Penumpang Sudah Boarding Sebelumnya
            </div>
          ` : `
            <button type="button" class="btn-submit-action btn-green" id="btnConfirmBoarding">
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
        this.showToast('Boarding Berhasil', `Penumpang ${booking.passengers[0].name} telah diverifikasi masuk kapal!`);
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
