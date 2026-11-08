/* ============================================================
   core.js — estado, banco de dados, sincronização, rotas, eventos
   ============================================================ */
const COLS = ['students', 'lessons', 'exercises', 'homework', 'plans', 'reports', 'charges', 'payments', 'materials', 'goals', 'tasks', 'notes', 'packages', 'contracts', 'stages', 'recordings', 'groups'];
const S = { mode: 'professora', portal: null, portalReady: false, portalAt: {}, guardAt: {}, portalError: null, settings: defaultSettings(), ready: false, loaded: {}, fromCache: {}, pending: {}, env: { ok: true }, syncError: null, unsubs: [], hubExists: false, timedOut: false };
const M = {};
COLS.forEach(c => { S[c] = []; M[c] = new Map(); });
const NS = { user: null, db: null, downloads: null, assets: null };
let UID = null;
const UI = { f: {}, tab: {}, cal: { view: 'month', date: todayISO() }, finMonth: monthOf(todayISO()), finTab: 'mes', exTab: 'lib', repStudent: '', route: '', limit: {}, userName: '', compare: null, ignoreHash: null };
const D = () => ({ students: S.students, lessons: S.lessons, exercises: S.exercises, homework: S.homework, plans: S.plans, reports: S.reports, charges: S.charges, payments: S.payments, materials: S.materials, goals: S.goals, tasks: S.tasks, notes: S.notes, contracts: S.contracts, stages: S.stages, recordings: S.recordings, groups: S.groups, packages: S.packages });
const stName = id => (M.students.get(id) || {}).name || '(aluno removido)';
const getF = (page, def) => (UI.f[page] ||= { ...def });
const pages = n => Math.max(1, n);

/* ---------- erros ---------- */
function errMsg(e) {
  const c = e && e.code;
  if (c === 'invalid_argument') return 'Não foi possível gravar. Se você abriu este sistema por um link compartilhado com permissão só de leitura, peça acesso de edição ao dono.';
  if (c === 'quota_exceeded') return 'O limite de armazenamento foi atingido. Exporte um backup e exclua registros antigos.';
  if (c === 'resource_exhausted') return 'Muitas operações seguidas. Aguarde alguns segundos e tente de novo.';
  if (c === 'unavailable' || c === 'revoked') return 'Sem conexão com o banco de dados. Tente de novo em instantes.';
  return (e && e.message) || 'Erro inesperado.';
}
const safe = async fn => { try { return await fn(); } catch (e) { console.error(e); toast(errMsg(e), 'err'); } };

/* ---------- banco de dados (documentos privados em data/users/<id>/hub) ---------- */
const hubRef = () => NS.db.doc(`data/users/${UID}/hub`);
const colRef = c => hubRef().collection(c);
const clean = o => JSON.parse(JSON.stringify(o));
const chains = new Map();
function serial(key, fn) {
  const prev = chains.get(key) || Promise.resolve();
  const next = prev.catch(() => { }).then(fn);
  chains.set(key, next);
  const done = () => { if (chains.get(key) === next) chains.delete(key); };
  next.then(done, done);
  return next;
}
async function retry(fn) {
  try { return await fn(); } catch (e) {
    if (e && (e.code === 'unavailable' || e.code === 'resource_exhausted')) { await sleep(500 + Math.random() * 500); return await fn(); }
    throw e;
  }
}
function applyLocal(c, id, data) {
  const row = { id, ...data };
  const i = S[c].findIndex(x => x.id === id);
  if (i >= 0) S[c][i] = row; else S[c].push(row);
  M[c].set(id, row);
}
function removeLocal(c, id) { S[c] = S[c].filter(x => x.id !== id); M[c].delete(id); }
async function put(c, obj) {
  const id = obj.id || newId();
  const data = clean(obj); delete data.id;
  await serial(c + '/' + id, () => retry(() => colRef(c).doc(id).set(data)));
  applyLocal(c, id, data); scheduleRender();
  afterWrite(c, { ...data, id });
  return id;
}
async function del(c, id) {
  const before = M[c].get(id);
  await serial(c + '/' + id, () => retry(() => colRef(c).doc(id).delete()));
  removeLocal(c, id); scheduleRender();
  afterWrite(c, before);
}
/* ---------- painel do aluno: espelho publicado em portal/<id da conta do aluno> ---------- */
const PORTAL_COLS = new Set(['students', 'lessons', 'homework', 'plans', 'reports', 'contracts', 'stages', 'materials', 'recordings', 'groups']);
const portalTimers = new Map();
const GUARD_ONLY = new Set(['charges', 'payments']);
function afterWrite(c, row) {
  if (!row || S.mode !== 'professora') return;
  if (GUARD_ONLY.has(c)) { if (row.studentId) scheduleGuardians(row.studentId); return; }
  if (!PORTAL_COLS.has(c)) return;
  if (c === 'groups') { for (const x of S.students) if (x.groupId === row.id) schedulePortal(x.id); return; }
  if (c === 'materials') { for (const x of S.students) if (x.accountId) schedulePortal(x.id); return; }
  const sid = c === 'students' ? row.id : row.studentId;
  if (sid) schedulePortal(sid);
}
function schedulePortal(sid) {
  const s = M.students.get(sid); if (!s) return;
  scheduleGuardians(sid);
  if (!s.accountId) return;
  clearTimeout(portalTimers.get(sid));
  portalTimers.set(sid, setTimeout(() => { publishPortal(sid).catch(e => { console.error(e); S.portalError = errMsg(e); scheduleRender(); }); }, 1200));
}
const guardTimers = new Map();
function scheduleGuardians(sid) { const s = M.students.get(sid); for (const id of (s && s.guardians) || []) scheduleGuardian(id); }
function scheduleGuardian(accId) {
  clearTimeout(guardTimers.get(accId));
  guardTimers.set(accId, setTimeout(() => { publishGuardian(accId).catch(e => { console.error(e); S.portalError = errMsg(e); scheduleRender(); }); }, 1200));
}
/* publica (ou remove) o painel de um responsável: reúne todos os filhos ligados àquela conta */
async function publishGuardian(accId) {
  const ids = S.students.filter(x => (x.guardians || []).includes(accId)).map(x => x.id), ref = NS.db.doc('portal/' + accId);
  if (!ids.length) { await serial('portal/' + accId, () => retry(() => ref.delete())); delete S.guardAt[accId]; scheduleRender(); return false; }
  const doc = guardianDoc(ids, D(), todayISO(), nowKey(), { banner: S.settings.banner, guide: S.settings.guide });
  await serial('portal/' + accId, () => retry(() => ref.set(clean(doc))));
  S.guardAt[accId] = nowKey(); S.portalError = null; scheduleRender();
  return true;
}
async function publishPortal(sid) {
  const s = M.students.get(sid); if (!s || !s.accountId) return false;
  const doc = portalDoc(sid, D(), todayISO(), nowKey(), { banner: S.settings.banner, guide: S.settings.guide }); if (!doc) return false;
  await serial('portal/' + s.accountId, () => retry(() => NS.db.doc('portal/' + s.accountId).set(clean(doc))));
  S.portalAt[sid] = nowKey(); S.portalError = null; scheduleRender();
  return true;
}
function startStudentSync() {
  S.unsubs.push(NS.db.doc('portal/' + UID).onSnapshot(snap => {
    S.portal = snap.exists ? snap.data() : null; S.portalReady = true; S.syncError = null; scheduleRender();
  }, e => { S.syncError = (e && e.code) || 'unavailable'; S.portalReady = true; scheduleRender(); }));
  startStudentExtraSync();
  setTimeout(() => { if (!S.portalReady) { S.portalReady = true; S.timedOut = true; scheduleRender(); } }, 10000);
}
async function saveSettings(patch) {
  S.settings = { ...S.settings, ...patch };
  applyPrefs();
  await serial('hub', () => retry(() => hubRef().set({ settings: clean(S.settings), updatedAt: Date.now() })));
  scheduleRender();
}
async function pool(items, fn, n) {
  let i = 0;
  const w = Array.from({ length: Math.min(n || 6, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } });
  await Promise.all(w);
}

/* ---------- sincronização ao vivo ---------- */
function onSyncError(e) {
  S.syncError = (e && e.code) || 'unavailable';
  if (e && e.code === 'revoked') S.env = { ok: false, reason: 'revoked' };
  scheduleRender();
}
function checkReady() { if (!S.ready && ['hub', ...COLS].every(k => S.loaded[k] && !S.fromCache[k])) S.ready = true; }
function startSync() {
  const mark = (key, snap) => {
    S.loaded[key] = true; S.fromCache[key] = !!(snap.metadata && snap.metadata.fromCache); S.pending[key] = !!(snap.metadata && snap.metadata.hasPendingWrites);
    S.syncError = null; checkReady(); scheduleRender();
  };
  S.unsubs.push(hubRef().onSnapshot(snap => {
    const d = snap.exists ? snap.data() : null;
    S.settings = { ...defaultSettings(), ...((d && d.settings) || {}) }; S.hubExists = snap.exists;
    applyPrefs(); mark('hub', snap);
  }, onSyncError));
  for (const c of COLS) {
    S.unsubs.push(colRef(c).onSnapshot(snap => {
      S[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      M[c] = new Map(S[c].map(x => [x.id, x]));
      mark(c, snap);
    }, onSyncError));
  }
  setTimeout(() => { if (!S.ready) { S.timedOut = true; S.ready = true; scheduleRender(); } }, 10000);
}
function syncState() {
  if (S.syncError) return 'off';
  const keys = ['hub', ...COLS];
  if (keys.some(k => !S.loaded[k] || S.fromCache[k] || S.pending[k])) return S.timedOut ? 'off' : 'sync';
  return 'ok';
}

/* ---------- preferências visuais ---------- */
function applyPrefs() {
  const r = document.documentElement, t = S.settings.theme;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
  r.dataset.density = S.settings.density === 'compact' ? 'compact' : 'comfortable';
}

/* ---------- rotas ---------- */
const PAGES = [['dashboard', 'Dashboard', 'home'], ['alunos', 'Alunos', 'users'], ['calendario', 'Calendário', 'calendar'], ['aulas', 'Aulas', 'book'], ['exercicios', 'Exercícios e Homework', 'pencil'], ['planos', 'Weekly Study Plans', 'plan'], ['relatorios', 'Relatórios de Desempenho', 'chart'], ['financeiro', 'Financeiro', 'wallet'], ['materiais', 'Biblioteca de Materiais', 'folder'], ['objetivos', 'Objetivos de Aprendizagem', 'target'], ['contratos', 'Contrato e Cronograma', 'route'], ['relaula', 'Relatório da Aula', 'contract'], ['gravacoes', 'Gravações das Aulas', 'video'], ['turmas', 'Turmas', 'users'], ['portal', 'Área do Aluno', 'video'], ['tarefas', 'Tarefas da Professora', 'check'], ['configuracoes', 'Configurações', 'sliders']];
const NAV_OF = { aluno: 'alunos', plano: 'planos', previa: 'portal', previaresp: 'portal' };
function parseRoute() {
  const h = UI.route || location.hash.slice(1) || 'dashboard';
  const i = h.indexOf('-');
  return { page: i < 0 ? h : h.slice(0, i), id: i < 0 ? '' : h.slice(i + 1) };
}
function go(r) {
  UI.route = r;
  try { if (location.hash.slice(1) !== r) { UI.ignoreHash = r; location.hash = r; } } catch (e) { /* hash bloqueado: a navegação continua interna */ }
  closeAllModals(); closeSide(); render(true);
}
window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (UI.ignoreHash === h) { UI.ignoreHash = null; return; }
  UI.route = h || 'dashboard'; closeAllModals(); closeSide(); render(true);
});
const openSide = () => { const s = $('#side'); if (s) { s.classList.add('open'); $('#scrim').classList.add('open'); } };
const closeSide = () => { const s = $('#side'); if (s) { s.classList.remove('open'); $('#scrim').classList.remove('open'); } };

/* ---------- renderização ---------- */
let rafId = 0;
function scheduleRender() { if (rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; render(); }); }
function keepFocus(fn, top) {
  const a = document.activeElement, main = $('#main');
  const id = a && a.id && main && main.contains(a) ? a.id : null;
  const sel = id && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  const y = window.scrollY;
  fn();
  if (id) { const el = document.getElementById(id); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } } }
  window.scrollTo(0, top ? 0 : y);
}
function gateView() {
  const msg = S.env.reason === 'revoked'
    ? 'O acesso a esta página foi encerrado. Abra o link novamente pelo Claude.'
    : 'Este sistema guarda seus dados no banco privado da sua conta. Abra a página pelo Claude, já conectada à sua conta, para entrar.';
  return html`<div class="gate"><div class="card"><img src="${LOGO}" alt=""><h1>${brandName()}</h1><p class="muted">${msg}</p><p class="small muted">Seus dados não ficam expostos publicamente: cada pessoa que abre o link enxerga apenas a própria área.</p></div></div>`;
}
const loadingView = () => html`<div class="gate"><div class="card" style="width:min(92vw,420px)"><img src="${LOGO}" alt=""><h1>${brandName()}</h1><div class="stack-s" style="margin-top:18px"><div class="skel"></div><div class="skel" style="width:80%"></div><div class="skel" style="width:60%"></div></div><p class="small muted" style="margin:16px 0 0">Carregando seus dados…</p></div></div>`;
const brandName = () => (!S.settings.platformName || S.settings.platformName === 'English Teacher Hub') ? BRAND.name : S.settings.platformName;
function buildShell() {
  $('#root').innerHTML = html`<div class="shell" id="shell">
    <aside class="side" id="side" aria-label="Menu principal">
      <div class="brand"><img src="${LOGO}" alt="Logo Teacher Gabriela Campos"><div><h1 id="brand-name"></h1><small id="brand-sub"></small></div></div>
      <nav class="nav" id="nav">${PAGES.map(([id, label, ic]) => html`<a href="#${id}" data-nav="${id}">${ico(ic)}<span>${label}</span></a>`)}</nav>
      <div class="side-foot"><div id="sync"></div><div id="whoami"></div></div>
    </aside>
    <div class="scrim" id="scrim" data-act="side-close"></div>
    <div class="main-col">
      <header class="topbar"><div class="topbar-in">
        <button type="button" class="icon-btn menu-btn" data-act="side-open" aria-label="Abrir menu">${ico('menu')}</button>
        <div class="search">${ico('search')}<input id="gsearch" type="search" placeholder="Buscar alunos, aulas, exercícios, pagamentos…" autocomplete="off" data-input="gsearch" aria-label="Buscar em todo o sistema"><div class="search-res" id="search-res" hidden></div></div>
        <span class="spacer"></span>
        <button type="button" class="icon-btn bell" id="bell" data-act="bell-open"></button>
        <button type="button" class="btn primary" data-act="quick-add">${ico('plus')}<span class="hide-s">Novo</span></button>
        <button type="button" class="icon-btn" data-act="toggle-theme" id="theme-btn" aria-label="Alternar tema claro e escuro"></button>
      </div></header>
      <main class="content" id="main" tabindex="-1"></main>
    </div>
  </div>`.s;
}
function updateShell() {
  const { page } = parseRoute(), cur = NAV_OF[page] || page;
  $('#brand-name').textContent = brandName();
  $('#brand-sub').textContent = BRAND.sub;
  $$('#nav a').forEach(a => { if (a.dataset.nav === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const st = syncState();
  $('#sync').innerHTML = `<span class="dot ${st === 'ok' ? '' : st}"></span>${st === 'ok' ? 'Dados salvos e sincronizados' : st === 'sync' ? 'Sincronizando…' : 'Sem conexão com o banco: pode estar desatualizado'}`;
  if (typeof updateBell === 'function') updateBell();
  $('#whoami').textContent = UI.userName ? 'Conta: ' + UI.userName : '';
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-btn').innerHTML = ico(dark ? 'sun' : 'moon').s;
}
function render(top) {
  const root = $('#root');
  if (!root) return;
  if (!S.env.ok) { root.innerHTML = gateView().s; return; }
  if (S.mode === 'aluno') { root.innerHTML = (S.portalReady ? portalPage() : loadingView()).s; return; }
  if (!S.ready) { root.innerHTML = loadingView().s; return; }
  if (S.subsDirty) { S.subsDirty = false; syncSubmissions(); }
  seedModels();
  if (!$('#shell')) buildShell();
  updateShell();
  const { page, id } = parseRoute();
  let out;
  try { out = (VIEWS[page] || VIEWS.notfound)(id); } catch (e) { console.error(e); out = html`<div class="card"><h3>Não foi possível montar esta página</h3><p class="muted">${e.message}</p></div>`; }
  keepFocus(() => { $('#main').innerHTML = out.s; }, top);
}
VIEWS.notfound = () => html`<div class="card">${empty('Página não encontrada', 'O endereço não existe neste sistema.', btn('Ir para o Dashboard', 'go', { cls: 'primary', data: { to: 'dashboard' } }))}</div>`;

/* ---------- eventos globais ---------- */
const fail = err => { console.error(err); toast(errMsg(err), 'err'); };
document.addEventListener('click', e => {
  if (!e.target.closest('.search')) hideSearch();
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const fn = ACTIONS[t.dataset.act];
  if (!fn) return;
  if (t.tagName === 'A') e.preventDefault();
  Promise.resolve().then(() => fn(t.dataset, t, e)).catch(fail);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.form];
  if (!fn || f._busy) return;
  f._busy = true;
  const sub = f.querySelector('[type=submit]'); if (sub) sub.disabled = true;
  Promise.resolve().then(() => fn(formData(f), f, f.dataset)).catch(fail).finally(() => { f._busy = false; if (sub) sub.disabled = false; });
});
document.addEventListener('change', e => {
  const t = e.target.closest('[data-change]'); if (!t) return;
  const fn = CHANGES[t.dataset.change]; if (!fn) return;
  Promise.resolve().then(() => fn(t.type === 'checkbox' ? t.checked : t.value, t, t.dataset, e)).catch(fail);
});
document.addEventListener('input', e => {
  const t = e.target.closest('[data-input]'); if (!t) return;
  const fn = INPUTS[t.dataset.input]; if (!fn) return;
  Promise.resolve().then(() => fn(t.value, t, t.dataset, e)).catch(fail);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modals.length) closeModal(); });

ACTIONS.go = d => go(d.to);
ACTIONS['side-open'] = openSide;
ACTIONS['side-close'] = closeSide;
ACTIONS['toggle-theme'] = () => {
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (S.mode === 'aluno') { document.documentElement.dataset.theme = dark ? 'light' : 'dark'; scheduleRender(); return; }
  return saveSettings({ theme: dark ? 'light' : 'dark' });
};
const setFilter = (v, t) => { const f = (UI.f[t.dataset.page] ||= {}); f[t.dataset.key] = t.type === 'checkbox' ? t.checked : v; UI.limit[t.dataset.page] = 0; render(); };
INPUTS.filter = setFilter; CHANGES.filter = setFilter;
ACTIONS['set-filter'] = d => { (UI.f[d.page] ||= {})[d.key] = d.value; UI.limit[d.page] = 0; render(); };
ACTIONS['more'] = d => { UI.limit[d.page] = (UI.limit[d.page] || 0) + 100; render(); };
const limited = (page, list) => list.slice(0, 100 + (UI.limit[page] || 0));
const moreBtn = (page, list) => list.length > 100 + (UI.limit[page] || 0) ? html`<div class="row" style="justify-content:center;margin-top:12px">${btn(`Mostrar mais (${list.length - 100 - (UI.limit[page] || 0)} restantes)`, 'more', { data: { page } })}</div>` : '';

/* ---------- busca global ---------- */
const hideSearch = () => { const b = $('#search-res'); if (b) b.hidden = true; };
const searchSub = it => [it.studentId ? stName(it.studentId) : '', it.date ? fmtDate(it.date) : '', it.sub || ''].filter(Boolean).join(' · ');
INPUTS.gsearch = v => {
  const box = $('#search-res'); if (!box) return;
  if (v.trim().length < 2) { box.hidden = true; return; }
  const groups = searchAll(v, D(), 5);
  box.hidden = false;
  box.innerHTML = groups.length
    ? groups.map(g => html`<h4>${g.label} (${g.total})</h4>${g.items.map(it => html`<button type="button" data-act="open-ref" data-type="${it.type}" data-id="${it.id}"><b>${it.title}</b> <span class="muted small">${searchSub(it)}</span></button>`)}`.s).join('')
    : '<div class="empty small" style="padding:16px">Nada encontrado para essa busca.</div>';
};
ACTIONS['open-ref'] = d => { hideSearch(); const i = $('#gsearch'); if (i) i.value = ''; openRef(d.type, d.id); };
function openRef(type, id) {
  closeAllModals();
  switch (type) {
    case 'student': return go('aluno-' + id);
    case 'lesson': return openLessonDetail(id);
    case 'exercise': return openExerciseView(id);
    case 'homework': return openHomeworkView(id);
    case 'plan': return go('plano-' + id);
    case 'material': return openMaterialForm(id);
    case 'payment': return openPaymentForm(id);
    case 'report': return openReportView(id);
    case 'goal': return openGoalForm(id);
    case 'task': return openTaskForm(id);
    case 'note': { const n = M.notes.get(id); if (n) { UI.tab['aluno-' + n.studentId] = 'obs'; go('aluno-' + n.studentId); } return; }
  }
}
ACTIONS['open-ref-tl'] = d => openRef(d.type, d.id);

/* ---------- operações de dados compostas ---------- */
const STUDENT_CHILD_COLS = ['lessons', 'homework', 'plans', 'reports', 'charges', 'payments', 'goals', 'notes', 'packages', 'contracts', 'stages', 'recordings'];
function studentCounts(id) {
  const o = {};
  for (const c of STUDENT_CHILD_COLS) o[c] = S[c].filter(x => x.studentId === id).length;
  return o;
}
async function deleteStudentCascade(id) {
  const jobs = [], st0 = M.students.get(id), gids = (st0 && st0.guardians) || [];
  if (st0 && st0.accountId) { try { await NS.db.doc('portal/' + st0.accountId).delete(); } catch (e) { console.error(e); } }
  for (const c of STUDENT_CHILD_COLS) for (const x of S[c]) if (x.studentId === id) jobs.push(() => del(c, x.id));
  for (const t of S.tasks) if (t.studentId === id) jobs.push(() => put('tasks', { ...t, studentId: '' }));
  for (const m of S.materials) if ((m.studentIds || []).includes(id)) jobs.push(() => put('materials', { ...m, studentIds: m.studentIds.filter(x => x !== id) }));
  await pool(jobs, j => j(), 6);
  await del('students', id);
  for (const g of gids) { try { await publishGuardian(g); } catch (e) { console.error(e); } }
}
function backupObject() {
  const o = { app: 'english-teacher-hub', version: 1, exportedAt: new Date().toISOString(), settings: S.settings, collections: {} };
  COLS.forEach(c => { o.collections[c] = S[c]; });
  return o;
}
function validateBackup(obj) {
  if (!obj || obj.app !== 'english-teacher-hub' || !obj.collections || typeof obj.collections !== 'object') throw new Error('Este arquivo não é um backup do English Teacher Hub.');
  let total = 0;
  for (const c of COLS) {
    const list = obj.collections[c] || [];
    if (!Array.isArray(list)) throw new Error('Backup inválido: a lista "' + c + '" está corrompida.');
    for (const it of list) if (!it || typeof it !== 'object' || !/^[A-Za-z0-9_-]{1,100}$/.test(String(it.id || ''))) throw new Error('Backup inválido: há um registro sem identificador válido em "' + c + '".');
    total += list.length;
  }
  if (total > 20000) throw new Error('Backup grande demais para restaurar de uma vez.');
  return total;
}
async function wipeAll() {
  const jobs = [];
  for (const c of COLS) for (const x of S[c]) jobs.push([c, x.id]);
  await pool(jobs, ([c, id]) => del(c, id), 6);
}
async function restoreBackup(obj, replace) {
  validateBackup(obj);
  if (replace) await wipeAll();
  const jobs = [];
  for (const c of COLS) for (const it of (obj.collections[c] || [])) jobs.push([c, it]);
  await pool(jobs, ([c, it]) => put(c, it), 6);
  if (obj.settings && typeof obj.settings === 'object') await saveSettings({ ...defaultSettings(), ...obj.settings });
  return jobs.length;
}
async function saveFile(filename, data) {
  if (!NS.downloads) { toast('Download indisponível neste ambiente.', 'err'); return false; }
  try { await NS.downloads.save({ filename, data }); toast('Arquivo pronto: ' + filename, 'ok'); return true; } catch (e) {
    if (e && e.code === 'declined') return false;
    toast(errMsg(e), 'err'); return false;
  }
}
