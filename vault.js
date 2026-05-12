// Inicialización principal de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar módulos en orden
  try { Auth.init(); } catch(e) { console.warn('Auth init:', e); }
  try { Vault.init(); } catch(e) { console.warn('Vault init:', e); }
  try { Loan.init(); } catch(e) { console.warn('Loan init:', e); }
  try { Scanner.init(); } catch(e) { console.warn('Scanner init:', e); }

  // Cerrar modales al hacer click en el fondo
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  // Tecla ESC cierra modales
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });

  console.log('✅ Escáner Keila + Bóveda Universitaria iniciado');
});
