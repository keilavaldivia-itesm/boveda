// Módulo de gestión de préstamos de expedientes
const Loan = {
  loans: [],

  init() {
    const saved = localStorage.getItem('vault_loans');
    if (saved) {
      try { this.loans = JSON.parse(saved); } catch {}
    }
    // Set default dates
    const start = document.getElementById('loan-start');
    const end = document.getElementById('loan-end');
    if (start) start.value = new Date().toISOString().slice(0, 10);
    if (end) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      end.value = d.toISOString().slice(0, 10);
    }
  },

  initiate() {
    if (!Auth.canRequestLoans()) {
      UI.showNotification('⛔ Inicia sesión para solicitar préstamos', 'error');
      return;
    }
    const record = Vault.currentRecord;
    if (!record) return;
    if (record.status === 'prestado') {
      UI.showNotification('⚠️ Este expediente ya está prestado', 'error');
      return;
    }

    document.getElementById('loan-record-id').value = record.id;
    document.getElementById('loan-record-num').textContent = record.number + ' — ' + record.holder;
    document.getElementById('loan-scan-status').textContent = 'Esperando escaneo...';
    document.getElementById('btn-submit-loan').disabled = true;

    // Pre-fill requester if logged in
    if (Auth.currentUser) {
      document.getElementById('loan-requester').value = Auth.currentUser.name;
    }

    UI.showModal('loan-modal');
  },

  submit(event) {
    event.preventDefault();
    const recordId = document.getElementById('loan-record-id').value;
    const record = Vault.records.find(r => r.id === recordId);
    if (!record) return;

    const loan = {
      id: Utils.uuid(),
      recordId,
      recordNumber: record.number,
      requester: document.getElementById('loan-requester').value,
      department: document.getElementById('loan-dept').value,
      reason: document.getElementById('loan-reason').value,
      startDate: document.getElementById('loan-start').value,
      endDate: document.getElementById('loan-end').value,
      status: 'activo',
      createdAt: new Date().toLocaleString('es-MX'),
      createdBy: Auth.currentUser?.name
    };

    this.loans.push(loan);
    localStorage.setItem('vault_loans', JSON.stringify(this.loans));

    // Update record status
    record.status = 'prestado';
    record.history.push({
      action: `Préstamo a ${loan.requester} (${loan.department})`,
      date: loan.createdAt,
      user: loan.createdBy
    });
    Vault.save();
    Vault.showDetail(record);
    Vault.render();

    UI.closeModal('loan-modal');
    UI.showNotification(`✅ Préstamo registrado hasta ${loan.endDate}`);
    event.target.reset();
  },

  return(recordId) {
    const record = Vault.records.find(r => r.id === recordId);
    if (!record) return;

    const activeLoan = this.loans.find(l => l.recordId === recordId && l.status === 'activo');
    if (activeLoan) {
      activeLoan.status = 'devuelto';
      activeLoan.returnedAt = new Date().toLocaleString('es-MX');
      localStorage.setItem('vault_loans', JSON.stringify(this.loans));
    }

    record.status = 'activo';
    record.history.push({
      action: 'Devolución',
      date: new Date().toLocaleString('es-MX'),
      user: Auth.currentUser?.name
    });
    Vault.save();
    Vault.showDetail(record);
    Vault.render();
    UI.showNotification('✅ Expediente devuelto a la bóveda');
  }
};
