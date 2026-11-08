(() => {
  if (window.__NOSEED === undefined) window.__NOSEED = true;
  const init = window.__INIT_STORE ? JSON.parse(window.__INIT_STORE) : {};
  const store = new Map(Object.entries(init));
  const subs = [];
  const clone = o => JSON.parse(JSON.stringify(o));
  const isChild = (col, p) => p.startsWith(col + '/') && !p.slice(col.length + 1).includes('/');
  const notify = () => setTimeout(() => subs.forEach(s => s()), 0);
  window.__store = () => JSON.stringify(Object.fromEntries(store));
  window.__downloads = [];
  const failWrites = { on: false }; window.__failWrites = failWrites;
  const docRef = path => ({
    path, id: path.split('/').pop(), collection: n => colRef(path + '/' + n),
    async get() { return { exists: store.has(path), id: this.id, data: () => clone(store.get(path)) }; },
    async set(d) { if (failWrites.on) { const e = new Error('Sem conexão com o servidor.'); e.code = 'unavailable'; throw e; } store.set(path, clone(d)); notify(); },
    async delete() { store.delete(path); notify(); },
    onSnapshot(cb) { const f = () => cb({ exists: store.has(path), id: this.id, data: () => clone(store.get(path)), metadata: { fromCache: false, hasPendingWrites: false } }); subs.push(f); setTimeout(f, 0); return () => { subs.splice(subs.indexOf(f), 1); }; }
  });
  const colRef = path => ({
    path, doc: id => docRef(path + '/' + id),
    onSnapshot(cb) { const f = () => cb({ docs: [...store.keys()].filter(k => isChild(path, k)).map(k => ({ id: k.split('/').pop(), data: () => clone(store.get(k)) })), metadata: { fromCache: false, hasPendingWrites: false } }); subs.push(f); setTimeout(f, 0); return () => { subs.splice(subs.indexOf(f), 1); }; }
  });
  const caps = {
    user: { id: async () => window.__UID || 'u1', me: async () => ({ name: window.__UID ? 'Aluna Teste' : 'Profa Teste' }), isOwner: async () => !window.__UID, profiles: async ids => Object.fromEntries(ids.map(i => [i, { name: i === 'acc-maria' ? 'Maria Conta' : i }])), search: async q => [{ id: 'acc-maria', name: 'Maria Conta', avatarUrl: '', guest: true }, { id: 'acc-joao', name: 'João Conta', avatarUrl: '', guest: true }].filter(p => p.name.toLowerCase().includes(String(q).toLowerCase())) },
    db: { doc: docRef, collection: colRef },
    downloads: { save: async x => { window.__downloads.push({ filename: x.filename, size: x.data && (x.data.size || x.data.length || x.data.byteLength) }); } },
    assets: { upload: async b => ({ id: 'a' + Date.now(), url: '/_blob/x', sizeBytes: b.size, contentType: b.type }), delete: async id => { (window.__deleted = window.__deleted || []).push(id); } }
  };
  window.__TEST_HOST = { use: async n => caps[n] || null };
})();
