/**
 * USERS.JS — Gestión de usuarios con Google Sheets como backend
 */
const UsersView = {
  filterText: '',
  filterRole: '',
  users: [], // cache local

  render() {
    const tab = document.getElementById('tab-users');
    if (tab) tab.style.display = Auth.isAdmin() ? '' : 'none';
    if (!Auth.isAdmin()) return;
    this.loadUsers();
  },

  async loadUsers() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">⏳ Cargando usuarios...</td></tr>';

    try {
      this.users = await DB.getUsuarios();
      // Mezclar con admins hardcoded que siempre deben estar
      const hardcoded = Object.entries(Auth.allowedEmails);
      hardcoded.forEach(([email, role]) => {
        if (!this.users.find(u => u.email === email)) {
          this.users.push({ email, role, nombre: '', activo: '1', _hardcoded: true });
        }
      });
      // Sincronizar allowedEmails con Sheets
      this.users.forEach(u => { if (u.activo !== '0') Auth.allowedEmails[u.email] = u.role; });
      this._renderTable();
    } catch(e) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:#dc2626">❌ Error al cargar usuarios. Verifica la conexión.</td></tr>';
    }
  },

  _renderTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    let entries = this.users.filter(u => u.activo !== '0');

    if (this.filterText) entries = entries.filter(u => u.email.toLowerCase().includes(this.filterText.toLowerCase()));
    if (this.filterRole) entries = entries.filter(u => u.role === this.filterRole);

    const counter = document.getElementById('users-count');
    if (counter) counter.textContent = this.users.length + ' usuarios · ' + entries.length + ' mostrados';

    if (!entries.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted)">Sin usuarios que coincidan</td></tr>`;
      return;
    }

    const roleLabel = { admin:'⚙️ Admin', archivist:'📂 Archivist', viewer:'👁 Viewer' };
    const roleCls   = { admin:'role-admin', archivist:'role-archivist', viewer:'role-viewer' };
    const currentEmail = Auth.currentUser?.email || '';

    tbody.innerHTML = entries
      .sort((a,b) => { if(a.role==='admin'&&b.role!=='admin') return -1; if(a.role!=='admin'&&b.role==='admin') return 1; return a.email.localeCompare(b.email); })
      .map(u => {
        const isMe = u.email === currentEmail;
        const initials = u.email.split('.')[0].slice(0,2).toUpperCase();
        const avatarColor = u.role==='admin'?'#dc2626':u.role==='archivist'?'#2563eb':'#16a34a';
        return `<tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0">${initials}</div>
              <div>
                <div style="font-weight:600;font-size:.85rem">${u.email}</div>
                ${u.nombre?`<div style="font-size:.72rem;color:var(--text-muted)">${u.nombre}</div>`:''}
                ${isMe?'<div style="font-size:.72rem;color:var(--text-muted)">← sesión actual</div>':''}
              </div>
            </div>
          </td>
          <td><span class="role-pill ${roleCls[u.role]||'role-viewer'}">${roleLabel[u.role]||u.role}</span></td>
          <td style="color:var(--text-muted);font-size:.78rem">${u.role==='admin'?'Acceso total':u.role==='archivist'?'Gestión de expedientes':'Solo consulta'}</td>
          <td>
            <div class="row-actions">
              <button onclick="UsersView.showEdit('${u.email}','${u.role}')" title="Cambiar rol">✏️</button>
              ${!isMe?`<button onclick="UsersView.confirmRemove('${u.email}')" style="color:#dc2626" title="Revocar acceso">🗑</button>`:'<button disabled style="opacity:.3">🗑</button>'}
            </div>
          </td>
        </tr>`;
      }).join('');
  },

  showAdd() {
    document.getElementById('user-modal-title').textContent = '➕ Otorgar Acceso';
    document.getElementById('user-modal-btn').textContent   = '✅ Otorgar acceso';
    document.getElementById('new-user-email').value         = '';
    document.getElementById('new-user-email').disabled      = false;
    document.getElementById('new-user-nombre').value        = '';
    document.getElementById('new-user-role').value          = 'viewer';
    document.getElementById('user-modal-mode').value        = 'add';
    UI.showModal('user-modal');
    setTimeout(() => document.getElementById('new-user-email').focus(), 100);
  },

  showEdit(email, role) {
    document.getElementById('user-modal-title').textContent = '✏️ Cambiar Rol';
    document.getElementById('user-modal-btn').textContent   = '✅ Guardar cambio';
    document.getElementById('new-user-email').value         = email;
    document.getElementById('new-user-email').disabled      = true;
    document.getElementById('new-user-nombre').value        = this.users.find(u=>u.email===email)?.nombre||'';
    document.getElementById('new-user-role').value          = role;
    document.getElementById('user-modal-mode').value        = 'edit';
    UI.showModal('user-modal');
  },

  async confirmModal() {
    const email  = document.getElementById('new-user-email').value.trim().toLowerCase();
    const nombre = document.getElementById('new-user-nombre').value.trim();
    const role   = document.getElementById('new-user-role').value;
    const mode   = document.getElementById('user-modal-mode').value;
    if (!email) { UI.showNotification('Escribe un correo', 'error'); return; }

    const btn = document.getElementById('user-modal-btn');
    btn.disabled = true; btn.textContent = '⏳ Guardando...';

    try {
      if (mode === 'add') {
        if (!email.endsWith('@tec.mx')) { UI.showNotification('⛔ Solo @tec.mx', 'error'); btn.disabled=false; btn.textContent='✅ Otorgar acceso'; return; }
        if (this.users.find(u=>u.email===email)) { UI.showNotification('⚠️ Ya tiene acceso', 'error'); btn.disabled=false; btn.textContent='✅ Otorgar acceso'; return; }
        await DB.addUsuario(email, role, nombre);
        Auth.allowedEmails[email] = role;
        UI.showNotification('✅ Acceso otorgado: ' + email);
      } else {
        await DB.updateUsuarioRole(email, role);
        Auth.allowedEmails[email] = role;
        UI.showNotification('✅ Rol actualizado: ' + email);
      }
      UI.closeModal('user-modal');
      await this.loadUsers();
    } catch(e) {
      UI.showNotification('❌ Error al guardar: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = mode==='add'?'✅ Otorgar acceso':'✅ Guardar cambio';
    }
  },

  confirmRemove(email) {
    document.getElementById('confirm-remove-email').textContent = email;
    document.getElementById('pending-remove-email').value       = email;
    UI.showModal('confirm-remove-modal');
  },

  async executeRemove() {
    const email = document.getElementById('pending-remove-email').value;
    try {
      await DB.deleteUsuario(email);
      delete Auth.allowedEmails[email];
      UI.closeModal('confirm-remove-modal');
      UI.showNotification('🗑️ Acceso revocado: ' + email);
      await this.loadUsers();
    } catch(e) {
      UI.showNotification('❌ Error al eliminar: ' + e.message, 'error');
      UI.closeModal('confirm-remove-modal');
    }
  },

  applyFilter() {
    this.filterText = document.getElementById('users-search')?.value || '';
    this.filterRole = document.getElementById('users-filter-role')?.value || '';
    this._renderTable();
  },

  exportList() {
    if (!this.users.length) { UI.showNotification('Sin usuarios','error'); return; }
    const csv = 'email,rol,nombre\n' + this.users.map(u=>`${u.email},${u.role},${u.nombre||''}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'usuarios_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    UI.showNotification('✅ Lista exportada');
  },

  importList() {
    const input = document.createElement('input');
    input.type='file'; input.accept='.csv';
    input.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        const lines = ev.target.result.split('\n').filter(Boolean).slice(1);
        let count = 0;
        for (const line of lines) {
          const [email, role, nombre] = line.split(',').map(s=>s.trim().toLowerCase());
          if (email && email.endsWith('@tec.mx') && ['admin','archivist','viewer'].includes(role)) {
            try { await DB.addUsuario(email, role, nombre||''); Auth.allowedEmails[email]=role; count++; }
            catch {}
          }
        }
        await this.loadUsers();
        UI.showNotification('✅ '+count+' usuarios importados');
      };
      reader.readAsText(file);
    };
    input.click();
  }
};
