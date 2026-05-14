/**
 * DB.JS — Capa de datos con Google Sheets via SheetDB
 * URL base: https://sheetdb.io/api/v1/cz81qsf3gp08j
 * Hojas: usuarios | expedientes | prestamos
 */
const DB = {
  BASE: 'https://sheetdb.io/api/v1/cz81qsf3gp08j',
  // Cache local para velocidad
  _cache: { usuarios: null, expedientes: null, prestamos: null },

  // ── GET ───────────────────────────────────────────────────────────────
  async get(sheet) {
    try {
      const res = await fetch(`${this.BASE}?sheet=${sheet}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      this._cache[sheet] = data;
      return data;
    } catch(e) {
      console.warn(`DB.get(${sheet}) falló, usando cache:`, e.message);
      return this._cache[sheet] || [];
    }
  },

  // ── POST (crear) ──────────────────────────────────────────────────────
  async post(sheet, row) {
    try {
      const res = await fetch(`${this.BASE}?sheet=${sheet}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [row] })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      console.error(`DB.post(${sheet}) error:`, e.message);
      throw e;
    }
  },

  // ── PUT (actualizar por id) ───────────────────────────────────────────
  async put(sheet, id, row) {
    try {
      const res = await fetch(`${this.BASE}/id/${id}?sheet=${sheet}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: row })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      console.error(`DB.put(${sheet}) error:`, e.message);
      throw e;
    }
  },

  // ── DELETE ────────────────────────────────────────────────────────────
  async delete(sheet, id) {
    try {
      const res = await fetch(`${this.BASE}/id/${id}?sheet=${sheet}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      console.error(`DB.delete(${sheet}) error:`, e.message);
      throw e;
    }
  },

  // ── BUSCAR por campo ──────────────────────────────────────────────────
  async search(sheet, field, value) {
    try {
      const res = await fetch(`${this.BASE}/search?sheet=${sheet}&${field}=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      console.error(`DB.search error:`, e.message);
      return [];
    }
  },

  // ── Helpers específicos ───────────────────────────────────────────────

  // USUARIOS
  async getUsuarios() {
    const rows = await this.get('usuarios');
    return rows.map(r => ({ email: r.email, role: r.role, nombre: r.nombre||'', activo: r.activo||'1' }));
  },

  async addUsuario(email, role, nombre) {
    return this.post('usuarios', { email, role, nombre: nombre||'', activo: '1', createdAt: new Date().toISOString() });
  },

  async updateUsuarioRole(email, role) {
    const rows = await this.search('usuarios', 'email', email);
    if (!rows.length) throw new Error('Usuario no encontrado');
    const id = rows[0].id;
    return this.put('usuarios', id, { role });
  },

  async deleteUsuario(email) {
    const rows = await this.search('usuarios', 'email', email);
    if (!rows.length) throw new Error('Usuario no encontrado');
    return this.delete('usuarios', rows[0].id);
  },

  // EXPEDIENTES
  async getExpedientes() {
    return this.get('expedientes');
  },

  async saveExpediente(record) {
    // Aplanar el objeto para Sheets (sin objetos anidados)
    const row = {
      id:           record.id,
      number:       record.number,
      matricula:    record.matricula,
      nombre:       record.nombre,
      apellido1:    record.apellido1,
      apellido2:    record.apellido2,
      carrera:      record.carrera||'',
      anio:         record.anio||'',
      titulo:       record.titulo||'',
      series:       record.series,
      location:     record.location,
      status:       record.status,
      accessLevel:  record.accessLevel||'restringido',
      createdAt:    record.createdAt,
      createdBy:    record.createdBy||'',
      retentionYears:  record.retention?.years||'',
      retentionAction: record.retention?.action||'',
      retentionExpiry: record.retention?.expiryDate||'',
      retentionBasis:  record.retention?.basis||'',
      checksum:     record.checksum||'',
      version:      record.version||1,
    };
    return this.post('expedientes', row);
  },

  async updateExpediente(id, fields) {
    return this.put('expedientes', id, fields);
  },

  async deleteExpediente(id) {
    return this.delete('expedientes', id);
  },

  // PRÉSTAMOS
  async getPrestamos() {
    return this.get('prestamos');
  },

  async savePrestamo(loan) {
    const row = {
      id:            loan.id,
      recordId:      loan.recordId,
      recordNumber:  loan.recordNumber,
      requester:     loan.requester,
      authorizedBy:  loan.authorizedBy||'',
      department:    loan.department,
      reason:        loan.reason,
      startDate:     loan.startDate,
      endDate:       loan.endDate,
      status:        loan.status,
      createdAt:     loan.createdAt,
      createdBy:     loan.createdBy||'',
    };
    return this.post('prestamos', row);
  },

  async updatePrestamo(id, fields) {
    return this.put('prestamos', id, fields);
  },
};
