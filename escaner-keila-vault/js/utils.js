// Funciones utilitarias compartidas

const Utils = {
  // Generar ID único
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  // Formatear fecha
  formatDate(date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    const locale = options.locale || 'es-MX';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(options.time && { hour: '2-digit', minute: '2-digit' })
    });
  },
  
  // Formatear hora relativa
  timeAgo(date) {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return this.formatDate(then);
  },
  
  // Acortar texto
  truncate(text, length = 50) {
    if (!text) return '';
    return text.length > length ? text.slice(0, length) + '...' : text;
  },
  
  // Validar email institucional
  isValidUniversityEmail(email) {
    // Ajustar regex según dominio de tu universidad
    const patterns = [
      /@universidad\.edu\.mx$/i,
      /@alumnos\.universidad\.edu\.mx$/i,
      /@staff\.universidad\.edu\.mx$/i
    ];
    return patterns.some(p => p.test(email));
  },
  
  // Copiar al portapapeles
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback para navegadores antiguos
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },
  
  // Descargar archivo
  downloadFile(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Debounce para búsquedas
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Parsear CSV simple
  parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = (values[i] || '').replace(/^"|"$/g, '');
      });
      return obj;
    });
  },
  
  // Generar CSV desde array de objetos
  toCSV(data, headers = null) {
    if (!data.length) return '';
    
    const keys = headers || Object.keys(data[0]);
    const rows = [keys.join(',')];
    
    data.forEach(item => {
      const values = keys.map(key => {
        const val = item[key] ?? '';
        return typeof val === 'string' && val.includes(',') 
          ? `"${val.replace(/"/g, '""')}"` 
          : val;
      });
      rows.push(values.join(','));
    });
    
    return rows.join('\n');
  },
  
  // Obtener geolocalización
  async getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },
  
  // Reproducir sonido de confirmación
  playBeep(frequency = 800, duration = 100) {
    if (!Config.scanner.soundEnabled) return;
    
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = frequency;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      console.warn('Error reproduciendo sonido:', e);
    }
  }
};
