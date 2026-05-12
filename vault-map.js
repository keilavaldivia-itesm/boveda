/* Estilos responsive adicionales */

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .scanner-controls {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Móvil */
@media (max-width: 768px) {
  .app-header {
    padding: 10px 16px;
  }
  .header-left h1 {
    font-size: 1.1rem;
  }
  
  .scanner-section {
    padding: 12px;
  }
  
  .camera-container {
    padding: 16px;
  }
  
  .scanner-controls {
    grid-template-columns: 1fr;
  }
  
  .scan-results {
    padding: 12px;
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .modal-content {
    margin: 10px;
    padding: 16px;
  }
  
  .modal-footer {
    flex-direction: column-reverse;
  }
  .modal-footer button {
    width: 100%;
    justify-content: center;
  }
  
  .vault-panel {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    max-height: 60vh;
    border-bottom: 1px solid var(--border);
  }
  
  .record-detail {
    position: relative;
    border-radius: 8px;
    box-shadow: none;
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }
}

/* Móvil pequeño */
@media (max-width: 480px) {
  .header-right {
    gap: 6px;
  }
  .user-badge {
    font-size: 0.8rem;
    padding: 4px 8px;
  }
  .user-badge .role-badge {
    display: none;
  }
  
  .btn-sm, .btn-xs {
    padding: 4px 8px;
    font-size: 0.75rem;
  }
  
  .columns-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .preset-list {
    gap: 4px;
  }
  .preset-tag {
    font-size: 0.75rem;
    padding: 3px 8px;
  }
}

/* Alta densidad de pantalla */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .btn-primary, .btn-secondary, .btn-outline {
    /* Mejorar renderizado en retina */
  }
}

/* Modo oscuro (opcional - futuro) */
@media (prefers-color-scheme: dark) {
  /* Variables para modo oscuro se pueden agregar aquí */
}
