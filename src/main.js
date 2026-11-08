/* ============================================================
   main.js — inicialização
   ============================================================ */
async function startApp(host) {
  const get = async n => { try { return await host.use(n); } catch (e) { return null; } };
  const [user, db, downloads, assets] = await Promise.all([get('user'), get('db'), get('downloads'), get('assets')]);
  NS.user = user; NS.db = db; NS.downloads = downloads; NS.assets = assets; NS.fileUrl = host.fileUrl || null;
  if (!user || !db) { S.env = { ok: false, reason: 'none' }; render(); return; }
  try {
    UID = await user.id();
    if (!UID) throw new Error('sem id');
    try { const me = await user.me(); UI.userName = (me && me.name) || ''; } catch (e) { /* nome é opcional */ }
  } catch (e) { S.env = { ok: false, reason: 'none' }; render(); return; }
  S.env = { ok: true };
  let owner = false;
  try { owner = await user.isOwner(); } catch (e) { owner = false; }
  if (!owner) { S.mode = 'aluno'; startStudentSync(); render(); return; }
  startSync();
  startSubsSync();
  render();
}
(async function boot() {
  applyPrefs();
  if (window.__TEST_HOST) { render(); return startApp(window.__TEST_HOST); }
  if (!API.configured()) { S.env = { ok: false, reason: 'noapi' }; render(); return; }
  if (!API.hasToken()) { S.env = { ok: false, reason: 'login' }; render(); return; }
  render();
  try { await API.loadMe(); } catch (e) {
    if (e.code === 'revoked') return;
    S.env = { ok: false, reason: e.code === 'unavailable' ? 'offline' : 'login', detail: e.message }; render(); return;
  }
  await startApp(API.host);
})();
