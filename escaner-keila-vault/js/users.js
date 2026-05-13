/**
 * USERS.JS — Administración de usuarios autorizados
 * Solo accesible para rol admin
 */
const UsersView = {

  filterText: '',
  filterRole: '',

  render() {
    // Mostrar/ocultar pestaña según rol
    const tab = document.getElementById('tab-users');
    if (tab) tab.style.display = Auth.isAdmin() ? '' : 'none';

    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    const emails  = Auth.allowedEmails || {};
    let entries = Object.entries(emails);

    // Aplicar filtros
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      entries = entries.filter(([e]) => e.toLowerCase().includes(q));
    }
    if (this.filterRole) {
      entries = entries.filter(([, r]) => r === this.filterRole);
    }

    // Actualizar contador
    const counter = document.getElementById('users-count');
    if (counter) counter.textContent = Object.keys(emails).length + ' usuarios · ' + entries.length + ' mostrados';

    if (!entries.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted)">
        ${this.filterText||this.filterRole ? '🔍 Sin resultados para el filtro' : '📋 Sin usuarios registrados'}</td></tr>`;
      return;
    }

    const roleLabel = { admin:'⚙️ Admin', archivist:'📂 Archivist', viewer:'👁 Viewer' };
    const roleCls   = { admin:'role-admin', archivist:'role-archivist', viewer:'role-viewer' };
    const currentEmail = Auth.currentUser?.email || '';

    tbody.innerHTML = entries
      .sort((a,b) => {
        // Admins primero, luego por correo
        if (a[1]==='admin' && b[1]!=='admin') return -1;
        if (a[1]!=='admin' && b[1]==='admin') return 1;
        return a[0].localeCompare(b[0]);
      })
      .map(([email, role]) => {
        const isMe = email === currentEmail;
        const initials = email.split('.')[0].slice(0,2).toUpperCase();
        const avatarColor = role==='admin'?'#dc2626':role==='archivist'?'#2563eb':'#16a34a';
        return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor};
                          color:#fff;display:flex;align-items:center;justify-content:center;
                          font-size:.72rem;font-weight:700;flex-shrink:0">${initials}</div>
              <div>
                <div style="font-weight:600;font-size:.85rem">${email}</div>
                ${isMe ? '<div style="font-size:.72rem;color:var(--text-muted)">← sesión actual</div>' : ''}
              </div>
            </div>
          </td>
          <td>
            <span class="role-pill ${roleCls[role]||'role-viewer'}">${roleLabel[role]||role}</span>
          </td>
          <td style="color:var(--text-muted);font-size:.78rem">
            ${role==='admin'?'Acceso total al sistema':role==='archivist'?'Gestión de expedientes y préstamos':'Solo consulta'}
          </td>
          <td>
            <div class="row-actions">
              <button onclick="UsersView.showEdit('${email}','${role}')" title="Cambiar rol">✏️</button>
              ${!isMe
                ? `<button onclick="UsersView.confirmRemove('${email}')" style="color:#dc2626" title="Revocar acceso">🗑</button>`
                : `<button disabled style="opacity:.3;cursor:default" title="No puedes eliminarte a ti mismo">🗑</button>`}
            </div>
          </td>
        </tr>`;
      }).join('');
  },

  // ── Agregar usuario ────────────────────────────────────────────────
  showAdd() {
    document.getElementById('user-modal-title').textContent  = '➕ Otorgar Acceso';
    document.getElementById('user-modal-btn').textContent    = '✅ Otorgar acceso';
    document.getElementById('new-user-email').value          = '';
    document.getElementById('new-user-email').disabled       = false;
    document.getElementById('new-user-role').value           = 'viewer';
    document.getElementById('user-modal-mode').value         = 'add';
    UI.showModal('user-modal');
    setTimeout(()=>document.getElementById('new-user-email').focus(), 100);
  },

  // ── Editar rol ────────────────────────────────────────────────────
  showEdit(email, role) {
    document.getElementById('user-modal-title').textContent  = '✏️ Cambiar Rol';
    document.getElementById('user-modal-btn').textContent    = '✅ Guardar cambio';
    document.getElementById('new-user-email').value          = email;
    document.getElementById('new-user-email').disabled       = true;
    document.getElementById('new-user-role').value           = role;
    document.getElementById('user-modal-mode').value         = 'edit';
    UI.showModal('user-modal');
  },

  // ── Confirmar modal ───────────────────────────────────────────────
  confirmModal() {
    const email = document.getElementById('new-user-email').value.trim().toLowerCase();
    const role  = document.getElementById('new-user-role').value;
    const mode  = document.getElementById('user-modal-mode').value;

    if (!email) { UI.showNotification('Escribe un correo', 'error'); return; }

    if (mode === 'add') {
      if (!email.endsWith('@tec.mx')) {
        UI.showNotification('⛔ Solo correos @tec.mx', 'error'); return;
      }
      if (Auth.allowedEmails[email]) {
        UI.showNotification('⚠️ Este correo ya tiene acceso', 'error'); return;
      }
      Auth.addAllowedEmail(email, role);
    } else {
      Auth.allowedEmails[email] = role;
      localStorage.setItem('vault_allowed_emails', JSON.stringify(Auth.allowedEmails));
      UI.showNotification('✅ Rol actualizado: ' + email);
    }

    UI.closeModal('user-modal');
    this.render();
  },

  // ── Eliminar con confirmación ─────────────────────────────────────
  confirmRemove(email) {
    // Mostrar modal de confirmación
    document.getElementById('confirm-remove-email').textContent = email;
    document.getElementById('pending-remove-email').value       = email;
    UI.showModal('confirm-remove-modal');
  },

  executeRemove() {
    const email = document.getElementById('pending-remove-email').value;
    Auth.removeAllowedEmail(email);
    UI.closeModal('confirm-remove-modal');
    this.render();
    UI.showNotification('🗑️ Acceso revocado: ' + email);
  },

  // ── Filtros ───────────────────────────────────────────────────────
  applyFilter() {
    this.filterText = document.getElementById('users-search')?.value || '';
    this.filterRole = document.getElementById('users-filter-role')?.value || '';
    this.render();
  },

  // ── Exportar lista ────────────────────────────────────────────────
  exportList() {
    const rows = Object.entries(Auth.allowedEmails||{}).map(([email,role])=>({email,rol:role}));
    if (!rows.length) { UI.showNotification('Sin usuarios para exportar','error'); return; }
    const csv = 'email,rol\n' + rows.map(r=>r.email+','+r.rol).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'usuarios_autorizados_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    UI.showNotification('✅ Lista exportada');
  },

  // ── Importar lista desde CSV ──────────────────────────────────────
  importList() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.split('\n').filter(Boolean).slice(1);
        let count = 0;
        lines.forEach(line => {
          const [email, role] = line.split(',').map(s=>s.trim().toLowerCase());
          if (email && email.endsWith('@tec.mx') && ['admin','archivist','viewer'].includes(role)) {
            Auth.allowedEmails[email] = role; count++;
          }
        });
        localStorage.setItem('vault_allowed_emails', JSON.stringify(Auth.allowedEmails));
        this.render();
        UI.showNotification('✅ '+count+' usuarios importados');
      };
      reader.readAsText(file);
    };
    input.click();
  }
};
