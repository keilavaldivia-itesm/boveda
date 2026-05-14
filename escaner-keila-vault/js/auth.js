/**
 * AUTH.JS — Autenticación con Google OAuth + lista blanca @tec.mx
 * Client ID: 536455335373-8b1vhm7d1i5c17ck9av8laatd93ug5as.apps.googleusercontent.com
 */

// ── Función global requerida por Google Identity Services ─────────────
function onGoogleSignIn(response) {
  Auth.handleGoogleCredential(response);
}

const Auth = {
  currentUser: null,
  GOOGLE_CLIENT_ID: '536455335373-8b1vhm7d1i5c17ck9av8laatd93ug5as.apps.googleusercontent.com',
  ALLOWED_DOMAIN: 'tec.mx',

  // Lista blanca de correos autorizados con su rol
  allowedEmails: {
    'lupita.lopez@tec.mx':     'admin',
    'keila.valdivia@tec.mx':   'admin',
    'anacris.sigala@tec.mx':   'admin',
    'cesar.parra@tec.mx':      'admin',
    'claudia.guerrero@tec.mx': 'admin',
  },

  // Usuarios demo para pruebas sin Google
  demoUsers: [
    { id:'d1', name:'Admin Demo',     email:'admin@tec.mx',    role:'admin' },
    { id:'d2', name:'Archivista Demo',email:'archivo@tec.mx',  role:'archivist' },
    { id:'d3', name:'Consulta Demo',  email:'consulta@tec.mx', role:'viewer' },
  ],

  init() {
    this.loadAllowedEmails();

    const saved = localStorage.getItem('boveda_itesm_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.exp && new Date(session.exp) > new Date()) {
          this.currentUser = session.user;
          this._showApp();
          return;
        }
      } catch {}
      localStorage.removeItem('boveda_itesm_session');
    }
    // Sin sesión → mostrar gate
    this._showGate();
  },

  // ── Google Sign-In callback ──────────────────────────────────────────
  handleGoogleCredential(response) {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const email   = (payload.email || '').toLowerCase();
      const domain  = email.split('@')[1] || '';

      // 1. Verificar dominio
      if (domain !== this.ALLOWED_DOMAIN) {
        this._showError('⛔ Solo se permiten cuentas @' + this.ALLOWED_DOMAIN);
        return;
      }

      // 2. Verificar lista blanca
      const role = this.allowedEmails[email];
      if (!role) {
        this._showError('⛔ Tu cuenta no tiene acceso autorizado.\nContacta al administrador del sistema.');
        return;
      }

      this.currentUser = {
        id:      payload.sub,
        name:    payload.name,
        email,
        role,
        picture: payload.picture || null,
        googleAuth: true,
      };

      this._saveSession();
      this._showApp();

    } catch (e) {
      this._showError('❌ Error al verificar credenciales. Intenta de nuevo.');
      console.error('Google auth error:', e);
    }
  },

  // ── Login demo ───────────────────────────────────────────────────────
  handleLogin(event) {
    event.preventDefault();
    const rawEmail = (document.getElementById('login-email')?.value || '').toLowerCase().trim();
    const pass     = document.getElementById('login-password')?.value || '';

    // Verificar contraseña
    if (pass !== 'demo1234') {
      this._showError('Contraseña incorrecta. Usa: demo1234');
      return;
    }

    // Normalizar email — aceptar "admin", "admin@tec.mx", etc.
    let email = rawEmail;
    if (!email.includes('@')) email = email + '@tec.mx';

    // Buscar en lista blanca primero
    let role = this.allowedEmails[email];

    // Luego en usuarios demo predefinidos
    if (!role) {
      const demo = this.demoUsers.find(u => u.email === email);
      role = demo?.role;
    }

    // Si no está en ninguna lista, dar acceso demo como admin (modo desarrollo)
    if (!role) {
      // Para que el demo funcione sin configuración previa
      role = 'admin';
    }

    this.currentUser = {
      id:      'demo-' + Date.now(),
      name:    email.split('@')[0].replace('.', ' '),
      email,
      role,
      picture: null,
      googleAuth: false,
    };

    this._saveSession();
    this._showApp();
  },

  logout() {
    if (this.currentUser?.googleAuth && typeof google !== 'undefined') {
      try { google.accounts.id.disableAutoSelect(); } catch {}
    }
    this.currentUser = null;
    localStorage.removeItem('boveda_itesm_session');
    // Detener auto-sync
    try { AutoSync.stop(); } catch {}
    this._showGate();
  },

  // ── Gate / App visibility ────────────────────────────────────────────
  _showGate() {
    document.getElementById('login-gate')?.classList.remove('hidden');
    document.getElementById('app-shell')?.classList.add('hidden');
    this._clearError();
  },

  async _showApp() {
    document.getElementById('login-gate')?.classList.add('hidden');
    document.getElementById('app-shell')?.classList.remove('hidden');
    UI.updateAuthUI(true);

    // Cargar usuarios desde Sheets y sincronizar allowedEmails
    try {
      const sheetUsers = await DB.getUsuarios();
      sheetUsers.forEach(u => {
        if (u.activo !== '0' && u.email && u.role) {
          this.allowedEmails[u.email] = u.role;
        }
      });
    } catch(e) { console.warn('No se pudo sincronizar usuarios:', e.message); }

    try { Dashboard.render(); } catch {}
    try { UsersView.render(); } catch {}

    // Arrancar auto-sync
    try { AutoSync.start(); } catch {}
  },

  _showError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  },

  _clearError() {
    const el = document.getElementById('login-error');
    if (el) el.classList.add('hidden');
  },

  _saveSession() {
    const exp = new Date();
    exp.setHours(exp.getHours() + 8);
    localStorage.setItem('boveda_itesm_session', JSON.stringify({
      user: this.currentUser,
      exp:  exp.toISOString()
    }));
  },

  // ── Gestión de lista blanca ──────────────────────────────────────────
  loadAllowedEmails() {
    const saved = localStorage.getItem('boveda_allowed_emails');
    if (saved) {
      try { Object.assign(this.allowedEmails, JSON.parse(saved)); } catch {}
    }
  },

  addAllowedEmail(email, role) {
    if (!this.isAdmin()) { UI.showNotification('⛔ Solo administradores', 'error'); return; }
    if (!email.endsWith('@' + this.ALLOWED_DOMAIN)) {
      UI.showNotification('⛔ Solo correos @' + this.ALLOWED_DOMAIN, 'error'); return;
    }
    this.allowedEmails[email] = role || 'viewer';
    localStorage.setItem('boveda_allowed_emails', JSON.stringify(this.allowedEmails));
    UI.showNotification('✅ Acceso otorgado: ' + email);
  },

  removeAllowedEmail(email) {
    if (!this.isAdmin()) { UI.showNotification('⛔ Solo administradores', 'error'); return; }
    delete this.allowedEmails[email];
    localStorage.setItem('boveda_allowed_emails', JSON.stringify(this.allowedEmails));
    UI.showNotification('🗑️ Acceso revocado: ' + email);
  },

  // ── Permisos ─────────────────────────────────────────────────────────
  isAdmin()          { return this.currentUser?.role === 'admin'; },
  isArchivist()      { return ['admin','archivist'].includes(this.currentUser?.role); },
  canManageRecords() { return this.isArchivist(); },
  canRequestLoans()  { return !!this.currentUser; },
};
