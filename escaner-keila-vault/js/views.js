// Controlador de vistas / pestañas
const Views = {
  current: 'dashboard',

  show(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const view = document.getElementById('view-' + name);
    if (view) view.classList.add('active');

    const names = ['dashboard', 'spreadsheet', 'scanner', 'mapview'];
    const idx   = names.indexOf(name);
    const tabs  = document.querySelectorAll('.nav-tab');
    if (tabs[idx]) tabs[idx].classList.add('active');

    this.current = name;

    if (name === 'dashboard')   { Dashboard.render(); }
    if (name === 'spreadsheet') { Sheet.render(); }
    if (name === 'scanner')     { const p = document.getElementById('vault-panel'); if(p) p.style.display='flex'; Vault.render(); }
    if (name === 'mapview')     { MapView.render(); MapView.renderLegend(); }
  }
};
