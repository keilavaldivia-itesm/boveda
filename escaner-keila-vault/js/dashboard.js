/**
 * DASHBOARD.JS — KPIs, gráficas y alertas UniArchive
 * Incluye: préstamos vencidos, próximos a vencer, ocupación de bóveda
 */
const Dashboard = {

  render() {
    const records = Vault.records || [];
    this.renderKPIs(records);
    this.renderSeriesChart(records);
    this.renderStatusDonut(records);
    this.renderRetentionAlerts(records);
    this.renderActivityFeed(records);
    this.renderLoanAlerts();
    this.renderZoneOccupancy(records);
  },

  renderKPIs(records) {
    const now       = new Date();
    const activos   = records.filter(r => r.status==='activo').length;
    const prestados = records.filter(r => r.status==='prestado').length;
    const transferidos = records.filter(r => r.status==='transferido').length;
    const vencidos  = records.filter(r => r.retention?.expiryDate && new Date(r.retention.expiryDate)<now).length;
    const proximos  = records.filter(r => {
      if (!r.retention?.expiryDate) return false;
      const d = (new Date(r.retention.expiryDate)-now)/86400000;
      return d>=0 && d<180;
    }).length;

    const loans = typeof Loan!=='undefined' ? Loan.getActiveLoans() : [];
    const loanVencidos = loans.filter(l=>l.alert==='vencido').length;
    const loanProximos = loans.filter(l=>l.alert==='proximo').length;

    const kpis = {
      'kpi-total':        records.length,
      'kpi-activos':      activos,
      'kpi-prestados':    prestados,
      'kpi-transferidos': transferidos,
      'kpi-vencidos':     vencidos,
      'kpi-proximos':     proximos,
      'kpi-loan-vencidos':loanVencidos,
      'kpi-loan-proximos':loanProximos,
    };
    Object.entries(kpis).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.textContent=val; });
  },

  renderSeriesChart(records) {
    const container = document.getElementById('chart-series');
    if (!container) return;
    const series = ['academico','administrativo','investigacion','legal','financiero'];
    const labels = { academico:'Académico', administrativo:'Administrativo', investigacion:'Investigación', legal:'Legal', financiero:'Financiero' };
    const colors = { academico:'#2563eb', administrativo:'#7c3aed', investigacion:'#059669', legal:'#dc2626', financiero:'#d97706' };
    const counts = {}; series.forEach(s=>counts[s]=0);
    records.forEach(r=>{ if(counts[r.series]!==undefined) counts[r.series]++; });
    const max = Math.max(...Object.values(counts),1);
    container.innerHTML = series.map(s=>`
      <div class="bar-row">
        <span class="bar-label">${labels[s]}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(counts[s]/max*100)}%;background:${colors[s]}"></div></div>
        <span class="bar-count">${counts[s]}</span>
      </div>`).join('');
  },

  renderStatusDonut(records) {
    const donut  = document.getElementById('donut-status');
    const legend = document.getElementById('legend-status');
    if (!donut||!legend) return;
    const total = records.length||1;
    const data = [
      { label:'Activo',      key:'activo',      color:'#16a34a' },
      { label:'Prestado',    key:'prestado',     color:'#ca8a04' },
      { label:'Transferido', key:'transferido',  color:'#2563eb' },
    ];
    data.forEach(d=>{ d.count=records.filter(r=>r.status===d.key).length; d.pct=(d.count/total)*100; });
    let deg=0;
    const segs = data.map(d=>{ const s=deg; deg+=(d.pct/100)*360; return `${d.color} ${s}deg ${deg}deg`; }).join(',');
    donut.style.background = records.length ? `conic-gradient(${segs})` : '#e5e7eb';
    legend.innerHTML = data.map(d=>`<div class="legend-item"><span class="legend-dot" style="background:${d.color}"></span><span>${d.label}: <strong>${d.count}</strong></span></div>`).join('');
  },

  renderRetentionAlerts(records) {
    const container = document.getElementById('retention-alerts');
    if (!container) return;
    const now = new Date();
    const alerts = records
      .filter(r=>r.retention?.expiryDate)
      .map(r=>({ ...r, daysLeft: Math.ceil((new Date(r.retention.expiryDate)-now)/86400000) }))
      .filter(r=>r.daysLeft<180)
      .sort((a,b)=>a.daysLeft-b.daysLeft)
      .slice(0,6);
    if (!alerts.length) { container.innerHTML='<p class="no-alerts">✅ Sin alertas de retención activas</p>'; return; }
    container.innerHTML = alerts.map(r=>{
      const cls  = r.daysLeft<0?'danger':'warn';
      const text = r.daysLeft<0?`Vencida hace ${Math.abs(r.daysLeft)} días`:`Vence en ${r.daysLeft} días`;
      return `<div class="alert-item ${cls}">
        <span><span class="alert-num">${r.matricula||r.number}</span> — ${[r.nombre,r.apellido1].filter(Boolean).join(' ')||r.holder||''}</span>
        <span class="alert-days">${text} · ${r.retention.action}</span>
      </div>`;
    }).join('');
  },

  renderActivityFeed(records) {
    const container = document.getElementById('activity-feed');
    if (!container) return;
    const icon = { CREADO:'📂', IMPORTADO:'📥', MOVIDO:'🔄', CONSULTA:'👁', ACCESO_CAMBIADO:'🔐', PRESTAMO:'📤', DEVOLUCION:'📥', DEFAULT:'📋' };
    const events = [];
    records.forEach(r=>(r.auditTrail||[]).forEach(e=>events.push({...e, recordNum:r.matricula||r.number})));
    if (!events.length) { container.innerHTML='<p class="no-alerts">Sin actividad registrada</p>'; return; }
    events.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    container.innerHTML = events.slice(0,12).map(e=>`
      <div class="activity-item">
        <span class="activity-icon">${icon[e.action]||icon.DEFAULT}</span>
        <span class="activity-text"><strong>${e.recordNum}</strong> — ${e.action}
          ${e.detail?`<br><span style="color:var(--text-muted);font-size:.75rem">${e.detail}</span>`:''}
        </span>
        <span class="activity-time">${(e.timestamp||'').replace('T',' ').slice(0,16)}<br>${e.agent||''}</span>
      </div>`).join('');
  },

  // ── NUEVO: Alertas de préstamos (UniArchive) ──────────────────────────
  renderLoanAlerts() {
    const container = document.getElementById('loan-alerts');
    if (!container || typeof Loan==='undefined') return;
    const loans = Loan.getActiveLoans();
    if (!loans.length) { container.innerHTML='<p class="no-alerts">✅ Sin préstamos activos</p>'; return; }
    container.innerHTML = loans.slice(0,6).map(l=>{
      const cls  = l.alert==='vencido'?'danger':l.alert==='proximo'?'warn':'ok';
      const icon = l.alert==='vencido'?'🔴':l.alert==='proximo'?'⚠️':'🟢';
      const text = l.daysLeft<0?`Vencido hace ${Math.abs(l.daysLeft)} días`:
                   l.daysLeft===0?'Vence hoy':`${l.daysLeft} día${l.daysLeft!==1?'s':''} restante${l.daysLeft!==1?'s':''}`;
      return `<div class="alert-item ${cls}">
        <span>${icon} <strong>${l.recordNumber}</strong> → ${l.requester}</span>
        <span class="alert-days">${text}</span>
      </div>`;
    }).join('');
  },

  // ── NUEVO: Ocupación por zona (UniArchive wireframe) ──────────────────
  renderZoneOccupancy(records) {
    const container = document.getElementById('zone-occupancy');
    if (!container) return;
    const zonas = {
      'A': { label:'Zona A', serie:'academico',       color:'#2563eb', capacity:500 },
      'B': { label:'Zona B', serie:'administrativo',  color:'#7c3aed', capacity:300 },
      'C': { label:'Zona C', serie:'legal',           color:'#dc2626', capacity:200 },
      'D': { label:'Zona D', serie:'financiero',      color:'#d97706', capacity:150 },
    };
    Object.entries(zonas).forEach(([key, z]) => {
      const count = records.filter(r=>(r.location||'').startsWith(key+'-')).length;
      const pct   = Math.min(100, Math.round((count/z.capacity)*100));
      const color = pct>90?'#dc2626':pct>75?'#ca8a04':'#16a34a';
      const icon  = pct>90?'🔴':pct>75?'🟡':'🟢';
      const el = document.getElementById('zone-'+key);
      if (el) {
        el.querySelector('.zone-pct').textContent  = icon+' '+pct+'%';
        el.querySelector('.zone-count').textContent = count+' exp.';
        el.querySelector('.zone-bar').style.cssText = `width:${pct}%;background:${color}`;
      }
    });
  }
};
