// Módulo de Dashboard con KPIs y gráficas
const Dashboard = {

  render() {
    const records = Vault.records || [];
    this.renderKPIs(records);
    this.renderSeriesChart(records);
    this.renderStatusDonut(records);
    this.renderRetentionAlerts(records);
    this.renderActivityFeed(records);
  },

  renderKPIs(records) {
    const total       = records.length;
    const activos     = records.filter(r => r.status === 'activo').length;
    const prestados   = records.filter(r => r.status === 'prestado').length;
    const transferidos= records.filter(r => r.status === 'transferido').length;

    const now = new Date();
    const vencidos = records.filter(r => {
      if (!r.retention?.expiryDate) return false;
      return new Date(r.retention.expiryDate) < now;
    }).length;
    const proximos = records.filter(r => {
      if (!r.retention?.expiryDate) return false;
      const d = (new Date(r.retention.expiryDate) - now) / (1000*60*60*24);
      return d >= 0 && d < 180;
    }).length;

    this._set('kpi-total',       total);
    this._set('kpi-activos',     activos);
    this._set('kpi-prestados',   prestados);
    this._set('kpi-transferidos',transferidos);
    this._set('kpi-vencidos',    vencidos);
    this._set('kpi-proximos',    proximos);
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  renderSeriesChart(records) {
    const container = document.getElementById('chart-series');
    if (!container) return;

    const seriesList = ['academico','administrativo','investigacion','legal','financiero'];
    const labels     = { academico:'Académico', administrativo:'Administrativo', investigacion:'Investigación', legal:'Legal', financiero:'Financiero' };
    const colors     = { academico:'#2563eb', administrativo:'#7c3aed', investigacion:'#059669', legal:'#dc2626', financiero:'#d97706' };
    const counts     = {};
    seriesList.forEach(s => counts[s] = 0);
    records.forEach(r => { if (counts[r.series] !== undefined) counts[r.series]++; });

    const max = Math.max(...Object.values(counts), 1);

    container.innerHTML = seriesList.map(s => {
      const pct = Math.round((counts[s] / max) * 100);
      return `
        <div class="bar-row">
          <span class="bar-label">${labels[s]}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${colors[s]}"></div>
          </div>
          <span class="bar-count">${counts[s]}</span>
        </div>`;
    }).join('');
  },

  renderStatusDonut(records) {
    const donut  = document.getElementById('donut-status');
    const legend = document.getElementById('legend-status');
    if (!donut || !legend) return;

    const total = records.length || 1;
    const data = [
      { label:'Activo',      key:'activo',      color:'#16a34a' },
      { label:'Prestado',    key:'prestado',     color:'#ca8a04' },
      { label:'Transferido', key:'transferido',  color:'#2563eb' },
    ];

    data.forEach(d => {
      d.count = records.filter(r => r.status === d.key).length;
      d.pct   = (d.count / total) * 100;
    });

    // Build conic-gradient
    let deg = 0;
    const segments = data.map(d => {
      const start = deg;
      deg += (d.pct / 100) * 360;
      return `${d.color} ${start}deg ${deg}deg`;
    }).join(', ');

    if (records.length === 0) {
      donut.style.background = '#e5e7eb';
    } else {
      donut.style.background = `conic-gradient(${segments})`;
    }

    legend.innerHTML = data.map(d =>
      `<div class="legend-item">
        <span class="legend-dot" style="background:${d.color}"></span>
        <span>${d.label}: <strong>${d.count}</strong></span>
       </div>`
    ).join('');
  },

  renderRetentionAlerts(records) {
    const container = document.getElementById('retention-alerts');
    if (!container) return;

    const now = new Date();
    const alerts = records
      .filter(r => r.retention?.expiryDate)
      .map(r => {
        const days = Math.ceil((new Date(r.retention.expiryDate) - now) / (1000*60*60*24));
        return { ...r, daysLeft: days };
      })
      .filter(r => r.daysLeft < 180)
      .sort((a,b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);

    if (alerts.length === 0) {
      container.innerHTML = '<p class="no-alerts">✅ Sin alertas de retención activas</p>';
      return;
    }

    container.innerHTML = alerts.map(r => {
      const cls  = r.daysLeft < 0 ? 'danger' : 'warn';
      const text = r.daysLeft < 0
        ? `Vencida hace ${Math.abs(r.daysLeft)} días`
        : `Vence en ${r.daysLeft} días`;
      return `
        <div class="alert-item ${cls}">
          <span>
            <span class="alert-num">${r.matricula || r.number}</span>
            — ${[r.nombre, r.apellido1].filter(Boolean).join(' ') || r.holder || ''}
          </span>
          <span class="alert-days">${text} · ${r.retention.action}</span>
        </div>`;
    }).join('');
  },

  renderActivityFeed(records) {
    const container = document.getElementById('activity-feed');
    if (!container) return;

    const actionIcon = {
      CREADO:'📂', IMPORTADO:'📥', MOVIDO:'🔄',
      CONSULTA:'👁', ACCESO_CAMBIADO:'🔐', PRESTAMO:'📤', DEFAULT:'📋'
    };

    // Recopilar todos los eventos del audit trail
    const events = [];
    records.forEach(r => {
      (r.auditTrail || []).forEach(e => {
        events.push({ ...e, recordNum: r.matricula || r.number, recordHolder: r.holder || '' });
      });
    });

    if (events.length === 0) {
      container.innerHTML = '<p class="no-alerts">Sin actividad registrada aún</p>';
      return;
    }

    // Ordenar por timestamp descendente
    events.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recent = events.slice(0, 12);

    container.innerHTML = recent.map(e => {
      const icon = actionIcon[e.action] || actionIcon.DEFAULT;
      const ts   = e.timestamp ? e.timestamp.replace('T',' ').slice(0,16) : '-';
      return `
        <div class="activity-item">
          <span class="activity-icon">${icon}</span>
          <span class="activity-text">
            <strong>${e.recordNum}</strong> — ${e.action}
            ${e.detail ? `<br><span style="color:var(--text-muted)">${e.detail}</span>` : ''}
          </span>
          <span class="activity-time">${ts}<br>${e.agent || ''}</span>
        </div>`;
    }).join('');
  }
};
