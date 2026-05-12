// Módulo de autenticación y gestión de roles

const Auth = {
  // Roles disponibles
  roles: {
    ADMIN: 'admin',
    ARCHIVIST: 'archivist', 
    CONSULTANT: 'consultant',
    REQUESTER: 'requester'
  },
  
  // Usuario actual
  currentUser: null,
  
  // Verificar si hay sesión activa
  init() {
    const saved = sessionStorage.getItem('vault_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        UI.updateAuthUI(true);
        return true;
      } catch (e) {
        this.logout();
      }
    }
    return false;
  },
  
  // Manejar login del formulario
  async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
      // Validación básica (en producción, usar backend)
      if (!Utils.isValidUniversityEmail(email)) {
        throw new Error('Use su correo institucional');
      }
      
      if (password.length < 6) {
        throw new Error('Contraseña muy corta');
      }
      
      // Simular respuesta del servidor (REEMPLAZAR con llamada real)
      const user = {
        id: Utils.uuid(),
        email: email,
        name: email.split('@')[0],
        role: email.includes('admin') ? this.roles.ADMIN : 
              email.includes('archivo') ? this.roles.ARCHIVIST :
              email.includes('consulta') ? this.roles.CONSULTANT :
              this.roles.REQUESTER,
        department: 'General',
        token: 'mock_token_' + Utils.uuid()
      };
      
      // Guardar sesión
      this.currentUser = user;
      sessionStorage.setItem('vault_user', JSON.stringify(user));
      
      // Actualizar UI
      UI.updateAuthUI(true);
      UI.closeModal('login-modal');
      UI.showNotification('✅ Sesión iniciada como ' + user.name);
      
      // Resetear formulario
      event.target.reset();
      
    } catch (error) {
      UI.showNotification('❌ ' + error.message, 'error');
    }
  },
  
  // Login SSO institucional
  async ssoLogin(event) {
    event?.preventDefault();
    
    // En producción: redirigir a proveedor OAuth
    // window.location.href = 'https://sso.universidad.edu.mx/oauth/authorize?client_id=keila_vault&redirect_uri=' + encodeURIComponent(window.location.href);
    
    // Demo: simular login exitoso
    this.currentUser = {
      id: Utils.uuid(),
      email: 'demo@universidad.edu.mx',
      name: 'Usuario Demo',
      role: this.roles.ARCHIVIST,
      department: 'Archivo Central',
      token: 'sso_token_' + Utils.uuid()
    };
    
    sessionStorage.setItem('vault_user', JSON.stringify(this.currentUser));
    UI.updateAuthUI(true);
    UI.closeModal('login-modal');
    UI.showNotification('✅ Conectado vía SSO');
  },
  
  // Cerrar sesión
  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('vault_user');
    UI.updateAuthUI(false);
    UI.showNotification('👋 Sesión cerrada');
    
    // Ocultar panel de bóveda si está abierto
    if (!document.getElementById('vault-panel').classList.contains('hidden')) {
      Vault.togglePanel();
    }
  },
  
  // Verificar permisos
  hasRole(...roles) {
    if (!this.currentUser) return false;
    return roles.includes(this.currentUser.role);
  },
  
  // Verificar si es admin
  isAdmin() {
    return this.hasRole(this.roles.ADMIN);
  },
  
  // Verificar si puede gestionar expedientes
  canManageRecords() {
    return this.hasRole(this.roles.ADMIN, this.roles.ARCHIVIST);
  },
  
  // Verificar si puede solicitar préstamos
  canRequestLoans() {
    return this.currentUser !== null; // Todos los roles autenticados
  }
};

// Inicializar al cargar la app
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
