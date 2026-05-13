// Controlador de vistas / pestañas
const Views = {
  current: 'dashboard',

  show(name) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    // Activar la vista seleccionada
    const view = document.getElementById('view-' + name);
    if (view) view.classList.add('active');

    // Activar la pestaña correspondiente
    const tabs = document.querySelectorAll('.nav-tab');
    const names = ['dashboard', 'spreadsheet', 'scanner'];
    const idx = names.indexOf(name);
    if (tabs[idx]) tabs[idx].classList.add('active');

    this.current = name;

    // Refrescar la vista activa
    if (name === 'dashboard') Dashboard.render();
    if (name === 'spreadsheet') Sheet.render();
    if (name === 'scanner') {
      // Asegurarse que el panel lateral esté visible
      const panel = document.getElementById('vault-panel');
      if (panel) panel.style.display = 'flex';
      Vault.render();
    }
  }
};
