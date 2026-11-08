/* ============================================================
   main.js — inicialização
   ============================================================ */
(async function boot() {
  applyPrefs();
  render();
  const c = window.claude;
  if (!c || typeof c.use !== 'function') { S.env = { ok: false, reason: 'none' }; render(); return; }
  const get = async n => { try { return await c.use(n); } catch (e) { return null; } };
  const [user, db, downloads, assets] = await Promise.all([get('user'), get('db'), get('downloads'), get('assets')]);
  NS.user = user; NS.db = db; NS.downloads = downloads; NS.assets = assets;
  if (!user || !db) { S.env = { ok: false, reason: 'none' }; render(); return; }
  try {
    UID = await user.id();
    if (!UID) throw new Error('sem id');
    try { const me = await user.me(); UI.userName = (me && me.name) || ''; } catch (e) { /* nome é opcional */ }
  } catch (e) { S.env = { ok: false, reason: 'none' }; render(); return; }
  let owner = false;
  try { owner = await user.isOwner(); } catch (e) { owner = false; }
  if (!owner) { S.mode = 'aluno'; startStudentSync(); render(); return; }
  startSync();
  startSubsSync();
  render();
})();
