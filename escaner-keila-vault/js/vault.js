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
    const matricula = prompt('Matrícula:');
    if (!matricula) return;
    const nombre = prompt('Nombre:') || '';
    const apellido1 = prompt('Primer apellido:') || '';
    const apellido2 = prompt('Segundo apellido:') || '';
    const series = prompt('Serie documental (academico / administrativo / investigacion):') || 'academico';
    const location = prompt('Ubicación (ej: BOD-01-EST-A-CAJ-01):') || 'BOD-01';

    const record = this._buildRecord({ matricula, nombre, apellido1, apellido2, series, location });
    this.records.unshift(record);
    this.save();
    this.render();
    UI.showNotification('✅ Expediente registrado: ' + record.number);
    this.showDetail(record);
  },

  _buildRecord({ matricula, nombre, apellido1, apellido2, series, location }) {
    const id = Utils.uuid();
    const number = 'EXP-' + new Date().getFullYear() + '-' + String(this.records.length + 1).padStart(4, '0');
    const record = {
      id,
      number,
      matricula: matricula || '',
      nombre: nombre || '',
      apellido1: apellido1 || '',
      apellido2: apellido2 || '',
      holder: [nombre, apellido1, apellido2].filter(Boolean).join(' ') || matricula,
      series: series || 'academico',
      location: location || 'BOD-01',
      status: 'activo',
      createdAt: new Date().toLocaleDateString('es-MX'),
      history: [{ action: 'Creado', date: new Date().toLocaleString('es-MX'), user: Auth.currentUser?.name }],
    };
    record.qrData = JSON.stringify({ id: record.id, number: record.number, matricula: record.matricula });
    return record;
  },

  showDetail(record) {
    this.currentRecord = record;
    document.getElementById('detail-number').textContent = record.number;
    document.getElementById('detail-matricula').textContent = record.matricula || '-';
    document.getElementById('detail-nombre').textContent = record.nombre || '-';
    document.getElementById('detail-apellido1').textContent = record.apellido1 || '-';
    document.getElementById('detail-apellido2').textContent = record.apellido2 || '-';
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
      action: 'Movido de ' + this.currentRecord.location + ' a ' + newLoc,
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
      '📌 ' + h.date + ' — ' + h.action + (h.user ? ' (' + h.user + ')' : '')
    ).join('\n');
    alert('Historial de ' + this.currentRecord.number + ':\n\n' + hist);
  },

  findByQR(text) {
    try {
      const data = JSON.parse(text);
      if (data.id) return this.records.find(r => r.id === data.id) || null;
      if (data.matricula) return this.records.find(r => r.matricula === data.matricula) || null;
    } catch {}
    return this.records.find(r => r.number === text || r.matricula === text) || null;
  },

  filterBySeries() { this.render(); },
  filterByStatus() { this.render(); },
  search(query) { this.render(query); },

  getFiltered(query) {
    query = query || '';
    const series = document.getElementById('filter-series').value;
    const status = document.getElementById('filter-status').value;
    const q = query.toLowerCase();
    return this.records.filter(r => {
      const matchSeries = !series || r.series === series;
      const matchStatus = !status || r.status === status;
      const fullName = [r.nombre, r.apellido1, r.apellido2].join(' ').toLowerCase();
      const matchQ = !q ||
        r.number.toLowerCase().includes(q) ||
        (r.matricula || '').toLowerCase().includes(q) ||
        fullName.includes(q);
      return matchSeries && matchStatus && matchQ;
    });
  },

  render(query) {
    query = query || '';
    const list = document.getElementById('records-list');
    const filtered = this.getFiltered(query);

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>📋 No hay expedientes</p><button class="btn-outline" onclick="Vault.newRecord()">+ Registrar</button></div>';
      return;
    }

    const statusIcon = { activo: '🟢', prestado: '🟡', transferido: '🔵' };
    list.innerHTML = filtered.map(r => {
      const fullName = [r.nombre, r.apellido1, r.apellido2].filter(Boolean).join(' ') || r.holder || '-';
      return '<div class="record-item" onclick="Vault.showDetail(Vault.records.find(x=>x.id===\'' + r.id + '\'))">' +
        '<div class="record-main"><strong>' + (r.matricula || r.number) + '</strong>' +
        '<span>' + (statusIcon[r.status] || '') + ' ' + r.status + '</span></div>' +
        '<div class="record-sub">' + fullName + '</div>' +
        '<div class="record-sub" style="color:var(--text-muted);font-size:0.75rem">📍 ' + r.location + '</div>' +
        '</div>';
    }).join('');
  },

  importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.name.match(/\.(xlsx|xls)$/i)) {
        this._importExcel(file);
      } else {
        this._importCSVFile(file);
      }
    };
    input.click();
  },

  _normalizeRow(raw) {
    const r = {};
    Object.keys(raw).forEach(k => {
      r[k.toLowerCase().trim().replace(/\s+/g, '_').replace(/[áa]/g,'a').replace(/[éi]/g,'i').replace(/[ó]/g,'o').replace(/[ú]/g,'u')] = String(raw[k]).trim();
    });
    return r;
  },

  _recordFromRow(r) {
    const matricula = r.matricula || '';
    if (!matricula) return null;
    const record = this._buildRecord({
      matricula,
      nombre:    r.nombre || '',
      apellido1: r.primer_apellido || r.apellido1 || r.apellido || '',
      apellido2: r.segundo_apellido || r.apellido2 || '',
      series:    r.serie || r.series || 'academico',
      location:  r.ubicacion || r.location || 'BOD-01',
    });
    record.status = r.status || r.estado || 'activo';
    return record;
  },

  _importExcel(file) {
    if (typeof XLSX === 'undefined') {
      UI.showNotification('❌ Librería Excel no cargada, usa CSV por ahora', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        let count = 0;
        rows.forEach(raw => {
          const r = this._normalizeRow(raw);
          const record = this._recordFromRow(r);
          if (record) { record.history = [{ action: 'Importado desde Excel', date: new Date().toLocaleString('es-MX'), user: Auth.currentUser?.name }]; this.records.push(record); count++; }
        });
        this.save();
        this.render();
        UI.showNotification('✅ ' + count + ' expedientes importados desde Excel');
      } catch (err) {
        UI.showNotification('❌ Error al leer Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  _importCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      let count = 0;
      lines.slice(1).forEach(line => {
        const vals = line.split(',');
        const raw = {};
        headers.forEach((h, i) => raw[h] = (vals[i] || '').trim());
        const record = this._recordFromRow(raw);
        if (record) { record.history = [{ action: 'Importado desde CSV', date: new Date().toLocaleString('es-MX'), user: Auth.currentUser?.name }]; this.records.push(record); count++; }
      });
      this.save();
      this.render();
      UI.showNotification('✅ ' + count + ' expedientes importados desde CSV');
    };
    reader.readAsText(file);
  }
};
