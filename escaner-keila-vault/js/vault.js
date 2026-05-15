/**
 * VAULT.JS — Gestión de Expedientes
 * ISO 15489-1:2016 + modelo UniArchive
 * Jerarquía: Zona → Estante → Nivel → Caja → Expediente
 */
const Vault = {
  records: [],
  currentRecord: null,
  panelOpen: false,

  // ── Tabla de retención UniArchive §Consideraciones ────────────────────
  retentionSchedule: {
    academico:       { years: 10, action: 'transferir',  basis: 'Ley General de Educación art. 12' },
    administrativo:  { years: 10, action: 'destruir',    basis: 'Ley Federal de Archivos art. 30' },
    investigacion:   { years: 15, action: 'conservar',   basis: 'Política institucional I+D' },
    legal:           { years: 15, action: 'conservar',   basis: 'Código Civil Federal art. 1152' },
    financiero:      { years: 7,  action: 'destruir',    basis: 'SAT / Código Fiscal art. 67' },
  },

  series: ['academico','administrativo','investigacion','legal','financiero'],

  // ── Estructura jerárquica de la bóveda (UniArchive) ──────────────────
  vaultLayout: {
    'BOD-01': {
      label: 'Bóveda 01 — Acervo General',
      zonas: {
        'A': { nombre: 'Zona A - Académicos',      color: '#2563eb', estantes: ['EST-001','EST-002','EST-003'] },
        'B': { nombre: 'Zona B - Administrativos', color: '#7c3aed', estantes: ['EST-004','EST-005'] },
        'C': { nombre: 'Zona C - Legal',           color: '#dc2626', estantes: ['EST-006'] },
        'D': { nombre: 'Zona D - Financiero',      color: '#d97706', estantes: ['EST-007'] },
      }
    }
  },

  // Parsear código de caja UniArchive: Z-EEE-N-CCC
  parseLocation(loc) {
    if (!loc) return {};
    const parts = loc.split('-');
    if (parts.length >= 4) {
      return { zona: parts[0], estante: parts[0]+'-'+parts[1], nivel: parts[2], caja: loc };
    }
    return { caja: loc };
  },

  init() {
    // Cargar del cache local primero (rápido)
    const saved = localStorage.getItem('vault_records_cache');
    if (saved) { try { this.records = JSON.parse(saved); } catch {} }
    this.render();
    // Luego sincronizar con Sheets (en background)
    this.syncFromSheets();
  },

  // Normalizar clave de columna (quita acentos, espacios, mayúsculas)
  _normalizeKey(k) {
    return (k||'').toLowerCase().trim()
      .replace(/\s+/g,'_')
      .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
      .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');
  },

  // Leer campo con múltiples nombres posibles
  _field(r, ...keys) {
    for (const k of keys) {
      const nk = this._normalizeKey(k);
      // Buscar en las claves normalizadas del objeto
      for (const rk of Object.keys(r)) {
        if (this._normalizeKey(rk) === nk && r[rk] !== '' && r[rk] !== undefined) {
          return String(r[rk]).trim();
        }
      }
    }
    return '';
  },

  async syncFromSheets() {
    try {
      const rows = await DB.getExpedientes();
      if (!rows.length && this.records.length) return;

      // Mapeo flexible — acepta columnas con cualquier capitalización/acento
      console.log('📥 Filas recibidas de Sheets:', rows.length);
      if (rows.length) console.log('📋 Columnas disponibles:', Object.keys(rows[0]).join(', '));

      this.records = rows
        .filter(r => {
          // Filtrar filas completamente vacías
          const vals = Object.values(r).filter(v => v && String(v).trim());
          return vals.length > 0;
        })
        .map(r => {
          const matricula = this._field(r,'matricula','matrícula','id_alumno','no_control');
          const nombre    = this._field(r,'nombre','name','nombres');
          const apellido1 = this._field(r,'apellido1','primer_apellido','apellido_paterno','apellido');
          const apellido2 = this._field(r,'apellido2','segundo_apellido','apellido_materno');
          const series    = this._field(r,'series','serie','tipo','categoria') || 'academico';
          const location  = this._field(r,'location','ubicacion','ubicación','caja','lugar');
          const status    = this._field(r,'status','estado','estatus') || 'activo';
          const id        = this._field(r,'id') || Utils.uuid();
          const number    = this._field(r,'number','numero','expediente','no_expediente') ||
                            'EXP-'+new Date().getFullYear()+'-'+String(this.records.length+1).padStart(6,'0');

          const retYears  = Number(this._field(r,'retentionyears','retencion_años','años_retencion')) || 10;
          const retExpiry = this._field(r,'retentionexpiry','fecha_vencimiento','vencimiento_retencion');

          return {
            id, number, matricula, nombre, apellido1, apellido2,
            carrera:    this._field(r,'carrera','programa','programa_academico'),
            anio:       this._field(r,'anio','año','year','generacion'),
            titulo:     this._field(r,'titulo','título','descripcion','descripción','contenido'),
            holder:     [nombre,apellido1,apellido2].filter(Boolean).join(' ') || matricula,
            series:     series.toLowerCase(),
            location,
            status:     status.toLowerCase(),
            accessLevel:this._field(r,'accesslevel','acceso','nivel_acceso') || 'restringido',
            createdAt:  this._field(r,'createdat','fecha_captura','fecha','fecha_registro') || new Date().toISOString(),
            createdBy:  this._field(r,'createdby','capturado_por','usuario'),
            retention: {
              years:      retYears,
              action:     this._field(r,'retentionaction','accion_disposicion') || 'transferir',
              basis:      this._field(r,'retentionbasis','base_legal') || '',
              expiryDate: retExpiry || '',
              status:     'vigente',
            },
            checksum:   this._field(r,'checksum') || '',
            version:    Number(this._field(r,'version')) || 1,
            auditTrail: [],
            accessLog:  [],
            qrData:     JSON.stringify({ id, number, matricula }),
          };
        });

      this._cacheLocal();
      this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
      if (typeof Sheet !== 'undefined') { Sheet.filtered=[]; Sheet.filter(); }
      console.log('✅ Sync: '+this.records.length+' expedientes desde Sheets');
    } catch(e) {
      console.warn('Sync desde Sheets falló, usando cache:', e.message);
    }
  },

  _cacheLocal() {
    localStorage.setItem('vault_records_cache', JSON.stringify(this.records));
  },

  save() {
    this._cacheLocal(); // Cache local inmediato
  },

  async saveToSheets(record) {
    try {
      await DB.saveExpediente(record);
    } catch(e) {
      UI.showNotification('⚠️ Guardado localmente. Sin conexión a Sheets.', 'error');
    }
  },

  async deleteFromSheets(id) {
    try {
      await DB.deleteExpediente(id);
    } catch(e) {
      console.warn('No se pudo eliminar de Sheets:', e.message);
    }
  },

  // ── Audit Trail ISO 15489 §7 ──────────────────────────────────────────
  _audit(record, action, detail) {
    if (!record.auditTrail) record.auditTrail = [];
    record.auditTrail.push({
      timestamp:  new Date().toISOString(),
      action,
      detail:     detail || '',
      agent:      Auth.currentUser?.name  || 'sistema',
      agentRole:  Auth.currentUser?.role  || '-',
    });
  },

  // Checksum integridad
  _checksum(data) {
    const str = JSON.stringify(data);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).padStart(8,'0');
  },

  // ── Construir expediente (modelo UniArchive completo) ─────────────────
  _buildRecord({ matricula, nombre, apellido1, apellido2, carrera, anio, titulo, series, location, accessLevel }) {
    const id     = Utils.uuid();
    const now    = new Date();
    const number = 'EXP-' + now.getFullYear() + '-' + String(this.records.length + 1).padStart(6,'0');
    const ret    = this.retentionSchedule[series] || this.retentionSchedule['academico'];
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + ret.years);

    const record = {
      id, number,
      // Datos del titular
      matricula:  matricula  || '',
      nombre:     nombre     || '',
      apellido1:  apellido1  || '',
      apellido2:  apellido2  || '',
      holder:     [nombre, apellido1, apellido2].filter(Boolean).join(' ') || matricula,
      carrera:    carrera    || '',
      anio:       anio       || now.getFullYear(),
      titulo:     titulo     || [nombre, apellido1].filter(Boolean).join(' ') || matricula,
      // Clasificación
      series,
      location:   location   || 'A-001-1-001',
      status:     'activo',
      accessLevel: accessLevel || 'restringido',
      // Metadatos ISO 15489
      createdAt:   now.toISOString(),
      createdBy:   Auth.currentUser?.name || 'sistema',
      createdRole: Auth.currentUser?.role || '-',
      retention: {
        years:      ret.years,
        action:     ret.action,
        basis:      ret.basis,
        expiryDate: expiry.toISOString().slice(0,10),
        status:     'vigente',
      },
      accessLog:  [],
      checksum:   this._checksum({ matricula, nombre, apellido1, apellido2, series }),
      version:    1,
      auditTrail: [],
      qrData:     null,
    };
    record.qrData = JSON.stringify({ id, number, matricula, carrera, series });
    this._audit(record, 'CREADO', 'Expediente registrado en el sistema');
    return record;
  },

  // ── Nuevo expediente con formulario enriquecido ───────────────────────
  newRecord() {
    if (!Auth.canManageRecords()) { UI.showNotification('⛔ Sin permiso', 'error'); return; }
    UI.showModal('new-record-modal');
  },

  submitNewRecord(e) {
    e.preventDefault();
    const get = id => document.getElementById(id)?.value || '';
    const record = this._buildRecord({
      matricula:  get('nr-matricula'),
      nombre:     get('nr-nombre'),
      apellido1:  get('nr-apellido1'),
      apellido2:  get('nr-apellido2'),
      carrera:    get('nr-carrera'),
      anio:       get('nr-anio'),
      titulo:     get('nr-titulo'),
      series:     get('nr-series'),
      location:   get('nr-location'),
      accessLevel:get('nr-access'),
    });
    this.records.unshift(record);
    this.save();
    this.render();
    if (typeof Dashboard !== 'undefined') Dashboard.render();
    if (typeof Sheet !== 'undefined') { Sheet.filtered=[]; Sheet.filter(); }
    // Guardar en Sheets
    this.saveToSheets(record);
    UI.closeModal('new-record-modal');
    UI.showNotification('✅ Expediente ' + record.number + ' registrado');
    this.showDetail(record);
    e.target.reset();
  },

  // ── Detalle ───────────────────────────────────────────────────────────
  showDetail(record) {
    this.currentRecord = record;
    if (!record.accessLog) record.accessLog = [];
    record.accessLog.push({ timestamp: new Date().toISOString(), agent: Auth.currentUser?.name||'anónimo', action:'CONSULTA' });
    this.save();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val||'-'; };
    set('detail-number',   record.number);
    set('detail-matricula',record.matricula);
    set('detail-nombre',   record.nombre);
    set('detail-apellido1',record.apellido1);
    set('detail-apellido2',record.apellido2);
    set('detail-carrera',  record.carrera);
    set('detail-anio',     record.anio);
    set('detail-titulo',   record.titulo);
    set('detail-series',   record.series);
    set('detail-location', record.location);
    set('detail-date',     record.createdAt?.slice(0,10));
    set('detail-created-by',   record.createdBy);
    set('detail-access-level', record.accessLevel);
    set('detail-expiry',   record.retention?.expiryDate);
    set('detail-retention-action', record.retention?.action);
    set('detail-checksum', record.checksum);
    set('detail-version',  record.version);

    const statusEl = document.getElementById('detail-status');
    if (statusEl) { statusEl.textContent = record.status; statusEl.className = 'status-badge status-'+record.status; }

    this._checkRetentionAlert(record);
    document.getElementById('record-detail').classList.remove('hidden');
    if (!this.panelOpen) this.togglePanel();
  },

  _checkRetentionAlert(record) {
    if (!record.retention?.expiryDate) return;
    const days = Math.ceil((new Date(record.retention.expiryDate) - new Date()) / 86400000);
    if (days < 0)   { record.retention.status = 'vencido'; UI.showNotification('⚠️ Retención VENCIDA: '+record.number+'. Acción: '+record.retention.action,'error'); }
    else if (days < 180) { record.retention.status = 'próximo'; UI.showNotification('📅 Retención próxima ('+days+' días): '+record.number,'error'); }
    else record.retention.status = 'vigente';
  },

  moveRecord() {
    if (!this.currentRecord || !Auth.canManageRecords()) return;
    const newLoc = prompt('Nueva ubicación (ej: A-002-2-003):', this.currentRecord.location);
    if (!newLoc) return;
    const old = this.currentRecord.location;
    this.currentRecord.location = newLoc;
    this.currentRecord.version = (this.currentRecord.version||1)+1;
    this._audit(this.currentRecord,'MOVIDO','De '+old+' a '+newLoc);
    document.getElementById('detail-location').textContent = newLoc;
    this.save();
    UI.showNotification('✅ Movido a '+newLoc);
  },

  changeAccessLevel() {
    if (!this.currentRecord || !Auth.isAdmin()) { UI.showNotification('⛔ Solo administradores','error'); return; }
    const levels = ['público','restringido','confidencial'];
    const curr = this.currentRecord.accessLevel||'restringido';
    const next = levels[(levels.indexOf(curr)+1)%levels.length];
    this.currentRecord.accessLevel = next;
    this._audit(this.currentRecord,'ACCESO_CAMBIADO',curr+' → '+next);
    document.getElementById('detail-access-level').textContent = next;
    this.save();
    UI.showNotification('🔐 Nivel de acceso: '+next);
  },

  showHistory() {
    if (!this.currentRecord) return;
    const trail = this.currentRecord.auditTrail||[];
    if (!trail.length) { alert('Sin historial.'); return; }
    const text = trail.map(e =>
      '['+e.timestamp.replace('T',' ').slice(0,19)+'] '+e.action+
      (e.detail?' — '+e.detail:'')+'\n  Agente: '+e.agent+' ('+e.agentRole+')'
    ).join('\n\n');
    alert('📋 AUDIT TRAIL — '+this.currentRecord.number+'\n\n'+text);
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
      if (data.id) return this.records.find(r => r.id===data.id)||null;
      if (data.matricula) return this.records.find(r => r.matricula===data.matricula)||null;
    } catch {}
    return this.records.find(r => r.number===text||r.matricula===text)||null;
  },

  filterBySeries() { this.render(); },
  filterByStatus()  { this.render(); },
  search(q)         { this.render(q); },

  getFiltered(query) {
    query = query||'';
    const series = document.getElementById('filter-series')?.value||'';
    const status = document.getElementById('filter-status')?.value||'';
    const q = query.toLowerCase();
    return this.records.filter(r => {
      const fullName = [r.nombre,r.apellido1,r.apellido2].join(' ').toLowerCase();
      return (!series||r.series===series) &&
             (!status||r.status===status) &&
             (!q||(r.number||'').toLowerCase().includes(q)||
                  (r.matricula||'').toLowerCase().includes(q)||
                  fullName.includes(q)||
                  (r.carrera||'').toLowerCase().includes(q)||
                  (r.titulo||'').toLowerCase().includes(q));
    });
  },

  render(query) {
    query = query||'';
    const list = document.getElementById('records-list');
    if (!list) return;
    const filtered = this.getFiltered(query);
    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state"><p>📋 No hay expedientes</p><button class="btn-outline" onclick="Vault.newRecord()">+ Registrar</button></div>';
      return;
    }
    const si = { activo:'🟢', prestado:'🟡', transferido:'🔵' };
    const ri = { vigente:'', próximo:'⚠️', vencido:'🔴' };
    list.innerHTML = filtered.map(r => {
      const fullName = [r.nombre,r.apellido1,r.apellido2].filter(Boolean).join(' ')||r.holder||'-';
      const rs = r.retention?.status||'';
      return '<div class="record-item" onclick="Vault.showDetail(Vault.records.find(x=>x.id===\''+r.id+'\'))">'+
        '<div class="record-main"><strong>'+(r.matricula||r.number)+'</strong>'+
        '<span>'+(si[r.status]||'')+' '+r.status+' '+(ri[rs]||'')+'</span></div>'+
        '<div class="record-sub">'+fullName+(r.carrera?' · '+r.carrera:'')+'</div>'+
        '<div class="record-sub" style="color:var(--text-muted);font-size:.75rem">📍 '+r.location+' · '+r.series+'</div>'+
        '</div>';
    }).join('');
  },

  // ── Importar Excel/CSV ────────────────────────────────────────────────
  importCSV() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      file.name.match(/\.(xlsx|xls)$/i) ? this._importExcel(file) : this._importCSVFile(file);
    };
    input.click();
  },

  _normalizeRow(raw) {
    const r = {};
    Object.keys(raw).forEach(k => {
      const key = k.toLowerCase().trim().replace(/\s+/g,'_')
        .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');
      r[key] = String(raw[k]).trim();
    });
    return r;
  },

  _recordFromRow(r) {
    const matricula = r.matricula||''; if (!matricula) return null;
    const record = this._buildRecord({
      matricula,
      nombre:    r.nombre||'',
      apellido1: r.primer_apellido||r.apellido1||r.apellido||'',
      apellido2: r.segundo_apellido||r.apellido2||'',
      carrera:   r.carrera||'',
      anio:      r.anio||r.año||'',
      titulo:    r.titulo||'',
      series:    r.serie||r.series||'academico',
      location:  r.ubicacion||r.location||'A-001-1-001',
      accessLevel: r.acceso||r.access_level||'restringido',
    });
    record.status = r.status||r.estado||'activo';
    return record;
  },

  _importExcel(file) {
    if (typeof XLSX==='undefined') { UI.showNotification('❌ Librería Excel no cargada, usa CSV','error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result),{type:'array'});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
        let count = 0;
        rows.forEach(raw => {
          const rec = this._recordFromRow(this._normalizeRow(raw));
          if (rec) { this._audit(rec,'IMPORTADO','Origen: Excel'); this.records.push(rec); count++; }
        });
        this.save(); this.render();
        if (typeof Dashboard!=='undefined') Dashboard.render();
        UI.showNotification('✅ '+count+' expedientes importados desde Excel');
      } catch(err) { UI.showNotification('❌ Error Excel: '+err.message,'error'); }
    };
    reader.readAsArrayBuffer(file);
  },

  _importCSVFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/\s+/g,'_'));
      let count = 0;
      lines.slice(1).forEach(line => {
        const raw = {}; line.split(',').forEach((v,i)=>raw[headers[i]]=(v||'').trim());
        const rec = this._recordFromRow(raw);
        if (rec) { this._audit(rec,'IMPORTADO','Origen: CSV'); this.records.push(rec); count++; }
      });
      this.save(); this.render();
      if (typeof Dashboard!=='undefined') Dashboard.render();
      UI.showNotification('✅ '+count+' expedientes importados desde CSV');
    };
    reader.readAsText(file);
  },

  // ── Exportar audit trail ──────────────────────────────────────────────
  exportAuditTrail() {
    const all = this.records.flatMap(r=>(r.auditTrail||[]).map(e=>({expediente:r.number,matricula:r.matricula,...e})));
    if (!all.length) { UI.showNotification('Sin eventos','error'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([Utils.toCSV(all)],{type:'text/csv'}));
    a.download = 'audit_trail_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click(); UI.showNotification('✅ Audit trail exportado');
  }
};
