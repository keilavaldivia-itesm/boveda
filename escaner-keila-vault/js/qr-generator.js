// Módulo de generación e impresión de códigos QR
const QRGenerator = {
  async generate(data, canvasId = 'qr-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    try {
      await QRCode.toCanvas(canvas, data, {
        width: 200,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      });
    } catch (e) {
      console.error('Error generando QR:', e);
    }
  },

  async printLabel() {
    const record = Vault.currentRecord;
    if (!record) {
      UI.showNotification('⚠️ Selecciona un expediente primero', 'error');
      return;
    }

    // Show preview modal
    const preview = document.getElementById('qr-preview-modal');
    document.getElementById('qr-data-preview').textContent = record.number + ' — ' + record.holder;
    preview.classList.remove('hidden');

    await this.generate(record.qrData || record.number);
  },

  async printFromPreview() {
    const record = Vault.currentRecord;
    if (!record) return;

    const canvas = document.getElementById('qr-canvas');
    const imgData = canvas.toDataURL('image/png');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta ${record.number}</title>
        <style>
          body { font-family: Arial, sans-serif; display:flex; justify-content:center; padding:20px; }
          .label {
            border: 2px solid #000;
            padding: 16px;
            width: 260px;
            text-align: center;
            border-radius: 8px;
          }
          .label img { width: 200px; height: 200px; }
          .label h2 { font-size: 1rem; margin: 8px 0 4px; }
          .label p { font-size: 0.75rem; color: #555; margin: 2px 0; }
          .label .series { 
            background: #2563eb; color: white; 
            padding: 2px 8px; border-radius: 10px; 
            font-size: 0.7rem; display:inline-block; margin-top:6px;
          }
          @media print { body { padding:0; } }
        </style>
      </head>
      <body>
        <div class="label">
          <img src="${imgData}" alt="QR">
          <h2>${record.number}</h2>
          <p>${record.holder}</p>
          <p>📍 ${record.location}</p>
          <span class="series">${record.series}</span>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    win.document.close();

    UI.closeModal('qr-preview-modal');
  },

  async generateBatch(records) {
    // Generate QR codes for multiple records and trigger print
    const win = window.open('', '_blank');
    const items = await Promise.all(records.map(async r => {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, r.qrData || r.number, { width: 150, margin: 1 });
      return { record: r, img: canvas.toDataURL('image/png') };
    }));

    win.document.write(`
      <!DOCTYPE html><html><head><title>Etiquetas en lote</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        .grid { display: flex; flex-wrap: wrap; gap: 12px; }
        .label { border:2px solid #000; padding:10px; width:180px; text-align:center; border-radius:6px; }
        .label img { width:140px; }
        .label h3 { font-size:0.8rem; margin:4px 0; }
        .label p { font-size:0.65rem; color:#555; }
        @media print { body{padding:0} }
      </style></head><body>
      <div class="grid">
        ${items.map(({record, img}) => `
          <div class="label">
            <img src="${img}">
            <h3>${record.number}</h3>
            <p>${record.holder}</p>
          </div>
        `).join('')}
      </div>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }
};
