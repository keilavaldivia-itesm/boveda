/**
 * MAPVIEW.JS — Mapa Visual de Bóveda + Árbol Jerárquico
 * Pestaña interactiva que combina:
 *  - Árbol jerárquico: Serie → Ubicación → Expedientes
 *  - Mapa físico: Bóveda → Estante → Caja (con ocupación visual)
 */
const MapView = {
  selectedLocation: null,
  selectedSeries: null,
  treeExpanded: {},   // nodos abiertos en el árbol
  mapZoom: 1,

  // ── Estructura física de la bóveda ────────────────────────────────────
  layout: {
    'BOD-01': {
      label: 'Bóveda 01 — Acervo General',
      shelves: ['EST-A', 'EST-B', 'EST-C', 'EST-D'],
      boxesPerShelf: 6,
      capacity: 20,
      color: '#2563eb'
    }
  },

  seriesColors: {
    academico:      '#2563eb',
    administrativo: '#7c3aed',
    investigacion:  '#059669',
    legal:          '#dc2626',
    financiero:     '#d97706',
  },

  seriesLabel: {
    academico:      '📚 Académico',
    administrativo: '⚙️ Administrativo',
    investigacion:  '🔬 Investigación',
    legal:          '⚖️ Legal',
    financiero:     '💰 Financiero',
  },

  // ── Render principal ─────────────────────────────────────────────────
  render() {
    this.renderTree();
    this.renderVaultMap();
    this.renderInfoPanel(null);
  },

  // ════════════════════════════════════════════════════════════════════
  // ÁRBOL JERÁRQUICO
  // ════════════════════════════════════════════════════════════════════
  renderTree() {
    const container = document.getElementById('hierarchy-tree');
    if (!container) return;
    const records = Vault.records || [];

    // Agrupar: serie → location → [records]
    const tree = {};
    records.forEach(r => {
      const s = r.series || 'academico';
      const l = r.location || 'Sin ubicación';
      if (!tree[s]) tree[s] = {};
      if (!tree[s][l]) tree[s][l] = [];
      tree[s][l].push(r);
    });

    const statusDot = { activo:'🟢', prestado:'🟡', transferido:'🔵' };

    let html = '';
    const series = Object.keys(tree).sort();

    if (series.length === 0) {
      html = '<div class="tree-empty">📋 No hay expedientes registrados</div>';
    }

    series.forEach(s => {
      const sKey   = 'series-' + s;
      const open   = this.treeExpanded[sKey] !== false; // default open
      const color  = this.seriesColors[s] || '#6b7280';
      const label  = this.seriesLabel[s]  || s;
      const total  = Object.values(tree[s]).reduce((a,b)=>a+b.length, 0);
      const locs   = Object.keys(tree[s]);

      html += `
        <div class="tree-node tree-serie ${this.selectedSeries===s?'tree-selected-serie':''}">
          <div class="tree-row tree-serie-row" onclick="MapView.toggleNode('${sKey}'); MapView.selectSeries('${s}')">
            <span class="tree-toggle">${open?'▼':'▶'}</span>
            <span class="tree-dot" style="background:${color}"></span>
            <span class="tree-label">${label}</span>
            <span class="tree-badge">${total}</span>
          </div>
          <div class="tree-children ${open?'':'tree-hidden'}">`;

      locs.sort().forEach(loc => {
        const lKey    = sKey + '-' + loc;
        const lOpen   = this.treeExpanded[lKey] !== false;
        const recs    = tree[s][loc];
        const isSelLoc= this.selectedLocation === loc;

        html += `
            <div class="tree-node tree-loc ${isSelLoc?'tree-selected-loc':''}">
              <div class="tree-row tree-loc-row" onclick="MapView.toggleNode('${lKey}'); MapView.selectLocation('${loc}')">
                <span class="tree-toggle">${lOpen?'▼':'▶'}</span>
                <span class="tree-loc-icon">📦</span>
                <span class="tree-label">${loc}</span>
                <span class="tree-badge tree-badge-loc">${recs.length}</span>
              </div>
              <div class="tree-children ${lOpen?'':'tree-hidden'}">`;

        recs.forEach(r => {
          const fullName = [r.nombre, r.apellido1].filter(Boolean).join(' ') || r.holder || '';
          const dot = statusDot[r.status] || '⚪';
          html += `
                <div class="tree-leaf" onclick="MapView.selectRecord('${r.id}')">
                  <span>${dot}</span>
                  <span class="tree-leaf-num">${r.matricula || r.number}</span>
                  <span class="tree-leaf-name">${fullName}</span>
                </div>`;
        });

        html += `
              </div>
            </div>`;
      });

      html += `
          </div>
        </div>`;
    });

    container.innerHTML = html;
  },

  toggleNode(key) {
    this.treeExpanded[key] = !(this.treeExpanded[key] !== false);
    this.renderTree();
  },

  selectSeries(s) {
    this.selectedSeries = (this.selectedSeries === s) ? null : s;
    this.selectedLocation = null;
    this.renderTree();
    this.renderVaultMap();
    this.renderInfoPanel({ type: 'series', series: s });
  },

  selectLocation(loc) {
    this.selectedLocation = (this.selectedLocation === loc) ? null : loc;
    this.renderTree();
    this.renderVaultMap();
    this.renderInfoPanel({ type: 'location', location: loc });
  },

  selectRecord(id) {
    const record = (Vault.records||[]).find(r => r.id === id);
    if (!record) return;
    this.renderInfoPanel({ type: 'record', record });
  },

  // ════════════════════════════════════════════════════════════════════
  // MAPA VISUAL DE LA BÓVEDA
  // ════════════════════════════════════════════════════════════════════
  renderVaultMap() {
    const container = document.getElementById('vault-map-visual');
    if (!container) return;
    const records = Vault.records || [];

    let html = '';

    Object.entries(this.layout).forEach(([vaultId, vault]) => {
      html += `<div class="vault-building">
        <div class="vault-building-label">🏢 ${vault.label}</div>`;

      vault.shelves.forEach(shelf => {
        html += `<div class="vault-shelf">
          <div class="shelf-name-tag">${shelf}</div>
          <div class="shelf-boxes">`;

        for (let i = 1; i <= vault.boxesPerShelf; i++) {
          const boxId    = `${vaultId}-${shelf}-CAJ-${String(i).padStart(2,'0')}`;
          const boxRecs  = records.filter(r => r.location === boxId);
          const count    = boxRecs.length;
          const pct      = Math.min(100, (count / vault.capacity) * 100);

          // Color por serie mayoritaria
          const serieCounts = {};
          boxRecs.forEach(r => { serieCounts[r.series] = (serieCounts[r.series]||0)+1; });
          const topSerie = Object.entries(serieCounts).sort((a,b)=>b[1]-a[1])[0];
          const fillColor = topSerie ? (this.seriesColors[topSerie[0]] || '#2563eb') : '#e5e7eb';

          const isSelected = this.selectedLocation === boxId;
          const isHighlight = this.selectedSeries &&
            boxRecs.some(r => r.series === this.selectedSeries);

          html += `
            <div class="vault-box ${isSelected?'vault-box-selected':''} ${isHighlight?'vault-box-highlight':''}"
                 onclick="MapView.clickBox('${boxId}')"
                 title="${boxId}: ${count}/${vault.capacity} expedientes">
              <div class="box-fill-bar" style="height:${pct}%;background:${count>0?fillColor:'transparent'}"></div>
              <div class="box-label-overlay">
                <span class="box-num">${String(i).padStart(2,'0')}</span>
                ${count > 0 ? `<span class="box-count-badge">${count}</span>` : ''}
              </div>
            </div>`;
        }

        html += `</div></div>`;
      });

      html += `</div>`;
    });

    container.innerHTML = html;
  },

  clickBox(boxId) {
    this.selectLocation(boxId);
    // Scroll al nodo en el árbol
    setTimeout(() => {
      const nodes = document.querySelectorAll('.tree-selected-loc');
      if (nodes[0]) nodes[0].scrollIntoView({ behavior:'smooth', block:'center' });
    }, 100);
  },

  // ════════════════════════════════════════════════════════════════════
  // PANEL DE INFORMACIÓN
  // ════════════════════════════════════════════════════════════════════
  renderInfoPanel(ctx) {
    const panel = document.getElementById('map-info-panel');
    if (!panel) return;

    if (!ctx) {
      const records = Vault.records || [];
      const total   = records.length;
      const byStatus = { activo:0, prestado:0, transferido:0 };
      records.forEach(r => { if(byStatus[r.status]!==undefined) byStatus[r.status]++; });

      // Caja más ocupada
      const boxCounts = {};
      records.forEach(r => { boxCounts[r.location] = (boxCounts[r.location]||0)+1; });
      const topBox = Object.entries(boxCounts).sort((a,b)=>b[1]-a[1])[0];

      panel.innerHTML = `
        <div class="info-header">📊 Resumen de la Bóveda</div>
        <div class="info-kpis">
          <div class="info-kpi"><span class="info-kpi-val">${total}</span><span class="info-kpi-lbl">Total</span></div>
          <div class="info-kpi success"><span class="info-kpi-val">${byStatus.activo}</span><span class="info-kpi-lbl">Activos</span></div>
          <div class="info-kpi warn"><span class="info-kpi-val">${byStatus.prestado}</span><span class="info-kpi-lbl">Prestados</span></div>
        </div>
        ${topBox ? `<div class="info-row"><label>Caja más ocupada</label><span>${topBox[0]} (${topBox[1]})</span></div>` : ''}
        <div class="info-hint">Haz clic en una caja del mapa<br>o en un nodo del árbol para ver detalles</div>`;
      return;
    }

    if (ctx.type === 'series') {
      const records = (Vault.records||[]).filter(r => r.series === ctx.series);
      const color   = this.seriesColors[ctx.series] || '#6b7280';
      const label   = this.seriesLabel[ctx.series]  || ctx.series;
      const ret     = Vault.retentionSchedule?.[ctx.series];

      panel.innerHTML = `
        <div class="info-header" style="border-left:4px solid ${color};padding-left:10px">${label}</div>
        <div class="info-kpis">
          <div class="info-kpi"><span class="info-kpi-val">${records.length}</span><span class="info-kpi-lbl">Expedientes</span></div>
          <div class="info-kpi success"><span class="info-kpi-val">${records.filter(r=>r.status==='activo').length}</span><span class="info-kpi-lbl">Activos</span></div>
          <div class="info-kpi warn"><span class="info-kpi-val">${records.filter(r=>r.status==='prestado').length}</span><span class="info-kpi-lbl">Prestados</span></div>
        </div>
        ${ret ? `
        <div class="info-section-title">📅 Retención ISO 15489</div>
        <div class="info-row"><label>Plazo</label><span>${ret.years} años</span></div>
        <div class="info-row"><label>Acción</label><span>${ret.action}</span></div>
        <div class="info-row"><label>Base legal</label><span style="font-size:.75rem">${ret.basis}</span></div>` : ''}
        <div class="info-section-title">📍 Ubicaciones ocupadas</div>
        ${this._locationList(records)}`;
    }

    if (ctx.type === 'location') {
      const records  = (Vault.records||[]).filter(r => r.location === ctx.location);
      const capacity = 20;
      const pct      = Math.min(100, Math.round((records.length/capacity)*100));
      const color    = pct > 80 ? '#dc2626' : pct > 50 ? '#ca8a04' : '#16a34a';

      panel.innerHTML = `
        <div class="info-header">📦 ${ctx.location}</div>
        <div class="info-kpis">
          <div class="info-kpi"><span class="info-kpi-val">${records.length}/${capacity}</span><span class="info-kpi-lbl">Ocupación</span></div>
          <div class="info-kpi"><span class="info-kpi-val" style="color:${color}">${pct}%</span><span class="info-kpi-lbl">Capacidad</span></div>
        </div>
        <div style="margin:8px 0">
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width .4s"></div>
          </div>
        </div>
        <div class="info-section-title">📂 Expedientes en esta caja</div>
        <div class="info-record-list">
          ${records.length === 0
            ? '<span style="color:var(--text-muted);font-size:.82rem">Caja vacía</span>'
            : records.map(r => `
              <div class="info-record-item" onclick="MapView.selectRecord('${r.id}')">
                <span class="info-record-num">${r.matricula||r.number}</span>
                <span class="info-record-name">${[r.nombre,r.apellido1].filter(Boolean).join(' ')||r.holder||''}</span>
                <span class="info-record-status status-${r.status}">${r.status}</span>
              </div>`).join('')}
        </div>
        <div style="margin-top:10px">
          <button class="btn-sm btn-outline" onclick="Vault.newRecord()">+ Agregar expediente aquí</button>
        </div>`;
    }

    if (ctx.type === 'record') {
      const r = ctx.record;
      const fullName = [r.nombre, r.apellido1, r.apellido2].filter(Boolean).join(' ') || r.holder || '-';
      const retStatus = r.retention?.status || 'vigente';
      const retClass  = retStatus==='vencido'?'danger':retStatus==='próximo'?'warn':'success';

      panel.innerHTML = `
        <div class="info-header">📄 ${r.number}</div>
        <div class="info-row"><label>Matrícula</label><span class="cell-mono">${r.matricula||'-'}</span></div>
        <div class="info-row"><label>Titular</label><span>${fullName}</span></div>
        <div class="info-row"><label>Serie</label><span>${this.seriesLabel[r.series]||r.series}</span></div>
        <div class="info-row"><label>Ubicación</label><span>${r.location||'-'}</span></div>
        <div class="info-row"><label>Estado</label>
          <span class="status-badge status-${r.status}">${r.status}</span></div>
        <div class="info-row"><label>Acceso</label><span>${r.accessLevel||'-'}</span></div>
        <div class="info-row"><label>Vence retención</label>
          <span class="retention-chip ret-${retStatus==='vencido'?'vencido':retStatus==='próximo'?'proximo':'vigente'}">${r.retention?.expiryDate||'-'}</span></div>
        <div class="info-row"><label>Versión</label><span>${r.version||1}</span></div>
        <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-sm btn-primary" onclick="Views.show('scanner');setTimeout(()=>Vault.showDetail(Vault.records.find(x=>x.id==='${r.id}')),100)">Ver detalle</button>
          <button class="btn-sm btn-outline" onclick="Vault.currentRecord=Vault.records.find(x=>x.id==='${r.id}');QRGenerator.printLabel()">🔲 QR</button>
        </div>`;
    }
  },

  _locationList(records) {
    const locs = {};
    records.forEach(r => { locs[r.location] = (locs[r.location]||0)+1; });
    if (!Object.keys(locs).length) return '<span style="color:var(--text-muted);font-size:.82rem">Sin ubicaciones asignadas</span>';
    return Object.entries(locs).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([loc,n])=>
      `<div class="info-row" style="cursor:pointer" onclick="MapView.selectLocation('${loc}')">
        <label>📦 ${loc}</label><span>${n} exp.</span>
       </div>`
    ).join('');
  },

  // ── Leyenda ────────────────────────────────────────────────────────
  renderLegend() {
    const el = document.getElementById('map-legend');
    if (!el) return;
    el.innerHTML = Object.entries(this.seriesColors).map(([s,c])=>
      `<span class="legend-item-map">
        <span class="legend-dot-map" style="background:${c}"></span>
        ${this.seriesLabel[s]||s}
       </span>`
    ).join('');
  }
};

// ── Utilidades de árbol ──────────────────────────────────────────────
MapView.expandAll = function() {
  const records = Vault.records || [];
  const series  = [...new Set(records.map(r => r.series))];
  series.forEach(s => {
    this.treeExpanded['series-' + s] = true;
    const locs = [...new Set(records.filter(r=>r.series===s).map(r=>r.location))];
    locs.forEach(l => { this.treeExpanded['series-' + s + '-' + l] = true; });
  });
  this.renderTree();
};

MapView.collapseAll = function() {
  Object.keys(this.treeExpanded).forEach(k => { this.treeExpanded[k] = false; });
  this.renderTree();
};

MapView.filterTree = function(q) {
  q = (q || '').toLowerCase();
  if (!q) { this.render(); return; }
  const container = document.getElementById('hierarchy-tree');
  if (!container) return;
  const records = (Vault.records || []).filter(r =>
    (r.matricula||'').toLowerCase().includes(q) ||
    [r.nombre,r.apellido1,r.apellido2].join(' ').toLowerCase().includes(q) ||
    (r.location||'').toLowerCase().includes(q) ||
    (r.series||'').toLowerCase().includes(q)
  );
  // Rebuild tree with filtered records (swap Vault.records temporarily)
  const orig = Vault.records;
  Vault.records = records;
  // Force all nodes open for search results
  const series = [...new Set(records.map(r=>r.series))];
  series.forEach(s => {
    this.treeExpanded['series-'+s] = true;
    const locs = [...new Set(records.filter(r=>r.series===s).map(r=>r.location))];
    locs.forEach(l => { this.treeExpanded['series-'+s+'-'+l] = true; });
  });
  this.renderTree();
  this.renderVaultMap();
  Vault.records = orig;
};
