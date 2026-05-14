document.addEventListener('DOMContentLoaded', () => {
  try { Auth.init(); }    catch(e) { console.warn('Auth:', e); }

  // Si no hay sesión, mostrar login como única vista y bloquear contenido
  if (!Auth.currentUser) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Mostrar modal de login automáticamente
    UI.showModal('login-modal');
  } else {
    // Usuario ya autenticado - inicializar aplicación completa
    App.initializeAfterLogin();
  }

  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if(e.target===m) m.classList.add('hidden'); })
  );
  document.addEventListener('keydown', e => {
    if(e.key==='Escape') document.querySelectorAll('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'));
  });
});
