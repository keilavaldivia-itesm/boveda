// Módulo de gestión de expedientes (bóveda)
const Vault = {
  records: [],
  currentRecord: null,
  panelOpen: false,

  init() {
    const saved = localStorage.getItem('vault_records');
    if (saved) {
      try { this.records = JSON.parse(saved); } catch {}
    }
    this.render();
  },

  save() {
    localStorage.setItem('vault_records', JSON.stringify(this.records));
  },

  togglePanel() {
    const panel = document.getElementById('vault-panel');
    this.panelOpen = !this.panelOpen;
    panel.classList.toggle('hidden', !this.panelOpen);
    const btn = document.getElementById('btn-vault-toggle');
    btn.textContent = this.panelOpen ? '✕ Cerrar' : '🗂️ Expedientes';
  },

  newRecord() {
    if (!Auth.canManageRecords()) {
      UI.showNotification('⛔ Sin permiso para registrar expedientes', 'error');
      return;
    }
    const series = prompt('Serie documental (academico / administrativo / investigacion):') || 'academico';
    const holder = prompt('Nombre del titular del expediente:');
    if (!holder) return;
    const location = prompt('Ubicación (ej: BOD-01-EST-A-CAJ-01):') || 'BOD-01';

    const record = {
      id: Utils.uuid(),
      number: 'EXP-' + new Date().getFullYear() + '-' + String(this.records.length + 1).padStart(4, '0'),
      holder,
      series,
      location,
      status: 'activo',
      createdAt: new Date().toLocaleDateString('es-MX'),
      history: [{ action: 'Creado', date: new Date().toLocaleString('es-MX'), user: Auth.currentUser?.name }],
      qrData: null
    };
    record.qrData = JSON.stringify({ id: record.id, number: record.number, holder: record.holder });

    this.records.unshift(record);
    this.save();
    this.render();
    UI.showNotification('✅ Expediente registrado: ' + record.number);
    this.showDetail(record);
  },

  showDetail(record) {
    this.currentRecord = record;
    document.getElementById('detail-number').textContent = record.number;
    document.getElementById('detail-holder').textContent = record.holder;
    document.getElementById('detail-series').textContent = record.series;
    document.getElementById('detail-location').textContent = record.location;
    document.getElementById('detail-date').textContent = record.createdAt;

    const statusEl = document.getElementById('detail-status');
    statusEl.textContent = record.status;
    statusEl.className = 'status-badge status-' + record.status;

    document.getElementById('record-detail').classList.remove('hidden');

    if (!this.panelOpen) this.togglePanel();
  },

  moveRecord() {
    if (!this.currentRecord) return;
    const newLoc = prompt('Nueva ubicación:', this.currentRecord.location);
    if (!newLoc) return;
    this.currentRecord.history.push({
      action: `Movido de ${this.currentRecord.location} a ${newLoc}`,
      date: new Date().toLocaleString('es-MX'),
      user: Auth.currentUser?.name
    });
    this.currentRecord.location = newLoc;
    document.getElementById('detail-location').textContent = newLoc;
    this.save();
    UI.showNotification('✅ Expediente movido a ' + newLoc);
  },

  showHistory() {
    if (!this.currentRecord) return;
    const hist = this.currentRecord.history.map(h =>
      `📌 ${h.date} — ${h.action}${h.user ? ' ('+h.user+')' : ''}`
    ).join('\n');
    alert('Historial de ' + this.currentRecord.number + ':\n\n' + hist);
  },

  findByQR(text) {
    try {
      const data = JSON.parse(text);
      if (data.id) return this.records.find(r => r.id === data.id) || null;
    } catch {}
    return this.records.find(r => r.number === text || r.holder === text) || null;
  },

  filterBySeries() {
    this.render();
  },

  filterByStatus() {
    this.render();
  },

  search(query) {
    this.render(query);
  },

  getFiltered(query = '') {
    const series = document.getElementById('filter-series').value;
    const status = document.getElementById('filter-status').value;
    const q = query.toLowerCase();

    return this.records.filter(r => {
      const matchSeries = !series || r.series === series;
      const matchStatus = !status || r.status === status;
      const matchQ = !q || r.number.toLowerCase().includes(q) || r.holder.toLowerCase().includes(q);
      return matchSeries && matchStatus && matchQ;
    });
  },

  render(query = '') {
    const list = document.getElementById('records-list');
    const filtered = this.getFiltered(query);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state">
        <p>📋 No hay expedientes</p>
        <button class="btn-outline" onclick="Vault.newRecord()">+ Registrar</button>
      </div>`;
      return;
    }

    const statusIcon = { activo: '🟢', prestado: '🟡', transferido: '🔵' };
    list.innerHTML = filtered.map(r => `
      <div class="record-item" onclick="Vault.showDetail(Vault.records.find(x=>x.id==='${r.id}'))">
        <div class="record-main">
          <strong>${r.number}</strong>
          <span>${statusIcon[r.status] || ''} ${r.status}</span>
        </div>
        <div class="record-sub">${r.holder}</div>
        <div class="record-sub" style="color:var(--text-muted);font-size:0.75rem">📍 ${r.location}</div>
      </div>
    `).join('');
  },

  importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').filter(Boolean);
        const headers = lines[0].split(',');
        lines.slice(1).forEach(line => {
          const vals = line.split(',');
          const rec = {};
          headers.forEach((h, i) => rec[h.trim()] = vals[i]?.trim());
          if (rec.holder) {
            rec.id = Utils.uuid();
            rec.number = rec.number || 'EXP-IMP-' + Utils.uuid().slice(0, 6);
            rec.status = rec.status || 'activo';
            rec.history = [];
            this.records.push(rec);
          }
        });
        this.save();
        this.render();
        UI.showNotification(`✅ Importados ${lines.length - 1} expedientes`);
      };
      reader.readAsText(file);
    };
    input.click();
  }
};
