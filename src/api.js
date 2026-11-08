/* ============================================================
   api.js — comunicação com a API (Node.js + PostgreSQL)
   Oferece ao restante do site a mesma interface de dados que ele usa
   (user, db, downloads, assets), mas falando com a API por HTTPS.
   O endereço da API vem de config.js (window.APP_CONFIG.apiUrl).
   ============================================================ */
const API = (() => {
  const cfg = window.APP_CONFIG || {};
  const base = String(cfg.apiUrl || '').trim().replace(/\/+$/, '');
  const TK = 'eth_token', POLL_MS = Math.max(5000, Number(cfg.pollSeconds || 20) * 1000);
  let token = null, me = null;
  try { token = localStorage.getItem(TK) || null; } catch (e) { token = null; }
  const clone = o => JSON.parse(JSON.stringify(o));
  const mkErr = (msg, code, status) => { const e = new Error(msg); e.code = code; e.status = status; return e; };
  const AVATAR = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="#c9c4d4"/></svg>');

  function setToken(t) { token = t; try { if (t) localStorage.setItem(TK, t); else localStorage.removeItem(TK); } catch (e) { /* sem armazenamento: vale só nesta aba */ } }
  function expired() {
    setToken(null);
    try { sessionStorage.setItem('eth_msg', 'Sua sessão terminou. Entre novamente.'); } catch (e) { /* ignora */ }
    location.reload();
  }
  async function call(method, path, body, opt) {
    if (!base) throw mkErr('A API ainda não foi configurada neste site.', 'unavailable', 0);
    const h = {}; if (token && !(opt && opt.anon)) h.Authorization = 'Bearer ' + token;
    let payload;
    if (typeof Blob !== 'undefined' && body instanceof Blob) { payload = body; h['Content-Type'] = body.type || 'application/octet-stream'; }
    else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
    let r;
    try { r = await fetch(base + path, { method, headers: h, body: payload }); } catch (e) { throw mkErr('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'unavailable', 0); }
    let data = null; try { data = await r.json(); } catch (e) { data = null; }
    if (!r.ok) {
      if (r.status === 401 && token && !(opt && opt.anon)) { expired(); throw mkErr('Sua sessão terminou.', 'revoked', 401); }
      throw mkErr((data && data.error) || ('Erro ' + r.status + ' no servidor.'), r.status >= 500 ? 'unavailable' : 'api', r.status);
    }
    return data;
  }

  /* ---------- sessão ---------- */
  const configured = () => !!base;
  const hasToken = () => !!token;
  async function login(email, password) {
    const r = await call('POST', '/auth/login', { email, password }, { anon: true });
    setToken(r.token); me = r.user; return me;
  }
  async function loadMe() { const r = await call('GET', '/auth/me'); me = r.user; return me; }
  function logout() { setToken(null); me = null; location.reload(); }
  const fileUrl = id => base + '/files/' + encodeURIComponent(id) + '?token=' + encodeURIComponent(token || '');

  /* ---------- cache e sincronização por consulta periódica ---------- */
  const cache = { sync: null, bundle: null };
  const watchers = new Set();
  let epoch = 0, writing = 0, timer = 0, polling = false;

  const snapOf = (docs, exists) => ({ exists, docs, metadata: { fromCache: false, hasPendingWrites: false } });
  const docSnap = (id, d) => ({ exists: d != null, id, data: () => (d == null ? undefined : clone(d)), metadata: { fromCache: false, hasPendingWrites: false } });
  const stripId = r => { const o = { ...r }; delete o.id; return o; };

  /* converte um caminho "estilo documento" no que está em cache */
  function readDoc(path) {
    const p = path.split('/');
    if (p[0] === 'data' && p[1] === 'users' && p.length === 4 && p[3] === 'hub') {
      const s = cache.sync && cache.sync.settings;
      return docSnap('hub', s && s.exists ? { settings: s.settings, updatedAt: 0 } : null);
    }
    if (p[0] === 'portal' && p.length === 2) return docSnap(p[1], cache.bundle ? cache.bundle.portal : null);
    if (p[0] === 'hwsub' && p.length === 2) return docSnap(p[1], cache.bundle ? cache.bundle.submissions : null);
    if (p[0] === 'hwret' && p.length === 2) return docSnap(p[1], cache.bundle ? cache.bundle.returns : null);
    return docSnap(p[p.length - 1], null);
  }
  function readCol(path) {
    const p = path.split('/');
    if (p[0] === 'data' && p[1] === 'users' && p.length === 5 && p[3] === 'hub') {
      const list = (cache.sync && cache.sync.collections && cache.sync.collections[p[4]]) || [];
      return snapOf(list.map(r => ({ id: r.id, data: () => clone(stripId(r)) })), true);
    }
    if (p[0] === 'hwsub' && p.length === 1) {
      const subs = (cache.sync && cache.sync.submissions) || {};
      return snapOf(Object.keys(subs).map(id => ({ id, data: () => clone(subs[id]) })), true);
    }
    return snapOf([], true);
  }
  const sig = s => JSON.stringify(s.docs ? s.docs.map(d => [d.id, d.data()]) : [s.exists, s.data && s.data()]);

  function deliver() {
    for (const w of [...watchers]) {
      if (!w.ready()) continue;
      const s = w.read(), k = sig(s);
      if (k !== w.last) { w.last = k; try { w.cb(s); } catch (e) { console.error(e); } }
    }
  }
  const needs = () => (me && me.role === 'professora') ? 'sync' : 'bundle';
  async function refresh() {
    if (polling || !me) return; polling = true;
    const ep = epoch, kind = needs();
    try {
      const d = kind === 'sync' ? await call('GET', '/sync') : await call('GET', '/me/bundle');
      if (ep === epoch && writing === 0) { cache[kind] = d; }
      else if (!cache[kind]) cache[kind] = d;
      for (const w of watchers) if (w.failed) { w.failed = false; w.last = null; }
      deliver();
    } catch (e) {
      for (const w of [...watchers]) if (w.onErr) { w.failed = true; try { w.onErr(e); } catch (x) { console.error(x); } }
    } finally { polling = false; }
  }
  function startPolling() {
    if (timer) return;
    timer = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('online', refresh);
  }
  function watch(readFn, readyFn, cb, onErr) {
    const w = { read: readFn, ready: readyFn, cb, onErr, last: null };
    watchers.add(w); startPolling();
    if (readyFn()) setTimeout(deliver, 0); else setTimeout(refresh, 0);
    return () => watchers.delete(w);
  }
  const ready = () => !!cache[needs()];
  async function write(fn) {
    writing++; epoch++;
    try { return await fn(); } finally { writing--; epoch++; }
  }

  /* ---------- "banco de dados" ---------- */
  function docRef(path) {
    const p = path.split('/'), id = p[p.length - 1];
    return {
      path, id,
      collection: n => colRef(path + '/' + n),
      async get() {
        if (p[0] === 'hwret' && me && me.role === 'professora') { const r = await call('GET', '/returns/' + encodeURIComponent(id)); return docSnap(id, r.doc || null); }
        if (!ready()) await refresh();
        return readDoc(path);
      },
      async set(d) {
        await write(async () => {
          if (p[0] === 'data' && p.length === 4) {
            await call('PUT', '/settings', d.settings || {});
            if (cache.sync) cache.sync.settings = { exists: true, settings: clone(d.settings || {}) };
          } else if (p[0] === 'data' && p.length === 6) {
            await call('PUT', '/' + p[4] + '/' + encodeURIComponent(id), d);
            const list = (cache.sync && cache.sync.collections && cache.sync.collections[p[4]]);
            if (list) { const row = { id, ...clone(d) }, i = list.findIndex(x => x.id === id); if (i >= 0) list[i] = row; else list.push(row); }
          } else if (p[0] === 'portal') {
            await call('PUT', '/portal/' + encodeURIComponent(id), d);
          } else if (p[0] === 'hwsub') {
            await call('PUT', '/me/submissions', { items: d.items || {} });
            if (cache.bundle) cache.bundle.submissions = clone(d);
          } else if (p[0] === 'hwret') {
            await call('PUT', '/returns/' + encodeURIComponent(id), { items: d.items || {} });
          } else throw mkErr('Caminho de dados desconhecido: ' + path, 'api', 0);
        });
        deliver();
      },
      async delete() {
        await write(async () => {
          if (p[0] === 'data' && p.length === 6) {
            await call('DELETE', '/' + p[4] + '/' + encodeURIComponent(id));
            const c = cache.sync && cache.sync.collections; if (c && c[p[4]]) c[p[4]] = c[p[4]].filter(x => x.id !== id);
          } else if (p[0] === 'portal') {
            await call('DELETE', '/portal/' + encodeURIComponent(id));
          } else throw mkErr('Não é possível excluir este item.', 'api', 0);
        });
        deliver();
      },
      onSnapshot(cb, onErr) { return watch(() => readDoc(path), ready, cb, onErr); }
    };
  }
  function colRef(path) {
    return {
      path, doc: id => docRef(path + '/' + id),
      onSnapshot(cb, onErr) { return watch(() => readCol(path), ready, cb, onErr); }
    };
  }

  /* ---------- contas ---------- */
  const user = {
    id: async () => me && me.id,
    me: async () => ({ name: (me && (me.name || me.email)) || '' }),
    isOwner: async () => !!me && me.role === 'professora',
    role: () => (me && me.role) || '',
    search: async (q, role) => {
      const r = await call('GET', '/users/search?q=' + encodeURIComponent(q || ''));
      return r.users.filter(u => !role || u.role === role).map(u => ({ id: u.id, name: u.name ? u.name + ' (' + u.email + ')' : u.email, email: u.email, role: u.role, avatarUrl: AVATAR }));
    },
    profiles: async ids => (await call('POST', '/users/profiles', { ids })).profiles,
    create: async o => (await call('POST', '/users', o)).user,
    resetPassword: async (id, password) => { await call('POST', '/users/' + encodeURIComponent(id) + '/password', { password }); },
    changePassword: async (current, password) => { await call('POST', '/auth/password', { current, password }); }
  };

  /* ---------- arquivos e downloads ---------- */
  const assets = {
    upload: async file => {
      const r = await call('POST', '/files?name=' + encodeURIComponent(file.name || 'arquivo'), file);
      return { id: r.id, url: fileUrl(r.id), sizeBytes: r.sizeBytes, contentType: r.contentType };
    },
    delete: async id => { try { await call('DELETE', '/files/' + encodeURIComponent(id)); } catch (e) { if (e.status !== 404 && e.status !== 403) throw e; } }
  };
  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  const host = { use: async n => ({ user, db: { doc: docRef, collection: colRef }, assets, downloads })[n] || null, fileUrl };
  return { host, configured, hasToken, login, loadMe, logout, call, user, health: () => call('GET', '/health', undefined, { anon: true }), me: () => me };
})();
