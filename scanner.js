/* Escáner Keila - Estilos base (preservados) */
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --success: #16a34a;
  --warning: #ca8a04;
  --danger: #dc2626;
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-muted: #64748b;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left h1 {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-vault {
  background: var(--primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg);
  border-radius: 20px;
  font-size: 0.875rem;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  background: var(--primary);
  color: white;
}

/* Botones */
.btn-primary, .btn-secondary, .btn-outline, .btn-danger, .btn-sm, .btn-xs, .btn-text {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: var(--primary);
  color: white;
}
.btn-primary:hover { background: var(--primary-hover); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-secondary:hover { background: #e2e8f0; }

.btn-outline {
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
}
.btn-outline:hover { background: #eff6ff; }

.btn-danger {
  background: var(--danger);
  color: white;
}
.btn-danger:hover { opacity: 0.9; }

.btn-sm { padding: 4px 10px; font-size: 0.8rem; border-radius: 6px; }
.btn-xs { padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; }
.btn-text { background: none; color: var(--text-muted); padding: 4px 8px; }
.btn-text:hover { color: var(--primary); }

.btn-block { width: 100%; justify-content: center; }

/* Contenedor principal */
.app-container {
  display: flex;
  min-height: calc(100vh - 60px);
}

/* Scanner Section */
.scanner-section {
  flex: 1;
  padding: 20px;
  max-width: 100%;
  overflow-x: hidden;
}

.camera-container {
  background: var(--surface);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  text-align: center;
  border: 1px solid var(--border);
}

.qr-reader {
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.camera-placeholder {
  padding: 40px 20px;
  color: var(--text-muted);
}

.scan-feedback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  margin-top: 12px;
  background: #f0fdf4;
  border-radius: 8px;
  color: var(--success);
  font-weight: 500;
}
.scan-feedback.hidden { display: none; }
.scan-feedback.error { background: #fef2f2; color: var(--danger); }

/* Controles del scanner */
.scanner-controls {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  align-items: end;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.control-group label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}
.control-group input, .control-group select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
}

/* Resultados de escaneos */
.scan-results {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.results-header h4 { font-size: 1rem; }
.results-actions { display: flex; gap: 8px; }

.scans-list {
  max-height: 200px;
  overflow-y: auto;
}
.scan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}
.scan-item:last-child { border-bottom: none; }
.scan-data { font-family: monospace; font-size: 0.8rem; color: var(--text-muted); }

.empty { color: var(--text-muted); font-style: italic; }

/* Configuración (details/summary) */
.columns-config, .labels-config, .scan-options, .api-config {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}
.columns-config details, .labels-config details, 
.scan-options details, .api-config details {
  cursor: pointer;
}
.columns-config summary, .labels-config summary,
.scan-options summary, .api-config summary {
  font-weight: 600;
  margin-bottom: 12px;
  list-style: none;
}
.columns-config summary::-webkit-details-marker,
.labels-config summary::-webkit-details-marker,
.scan-options summary::-webkit-details-marker,
.api-config summary::-webkit-details-marker {
  display: none;
}

.columns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.columns-grid label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.preset-tag {
  background: var(--bg);
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 4px;
}
.preset-tag button {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
.preset-tag button:hover { color: var(--danger); }

.add-preset {
  display: flex;
  gap: 8px;
}
.add-preset input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 0.9rem;
}
.toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-row {
  display: flex;
  gap: 10px;
}
.form-row input { flex: 1; }

/* Modales */
.modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal.hidden { display: none; }

.modal-content {
  background: var(--surface);
  border-radius: 12px;
  padding: 20px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-content.large { max-width: 800px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.modal-header h3 { font-size: 1.1rem; }
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
  line-height: 1;
}
.close-btn:hover { color: var(--text); }

/* Formularios en modales */
.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 6px;
  font-size: 0.9rem;
}
.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.form-static {
  padding: 10px 12px;
  background: var(--bg);
  border-radius: 8px;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.sso-link {
  text-align: center;
  margin-top: 12px;
  font-size: 0.9rem;
}
.sso-link a { color: var(--primary); text-decoration: none; }
.sso-link a:hover { text-decoration: underline; }

/* Área de confirmación QR */
.qr-confirm-area {
  border: 2px dashed var(--primary);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  background: #eff6ff;
}
.scan-status {
  margin-top: 8px;
  font-size: 0.875rem;
  color: var(--text-muted);
}
.scan-status.success { color: var(--success); font-weight: 500; }
.scan-status.error { color: var(--danger); font-weight: 500; }

/* Vista previa QR */
.qr-preview-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}
#qr-canvas {
  border: 1px solid var(--border);
  border-radius: 8px;
}
.qr-data-text {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  word-break: break-all;
  max-width: 100%;
}

/* Notificaciones */
.notification-area {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.notification {
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--surface);
  border-left: 4px solid var(--primary);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideIn 0.3s ease;
  max-width: 350px;
}
.notification.success { border-left-color: var(--success); }
.notification.error { border-left-color: var(--danger); }
.notification.warning { border-left-color: var(--warning); }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Utilidades */
.hidden { display: none !important; }
.text-center { text-align: center; }
.mt-2 { margin-top: 8px; }
.mb-2 { margin-bottom: 8px; }
