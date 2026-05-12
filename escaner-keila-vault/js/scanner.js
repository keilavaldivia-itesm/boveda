// Módulo de escaneo QR
const Scanner = {
  html5QrCode: null,
  isScanning: false,
  scans: [],
  loanMode: false,
  customColumns: [],
  presets: ['entrada', 'salida', 'inventario'],

  async start() {
    document.getElementById('camera-placeholder').classList.add('hidden');
    this.html5QrCode = new Html5Qrcode("reader");
    try {
      await this.html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => this.onScanSuccess(decodedText),
        () => {}
      );
      this.isScanning = true;
      document.getElementById('btn-start-scan').textContent = '⏹ Detener escáner';
      document.getElementById('btn-start-scan').onclick = () => Scanner.stop();
    } catch (err) {
      UI.showNotification('❌ No se pudo acceder a la cámara: ' + err.message, 'error');
      document.getElementById('camera-placeholder').classList.remove('hidden');
    }
  },

  async stop() {
    if (this.html5QrCode && this.isScanning) {
      await this.html5QrCode.stop();
      this.isScanning = false;
      document.getElementById('camera-placeholder').classList.remove('hidden');
      document.getElementById('btn-start-scan').textContent = '📷 Iniciar escáner';
      document.getElementById('btn-start-scan').onclick = () => Scanner.start();
    }
  },

  async onScanSuccess(decodedText) {
    Utils.playBeep();
    const continuous = document.getElementById('opt-continuous')?.checked;
    if (!continuous) await this.stop();

    if (this.loanMode) {
      this.loanMode = false;
      document.getElementById('loan-scan-status').textContent = '✅ QR verificado: ' + decodedText;
      document.getElementById('btn-submit-loan').disabled = false;
      await this.stop();
      return;
    }

    const entry = await this.buildEntry(decodedText);
    this.scans.unshift(entry);
    this.renderScans();

    const feedback = document.getElementById('scan-feedback');
    const msg = document.getElementById('feedback-message');
    feedback.classList.remove('hidden', 'error');
    msg.textContent = decodedText.substring(0, 60);
    setTimeout(() => feedback.classList.add('hidden'), 3000);

    // Si el texto coincide con un expediente, mostrarlo
    const record = Vault.findByQR(decodedText);
    if (record) {
      Vault.showDetail(record);
      UI.showNotification('📂 Expediente encontrado: ' + record.number);
    }
  },

  async buildEntry(text) {
    const activeColumns = [...document.querySelectorAll('[data-col]:checked')].map(el => el.dataset.col);
    const entry = { id: Utils.uuid() };

    if (activeColumns.includes('text')) entry.text = text;
    if (activeColumns.includes('datetime')) entry.datetime = new Date().toLocaleString('es-MX');
    if (activeColumns.includes('label')) entry.label = document.getElementById('scan-label').value || '';
    if (activeColumns.includes('number')) entry.number = this.scans.length + 1;

    if (activeColumns.includes('geo') && document.getElementById('geo-option').value === 'on') {
      try {
        const loc = await Utils.getLocation();
        entry.geo = `${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`;
      } catch {
        entry.geo = 'no disponible';
      }
    }

    this.customColumns.forEach(col => { entry[col.name] = ''; });
    return entry;
  },

  renderScans() {
    const list = document.getElementById('scans-list');
    const count = document.getElementById('scan-count');
    count.textContent = `(${this.scans.length})`;

    if (this.scans.length === 0) {
      list.innerHTML = '<p class="empty">Los escaneos aparecerán aquí</p>';
      return;
    }

    list.innerHTML = this.scans.slice(0, 50).map(s => `
      <div class="scan-item">
        <div>
          <span class="scan-data">${(s.text || '').substring(0, 40)}</span>
          ${s.label ? `<span class="preset-tag" style="margin-left:8px">${s.label}</span>` : ''}
        </div>
        <small style="color:var(--text-muted)">${s.datetime || ''}</small>
      </div>
    `).join('');
  },

  async sendData() {
    if (this.scans.length === 0) {
      UI.showNotification('⚠️ No hay datos que enviar', 'error');
      return;
    }
    const url = document.getElementById('sheetdb-url').value;
    if (!url) {
      UI.showNotification('⚠️ Configura la URL de SheetDB primero', 'error');
      return;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: this.scans })
      });
      if (res.ok) {
        UI.showNotification('✅ Datos enviados a Google Sheets');
        this.scans = [];
        this.renderScans();
      } else throw new Error('Error HTTP ' + res.status);
    } catch (e) {
      UI.showNotification('❌ Error al enviar: ' + e.message, 'error');
    }
  },

  exportCSV() {
    if (this.scans.length === 0) { UI.showNotification('Sin datos para exportar', 'error'); return; }
    const csv = Utils.toCSV(this.scans);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `escaneos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  },

  clearScans() {
    if (!confirm('¿Limpiar todos los escaneos?')) return;
    this.scans = [];
    this.renderScans();
  },

  toggleGeo(val) {
    if (val === 'on' && !navigator.geolocation) {
      UI.showNotification('Geolocalización no disponible', 'error');
      document.getElementById('geo-option').value = 'off';
    }
  },

  saveAPIConfig() {
    const url = document.getElementById('sheetdb-url').value;
    if (url) {
      localStorage.setItem('sheetdb_url', url);
      UI.showNotification('✅ URL guardada');
    }
  },

  addColumn() {
    const name = prompt('Nombre de la nueva columna:');
    if (!name) return;
    this.customColumns.push({ name });
    UI.showNotification('✅ Columna agregada: ' + name);
  },

  addPreset() {
    const val = document.getElementById('new-preset').value.trim();
    if (!val) return;
    this.presets.push(val);
    this.renderPresets();
    document.getElementById('new-preset').value = '';
    this.updateLabelSelect();
  },

  removePreset(name) {
    this.presets = this.presets.filter(p => p !== name);
    this.renderPresets();
    this.updateLabelSelect();
  },

  renderPresets() {
    const list = document.getElementById('preset-labels');
    list.innerHTML = this.presets.map(p =>
      `<span class="preset-tag">${p} <button onclick="Scanner.removePreset('${p}')">×</button></span>`
    ).join('');
  },

  updateLabelSelect() {
    const sel = document.getElementById('label-preset');
    sel.innerHTML = '<option value="">Predefinidas...</option>' +
      this.presets.map(p => `<option value="${p}">${p}</option>`).join('');
  },

  activateForLoan() {
    this.loanMode = true;
    UI.showNotification('📷 Escanea el QR del expediente...');
    this.start();
  },

  init() {
    const savedUrl = localStorage.getItem('sheetdb_url');
    if (savedUrl) document.getElementById('sheetdb-url').value = savedUrl;
  }
};
