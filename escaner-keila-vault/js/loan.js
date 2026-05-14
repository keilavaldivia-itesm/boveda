/**
 * LOAN.JS — Control de Préstamos, Devoluciones y Traslados
 * Modelo UniArchive: solicitante + quien autoriza + fecha devolución + motivo
 */
const Loan = {
  loans: [],

  init() {
    const saved = localStorage.getItem('vault_loans');
    if (saved) { try { this.loans = JSON.parse(saved); } catch {} }
    // Sync préstamos desde Sheets
    this.syncFromSheets();
  },

  async syncFromSheets() {
    try {
      const rows = await DB.getPrestamos();
      if (rows.length) {
        this.loans = rows;
        localStorage.setItem('vault_loans', JSON.stringify(this.loans));
        if (typeof Dashboard !== 'undefined') Dashboard.render();
      }
    } catch(e) { console.warn('Sync préstamos falló:', e.message); }
    const s = document.getElementById('loan-start');
    const e = document.getElementById('loan-end');
    if (s) s.value = new Date().toISOString().slice(0,10);
    if (e) { const d = new Date(); d.setDate(d.getDate()+15); e.value = d.toISOString().slice(0,10); }
  },

  initiate() {
    if (!Auth.canRequestLoans()) { UI.showNotification('⛔ Inicia sesión primero','error'); return; }
    const record = Vault.currentRecord;
    if (!record) return;
    if (record.status === 'prestado') { UI.showNotification('⚠️ Ya está prestado','error'); return; }

    document.getElementById('loan-record-id').value = record.id;
    document.getElementById('loan-record-num').textContent = record.number+' — '+(record.titulo||record.holder||record.matricula);
    document.getElementById('loan-record-location').textContent = '📍 '+record.location;
    document.getElementById('loan-scan-status').textContent = 'Pendiente de verificación QR...';
    document.getElementById('btn-submit-loan').disabled = false; // allow without QR for flexibility

    if (Auth.currentUser) document.getElementById('loan-requester').value = Auth.currentUser.name;
    UI.showModal('loan-modal');
  },

  async submit(event) {
    event.preventDefault();
    const recordId = document.getElementById('loan-record-id').value;
    const record = Vault.records.find(r => r.id===recordId);
    if (!record) return;

    const endDate = document.getElementById('loan-end').value;
    const loan = {
      id:        Utils.uuid(),
      recordId,
      recordNumber: record.number,
      requester: document.getElementById('loan-requester').value,
      authorizedBy: document.getElementById('loan-authorized-by').value,
      department: document.getElementById('loan-dept').value,
      reason:    document.getElementById('loan-reason').value,
      startDate: document.getElementById('loan-start').value,
      endDate,
      status:    'activo',
      createdAt: new Date().toLocaleString('es-MX'),
      createdBy: Auth.currentUser?.name,
      locationBefore: record.location,
    };

    this.loans.push(loan);
    localStorage.setItem('vault_loans', JSON.stringify(this.loans));
    // Guardar en Sheets
    try { await DB.savePrestamo(loan); } catch(e) { console.warn('Préstamo no guardado en Sheets:', e.message); }

    record.status = 'prestado';
    Vault._audit(record,'PRESTAMO',
      'Solicitante: '+loan.requester+' | Autoriza: '+(loan.authorizedBy||'-')+' | Devolver: '+endDate);
    Vault.save();
    Vault.showDetail(record);
    Vault.render();
    if (typeof Dashboard!=='undefined') Dashboard.render();

    UI.closeModal('loan-modal');
    UI.showNotification('✅ Préstamo registrado hasta '+endDate);
    event.target.reset();
    this.init();
  },

  async return(recordId) {
    const record = Vault.records.find(r => r.id===recordId);
    if (!record) { UI.showNotification('Expediente no encontrado','error'); return; }

    const cond = confirm('¿Confirmar devolución de '+record.number+'?\n\nHaz clic en Cancelar si el expediente llegó dañado.');
    const activeLoan = this.loans.find(l => l.recordId===recordId && l.status==='activo');
    if (activeLoan) {
      activeLoan.status = 'devuelto';
      activeLoan.returnedAt = new Date().toLocaleString('es-MX');
      activeLoan.condition = cond ? 'bueno' : 'dañado';
      localStorage.setItem('vault_loans', JSON.stringify(this.loans));
    }

    record.status = 'activo';
    record.version = (record.version||1)+1;
    Vault._audit(record,'DEVOLUCION','Condición: '+(cond?'bueno':'dañado'));
    Vault.save();
    // Actualizar en Sheets
    try { await DB.updateExpediente(record.id, { status: 'activo', version: record.version }); } catch {}
    try { if(activeLoan) await DB.updatePrestamo(activeLoan.id, { status:'devuelto', returnedAt: activeLoan.returnedAt }); } catch {}
    Vault.showDetail(record);
    Vault.render();
    if (typeof Dashboard!=='undefined') Dashboard.render();
    UI.showNotification('✅ Expediente devuelto a la bóveda');
  },

  // Lista préstamos activos con alertas de vencimiento (UniArchive)
  getActiveLoans() {
    const now = new Date();
    return this.loans
      .filter(l => l.status==='activo')
      .map(l => {
        const end  = new Date(l.endDate);
        const days = Math.ceil((end-now)/86400000);
        return { ...l, daysLeft: days, alert: days<0?'vencido':days<=3?'proximo':'ok' };
      })
      .sort((a,b) => a.daysLeft-b.daysLeft);
  },

  // Vista de préstamos activos (para dashboard)
  getOverdueCount() {
    return this.getActiveLoans().filter(l=>l.alert==='vencido').length;
  },
  getNearDueCount() {
    return this.getActiveLoans().filter(l=>l.alert==='proximo').length;
  }
};
