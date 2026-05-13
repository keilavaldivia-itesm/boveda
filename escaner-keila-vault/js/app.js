document.addEventListener('DOMContentLoaded', () => {
  try { Auth.init(); }    catch(e) { console.warn('Auth:', e); }
  try { Vault.init(); }   catch(e) { console.warn('Vault:', e); }
  try { Loan.init(); }    catch(e) { console.warn('Loan:', e); }
  try { Scanner.init(); } catch(e) { console.warn('Scanner:', e); }
  try { Dashboard.render(); } catch(e) { console.warn('Dashboard:', e); }
  try { Sheet.filtered=[...(Vault.records||[])]; Sheet._applySort(); } catch(e) {}
  // Show users tab if admin
  try { UsersView.render(); } catch(e) {}

  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if(e.target===m) m.classList.add('hidden'); })
  );
  document.addEventListener('keydown', e => {
    if(e.key==='Escape') document.querySelectorAll('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'));
  });
});
