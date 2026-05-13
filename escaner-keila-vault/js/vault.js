/**
 * VAULT.JS — Gestión de Expedientes
 * Cumplimiento ISO 15489-1:2016 (Gestión de Documentos de Archivo)
 *
 * Principios implementados:
 *  § 5.2  — Autenticidad, Fiabilidad, Integridad, Disponibilidad
 *  § 6.2  — Controles de documentos (metadatos, clasificación, acceso)
 *  § 6.3  — Procesos: captura, clasificación, acceso, retención, disposición
 *  § 7    — Audit trail (trazabilidad de todas las acciones)
 */
const Vault = {
  records: [],
  currentRecord: null,
  panelOpen: false,

  // ── Tabla de retención documental (§ 6.2 Disposition authority) ──────────
  retentionSchedule: {
    academico:       { years: 10, action: 'transferir',  basis: 'Ley General de Educación art. 12' },
    administrativo:  { years: 5,  action: 'destruir',    basis: 'Ley Federal de Archivos art. 30' },
    investigacion:   { years: 15, action: 'conservar',   basis: 'Política institucional I+D' },
    legal:           { years: 20, action: 'conservar',   basis: 'Código Civil Federal art. 1152' },
    financiero:      { years: 7,  action: 'destruir',    basis: 'SAT / Código Fiscal art. 67' },
  },

  // ── Series documentales (§ 6.2 Classification) ───────────────────────────
  series: ['academico', 'administrativo', 'investigacion', 'legal', 'financiero'],

  init() {
    const saved = localStorage.getItem('vault_records');
    if (saved) { try { this.records = JSON.parse(saved); } catch {} }
    this.render();
  },

  save() {
    localStorage.setItem('vault_records', JSON.stringify(this.records));
  },

  // ── Audit Trail (§ 7 — trazabilidad) ─────────────────────────────────────
  _audit(record, action, detail) {
    const entry = {
      timestamp: new Date().toISOString(),       // ISO 8601 requerido por la norma
      action,
      detail:    detail || '',
      agent:     Auth.currentUser?.name || 'sistema',
      agentRole: Auth.currentUser?.role || '-',
      ip:        'local',                         // En producción usar header real
    };
    if (!record.auditTrail) record.auditTrail = [];
    record.auditTrail.push(entry);
    return entry;
  },

  // ── Construcción de metadatos del expediente (§ 5.2.3 Metadata) ──────────
  _buildRecord({ matricula, nombre, apellido1, apellido2, series, location }) {
    const id     = Utils.uuid();
    const now    = new Date();
    const year   = now.getFullYear();
    const number = 'EXP-' + year + '-' + String(this.records.length + 1).padStart(4, '0');
    const ret    = this.retentionSchedule[series] || this.retentionSchedule['academico'];

    // Fecha de expiración según tabla de retención
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + ret.years);

    const record = {
      // — Identificación (§ 6.3.2 Capture) —
      id,
      number,
      matricula:  matricula  || '',
      nombre:     nombre     || '',
      apellido1:  apellido1  || '',
      apellido2:  apellido2  || '',
      holder:     [nombre, apellido1, apellido2].filter(Boolean).join(' ') || matricula,

      // — Clasificación y contexto (§ 6.2 Classification scheme) —
      series,
      location:   location   || 'BOD-01',
      status:     'activo',

      // — Metadatos de captura (§ 5.2.3 Point-of-capture metadata) —
      createdAt:   now.toISOString(),
      createdBy:   Auth.currentUser?.name || 'sistema',
      createdRole: Auth.currentUser?.role || '-',

      // — Retención y disposición (§ 6.2 Disposition authority) —
      retention: {
        years:      ret.years,
        action:     ret.action,         // transferir | destruir | conservar
        basis:      ret.basis,
        expiryDate: expiryDate.toISOString().slice(0, 10),
        status:     'vigente',          // vigente | próximo | vencido
      },

      // — Acceso y seguridad (§ 6.2 Access and permissions) —
      accessLevel: 'restringido',       // público | restringido | confidencial
      accessLog:   [],

      // — Integridad (§ 5.2 Integrity) —
      checksum:  this._checksum({ matricula, nombre, apellido1, apellido2, series }),
      version:   1,

      // — Audit trail (§ 7 Monitoring) —
      auditTrail: [],
      qrData: null,
    };

    record.qrData = JSON.stringify({ id, number, matricula, series });
    this._audit(record, 'CREADO', 'Expediente registrado en el sistema');
    return record;
  },

  // Checksum simple para detectar alteraciones no autorizadas (§ 5.2 Integrity)
  _checksum(data) {
    const str = JSON.stringify(data);
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  },

  // ── CRUD ──────────────────────────────────────────────────────────────────
  newRecord() {
    if (!Auth.canManageRecords()) {
      UI.showNotification('⛔ Sin permiso para registrar expedientes', 'error');
      return;
    }
    const matricula = prompt('Matrícula:');
    if (!matricula) return;
    const nombre    = prompt('Nombre:')          || '';
    const apellido1 = prompt('Primer apellido:') || '';
    const apellido2 = prompt('Segundo apellido:')|| '';
    const series    = prompt('Serie documental:\n' + this.series.join(' | ')) || 'academico';
    const location  = prompt('Ubicación (ej: BOD-01-EST-A-CAJ-01):') || 'BOD-01';

    const record = this._buildRecord({ matricula, nombre, apellido1, apellido2, series, location });
    this.records.unshift(record);
    this.save();
    this.render();
    UI.showNotification('✅ Expediente ' + record.number + ' registrado');
    this.showDetail(record);
  },

  showDetail(record) {
    this.currentRecord = record;

    // Registrar acceso (§ 6.2 Access log)
    if (!record.accessLog) record.accessLog = [];
    record.accessLog.push({
      timestamp: new Date().toISOString(),
      agent: Auth.currentUser?.name || 'anónimo',
      role:  Auth.currentUser?.role || '-',
      action: 'CONSULTA'
    });
    this.save();

    // Rellenar campos en el DOM
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };
    set('detail-number',   record.number);
    set('detail-matricula',record.matricula);
    set('detail-nombre',   record.nombre);
    set('detail-apellido1',record.apellido1);
    set('detail-apellido2',record.apellido2);
    set('detail-series',   record.series);
    set('detail-location', record.location);
    set('detail-date',     record.createdAt ? record.createdAt.slice(0,10) : '-');
    set('detail-created-by',  record.createdBy  || '-');
    set('detail-access-level',record.accessLevel || '-');
    set('detail-expiry',   record.retention?.expiryDate || '-');
    set('detail-retention-action', record.retention?.action || '-');
    set('detail-checksum', record.checksum || '-');
    set('detail-version',  record.version  || '1');

    const statusEl = document.getElementById('detail-status');
    if (statusEl) {
      statusEl.textContent = record.status;
      statusEl.className   = 'status-badge status-' + record.status;
    }

    // Alerta si retención vencida o próxima (§ 6.3 Disposition)
    this._checkRetentionAlert(record);

    document.getElementById('record-detail').classList.remove('hidden');
    if (!this.panelOpen) this.togglePanel();
  },

  _checkRetentionAlert(record) {
    if (!record.retention?.expiryDate) return;
    const expiry = new Date(record.retention.expiryDate);
    const now    = new Date();
    const days   = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (days < 0) {
      record.retention.status = 'vencido';
      UI.showNotification('⚠️ Retención VENCIDA: ' + record.number + '. Acción requerida: ' + record.retention.action, 'error');
    } else if (days < 180) {
      record.retention.status = 'próximo';
      UI.showNotification('📅 Retención próxima (' + days + ' días): ' + record.number, 'error');
    } else {
      record.retention.status = 'vigente';
    }
  },

  moveRecord() {
    if (!this.currentRecord) return;
    if (!Auth.canManageRecords()) { UI.showNotification('⛔ Sin permiso', 'error'); return; }
    const newLoc = prompt('Nueva ubicación:', this.currentRecord.location);
    if (!newLoc) return;
    const oldLoc = this.currentRecord.location;
    this.currentRecord.location = newLoc;
    this.currentRecord.version  = (this.currentRecord.version || 1) + 1;
    this._audit(this.currentRecord, 'MOVIDO', 'De ' + oldLoc + ' a ' + newLoc);
    document.getElementById('detail-location').textContent = newLoc;
    this.save();
    UI.showNotification('✅ Movido a ' + newLoc);
  },

  changeAccessLevel() {
    if (!this.currentRecord) return;
    if (!Auth.isAdmin()) { UI.showNotification('⛔ Solo administradores', 'error'); return; }
    const levels = ['público', 'restringido', 'confidencial'];
    const current = this.currentRecord.accessLevel || 'restringido';
    const next = levels[(levels.indexOf(current) + 1) % levels.length];
    this.currentRecord.accessLevel = next;
    this._audit(this.currentRecord, 'ACCESO_CAMBIADO', current + ' → ' + next);
    document.getElementById('detail-access-level').textContent = next;
    this.save();
    UI.showNotification('🔐 Nivel de acceso: ' + next);
  },

  showHistory() {
    if (!this.currentRecord) return;
    const trail = (this.currentRecord.auditTrail || []);
    if (trail.length === 0) { alert('Sin historial de auditoría.'); return; }
    const text = trail.map(e =>
      '[' + e.timestamp.replace('T', ' ').slice(0, 19) + '] ' +
      e.action + ' — ' + (e.detail || '') +
      '\n  Agente: ' + e.agent + ' (' + e.agentRole + ')'
    ).join('\n\n');
    alert('📋 AUDIT TRAIL — ' + this.currentRecord.number + '\n\n' + text);
  },

  togglePanel() {
    const panel = document.getElementById('vault-panel');
    this.panelOpen = !this.panelOpen;
    panel.classList.toggle('hidden', !this.panelOpen);
    const btn = document.getElementById('btn-vault-toggle');
    if (btn) btn.textContent = this.panelOpen ? '✕ Cerrar' : '🗂️ Expedientes';
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
  filterByStatus()  { this.render(); },
  search(q)         { this.render(q); },

  getFiltered(query) {
    query = query || '';
    const series  = document.getElementById('filter-series')?.value || '';
    const status  = document.getElementById('filter-status')?.value || '';
    const q = query.toLowerCase();
    return this.records.filter(r => {
      const matchSeries  = !series || r.series  === series;
      const matchStatus  = !status || r.status  === status;
      const fullName     = [r.nombre, r.apellido1, r.apellido2].join(' ').toLowerCase();
      const matchQ = !q ||
        (r.number    || '').toLowerCase().includes(q) ||
        (r.matricula || '').toLowerCase().includes(q) ||
        fullName.includes(q);
      return matchSeries && matchStatus && matchQ;
    });
  },

  render(query) {
    query = query || '';
    const list     = document.getElementById('records-list');
    const filtered = this.getFiltered(query);

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>📋 No hay expedientes</p><button class="btn-outline" onclick="Vault.newRecord()">+ Registrar</button></div>';
      return;
    }

    const retIcon  = { vigente: '', próximo: '⚠️', vencido: '🔴' };
    const statusIcon = { activo: '🟢', prestado: '🟡', transferido: '🔵' };

    list.innerHTML = filtered.map(r => {
      const fullName  = [r.nombre, r.apellido1, r.apellido2].filter(Boolean).join(' ') || r.holder || '-';
      const retStatus = r.retention?.status || '';
      return '<div class="record-item" onclick="Vault.showDetail(Vault.records.find(x=>x.id===\'' + r.id + '\'))">' +
        '<div class="record-main"><strong>' + (r.matricula || r.number) + '</strong>' +
        '<span>' + (statusIcon[r.status] || '') + ' ' + r.status + ' ' + (retIcon[retStatus] || '') + '</span></div>' +
        '<div class="record-sub">' + fullName + '</div>' +
        '<div class="record-sub" style="color:var(--text-muted);font-size:0.75rem">📍 ' + r.location + ' · ' + r.series + '</div>' +
        '</div>';
    }).join('');
  },

  // ── Importación Excel / CSV ───────────────────────────────────────────────
  importCSV() {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      file.name.match(/\.(xlsx|xls)$/i) ? this._importExcel(file) : this._importCSVFile(file);
    };
    input.click();
  },

  _normalizeRow(raw) {
    const r = {};
    Object.keys(raw).forEach(k => {
      const key = k.toLowerCase().trim()
        .replace(/\s+/g,'_').replace(/á/g,'a').replace(/é/g,'e')
        .replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');
      r[key] = String(raw[k]).trim();
    });
    return r;
  },

  _recordFromRow(r) {
    const matricula = r.matricula || '';
    if (!matricula) return null;
    const record = this._buildRecord({
      matricula,
      nombre:    r.nombre    || '',
      apellido1: r.primer_apellido || r.apellido1 || r.apellido || '',
      apellido2: r.segundo_apellido || r.apellido2 || '',
      series:    r.serie     || r.series || 'academico',
      location:  r.ubicacion || r.location || 'BOD-01',
    });
    record.status = r.status || r.estado || 'activo';
    record.accessLevel = r.acceso || r.access_level || 'restringido';
    return record;
  },

  _importExcel(file) {
    if (typeof XLSX === 'undefined') {
      UI.showNotification('❌ Librería Excel no cargada, usa CSV', 'error'); return;
    }
    const reader   = new FileReader();
    reader.onload  = (ev) => {
      try {
        const wb   = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        let count  = 0;
        rows.forEach(raw => {
          const record = this._recordFromRow(this._normalizeRow(raw));
          if (record) { this._audit(record, 'IMPORTADO', 'Origen: Excel'); this.records.push(record); count++; }
        });
        this.save(); this.render();
        UI.showNotification('✅ ' + count + ' expedientes importados desde Excel');
      } catch (err) { UI.showNotification('❌ Error Excel: ' + err.message, 'error'); }
    };
    reader.readAsArrayBuffer(file);
  },

  _importCSVFile(file) {
    const reader   = new FileReader();
    reader.onload  = (ev) => {
      const lines   = ev.target.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
      let count     = 0;
      lines.slice(1).forEach(line => {
        const raw = {};
        line.split(',').forEach((v, i) => raw[headers[i]] = (v || '').trim());
        const record = this._recordFromRow(raw);
        if (record) { this._audit(record, 'IMPORTADO', 'Origen: CSV'); this.records.push(record); count++; }
      });
      this.save(); this.render();
      UI.showNotification('✅ ' + count + ' expedientes importados desde CSV');
    };
    reader.readAsText(file);
  },

  // ── Exportar audit trail (§ 7 Monitoring) ────────────────────────────────
  exportAuditTrail() {
    const all = this.records.flatMap(r =>
      (r.auditTrail || []).map(e => ({
        expediente: r.number,
        matricula:  r.matricula,
        ...e
      }))
    );
    if (!all.length) { UI.showNotification('Sin eventos de auditoría', 'error'); return; }
    const csv = Utils.toCSV(all);
    const a   = document.createElement('a');
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'audit_trail_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    UI.showNotification('✅ Audit trail exportado');
  }
};
