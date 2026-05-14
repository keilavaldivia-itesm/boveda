// ── Auto-sync con Google Sheets cada 30 segundos ─────────────────────
const AutoSync = {
  interval: null,
  INTERVAL_MS: 30000,
  lastSync: null,
  syncing: false,

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.sync(), this.INTERVAL_MS);
    console.log('✅ Auto-sync activado cada 30s');
  },

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  },

  async sync() {
    if (this.syncing) return;
    this.syncing = true;
    this._setStatus('⏳', 'Sincronizando...');

    try {
      // Sincronizar expedientes
      await Vault.syncFromSheets();

      // Sincronizar préstamos
      await Loan.syncFromSheets();

      // Refrescar vista activa
      const view = typeof Views !== 'undefined' ? Views.current : 'dashboard';
      if (view === 'dashboard')    try { Dashboard.render(); } catch {}
      if (view === 'spreadsheet')  try { Sheet.filter(); } catch {}

      this.lastSync = new Date();
      this._setStatus('🟢', 'Sheets · ' + this.lastSync.toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'}));
    } catch(e) {
      this._setStatus('🔴', 'Sin conexión');
      console.warn('Auto-sync falló:', e.message);
    } finally {
      this.syncing = false;
    }
  },

  _setStatus(icon, text) {
    const el = document.getElementById('sync-status');
    if (el) el.textContent = icon + ' ' + text;
  },

  // Sync manual al hacer clic en el indicador
  async manualSync() {
    this._setStatus('⏳', 'Sincronizando...');
    await this.sync();
    UI.showNotification('✅ Sincronizado con Google Sheets');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try { Auth.init(); }    catch(e) { console.warn('Auth:', e); }
  try { Vault.init(); }   catch(e) { console.warn('Vault:', e); }
  try { Loan.init(); }    catch(e) { console.warn('Loan:', e); }
  try { Scanner.init(); } catch(e) { console.warn('Scanner:', e); }
  try { Dashboard.render(); } catch(e) { console.warn('Dashboard:', e); }
  try { Sheet.filtered=[...(Vault.records||[])]; Sheet._applySort(); } catch(e) {}
  try { UsersView.render(); } catch(e) {}

  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if(e.target===m) m.classList.add('hidden'); })
  );
  document.addEventListener('keydown', e => {
    if(e.key==='Escape') document.querySelectorAll('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'));
  });

  // Iniciar auto-sync solo cuando el usuario esté autenticado
  // Se llama desde Auth._showApp()
});
