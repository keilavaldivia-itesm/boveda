/**
 * AUTH.JS — Autenticación con Google OAuth + roles institucionales
 * Dominio restringido: tec.mx
 * Client ID: 536455335373-8b1vhm7d1i5c17ck9av8laatd93ug5as.apps.googleusercontent.com
 */

// Objeto App para inicialización diferida (definido aquí para estar disponible)
const App = {
  initializeAfterLogin() {
    try { Vault.init(); }   catch(e) { console.warn('Vault:', e); }
    try { Loan.init(); }    catch(e) { console.warn('Loan:', e); }
    try { Scanner.init(); } catch(e) { console.warn('Scanner:', e); }
    try { Dashboard.render(); } catch(e) { console.warn('Dashboard:', e); }
    try { Sheet.filtered=[...(Vault.records||[])]; Sheet._applySort(); } catch(e) {}
    try { UsersView.render(); } catch(e) {}
    
    // Mostrar dashboard por defecto después del login
    Views.show('dashboard');
  }
};

const Auth = {
  currentUser: null,
  GOOGLE_CLIENT_ID: '536455335373-8b1vhm7d1i5c17ck9av8laatd93ug5as.apps.googleusercontent.com',
  ALLOWED_DOMAIN: 'tec.mx',

  // ── Lista blanca de correos autorizados ──────────────────────────────
  allowedEmails: {
    'lupita.lopez@tec.mx':     'admin',
    'keila.valdivia@tec.mx':   'admin',
    'anacris.sigala@tec.mx':   'admin',
    'cesar.parra@tec.mx':      'admin',
    'claudia.guerrero@tec.mx': 'admin',
  },

  // Usuarios demo para pruebas sin Google
  demoUsers: [
    { id:'demo-1', name:'Admin Demo',     email:'admin@tec.mx',    role:'admin',     picture:null },
    { id:'demo-2', name:'Archivista Demo',email:'archivo@tec.mx',  role:'archivist', picture:null },
    { id:'demo-3', name:'Consulta Demo',  email:'consulta@tec.mx', role:'viewer',    picture:null },
  ],

  init() {
    // Cargar lista de correos guardada
    this.loadAllowedEmails();
    // Recuperar sesión guardada
    const saved = localStorage.getItem('vault_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        // Verificar que no haya expirado (8 horas)
        if (session.exp && new Date(session.exp) > new Date()) {
          this.currentUser = session.user;
          UI.updateAuthUI(true);
          // Inicializar aplicación si hay sesión válida
          App.initializeAfterLogin();
          return;
        } else {
          localStorage.removeItem('vault_session');
        }
      } catch {}
    }
    UI.updateAuthUI(false);
  },

  // ── Google Sign-In callback ─────────────────────────────────────────
  handleGoogleCredential(response) {
    try {
      // Decodificar JWT de Google (sin verificar firma en cliente — OK para UI)
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const email   = payload.email || '';
      const domain  = email.split('@')[1] || '';

      // 1. Verificar dominio
      if (domain !== this.ALLOWED_DOMAIN) {
        UI.showNotification('⛔ Solo se permite acceso con correo @' + this.ALLOWED_DOMAIN, 'error');
        UI.closeModal('login-modal');
        return;
      }

      // 2. Verificar lista blanca
      const role = this.allowedEmails[email];
      if (!role) {
        UI.showNotification('⛔ Tu cuenta no tiene acceso autorizado. Contacta al administrador.', 'error');
        UI.closeModal('login-modal');
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
      UI.closeModal('login-modal');
      UI.updateAuthUI(true);
      
      // Inicializar la aplicación después del login exitoso
      App.initializeAfterLogin();
      
      UI.showNotification('✅ Bienvenido/a, ' + payload.name.split(' ')[0]);

    } catch (e) {
      UI.showNotification('❌ Error al verificar credenciales de Google', 'error');
      console.error('Google auth error:', e);
    }
  },

  _inferRole(email) {
    // Para demo users — busca en allowedEmails primero
    return this.allowedEmails[email] || 'viewer';
  },

  // ── Gestión de lista blanca (solo admins) ─────────────────────────
  addAllowedEmail(email, role) {
    if (!Auth.isAdmin()) { UI.showNotification('⛔ Solo administradores', 'error'); return; }
    if (!email.endsWith('@' + this.ALLOWED_DOMAIN)) {
      UI.showNotification('⛔ El correo debe ser @' + this.ALLOWED_DOMAIN, 'error'); return;
    }
    this.allowedEmails[email] = role || 'viewer';
    localStorage.setItem('vault_allowed_emails', JSON.stringify(this.allowedEmails));
    UI.showNotification('✅ Acceso otorgado a ' + email);
  },

  removeAllowedEmail(email) {
    if (!Auth.isAdmin()) { UI.showNotification('⛔ Solo administradores', 'error'); return; }
    delete this.allowedEmails[email];
    localStorage.setItem('vault_allowed_emails', JSON.stringify(this.allowedEmails));
    UI.showNotification('🗑️ Acceso revocado: ' + email);
  },

  loadAllowedEmails() {
    const saved = localStorage.getItem('vault_allowed_emails');
    if (saved) { try { Object.assign(this.allowedEmails, JSON.parse(saved)); } catch {} }
  },

  // ── Login demo (sin Google) ─────────────────────────────────────────
  handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.toLowerCase();
    const pass  = document.getElementById('login-password').value;

    const demo = this.demoUsers.find(u => u.email === email);
    if (demo && pass === 'demo1234') {
      this.currentUser = { ...demo };
      this._saveSession();
      UI.closeModal('login-modal');
      UI.updateAuthUI(true);
      
      // Inicializar la aplicación después del login exitoso
      App.initializeAfterLogin();
      
      UI.showNotification('✅ Sesión demo iniciada como ' + demo.role);
    } else {
      UI.showNotification('❌ Credenciales incorrectas. Demo: demo1234', 'error');
    }
  },

  ssoLogin(event) {
    event.preventDefault();
    // Disparar el flujo de Google si está cargado
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.prompt();
    } else {
      UI.showNotification('⚠️ Cargando Google Sign-In...', 'error');
    }
  },

  _saveSession() {
    const exp = new Date();
    exp.setHours(exp.getHours() + 8);
    localStorage.setItem('vault_session', JSON.stringify({ user: this.currentUser, exp: exp.toISOString() }));
  },

  logout() {
    if (this.currentUser?.googleAuth && typeof google !== 'undefined') {
      google.accounts.id.disableAutoSelect();
    }
    this.currentUser = null;
    localStorage.removeItem('vault_session');
    UI.updateAuthUI(false);
    UI.showNotification('👋 Sesión cerrada');
  },

  // ── Permisos ────────────────────────────────────────────────────────
  isAdmin()           { return this.currentUser?.role === 'admin'; },
  isArchivist()       { return ['admin','archivist'].includes(this.currentUser?.role); },
  canManageRecords()  { return this.isArchivist(); },
  canRequestLoans()   { return !!this.currentUser; },
};
