// Módulo de Vista Hoja de Cálculo
const Sheet = {
  sortCol: 'createdAt',
  sortAsc: false,
  page: 1,
  pageSize: 25,
  filtered: [],

  filter() {
    const q      = (document.getElementById('sheet-search')?.value || '').toLowerCase();
    const series = document.getElementById('sheet-filter-series')?.value  || '';
    const status = document.getElementById('sheet-filter-status')?.value  || '';
    const ret    = document.getElementById('sheet-filter-retention')?.value || '';

    this.filtered = (Vault.records || []).filter(r => {
      const fullName = [r.nombre, r.apellido1, r.apellido2].join(' ').toLowerCase();
      const matchQ   = !q || (r.matricula||'').toLowerCase().includes(q) ||
                       fullName.includes(q) || (r.number||'').toLowerCase().includes(q);
      const matchS   = !series || r.series  === series;
      const matchSt  = !status || r.status  === status;
      const matchRet = !ret    || (r.retention?.status||'vigente') === ret;
      return matchQ && matchS && matchSt && matchRet;
    });

    this.page = 1;
    this._applySort();
    this.render();
  },

  sort(col) {
    if (this.sortCol === col) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortCol = col;
      this.sortAsc = true;
    }
    // Update header icons
    document.querySelectorAll('table.records-table th').forEach(th => th.classList.remove('sorted'));
    this._applySort();
    this.render();
  },

  _applySort() {
    const col = this.sortCol;
    const asc = this.sortAsc;
    this.filtered.sort((a, b) => {
      let va = a[col] || '';
      let vb = b[col] || '';
      if (col === 'retention') { va = a.retention?.expiryDate||''; vb = b.retention?.expiryDate||''; }
      return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  },

  render() {
    if (this.filtered.length === 0 && (Vault.records||[]).length > 0) {
      this.filter();
      return;
    }
    if (this.filtered.length === 0) {
      this.filtered = [...(Vault.records||[])];
      this._applySort();
    }

    const count = document.getElementById('sheet-count');
    if (count) count.textContent = this.filtered.length + ' expediente' + (this.filtered.length !== 1 ? 's' : '');

    const start  = (this.page - 1) * this.pageSize;
    const paged  = this.filtered.slice(start, start + this.pageSize);

    const statusBadge = {
      activo:      '<span style="color:#16a34a;font-weight:600">🟢 activo</span>',
      prestado:    '<span style="color:#ca8a04;font-weight:600">🟡 prestado</span>',
      transferido: '<span style="color:#2563eb;font-weight:600">🔵 transferido</span>',
    };
    const retChip = (r) => {
      const s = r.retention?.status || 'vigente';
      const d = r.retention?.expiryDate || '-';
      const cls = s === 'vencido' ? 'ret-vencido' : s === 'próximo' ? 'ret-proximo' : 'ret-vigente';
      const icon= s === 'vencido' ? '🔴' : s === 'próximo' ? '⚠️' : '✅';
      return `<span class="retention-chip ${cls}">${icon} ${d}</span>`;
    };
    const accessIcon = { público:'🌐', restringido:'🔒', confidencial:'🔐' };

    const tbody = document.getElementById('sheet-tbody');
    if (!tbody) return;

    if (paged.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted)">
        Sin expedientes que coincidan con los filtros</td></tr>`;
    } else {
      tbody.innerHTML = paged.map((r, i) => {
        const idx = start + i;
        return `<tr data-id="${r.id}" onclick="Sheet.selectRow(this, '${r.id}')">
          <td class="cell-mono" contenteditable="true" onblur="Sheet.saveCell('${r.id}','matricula',this)">${r.matricula||''}</td>
          <td contenteditable="true" onblur="Sheet.saveCell('${r.id}','nombre',this)">${r.nombre||''}</td>
          <td contenteditable="true" onblur="Sheet.saveCell('${r.id}','apellido1',this)">${r.apellido1||''}</td>
          <td contenteditable="true" onblur="Sheet.saveCell('${r.id}','apellido2',this)">${r.apellido2||''}</td>
          <td contenteditable="true" onblur="Sheet.saveCell('${r.id}','series',this)">${r.series||''}</td>
          <td contenteditable="true" onblur="Sheet.saveCell('${r.id}','location',this)">${r.location||''}</td>
          <td>${statusBadge[r.status] || r.status}</td>
          <td>${retChip(r)}</td>
          <td>${accessIcon[r.accessLevel]||'🔒'} ${r.accessLevel||'restringido'}</td>
          <td class="cell-muted">${(r.createdAt||'').slice(0,10)}</td>
          <td>
            <div class="row-actions">
              <button onclick="Sheet.viewRecord(event,'${r.id}')" title="Ver detalle">👁</button>
              <button onclick="Sheet.printQR(event,'${r.id}')" title="Imprimir QR">🔲</button>
              <button onclick="Sheet.deleteRecord(event,'${r.id}')" title="Eliminar" style="color:#dc2626">🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    this.renderPagination();
  },

  selectRow(tr, id) {
    document.querySelectorAll('table.records-table tr.selected').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
  },

  saveCell(id, field, el) {
    const record = Vault.records.find(r => r.id === id);
    if (!record) return;
    const newVal = el.textContent.trim();
    if (record[field] === newVal) return;

    const old = record[field];
    record[field] = newVal;
    record.version = (record.version || 1) + 1;

    // Update holder for compatibility
    if (['nombre','apellido1','apellido2'].includes(field)) {
      record.holder = [record.nombre, record.apellido1, record.apellido2].filter(Boolean).join(' ');
    }

    Vault._audit(record, 'EDITADO', field + ': "' + old + '" → "' + newVal + '"');
    Vault.save();

    // Brief visual feedback
    el.style.background = '#dcfce7';
    setTimeout(() => el.style.background = '', 800);
  },

  viewRecord(e, id) {
    e.stopPropagation();
    const record = Vault.records.find(r => r.id === id);
    if (!record) return;
    Views.show('scanner');
    setTimeout(() => Vault.showDetail(record), 100);
  },

  printQR(e, id) {
    e.stopPropagation();
    const record = Vault.records.find(r => r.id === id);
    if (!record) return;
    Vault.currentRecord = record;
    QRGenerator.printLabel();
  },

  deleteRecord(e, id) {
    e.stopPropagation();
    const record = Vault.records.find(r => r.id === id);
    if (!record) return;
    if (!confirm('¿Eliminar expediente ' + record.number + '? Esta acción no se puede deshacer.')) return;
    if (!Auth.isAdmin()) { UI.showNotification('⛔ Solo administradores pueden eliminar expedientes', 'error'); return; }
    Vault.records = Vault.records.filter(r => r.id !== id);
    Vault.save();
    this.filter();
    UI.showNotification('🗑️ Expediente eliminado');
  },

  renderPagination() {
    const total = this.filtered.length;
    const pages = Math.ceil(total / this.pageSize);
    const container = document.getElementById('sheet-pagination');
    if (!container) return;

    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = `<button class="page-btn" onclick="Sheet.goPage(${this.page-1})" ${this.page===1?'disabled':''}>‹ Anterior</button>`;

    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - this.page) <= 2) {
        html += `<button class="page-btn ${p===this.page?'active':''}" onclick="Sheet.goPage(${p})">${p}</button>`;
      } else if (Math.abs(p - this.page) === 3) {
        html += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
      }
    }

    html += `<button class="page-btn" onclick="Sheet.goPage(${this.page+1})" ${this.page===pages?'disabled':''}>Siguiente ›</button>`;
    html += `<span style="color:var(--text-muted);font-size:.8rem">${(this.page-1)*this.pageSize+1}–${Math.min(this.page*this.pageSize,total)} de ${total}</span>`;

    container.innerHTML = html;
  },

  goPage(p) {
    const pages = Math.ceil(this.filtered.length / this.pageSize);
    if (p < 1 || p > pages) return;
    this.page = p;
    this.render();
    document.querySelector('.table-wrap')?.scrollTo(0, 0);
  },

  exportXLSX() {
    if (typeof XLSX === 'undefined') {
      // fallback to CSV
      const csv = Utils.toCSV(this.filtered.map(r => ({
        Matricula: r.matricula, Nombre: r.nombre,
        PrimerApellido: r.apellido1, SegundoApellido: r.apellido2,
        Serie: r.series, Ubicacion: r.location, Estado: r.status,
        VenceRetencion: r.retention?.expiryDate, AccionDisposicion: r.retention?.action,
        NivelAcceso: r.accessLevel, FechaCaptura: r.createdAt?.slice(0,10),
        CreadoPor: r.createdBy, Checksum: r.checksum
      })));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
      a.download = 'expedientes_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
      return;
    }

    const rows = this.filtered.map(r => ({
      'Matrícula':         r.matricula,
      'Nombre':            r.nombre,
      'Primer Apellido':   r.apellido1,
      'Segundo Apellido':  r.apellido2,
      'Serie':             r.series,
      'Ubicación':         r.location,
      'Estado':            r.status,
      'Vence Retención':   r.retention?.expiryDate,
      'Acción Disposición':r.retention?.action,
      'Base Legal':        r.retention?.basis,
      'Nivel Acceso':      r.accessLevel,
      'Fecha Captura':     r.createdAt?.slice(0,10),
      'Creado Por':        r.createdBy,
      'Versión':           r.version,
      'Checksum':          r.checksum,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expedientes');
    XLSX.writeFile(wb, 'expedientes_ISO15489_' + new Date().toISOString().slice(0,10) + '.xlsx');
    UI.showNotification('✅ Excel exportado con ' + rows.length + ' expedientes');
  }
};
