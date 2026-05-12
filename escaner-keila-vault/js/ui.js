// Módulo de interfaz de usuario
const UI = {
  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  },

  showNotification(message, type = 'success') {
    const area = document.getElementById('notification-area');
    const note = document.createElement('div');
    note.className = `notification notification-${type}`;
    note.textContent = message;

    const style = note.style;
    style.cssText = `
      background: ${type === 'error' ? '#fef2f2' : '#f0fdf4'};
      color: ${type === 'error' ? '#dc2626' : '#16a34a'};
      border: 1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'};
      padding: 10px 16px;
      border-radius: 8px;
      margin-top: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      animation: slideIn 0.2s ease;
      cursor: pointer;
    `;

    note.onclick = () => note.remove();
    area.appendChild(note);
    setTimeout(() => note.remove(), 4000);
  },

  updateAuthUI(loggedIn) {
    const btnLogin = document.getElementById('btn-login');
    const userBadge = document.getElementById('user-badge');
    const vaultBtn = document.getElementById('btn-vault-toggle');

    if (loggedIn && Auth.currentUser) {
      btnLogin.classList.add('hidden');
      userBadge.classList.remove('hidden');
      document.getElementById('user-name').textContent = Auth.currentUser.name;
      document.getElementById('user-role').textContent = Auth.currentUser.role;
      vaultBtn.classList.remove('hidden');
    } else {
      btnLogin.classList.remove('hidden');
      userBadge.classList.add('hidden');
      vaultBtn.classList.add('hidden');
    }
  }
};

// Add notification area styles
const notifStyle = document.createElement('style');
notifStyle.textContent = `
  .notification-area {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  @keyframes slideIn {
    from { opacity:0; transform:translateX(20px); }
    to { opacity:1; transform:translateX(0); }
  }

  /* Record items */
  .record-item {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
  }
  .record-item:hover { background: var(--bg); }
  .record-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .record-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }

  /* Status badges */
  .status-badge {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .status-activo { background:#dcfce7; color:#16a34a; }
  .status-prestado { background:#fef9c3; color:#ca8a04; }
  .status-transferido { background:#dbeafe; color:#2563eb; }

  /* Empty state */
  .empty-state {
    padding: 32px 16px;
    text-align: center;
    color: var(--text-muted);
  }
  .empty-state p { margin-bottom: 12px; }

  /* QR preview */
  .qr-preview-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 12px;
  }
  .qr-data-text {
    font-size: 0.85rem;
    color: var(--text-muted);
    text-align: center;
  }

  /* Progress bar */
  .progress {
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 6px;
  }
  .progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 4px;
    transition: width 0.3s;
  }

  /* Vault panel */
  .vault-panel {
    width: 340px;
    min-width: 340px;
    border-right: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
  }
  .vault-panel.hidden { display: none !important; }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--surface);
    z-index: 10;
  }
  .panel-actions { display: flex; gap: 6px; }
  .filters-section {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom: 1px solid var(--border);
  }
  .filters-section select, .filters-section input {
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.85rem;
    width: 100%;
  }
  .records-list { flex: 1; overflow-y: auto; }
  .record-detail {
    padding: 16px;
    border-top: 2px solid var(--primary);
    background: #eff6ff;
  }
  .record-detail.hidden { display: none; }
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  .detail-grid .field label {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    display: block;
    margin-bottom: 2px;
  }
  .detail-grid .field p { font-size: 0.85rem; font-weight: 500; }
  .detail-actions { display: flex; flex-wrap: wrap; gap: 6px; }
`;
document.head.appendChild(notifStyle);
