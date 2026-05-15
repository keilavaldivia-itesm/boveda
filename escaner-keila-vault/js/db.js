/**
 * DB.JS — Capa de datos con Google Apps Script
 * 100% gratuito, sin límites, conectado directo a Google Sheets
 *
 * Reemplaza SheetDB por una API propia desplegada en Apps Script.
 * Configurar APPS_SCRIPT_URL con la URL de tu Web App desplegada.
 */
const DB = {
  // ← Pegar aquí la URL del Web App después de desplegar en Apps Script
  URL: 'https://script.google.com/macros/s/AKfycbyBp84lexZ-5Rvvern_2mZlXjSWy15KxJ8ktNg4v08KwJOcl2RtgSERJ7kkVXSkbvImoQ/exec',

  _cache: {},
  _loggedCols: false,

  // ── Petición GET ────────────────────────────────────────────────────
  async get(sheet) {
    try {
      const res  = await fetch(`${this.URL}?sheet=${sheet}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error desconocido');
      this._cache[sheet] = json.data;
      return json.data || [];
    } catch(e) {
      console.warn(`DB.get(${sheet}) falló, usando cache:`, e.message);
      return this._cache[sheet] || [];
    }
  },

  // ── Petición POST (acción) ──────────────────────────────────────────
  async post(action, sheet, payload) {
    const res = await fetch(this.URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, sheet, ...payload }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error en Apps Script');
    return json.result;
  },

  // ── Helpers ────────────────────────────────────────────────────────

  // USUARIOS
  async getUsuarios() {
    const rows = await this.get('usuarios');
    return rows.map(r => ({
      email:  r.email  || '',
      role:   r.role   || r.rol || 'viewer',
      nombre: r.nombre || '',
      activo: r.activo !== '0' ? '1' : '0',
    }));
  },

  async addUsuario(email, role, nombre) {
    return this.post('insert', 'usuarios', {
      data: { email, role, nombre: nombre||'', activo: '1', createdAt: new Date().toISOString() }
    });
  },

  async updateUsuarioRole(email, role) {
    // Buscar por email y actualizar
    const rows = await this.get('usuarios');
    const user = rows.find(r => (r.email||'').toLowerCase() === email.toLowerCase());
    if (!user?.id) throw new Error('Usuario no encontrado: ' + email);
    return this.post('update', 'usuarios', { id: user.id, data: { role } });
  },

  async deleteUsuario(email) {
    const rows = await this.get('usuarios');
    const user = rows.find(r => (r.email||'').toLowerCase() === email.toLowerCase());
    if (!user?.id) throw new Error('Usuario no encontrado: ' + email);
    return this.post('delete', 'usuarios', { id: user.id });
  },

  // EXPEDIENTES
  async getExpedientes() {
    const rows = await this.get('expedientes');
    if (rows.length && !this._loggedCols) {
      console.log('📊 Columnas en Sheets:', Object.keys(rows[0]).join(', '));
      this._loggedCols = true;
    }
    return rows;
  },

  async saveExpediente(record) {
    return this.post('insert', 'expedientes', {
      data: {
        id:              record.id,
        number:          record.number,
        matricula:       record.matricula,
        nombre:          record.nombre,
        apellido1:       record.apellido1,
        apellido2:       record.apellido2,
        carrera:         record.carrera    || '',
        anio:            record.anio       || '',
        titulo:          record.titulo     || '',
        series:          record.series,
        location:        record.location,
        status:          record.status,
        accessLevel:     record.accessLevel|| 'restringido',
        createdAt:       record.createdAt,
        createdBy:       record.createdBy  || '',
        retentionYears:  record.retention?.years   || '',
        retentionAction: record.retention?.action  || '',
        retentionExpiry: record.retention?.expiryDate || '',
        retentionBasis:  record.retention?.basis   || '',
        checksum:        record.checksum   || '',
        version:         record.version    || 1,
      }
    });
  },

  async updateExpediente(id, fields) {
    return this.post('update', 'expedientes', { id, data: fields });
  },

  async deleteExpediente(id) {
    return this.post('delete', 'expedientes', { id });
  },

  // PRÉSTAMOS
  async getPrestamos() {
    return this.get('prestamos');
  },

  async savePrestamo(loan) {
    return this.post('insert', 'prestamos', {
      data: {
        id:           loan.id,
        recordId:     loan.recordId,
        recordNumber: loan.recordNumber,
        requester:    loan.requester,
        authorizedBy: loan.authorizedBy || '',
        department:   loan.department,
        reason:       loan.reason,
        startDate:    loan.startDate,
        endDate:      loan.endDate,
        status:       loan.status,
        createdAt:    loan.createdAt,
        createdBy:    loan.createdBy || '',
      }
    });
  },

  async updatePrestamo(id, fields) {
    return this.post('update', 'prestamos', { id, data: fields });
  },

  // ── Verificar conexión ──────────────────────────────────────────────
  async ping() {
    try {
      const res = await fetch(`${this.URL}?sheet=usuarios`);
      return res.ok;
    } catch { return false; }
  },

  isConfigured() {
    return this.URL !== 'APPS_SCRIPT_URL_AQUI' && this.URL.includes('script.google.com');
  },
};
