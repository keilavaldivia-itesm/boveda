// Configuración global de la aplicación
const Config = {
  // URLs de API
  api: {
    // SheetDB (para compatibilidad con tu versión actual)
    sheetdb: {
      baseUrl: localStorage.getItem('sheetdb_url') || '',
      apiKey: ''
    },
    // API propia para bóveda (backend Node/Python)
    vault: {
      baseUrl: '/api/v1',
      timeout: 30000
    }
  },
  
  // Configuración de la bóveda
  vault: {
    defaultLocation: 'BOD-01',
    retentionPeriods: {
      academico: 50,    // años
      administrativo: 10,
      investigacion: 20
    }
  },
  
  // Configuración del scanner
  scanner: {
    continuousScan: true,
    soundEnabled: true,
    geoEnabled: false,
    qrFormats: ['QR_CODE', 'CODE_128', 'EAN_13', 'UPC_A']
  },
  
  // Configuración de UI
  ui: {
    notificationDuration: 4000,
    animationsEnabled: true
  },
  
  // Métodos de utilidad
  getSheetDBUrl() {
    return localStorage.getItem('sheetdb_url') || this.api.sheetdb.baseUrl;
  },
  
  saveSheetDBUrl(url) {
    localStorage.setItem('sheetdb_url', url);
    this.api.sheetdb.baseUrl = url;
  },
  
  // Cargar configuración guardada
  load() {
    const saved = localStorage.getItem('keila_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        Object.assign(this.scanner, config.scanner || {});
        Object.assign(this.ui, config.ui || {});
      } catch (e) {
        console.warn('Error cargando configuración:', e);
      }
    }
  },
  
  // Guardar configuración
  save() {
    const toSave = {
      scanner: this.scanner,
      ui: this.ui
    };
    localStorage.setItem('keila_config', JSON.stringify(toSave));
  }
};

// Inicializar al cargar
Config.load();
