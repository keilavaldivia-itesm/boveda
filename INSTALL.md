// Módulo de mapa visual de la bóveda
const VaultMap = {
  currentShelf: null,
  selectedBox: null,
  pendingCallback: null,

  // Estructura de la bóveda
  layout: {
    'BOD-01': {
      label: 'Bóveda 01',
      shelves: ['EST-A', 'EST-B', 'EST-C'],
      boxesPerShelf: 5,
      capacityPerBox: 20
    }
  },

  show(location = 'BOD-01', callback = null) {
    this.pendingCallback = callback;
    const modal = document.getElementById('vault-map-modal');
    document.getElementById('map-title').textContent = location;
    modal.classList.remove('hidden');
    this.renderShelves(location);
  },

  renderShelves(vaultId) {
    const vault = this.layout[vaultId] || this.layout['BOD-01'];
    const container = document.getElementById('shelf-visual');
    const records = Vault.records;

    container.innerHTML = vault.shelves.map(shelf => {
      const boxes = Array.from({ length: vault.boxesPerShelf }, (_, i) => {
        const boxId = `${vaultId}-${shelf}-CAJ-${String(i + 1).padStart(2, '0')}`;
        const count = records.filter(r => r.location === boxId).length;
        const pct = Math.min(100, (count / vault.capacityPerBox) * 100);
        const color = pct > 80 ? '#dc2626' : pct > 50 ? '#ca8a04' : '#16a34a';

        return `
          <div class="box-slot" onclick="VaultMap.selectBox('${boxId}', ${count}, ${vault.capacityPerBox})"
               title="${boxId}: ${count}/${vault.capacityPerBox}">
            <div class="box-fill" style="height:${pct}%;background:${color}"></div>
            <span class="box-label">${String(i + 1).padStart(2, '0')}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="shelf-row">
          <span class="shelf-label">${shelf}</span>
          <div class="boxes-row">${boxes}</div>
        </div>
      `;
    }).join('');

    // Inject styles if not present
    if (!document.getElementById('map-styles')) {
      const style = document.createElement('style');
      style.id = 'map-styles';
      style.textContent = `
        .shelf-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
        .shelf-label { width:60px; font-weight:600; color:var(--text-muted); font-size:0.85rem; }
        .boxes-row { display:flex; gap:8px; }
        .box-slot { 
          width:50px; height:70px; border:2px solid var(--border); border-radius:6px;
          cursor:pointer; position:relative; overflow:hidden; background:var(--bg);
          display:flex; align-items:flex-end; justify-content:center;
          transition:border-color 0.2s;
        }
        .box-slot:hover { border-color:var(--primary); }
        .box-fill { width:100%; transition:height 0.3s; }
        .box-label { 
          position:absolute; top:4px; left:0; right:0; text-align:center;
          font-size:0.7rem; font-weight:600; color:var(--text);
        }
      `;
      document.head.appendChild(style);
    }
  },

  selectBox(boxId, count, capacity) {
    this.selectedBox = boxId;
    const detail = document.getElementById('box-detail');
    detail.classList.remove('hidden');
    document.getElementById('box-id').textContent = boxId;
    document.getElementById('box-occupancy').textContent = `${count}/${capacity}`;
    const pct = Math.min(100, (count / capacity) * 100);
    document.getElementById('box-progress').style.width = pct + '%';
  },

  confirmSelection() {
    if (!this.selectedBox) return;
    if (this.pendingCallback) {
      this.pendingCallback(this.selectedBox);
      this.pendingCallback = null;
    }
    if (Vault.currentRecord) {
      Vault.currentRecord.location = this.selectedBox;
      document.getElementById('detail-location').textContent = this.selectedBox;
      Vault.save();
      UI.showNotification('📍 Ubicación actualizada: ' + this.selectedBox);
    }
    UI.closeModal('vault-map-modal');
  },

  navigate(location) {
    this.renderShelves(location);
    document.getElementById('map-title').textContent = location;
  }
};
