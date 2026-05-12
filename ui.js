/* Estilos específicos para gestión de bóveda */

/* Panel lateral de expedientes */
.vault-panel {
  width: 340px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  position: fixed;
  left: 0;
  top: 60px;
  z-index: 90;
  transition: transform 0.3s ease;
}

.vault-panel.hidden {
  transform: translateX(-100%);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-header h3 { font-size: 1rem; }
.panel-actions { display: flex; gap: 6px; }

/* Filtros */
.filters-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filters-section select, .filters-section input {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
}

/* Lista de expedientes */
.records-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.record-item {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.record-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}
.record-item.active {
  border-color: var(--primary);
  background: #eff6ff;
}

.record-main strong {
  display: block;
  color: var(--text);
  margin-bottom: 4px;
  font-size: 0.95rem;
}
.record-holder {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.record-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 0.75rem;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
}
.status-activo { background: #dcfce7; color: #166534; }
.status-prestado { background: #fef3c7; color: #92400e; }
.status-transferido { background: #dbeafe; color: #1e40af; }

.location-short {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 0.7rem;
}

/* Detalle de expediente */
.record-detail {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 16px;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.detail-header h4 { font-size: 1.1rem; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.detail-grid .field label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.detail-grid .field p {
  font-size: 0.9rem;
  font-weight: 500;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.detail-actions .btn-primary { grid-column: span 2; }

/* Mapa de bóveda */
.map-container {
  padding: 16px 0;
}

.location-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  flex-wrap: wrap;
}
.location-breadcrumb button {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.location-breadcrumb button:hover { background: #eff6ff; }
.location-breadcrumb span { color: var(--text-muted); }

.shelf-visual {
  background: var(--bg);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.shelf-level {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--surface);
  border-radius: 6px;
  border: 1px solid var(--border);
}
.shelf-level:last-child { margin-bottom: 0; }

.level-label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text);
  font-size: 0.9rem;
}

.boxes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
  gap: 8px;
}

.box-slot {
  border: 2px solid var(--border);
  border-radius: 6px;
  padding: 10px 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--surface);
  position: relative;
}
.box-slot:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.box-slot.selected {
  border-color: var(--primary);
  background: #eff6ff;
}
.box-slot.occupied {
  border-color: var(--warning);
  background: #fffbeb;
}
.box-slot.full {
  border-color: var(--danger);
  background: #fef2f2;
}

.box-id {
  display: block;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text);
}
.box-count {
  font-size: 0.7rem;
  color: var(--text-muted);
}
.warning-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.7rem;
}

/* Panel de detalles de caja */
.box-detail {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
}
.box-detail h4 { margin-bottom: 12px; font-size: 1rem; }
.box-detail p { 
  font-size: 0.9rem; 
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}

.progress {
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
}
.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}
.progress-fill.warning { background: var(--warning); }
.progress-fill.danger { background: var(--danger); }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
.empty-state p { margin-bottom: 12px; }

/* Responsive para móvil */
@media (max-width: 768px) {
  .vault-panel {
    width: 100%;
    max-width: 100vw;
    border-right: none;
    border-bottom: 1px solid var(--border);
    height: auto;
    max-height: 50vh;
    position: relative;
    top: 0;
  }
  
  .shelf-visual {
    overflow-x: auto;
  }
  
  .boxes-grid {
    grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-actions {
    grid-template-columns: 1fr;
  }
  .detail-actions .btn-primary { grid-column: span 1; }
}
